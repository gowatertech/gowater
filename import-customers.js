import XLSX from 'xlsx';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importCustomers() {
  console.log('📖 Leyendo archivo Excel...');
  
  // Leer el archivo Excel
  const workbook = XLSX.readFile('attached_assets/CUENTAS POR PAGAR_1761866929722.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ Encontradas ${data.length} filas en el Excel`);
  console.log('📋 Primeras 3 filas como ejemplo:');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
  
  // Constantes para el mapeo
  const COMPANY_ID = 17;
  const PROVINCE_ID = 27; // Sánchez Ramírez
  const MUNICIPALITY_ID = 167; // Cotuí
  const ZONA_COTUI_ID = 9;
  const ZONA_CHACUEY_ID = 12;

  const results = {
    success: [],
    errors: []
  };

  console.log('\n🔄 Procesando clientes...\n');

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      // Extraer datos del Excel (nota: la columna es "COD." con punto)
      const cod = row['COD.'] || row.COD || row.Cod || row.cod || '';
      const nombre = row.NOMBRE || row.Nombre || row.nombre || 'Sin nombre';
      const municipio = (row.MUNICIPIO || row.Municipio || row.municipio || '').toLowerCase();
      const telefono = row.TELEFONO || row.Telefono || row.telefono || row.TEL || '';
      const cxc = parseFloat(row.CXC || row.cxc || 0);

      // Validar que tenga al menos nombre
      if (!nombre || nombre === 'Sin nombre') {
        results.errors.push({ row: i + 2, error: 'Sin nombre', data: row });
        continue;
      }

      // Determinar zona basada en municipio
      let zoneId = null;
      if (municipio.includes('cotui') || municipio.includes('cotuí')) {
        zoneId = ZONA_COTUI_ID;
      } else if (municipio.includes('chacuey') || municipio.includes('plantanal')) {
        zoneId = ZONA_CHACUEY_ID;
      }

      // Procesar teléfono - agregar 1 al inicio si no lo tiene
      let phoneProcessed = String(telefono).trim();
      if (phoneProcessed && !phoneProcessed.startsWith('1')) {
        phoneProcessed = '1' + phoneProcessed;
      }

      // Crear referencia con formato "COD - número"
      const reference = cod ? `COD - ${cod}` : '';

      // Preparar datos para inserción
      const customerData = {
        companyId: COMPANY_ID,
        businessname: nombre,
        managername: nombre, // Usar el mismo nombre si no hay encargado
        phone: phoneProcessed || '1000000000', // Teléfono por defecto si no hay
        street: 'Sin dirección',
        streetnumber: 'S/N',
        provinceid: PROVINCE_ID,
        municipalityid: MUNICIPALITY_ID,
        zoneid: zoneId,
        reference: reference,
        balance: cxc.toFixed(2),
        creditlimit: '0.00'
      };

      // Insertar en la base de datos
      const query = `
        INSERT INTO customers (
          company_id, businessname, managername, phone, street, streetnumber,
          provinceid, municipalityid, zoneid, reference, balance, creditlimit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;

      const values = [
        customerData.companyId,
        customerData.businessname,
        customerData.managername,
        customerData.phone,
        customerData.street,
        customerData.streetnumber,
        customerData.provinceid,
        customerData.municipalityid,
        customerData.zoneid,
        customerData.reference,
        customerData.balance,
        customerData.creditlimit
      ];

      const result = await pool.query(query, values);
      
      results.success.push({
        id: result.rows[0].id,
        cod: cod,
        nombre: nombre,
        telefono: phoneProcessed,
        balance: cxc,
        zona: zoneId === ZONA_COTUI_ID ? 'COTUI' : zoneId === ZONA_CHACUEY_ID ? 'CHACUEY' : 'Sin zona'
      });

      if ((i + 1) % 10 === 0) {
        console.log(`✅ Procesados ${i + 1}/${data.length} clientes...`);
      }

    } catch (error) {
      results.errors.push({
        row: i + 2,
        error: error.message,
        data: row
      });
    }
  }

  // Reporte final
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE DE IMPORTACIÓN');
  console.log('='.repeat(60));
  console.log(`✅ Clientes importados exitosamente: ${results.success.length}`);
  console.log(`❌ Errores: ${results.errors.length}`);
  
  if (results.success.length > 0) {
    console.log('\n📝 Primeros 10 clientes importados:');
    results.success.slice(0, 10).forEach((c, idx) => {
      console.log(`${idx + 1}. ID: ${c.id} | COD: ${c.cod} | ${c.nombre} | Tel: ${c.telefono} | Balance: $${c.balance} | Zona: ${c.zona}`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Errores encontrados:');
    results.errors.forEach((e, idx) => {
      console.log(`${idx + 1}. Fila ${e.row}: ${e.error}`);
    });
  }

  await pool.end();
  console.log('\n✅ Importación completada');
}

importCustomers().catch(console.error);
