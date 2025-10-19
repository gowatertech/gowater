import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'attached_assets/LISTADO DE CLIENTES POR CONTRATO_1760835434935.xlsx';

// Leer el archivo Excel
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertir a JSON (array de arrays)
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Los encabezados están en la fila 3 (índice 3)
// Los datos comienzan en la fila 4 (índice 4)
const headers = rawData[3]; // ['COD.', 'NOMBRE', 'CEDULA', 'DIRECCION', 'TELEFONO', 'Bot.']
const dataRows = rawData.slice(4);

// Procesar los datos según las especificaciones:
// 1. Borrar columna COD. (índice 0)
// 2. Procesar teléfono: borrar guiones y añadir 1 al inicio (índice 4, pero será 3 después de borrar COD.)
// 3. Borrar columna Bot. (índice 5, pero será 4 después de borrar COD.)

const processedData = dataRows
  .filter(row => row && row.length > 0 && row[1]) // Filtrar filas vacías y sin nombre
  .map(row => {
    const nombre = row[1];
    const cedula = row[2] || '';
    const direccion = row[3] || '';
    let telefonoRaw = row[4] || '';
    
    // Procesar teléfono: extraer solo dígitos
    let telefono = '';
    if (telefonoRaw) {
      // Eliminar TODOS los caracteres no numéricos
      const digitsOnly = telefonoRaw.toString().replace(/\D/g, '');
      
      // Tomar solo los primeros 10 dígitos (número dominicano estándar)
      if (digitsOnly.length >= 10) {
        const mainNumber = digitsOnly.substring(0, 10);
        // Añadir 1 al inicio
        telefono = '1' + mainNumber;
      }
      // Si no hay suficientes dígitos, dejar vacío
    }
    
    return {
      nombre,
      cedula,
      direccion,
      telefono
    };
  });

console.log('Total de registros procesados:', processedData.length);
console.log('\n--- Primeros 10 registros procesados ---');
processedData.slice(0, 10).forEach((record, index) => {
  console.log(`\n${index + 1}.`);
  console.log(`  Nombre: ${record.nombre}`);
  console.log(`  Cédula: ${record.cedula}`);
  console.log(`  Dirección: ${record.direccion}`);
  console.log(`  Teléfono: ${record.telefono}`);
});

// Guardar los datos procesados en un archivo JSON
const outputPath = 'processed-customers.json';
fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
console.log(`\n✓ Datos procesados guardados en: ${outputPath}`);

// Crear también un nuevo archivo Excel con los datos procesados
const newWorkbook = XLSX.utils.book_new();
const newHeaders = ['NOMBRE', 'CEDULA', 'DIRECCION', 'TELEFONO'];
const newData = [newHeaders, ...processedData.map(r => [r.nombre, r.cedula, r.direccion, r.telefono])];
const newWorksheet = XLSX.utils.aoa_to_sheet(newData);
XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Clientes Procesados');
XLSX.writeFile(newWorkbook, 'clientes_procesados.xlsx');
console.log('✓ Archivo Excel procesado guardado en: clientes_procesados.xlsx');
