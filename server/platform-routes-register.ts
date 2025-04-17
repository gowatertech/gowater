import { Express, Router } from "express";
import { registerPlatformRoutes } from "./platform-routes";
import { db } from "./db";
import { sql } from "drizzle-orm";

export function registerPlatformEndpoints(app: Express) {
  // Crear un router específico para la plataforma
  const platformRouter = Router();
  
  // Endpoint de prueba
  app.get('/api/platform-test', async (req, res) => {
    try {
      // Consulta simple para verificar la conexión y ver si existen las tablas
      const plans = await db.execute(sql`SELECT * FROM plans LIMIT 5`);
      
      return res.json({
        message: 'Plataforma funcionando correctamente',
        status: 'success',
        data: {
          plans: plans.rows || []
        }
      });
    } catch (error) {
      console.error('Error en endpoint de prueba:', error);
      return res.status(500).json({
        message: 'Error al verificar la plataforma',
        status: 'error',
        error: String(error)
      });
    }
  });
  
  // Endpoint para listar tablas
  app.get('/api/platform-tables', async (req, res) => {
    try {
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      return res.json({
        message: 'Tablas disponibles en la base de datos',
        status: 'success',
        data: {
          tables: tables.rows || []
        }
      });
    } catch (error) {
      console.error('Error al listar tablas:', error);
      return res.status(500).json({
        message: 'Error al listar tablas',
        status: 'error',
        error: String(error)
      });
    }
  });
  
  // Registrar las rutas de la plataforma
  registerPlatformRoutes(platformRouter);
  
  // Montar todas las rutas de la plataforma bajo /api/platform
  app.use("/api/platform", platformRouter);
  
  console.log("🌐 Rutas de plataforma registradas");
}