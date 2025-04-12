import { db } from './server/db.js';
import { orders, invoices, invoiceItems, payments, orderItems } from './shared/schema.js';
import { eq, desc } from 'drizzle-orm';

// Función para probar directamente el endpoint
async function testEndpoint() {
  console.log("Probando endpoint directamente...");
  
  // Simulando una solicitud POST al endpoint de entrega y facturación
  const url = "http://localhost:3000/api/mobile/orders/23/deliver-and-invoice";
  const data = {
    paymentMethod: "cash",
    amountPaid: 472,
    userId: 1
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error HTTP: ${response.status}, ${errorText}`);
      return;
    }
    
    const result = await response.json();
    console.log("Respuesta del servidor:", JSON.stringify(result, null, 2));
    console.log("¡Prueba completada con éxito!");
  } catch (error) {
    console.error("Error durante la prueba:", error);
  }
}

async function main() {
  console.log("Iniciando prueba de entrega y cobro...");
  
  // Verificar el estado actual de la orden 23
  const orderData = await db
    .select()
    .from(orders)
    .where(eq(orders.id, 23))
    .limit(1);
  
  if (orderData.length === 0) {
    console.error("Orden no encontrada");
    return;
  }
  
  const order = orderData[0];
  console.log("Estado actual de la orden:", JSON.stringify(order, null, 2));
  
  // Si la orden ya está entregada, terminar
  if (order.status === "delivered") {
    console.log("La orden ya está entregada. No se procesa nuevamente.");
    return;
  }
  
  try {
    // 1. Actualizar el estado de la orden a "entregado"
    console.log("Actualizando estado de la orden a 'delivered'...");
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        status: "delivered",
        cash_collected: "472.00",
        actual_delivery_time: new Date()
      })
      .where(eq(orders.id, 23))
      .returning();
    
    if (!updatedOrder) {
      throw new Error("Error al actualizar el estado de la orden");
    }
    
    console.log("Orden actualizada correctamente:", updatedOrder.id);
    
    // 2. Obtener el último número de factura
    console.log("Obteniendo último número de factura...");
    const lastInvoice = await db
      .select({ maxNumber: invoices.invoice_number })
      .from(invoices)
      .orderBy(desc(invoices.invoice_number))
      .limit(1);
    
    const nextInvoiceNumber = lastInvoice.length > 0 ? lastInvoice[0].maxNumber + 1 : 1;
    console.log(`Próximo número de factura: ${nextInvoiceNumber}`);
    
    // 3. Crear una nueva factura
    console.log("Creando nueva factura...");
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoice_number: nextInvoiceNumber,
        customer_id: order.customer_id,
        total: "472.00",
        status: "paid",
        payment_method: "cash",
        date: new Date(),
        notes: `Factura generada desde entrega en ruta ${order.route_id || 'N/A'}`
      })
      .returning();
    
    console.log("Factura creada correctamente:", invoice.id, "Número:", invoice.invoice_number);
    
    // 4. Obtener los items de la orden
    console.log("Obteniendo items de la orden...");
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.order_id, 23));
    
    console.log(`Encontrados ${items.length} items`);
    
    // 5. Crear los items de la factura
    console.log("Creando items de la factura...");
    for (const item of items) {
      const totalAmount = parseFloat(item.price) * item.quantity;
      const formattedTotal = totalAmount.toFixed(2);
      
      await db
        .insert(invoiceItems)
        .values({
          invoice_id: invoice.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total: formattedTotal
        });
    }
    
    console.log("Items de factura creados correctamente");
    
    // 6. Registrar el pago
    console.log("Registrando pago...");
    const [payment] = await db
      .insert(payments)
      .values({
        invoice_id: invoice.id,
        customer_id: order.customer_id,
        amount: "472.00",
        payment_method: "cash",
        date: new Date(),
        notes: `Pago recibido durante entrega en ruta ${order.route_id || 'N/A'}`
      })
      .returning();
    
    console.log("Pago registrado correctamente:", payment.id);
    
    console.log("Proceso de entrega y cobro completado exitosamente!");
    
  } catch (error) {
    console.error("Error durante el proceso:", error);
  } finally {
    process.exit(0);
  }
}

// Modificamos para llamar a la prueba de endpoint en lugar de la función principal
testEndpoint();