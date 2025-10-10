/**
 * Endpoint para iniciar una ruta (marcarla como "in_progress")
 * Este endpoint verifica que un conductor no tenga múltiples rutas activas
 */

import { Express, Request, Response } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../db";
import { getCurrentCompanyId } from "../../company-db";
import { routes, orders } from "../../../shared/schema";

/**
 * Registra el endpoint para iniciar una ruta (marcarla como "in_progress")
 * Con validación para evitar que un conductor tenga múltiples rutas activas
 */
export function registerStartRouteEndpoint(app: Express) {
  app.post("/routes/:id/start", async (req: Request, res: Response) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (isNaN(routeId)) {
        return res.status(400).json({ 
          success: false, 
          message: "ID de ruta inválido" 
        });
      }
      
      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No se pudo determinar el contexto de la empresa"
        });
      }
      
      console.log(`POST /api/routes/${routeId}/start - Iniciando ruta para compañía ${companyId}...`);
      
      // Obtener la ruta que se quiere iniciar (filtrada por compañía)
      const [route] = await db
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.id, routeId),
            eq(routes.companyId, companyId)
          )
        );
      
      if (!route) {
        return res.status(404).json({ 
          success: false, 
          message: "Ruta no encontrada" 
        });
      }
      
      // Verificar que la ruta no esté completada
      if (route.status === "completed") {
        return res.status(400).json({ 
          success: false, 
          message: "No se puede iniciar una ruta que ya está completada" 
        });
      }
      
      // Verificar si el conductor ya tiene otra ruta activa
      const driverId = route.driverId;
      
      if (!driverId) {
        return res.status(400).json({ 
          success: false, 
          message: "La ruta no tiene conductor asignado" 
        });
      }
      
      const activeRoutes = await db
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.driverId, driverId),
            eq(routes.status, "in_progress"),
            eq(routes.companyId, companyId),
            // Excluir la ruta actual
            ne(routes.id, routeId)
          )
        );
      
      console.log(`Verificación de conductor ${driverId}: ${activeRoutes.length} rutas activas encontradas`);
      
      // Si el conductor ya tiene una ruta activa, no permitir iniciar otra
      if (activeRoutes.length > 0) {
        const activeRouteId = activeRoutes[0].id;
        console.log(`El conductor ${driverId} ya tiene la ruta #${activeRouteId} activa. No puede iniciar otra.`);
        
        return res.status(400).json({
          success: false,
          message: "Ya tienes una ruta activa. Debes completar o cancelar la ruta actual antes de iniciar una nueva.",
          activeRouteId: activeRouteId
        });
      }
      
      // Si pasa las validaciones, marcar la ruta como en progreso
      const [updatedRoute] = await db
        .update(routes)
        .set({ status: "in_progress" })
        .where(
          and(
            eq(routes.id, routeId),
            eq(routes.companyId, companyId)
          )
        )
        .returning();
      
      // Actualizar también los pedidos asociados a la ruta (filtrados por compañía)
      await db
        .update(orders)
        .set({ status: "in_transit" })
        .where(
          and(
            eq(orders.routeId, routeId),
            eq(orders.companyId, companyId)
          )
        );
      
      console.log(`Ruta #${routeId} iniciada exitosamente`);
      
      // Responder que todo fue exitoso
      const response = {
        success: true,
        route: updatedRoute
      };
      console.log(`Enviando respuesta:`, JSON.stringify(response));
      res.json(response);
    } catch (error) {
      console.error("Error al iniciar ruta:", error);
      res.status(500).json({ 
        success: false,
        message: "Error interno al iniciar la ruta"
      });
    }
  });
}