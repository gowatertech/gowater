const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Mapeo de números de documento (payments usa 3 dígitos, transactions usa 4)
const conversiones = [
  { ant_payment: 'ANT-001', ant_transaction: 'ANT-0001', ft: 'FT-0007', cliente: 'MARIA CRISTINA YUMI', monto: 40 },
  { ant_payment: 'ANT-006', ant_transaction: 'ANT-0006', ft: 'FT-0026', cliente: 'MARILENISS CONEPCION', monto: 120 },
  { ant_payment: 'ANT-009', ant_transaction: 'ANT-0009', ft: 'FT-0019', cliente: 'CLIENTE A DOMICILIO', monto: 440 },
  { ant_payment: 'ANT-013', ant_transaction: 'ANT-0013', ft: 'FT-0046', cliente: 'CLIENTE A DOMICILIO', monto: 400 },
  { ant_payment: 'ANT-014', ant_transaction: 'ANT-0014', ft: 'FT-0049', cliente: 'CLIENTE A DOMICILIO', monto: 360 },
  { ant_payment: 'ANT-017', ant_transaction: 'ANT-0017', ft: 'FT-0059', cliente: 'MARILEIDYS CASTILLO', monto: 80 },
  { ant_payment: 'ANT-019', ant_transaction: 'ANT-0019', ft: 'FT-0055', cliente: 'CARMEN J. FROMEA', monto: 320 },
];

async function actualizarTransacciones() {
  console.log('🔄 Actualizando transacciones ANT → RI...\n');

  let actualizados = 0;

  for (const conversion of conversiones) {
    // Convertir la transacción ANT a RI (Recibo de Ingreso)
    const result = await pool.query(
      `UPDATE transactions 
       SET document_type = 'RI',
           document_number = $1
       WHERE company_id = 17
         AND document_type = 'ANT'
         AND document_number = $2
       RETURNING id, document_number`,
      [conversion.ant_payment, conversion.ant_transaction]
    );

    if (result.rows.length > 0) {
      console.log(`✅ ${conversion.cliente.substring(0, 35).padEnd(35)} | ${conversion.ant_transaction} → ${conversion.ant_payment} (RI) | Aplicado a ${conversion.ft} | $${conversion.monto.toFixed(2)}`);
      actualizados++;
    } else {
      console.log(`⚠️  No encontrado: ${conversion.ant_transaction}`);
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`  ✅ Transacciones actualizadas: ${actualizados}`);
  console.log(`  💰 Total: $${conversiones.reduce((sum, c) => sum + c.monto, 0).toFixed(2)}`);

  await pool.end();
}

actualizarTransacciones().catch(console.error);
