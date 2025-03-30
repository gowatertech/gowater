// Script para actualizar el isReturnable en el endpoint de productos en una ruta específica
const fs = require('fs');
const path = require('path');

// Leer el archivo routes-endpoints.ts
const filePath = path.join(process.cwd(), 'server', 'routes-endpoints.ts');
const content = fs.readFileSync(filePath, 'utf-8');

// Dos patrones para reemplazar
const pattern1 = `.select({
              productId: orderItemsTable.productId,
              name: products.name,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
            })`;

const replacement1 = `.select({
              productId: orderItemsTable.productId,
              name: products.name,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
              isReturnable: products.isReturnable,
            })`;

// Reemplazar todas las ocurrencias
const updatedContent = content.replaceAll(pattern1, replacement1);

// Guardar el archivo modificado
fs.writeFileSync(filePath, updatedContent, 'utf-8');

console.log("Archivo actualizado correctamente");