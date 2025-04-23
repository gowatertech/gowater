import { Express, Request, Response } from "express";
import { db, usersSimple } from "../../db";
import { eq, and } from "drizzle-orm";

// Endpoint para obtener las ubicaciones de los conductores
export function registerDriversLocationsEndpoint(app: Express) {
  app.get("/api/drivers/locations", async (req: Request, res: Response) => {
    try {
      // Consultar los conductores (usuarios con rol driver)
      const drivers = await db
        .select({
          id: usersSimple.id,
          name: usersSimple.name,
        })
        .from(usersSimple)
        .where(eq(usersSimple.role, "driver"));
      
      // Este endpoint simplemente devuelve la lista de conductores sin ubicaciones reales
      // Como acordamos, por ahora no mostraremos ubicaciones reales
      res.json(drivers);
    } catch (error) {
      console.error("Error al obtener ubicaciones de conductores:", error);
      res.status(500).json({ 
        error: "Error al obtener ubicaciones de conductores" 
      });
    }
  });
}