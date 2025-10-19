import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Parámetros de importación
const COMPANY_ID = 17;
const PROVINCE_ID = 27; // Sánchez Ramírez
const MUNICIPALITY_ID = 167; // Cotuí

async function importCustomers() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando importación de clientes...\n');
    
    // Leer datos procesados
    const data = fs.readFileSync('processed-customers.json', 'utf-8');
    const customers = JSON.parse(data);
    
    console.log(`📊 Total de clientes a importar: ${customers.length}`);
    console.log(`🏢 Company ID: ${COMPANY_ID}`);
    console.log(`📍 Provincia: Sánchez Ramírez (ID: ${PROVINCE_ID})`);
    console.log(`📍 Municipio: Cotuí (ID: ${MUNICIPALITY_ID})\n`);
    
    await client.query('BEGIN');
    
    let imported = 0;
    let skipped = 0;
    let errors = [];
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      try {
        // Validar que tenga al menos nombre
        if (!customer.nombre || customer.nombre.trim() === '') {
          skipped++;
          errors.push(`Fila ${i + 1}: Sin nombre`);
          continue;
        }
        
        // Si no tiene teléfono, usar un valor por defecto o skipear
        const phone = customer.telefono && customer.telefono.trim() !== '' 
          ? customer.telefono 
          : '10000000000'; // Teléfono genérico si no hay
        
        // Insertar cliente
        const query = `
          INSERT INTO customers (
            company_id,
            businessname,
            managername,
            phone,
            rnc,
            street,
            streetnumber,
            provinceid,
            municipalityid,
            reference,
            creditlimit,
            balance
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        
        const values = [
          COMPANY_ID,
          customer.nombre, // businessname
          customer.nombre, // managername (usamos el mismo nombre)
          phone,
          customer.cedula || null, // rnc (usando cédula si está disponible)
          customer.direccion || 'Sin dirección', // street
          'S/N', // streetnumber
          PROVINCE_ID,
          MUNICIPALITY_ID,
          customer.direccion || null, // reference
          '0.00', // creditlimit
          '0.00'  // balance
        ];
        
        await client.query(query, values);
        imported++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`✓ Procesados: ${i + 1}/${customers.length}`);
        }
      } catch (err) {
        skipped++;
        errors.push(`Fila ${i + 1} (${customer.nombre}): ${err.message}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Importación completada!\n');
    console.log(`📈 Estadísticas:`);
    console.log(`   ✓ Importados exitosamente: ${imported}`);
    console.log(`   ⚠️  Omitidos: ${skipped}`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n⚠️  Errores encontrados:');
      errors.forEach(err => console.log(`   - ${err}`));
    } else if (errors.length > 10) {
      console.log(`\n⚠️  Se encontraron ${errors.length} errores (mostrando primeros 10):`);
      errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error durante la importación:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar importación
importCustomers()
  .then(() => {
    console.log('\n🎉 Proceso finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
