const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Casos exactos donde anticipo = saldo de factura
const conversiones = [
  { payment_id: 174, invoice_id: 208, invoice_number: 7, monto: 40.00, cliente: 'MARIA CRISTINA YUMI', ant_doc: 'ANT-001' },
  { payment_id: 189, invoice_id: 228, invoice_number: 26, monto: 120.00, cliente: 'MARILENISS CONEPCION', ant_doc: 'ANT-006' },
  { payment_id: 196, invoice_id: 221, invoice_number: 19, monto: 440.00, cliente: 'CLIENTE A DOMICILIO', ant_doc: 'ANT-009' },
  { payment_id: 214, invoice_id: 258, invoice_number: 46, monto: 400.00, cliente: 'CLIENTE A DOMICILIO', ant_doc: 'ANT-013' },
  { payment_id: 232, invoice_id: 268, invoice_number: 49, monto: 360.00, cliente: 'CLIENTE A DOMICILIO', ant_doc: 'ANT-014' },
  { payment_id: 240, invoice_id: 279, invoice_number: 59, monto: 80.00, cliente: 'MARILEIDYS CASTILLO', ant_doc: 'ANT-017' },
  { payment_id: 242, invoice_id: 274, invoice_number: 55, monto: 320.00, cliente: 'CARMEN J. FROMEA', ant_doc: 'ANT-019' },
];

async function convertirAnticiposAPagos() {
  console.log('🔄 Iniciando conversión de anticipos a pagos...\n');

  let convertidos = 0;
  let errores = 0;

  for (const conversion of conversiones) {
    try {
      await pool.query('BEGIN');

      // 1. Actualizar el payment: vincular a factura y marcar como pago normal
      const updatePayment = await pool.query(
        `UPDATE payments 
         SET invoice_id = $1, 
             is_advance = false
         WHERE id = $2
         RETURNING id, document_number`,
        [conversion.invoice_id, conversion.payment_id]
      );

      // 2. Actualizar la factura a estado 'paid'
      await pool.query(
        `UPDATE invoices 
         SET status = 'paid'
         WHERE id = $1`,
        [conversion.invoice_id]
      );

      // 3. Convertir la transacción ANT a RI (Recibo de Ingreso)
      const updateTransaction = await pool.query(
        `UPDATE transactions 
         SET document_type = 'RI',
             type = 'credit'
         WHERE company_id = 17
           AND document_type = 'ANT'
           AND document_number = $1
         RETURNING id, document_number`,
        [conversion.ant_doc]
      );

      await pool.query('COMMIT');

      console.log(`✅ ${conversion.cliente.substring(0, 35).padEnd(35)} | ${conversion.ant_doc} → Pago FT-${conversion.invoice_number.toString().padStart(4, '0')} | $${conversion.monto.toFixed(2)}`);
      convertidos++;

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(`❌ Error convirtiendo ${conversion.ant_doc}:`, error.message);
      errores++;
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`  ✅ Convertidos exitosamente: ${convertidos}`);
  console.log(`  ❌ Errores: ${errores}`);
  console.log(`\n💰 Total convertido: $${conversiones.reduce((sum, c) => sum + c.monto, 0).toFixed(2)}`);

  await pool.end();
}

convertirAnticiposAPagos().catch(console.error);
