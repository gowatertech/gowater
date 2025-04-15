// Este script actualiza todos los productos existentes para establecer hasCommission = true (S)
import dotenv from 'dotenv';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { products } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Cargar variables de entorno
dotenv.config();

// Establecer conexión a la base de datos
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

console.log("Iniciando actualización de comisiones de productos...");

// Función principal
async function updateProductsCommission() {
  try {
    // Obtener todos los productos
    const allProducts = await db.select().from(products);
    console.log(`Encontrados ${allProducts.length} productos para actualizar.`);
    
    // Contador para productos actualizados
    let updatedCount = 0;
    
    // Actualizar cada producto
    for (const product of allProducts) {
      // Solo actualizar si hasCommission no está establecido como true
      if (product.hasCommission !== true) {
        const result = await db
          .update(products)
          .set({ hasCommission: true })
          .where(eq(products.id, product.id))
          .returning();
        
        if (result.length > 0) {
          updatedCount++;
          console.log(`Producto ID ${product.id} (${product.name}) actualizado a hasCommission = true (S)`);
        }
      } else {
        console.log(`Producto ID ${product.id} (${product.name}) ya tiene hasCommission = true (S)`);
      }
    }
    
    console.log(`Proceso completado. Se actualizaron ${updatedCount} productos.`);
  } catch (error) {
    console.error("Error durante la actualización:", error);
  } finally {
    // Cerrar conexión a la base de datos
    await pool.end();
    process.exit(0);
  }
}

// Ejecutar el script
updateProductsCommission();