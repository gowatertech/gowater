import { exec } from 'child_process';
import * as readline from 'readline';

// Crear interfaz para input del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== SISTEMA DE MIGRACIÓN DE BASE DE DATOS PARA PRODUCCIÓN ===');
console.log('Este script ejecutará los siguientes pasos:');
console.log('1. Realizar backup de la base de datos actual');
console.log('2. Aplicar migraciones a la base de datos');
console.log('\nIMPORTANTE: Este proceso debe ejecutarse después de un deployment');

// Solicitar confirmación
rl.question('\n¿Desea continuar con la migración? (s/n): ', (answer) => {
  if (answer.toLowerCase() !== 's') {
    console.log('Operación cancelada');
    rl.close();
    return;
  }

  // Paso 1: Realizar backup
  console.log('\n[PASO 1] Realizando backup de la base de datos...');
  exec('npx tsx server/backup-database.ts', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error durante el backup: ${error.message}`);
      rl.close();
      return;
    }

    console.log(stdout);
    
    // Paso 2: Aplicar migraciones después de confirmación adicional
    rl.question('\n¿El backup se completó exitosamente? ¿Desea proceder con la migración? (s/n): ', (migrationAnswer) => {
      if (migrationAnswer.toLowerCase() !== 's') {
        console.log('Migración cancelada');
        rl.close();
        return;
      }

      console.log('\n[PASO 2] Aplicando migraciones...');
      exec('npx tsx server/migrate.ts', (migrationError, migrationStdout, migrationStderr) => {
        if (migrationError) {
          console.error(`Error durante la migración: ${migrationError.message}`);
          console.log('IMPORTANTE: Considere restaurar el backup realizado en el paso 1');
          rl.close();
          return;
        }

        console.log(migrationStdout);
        console.log('\n¡Migración completada exitosamente!');
        rl.close();
      });
    });
  });
});