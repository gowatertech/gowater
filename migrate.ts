import { db } from "./server/db";
import { 
  inventoryMovements, 
  inventoryAdjustments, 
  inventoryAdjustmentItems, 
  stockAlerts,
  products
} from "./shared/schema";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Iniciando migración...");
  
  try {
    // Añadir campo minStock a la tabla products si no existe
    console.log("Verificando si es necesario añadir minStock a products...");
    const hasMinStock = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'min_stock'
    `);
    
    if (!hasMinStock.rowCount || hasMinStock.rowCount === 0) {
      console.log("Añadiendo campo minStock a products...");
      await db.execute(sql`
        ALTER TABLE products ADD COLUMN min_stock INTEGER;
      `);
      console.log("Campo minStock añadido.");
    } else {
      console.log("El campo minStock ya existe en products.");
    }

    // Crear tabla inventoryMovements si no existe
    console.log("Creando tabla inventoryMovements...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'return', 'production', 'transfer')),
        reference_id INTEGER,
        reference_type TEXT CHECK (reference_type IN ('order', 'adjustment', 'production', 'vehicle_loading', 'transfer')),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Crear tabla inventoryAdjustments si no existe
    console.log("Creando tabla inventoryAdjustments...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id SERIAL PRIMARY KEY,
        reason TEXT NOT NULL CHECK (reason IN ('damage', 'loss', 'count', 'expiration', 'error', 'other')),
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Crear tabla inventoryAdjustmentItems si no existe
    console.log("Creando tabla inventoryAdjustmentItems...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
        id SERIAL PRIMARY KEY,
        adjustment_id INTEGER NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        previous_quantity INTEGER NOT NULL,
        new_quantity INTEGER NOT NULL,
        difference INTEGER NOT NULL,
        notes TEXT
      );
    `);
    
    // Crear tabla stockAlerts si no existe
    console.log("Creando tabla stockAlerts...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        current_stock INTEGER NOT NULL,
        min_stock INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id),
        notes TEXT
      );
    `);
    
    console.log("Migración completada exitosamente.");
  } catch (error) {
    console.error("Error durante la migración:", error);
  } finally {
    process.exit(0);
  }
}

migrate();