import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Necesario para Neon DB con Serverless
neonConfig.webSocketConstructor = ws;

// Verificar que exista DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL no está definida');
  process.exit(1);
}

// Función principal de migración
async function runMigration() {
  console.log('Iniciando proceso de migración...');
  
  try {
    // Crear conexión a la base de datos
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Ejecutar las migraciones desde la carpeta "migrations"
    console.log('Aplicando migraciones desde ./migrations');
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Migraciones aplicadas exitosamente');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
runMigration();