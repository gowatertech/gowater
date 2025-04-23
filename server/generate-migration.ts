import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Verificar argumentos
if (process.argv.length < 3) {
  console.error('Uso: tsx server/generate-migration.ts "descripción de la migración"');
  process.exit(1);
}

// Obtener nombre de la migración desde los argumentos
const migrationName = process.argv[2]
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

// Verificar que exista la carpeta de migraciones
const migrationsDir = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log('Carpeta de migraciones creada en:', migrationsDir);
}

// Generar la migración utilizando drizzle-kit
console.log(`Generando migración: ${migrationName}...`);

// Ejecutar drizzle-kit para generar el archivo SQL de migración
exec('npx drizzle-kit generate:pg', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error al generar la migración: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Error de Drizzle Kit: ${stderr}`);
    return;
  }
  
  console.log('Migración generada exitosamente');
  console.log(stdout);
  
  console.log('\nPara aplicar la migración en desarrollo:');
  console.log('npx tsx server/migrate.ts');
  
  console.log('\nPara aplicar la migración en producción después del deployment:');
  console.log('npx tsx server/migrate.ts');
});