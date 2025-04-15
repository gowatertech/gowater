// Script para actualizar todos los productos existentes, 
// estableciendo el campo hasCommission a true (S)

import { db } from '../db.js';
import { products } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

async function updateAllProductsCommission() {
  try {
    console.log("Iniciando actualización de comisiones de productos...");
    
    // Obtener todos los productos
    const allProducts = await db.select().from(products);
    console.log(`Encontrados ${allProducts.length} productos para actualizar.`);
    
    // Contador para productos actualizados
    let updatedCount = 0;
    
    for (const product of allProducts) {
      // Actualizar únicamente si el campo no está definido o es falso
      if (product.hasCommission !== true) {
        const [updated] = await db
          .update(products)
          .set({ hasCommission: true })
          .where(eq(products.id, product.id))
          .returning();
        
        if (updated) {
          updatedCount++;
          console.log(`Producto ID ${product.id} (${product.name}) actualizado.`);
        }
      }
    }
    
    console.log(`Proceso completado. Se actualizaron ${updatedCount} productos.`);
    process.exit(0);
  } catch (error) {
    console.error("Error al actualizar productos:", error);
    process.exit(1);
  }
}

// Ejecutar la función
updateAllProductsCommission();