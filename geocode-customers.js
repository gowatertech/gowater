import pg from 'pg';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const COMPANY_ID = 17;

// Función para hacer geocoding con Nominatim (OpenStreetMap)
async function geocodeAddress(street, municipality, province, country = 'República Dominicana') {
  try {
    // Construir la dirección completa
    const address = `${street}, ${municipality}, ${province}, ${country}`;
    
    // URL de Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GoWater-Customer-Import/1.0' // Nominatim requiere un User-Agent
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      return `${lat},${lon}`;
    }
    
    // Si no encuentra la dirección específica, intentar con municipio y provincia
    const fallbackAddress = `${municipality}, ${province}, ${country}`;
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`;
    
    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit
    
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'GoWater-Customer-Import/1.0'
      }
    });
    
    const fallbackData = await fallbackResponse.json();
    
    if (fallbackData && fallbackData.length > 0) {
      const lat = parseFloat(fallbackData[0].lat);
      const lon = parseFloat(fallbackData[0].lon);
      return `${lat},${lon}`;
    }
    
    return null;
  } catch (error) {
    console.error(`Error geocoding: ${error.message}`);
    return null;
  }
}

// Función para esperar (rate limiting)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeCustomers() {
  const client = await pool.connect();
  
  try {
    console.log('🌍 Iniciando geocodificación de clientes...\n');
    
    // Obtener clientes sin coordenadas
    const result = await client.query(`
      SELECT 
        c.id,
        c.businessname,
        c.street,
        m.name as municipality,
        p.name as province
      FROM customers c
      LEFT JOIN municipalities m ON c.municipalityid = m.id
      LEFT JOIN provinces p ON c.provinceid = p.id
      WHERE c.company_id = $1
      AND (c.coordinates IS NULL OR c.coordinates = '')
      ORDER BY c.id
    `, [COMPANY_ID]);
    
    const customers = result.rows;
    console.log(`📊 Total de clientes a geocodificar: ${customers.length}\n`);
    
    if (customers.length === 0) {
      console.log('✅ Todos los clientes ya tienen coordenadas');
      return;
    }
    
    let geocoded = 0;
    let failed = 0;
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      console.log(`[${i + 1}/${customers.length}] Geocodificando: ${customer.businessname}`);
      console.log(`   Dirección: ${customer.street}, ${customer.municipality}, ${customer.province}`);
      
      // Geocodificar
      const coordinates = await geocodeAddress(
        customer.street,
        customer.municipality,
        customer.province
      );
      
      if (coordinates) {
        // Actualizar en la base de datos
        await client.query(
          'UPDATE customers SET coordinates = $1 WHERE id = $2',
          [coordinates, customer.id]
        );
        
        console.log(`   ✓ Coordenadas asignadas: ${coordinates}\n`);
        geocoded++;
      } else {
        console.log(`   ⚠️  No se encontraron coordenadas\n`);
        failed++;
      }
      
      // Respetar rate limit de Nominatim (1 request por segundo)
      if (i < customers.length - 1) {
        await sleep(1100);
      }
    }
    
    console.log('\n✅ Geocodificación completada!\n');
    console.log(`📈 Estadísticas:`);
    console.log(`   ✓ Geocodificados exitosamente: ${geocoded}`);
    console.log(`   ⚠️  No geocodificados: ${failed}`);
    
  } catch (error) {
    console.error('\n❌ Error durante la geocodificación:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar geocodificación
geocodeCustomers()
  .then(() => {
    console.log('\n🎉 Proceso finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
