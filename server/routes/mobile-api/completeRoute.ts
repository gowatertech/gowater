import { Express, Request, Response } from "express";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { routes, orders, vehicleLoading } from "@shared/schema";

export function registerCompleteRouteEndpoint(app: Express) {
  // Endpoint para completar una ruta desde la app móvil
  app.post("/api/mobile/routes/:id/complete", async (req: Request, res: Response) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (!routeId || isNaN(routeId)) {
        return res.status(400).json({ 
          success: false, 
          message: "ID de ruta inválido" 
        });
      }

      // 1. Verificar si la ruta existe
      const route = await db.query.routes.findFirst({
        where: eq(routes.id, routeId)
      });
      
      if (!route) {
        return res.status(404).json({ 
          success: false, 
          message: "Ruta no encontrada" 
        });
      }
      
      // 2. Verificar si todas las órdenes de la ruta están entregadas
      const routeOrders = await db.select()
        .from(orders)
        .where(eq(orders.routeId, routeId));
      
      console.log(`Verificando si todas las órdenes de la ruta #${routeId} están entregadas...`);
      console.log(`Total de órdenes: ${routeOrders.length}`);
      
      // Verificar si hay alguna orden sin entregar
      const pendingOrders = routeOrders.filter(order => {
        const status = (order.status || "").toLowerCase();
        return status !== "delivered" && 
               status !== "completed" && 
               !status.includes("deliver");
      });
      
      if (pendingOrders.length > 0) {
        console.log(`Se encontraron ${pendingOrders.length} órdenes pendientes`);
        return res.status(400).json({
          success: false,
          message: `No se puede completar la ruta. Hay ${pendingOrders.length} órdenes pendientes por entregar.`,
          pendingOrders: pendingOrders.map(order => order.id)
        });
      }
      
      // 3. Actualizar el estado de la ruta a "completed"
      await db.update(routes)
        .set({
          status: "completed",
          endTime: new Date().toISOString(),
          driverEndedAt: new Date().toISOString(),
          isCompleted: true
        })
        .where(eq(routes.id, routeId));
      
      // 4. También completar la carga de vehículo relacionada con esta ruta
      const relatedLoading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.routeId, routeId),
      });
      
      if (relatedLoading) {
        console.log(`Completando carga de vehículo #${relatedLoading.id} relacionada con la ruta`);
        
        await db.update(vehicleLoading)
          .set({
            status: "completed",
            completedAt: new Date().toISOString()
          })
          .where(eq(vehicleLoading.id, relatedLoading.id));
      }
      
      // 5. Obtener la ruta actualizada para devolver en la respuesta
      const updatedRoute = await db.query.routes.findFirst({
        where: eq(routes.id, routeId)
      });
      
      return res.status(200).json({
        success: true,
        message: "Ruta completada exitosamente",
        route: updatedRoute
      });
      
    } catch (error) {
      console.error("Error al completar la ruta:", error);
      return res.status(500).json({
        success: false,
        message: "Error al completar la ruta",
        error: String(error)
      });
    }
  });
}