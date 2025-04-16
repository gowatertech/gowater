import { Express, Request, Response } from "express";
import { db } from "../../db";
import { eq, and, sql } from "drizzle-orm";
import { routes, orders } from "@shared/schema";

/**
 * Registra el endpoint para iniciar una ruta (marcarla como "in_progress")
 * Este endpoint verifica que un conductor no tenga múltiples rutas activas
 */
export function registerStartRouteEndpoint(app: Express) {
  app.post("/api/routes/:id/start", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/routes/:id/start - Iniciando ruta");
      const routeId = parseInt(req.params.id);
      
      if (!routeId || isNaN(routeId)) {
        return res.status(400).json({ 
          success: false,
          message: "ID de ruta inválido" 
        });
      }
      
      // 1. Obtener el ID del conductor asociado a la ruta
      const route = await db.query.routes.findFirst({
        where: eq(routes.id, routeId)
      });
      
      if (!route) {
        return res.status(404).json({ 
          success: false,
          message: "Ruta no encontrada" 
        });
      }
      
      const driverId = route.driverId;
      
      // 2. Verificar si el conductor ya tiene alguna ruta en progreso
      const activeRoutes = await db.select()
        .from(routes)
        .where(
          and(
            eq(routes.driverId, driverId),
            eq(routes.status, "in_progress"),
            sql`${routes.id} != ${routeId}` // Excluir la ruta actual
          )
        );
      
      if (activeRoutes.length > 0) {
        return res.status(400).json({
          success: false,
          message: "El conductor ya tiene una ruta en progreso",
          activeRouteId: activeRoutes[0].id
        });
      }
      
      // 3. Si la ruta ya está en progreso, simplemente retornar éxito
      if (route.status === "in_progress") {
        return res.status(200).json({
          success: true,
          message: "La ruta ya está en progreso",
          route: route
        });
      }
      
      // 4. Actualizar el estado de la ruta a "in_progress"
      const [updatedRoute] = await db.update(routes)
        .set({
          status: "in_progress",
          driverStartedAt: new Date(),
          startTime: route.startTime || new Date() // Usar startTime existente o establecer uno nuevo
        })
        .where(eq(routes.id, routeId))
        .returning();
      
      // 5. También actualizar el estado de los pedidos asociados a esta ruta
      await db.update(orders)
        .set({
          status: "in_transit"
        })
        .where(eq(orders.routeId, routeId));
      
      console.log(`Ruta #${routeId} iniciada con éxito`);
      
      // 6. Devolver la ruta actualizada
      return res.status(200).json({
        success: true,
        message: "Ruta iniciada con éxito",
        route: updatedRoute
      });
      
    } catch (error) {
      console.error("Error al iniciar la ruta:", error);
      return res.status(500).json({ 
        success: false,
        message: "Error al iniciar la ruta", 
        error: String(error) 
      });
    }
  });
}