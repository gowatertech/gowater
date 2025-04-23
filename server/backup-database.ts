import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Crear carpeta de backups si no existe
const backupDir = path.join(process.cwd(), 'database-backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Generar nombre de archivo con timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFileName = `gowater_backup_${timestamp}.sql`;
const backupFilePath = path.join(backupDir, backupFileName);

// Verificar variables de entorno
if (!process.env.PGDATABASE || !process.env.PGUSER || !process.env.PGHOST || !process.env.PGPORT) {
  console.error('Error: Variables de entorno de PostgreSQL no definidas');
  process.exit(1);
}

console.log('Iniciando backup de la base de datos...');

// Comando para realizar el backup
const pgDumpCmd = `pg_dump -h ${process.env.PGHOST} -p ${process.env.PGPORT} -U ${process.env.PGUSER} -d ${process.env.PGDATABASE} -F c -f "${backupFilePath}"`;

// Ejecutar el comando
exec(pgDumpCmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error al realizar backup: ${error.message}`);
    process.exit(1);
  }
  
  if (stderr) {
    // pg_dump puede enviar mensajes informativos a stderr
    console.log(`Mensajes de pg_dump: ${stderr}`);
  }
  
  console.log(`Backup de la base de datos creado exitosamente en: ${backupFilePath}`);
  console.log('Ahora es seguro proceder con la migración');
});