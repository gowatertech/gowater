import { db } from "./db";
import { invoices, payments, customers, transactions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "./storage";
import { sql } from "drizzle-orm";

const storage = new DatabaseStorage();

async function rebuildTransactions(companyId: number) {
  console.log(`🔄 Iniciando reconstrucción de transacciones para companyId=${companyId}\n`);

  const results = {
    invoicesProcessed: 0,
    paymentsProcessed: 0,
    transactionsCreated: 0,
    errors: [] as string[],
  };

  // 1. Obtener todas las facturas
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.companyId, companyId))
    .orderBy(invoices.date);

  console.log(`📄 Encontradas ${allInvoices.length} facturas\n`);

  // 2. Obtener transacciones existentes
  const existingTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.companyId, companyId));

  const existingInvoiceIds = new Set(
    existingTransactions.filter((t) => t.invoiceId !== null).map((t) => t.invoiceId)
  );

  const existingPaymentIds = new Set(
    existingTransactions.filter((t) => t.paymentId !== null).map((t) => t.paymentId)
  );

  // 3. Crear transacciones para facturas
  for (const invoice of allInvoices) {
    if (existingInvoiceIds.has(invoice.id)) {
      console.log(`⏭️  Factura #${invoice.invoiceNumber} ya tiene transacción`);
      continue;
    }

    try {
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, invoice.customerId))
        .limit(1);

      if (customer.length === 0) {
        results.errors.push(`Factura #${invoice.invoiceNumber}: cliente no encontrado`);
        continue;
      }

      // Crear transacción usando el storage directamente con companyId en el contexto
      const transaction = await db.transaction(async (tx) => {
        // Lockear tabla
        await tx.execute(sql`LOCK TABLE ${transactions} IN SHARE ROW EXCLUSIVE MODE`);

        // Generar número de documento
        const maxNumberResult = await tx
          .select({
            maxNumber: sql<string>`MAX(CAST(SUBSTRING(${transactions.documentNumber} FROM '[0-9]+') AS INTEGER))`,
          })
          .from(transactions)
          .where(
            sql`${transactions.companyId} = ${companyId} AND ${transactions.documentType} = 'FT'`
          );

        const maxNumber = parseInt(maxNumberResult[0]?.maxNumber || "0", 10);
        const nextNumber = maxNumber + 1;
        const documentNumber = `FT-${nextNumber.toString().padStart(4, "0")}`;

        // Insertar transacción
        const [newTransaction] = await tx
          .insert(transactions)
          .values({
            documentType: "FT",
            documentNumber,
            customerId: invoice.customerId,
            invoiceId: invoice.id,
            paymentId: null,
            amount: invoice.total,
            type: "debit",
            description: `Factura #${invoice.invoiceNumber} - ${customer[0].businessname}`,
            date: invoice.date,
            companyId,
            debit: invoice.total,
            credit: null,
            balance: "0.00", // Se calculará después
          })
          .returning();

        return newTransaction;
      });

      results.invoicesProcessed++;
      results.transactionsCreated++;
      console.log(
        `✅ ${transaction.documentNumber} creada para Factura #${invoice.invoiceNumber}`
      );
    } catch (error) {
      results.errors.push(`Factura #${invoice.invoiceNumber}: ${String(error)}`);
      console.error(`❌ Error al procesar factura #${invoice.invoiceNumber}:`, error);
    }
  }

  console.log("\n");

  // 4. Obtener todos los pagos
  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.companyId, companyId))
    .orderBy(payments.date);

  console.log(`💰 Encontrados ${allPayments.length} pagos\n`);

  // 5. Crear transacciones para pagos
  for (const payment of allPayments) {
    if (existingPaymentIds.has(payment.id)) {
      console.log(`⏭️  Pago #${payment.id} ya tiene transacción`);
      continue;
    }

    try {
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, payment.customerId))
        .limit(1);

      if (customer.length === 0) {
        results.errors.push(`Pago #${payment.id}: cliente no encontrado`);
        continue;
      }

      // Determinar tipo de documento
      const documentType = payment.isAdvance ? "ANT" : "RI";
      const description = payment.isAdvance
        ? `Anticipo - ${customer[0].businessname}`
        : payment.invoiceId
        ? `Pago Factura - ${customer[0].businessname}`
        : `Pago - ${customer[0].businessname}`;

      // Crear transacción
      const transaction = await db.transaction(async (tx) => {
        // Lockear tabla
        await tx.execute(sql`LOCK TABLE ${transactions} IN SHARE ROW EXCLUSIVE MODE`);

        // Generar número de documento
        const maxNumberResult = await tx
          .select({
            maxNumber: sql<string>`MAX(CAST(SUBSTRING(${transactions.documentNumber} FROM '[0-9]+') AS INTEGER))`,
          })
          .from(transactions)
          .where(
            sql`${transactions.companyId} = ${companyId} AND ${transactions.documentType} = ${documentType}`
          );

        const maxNumber = parseInt(maxNumberResult[0]?.maxNumber || "0", 10);
        const nextNumber = maxNumber + 1;
        const documentNumber = `${documentType}-${nextNumber.toString().padStart(4, "0")}`;

        // Insertar transacción
        const [newTransaction] = await tx
          .insert(transactions)
          .values({
            documentType,
            documentNumber,
            customerId: payment.customerId,
            invoiceId: payment.invoiceId || null,
            paymentId: payment.id,
            amount: payment.amount,
            type: "credit",
            description,
            date: payment.date,
            companyId,
            debit: null,
            credit: payment.amount,
            balance: "0.00", // Se calculará después
          })
          .returning();

        return newTransaction;
      });

      results.paymentsProcessed++;
      results.transactionsCreated++;
      console.log(`✅ ${transaction.documentNumber} creada para Pago #${payment.id}`);
    } catch (error) {
      results.errors.push(`Pago #${payment.id}: ${String(error)}`);
      console.error(`❌ Error al procesar pago #${payment.id}:`, error);
    }
  }

  console.log("\n🎉 Reconstrucción completada:");
  console.log(`   📄 Facturas procesadas: ${results.invoicesProcessed}`);
  console.log(`   💰 Pagos procesados: ${results.paymentsProcessed}`);
  console.log(`   ✅ Transacciones creadas: ${results.transactionsCreated}`);
  if (results.errors.length > 0) {
    console.log(`   ❌ Errores: ${results.errors.length}`);
    results.errors.forEach((err) => console.log(`      - ${err}`));
  }

  return results;
}

// Ejecutar para companyId=1
rebuildTransactions(1)
  .then(() => {
    console.log("\n✅ Proceso completado exitosamente");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  });
