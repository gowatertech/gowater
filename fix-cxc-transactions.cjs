const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixCXCTransactions() {
  console.log('🔄 Iniciando corrección de transacciones CXC...\n');

  // 1. Leer el archivo Excel
  const workbook = XLSX.readFile('./attached_assets/CUENTAS POR PAGAR_1761866929722.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`📊 Archivo Excel cargado: ${excelData.length} filas\n`);

  let actualizados = 0;
  let noEncontrados = 0;
  let sinCambios = 0;

  for (const row of excelData) {
    const nombre = row['NOMBRE'];
    const cxcExcel = parseFloat(row['CXC'] || 0);

    if (!nombre) continue;

    // Buscar el cliente en la BD por nombre
    const clienteResult = await pool.query(
      `SELECT id, businessname FROM customers WHERE company_id = 17 AND businessname ILIKE $1 LIMIT 1`,
      [nombre]
    );

    if (clienteResult.rows.length === 0) {
      // Intentar con COD - prefijo
      const clienteResult2 = await pool.query(
        `SELECT id, businessname FROM customers WHERE company_id = 17 AND businessname ILIKE $1 LIMIT 1`,
        [`%${nombre}%`]
      );

      if (clienteResult2.rows.length === 0) {
        noEncontrados++;
        continue;
      }

      const cliente = clienteResult2.rows[0];
      await actualizarTransaccion(cliente.id, cliente.businessname, cxcExcel);
      actualizados++;
    } else {
      const cliente = clienteResult.rows[0];
      await actualizarTransaccion(cliente.id, cliente.businessname, cxcExcel);
      actualizados++;
    }
  }

  async function actualizarTransaccion(customerId, businessname, cxcAmount) {
    const amountStr = cxcAmount.toFixed(2);
    
    const result = await pool.query(
      `UPDATE transactions 
       SET amount = $1 
       WHERE customer_id = $2 
         AND company_id = 17 
         AND document_type = 'CXC'
       RETURNING id, document_number`,
      [amountStr, customerId]
    );

    if (result.rows.length > 0) {
      console.log(`✅ ${businessname.substring(0, 35).padEnd(35)} | CXC: $${amountStr.padStart(10)} | ${result.rows[0].document_number}`);
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`  ✅ Actualizados: ${actualizados}`);
  console.log(`  ❌ No encontrados: ${noEncontrados}`);
  console.log(`  ⏭️  Sin cambios: ${sinCambios}`);

  await pool.end();
}

fixCXCTransactions().catch(console.error);
