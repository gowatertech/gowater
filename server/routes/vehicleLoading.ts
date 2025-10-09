import { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { getCurrentCompanyId } from "../company-db";
import { vehicleLoading, vehicleLoadingItems, products } from "@shared/schema";

export async function registerVehicleLoadingRoutes(app: Express) {
  // Endpoint para completar una carga (marcarla como completada)
  app.post("/api/vehicle-loading/:id/complete", async (req: Request, res: Response) => {
    try {
      const loadingId = parseInt(req.params.id);
      
      if (!loadingId || isNaN(loadingId)) {
        return res.status(400).json({ error: 'ID de carga inválido' });
      }
      
      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
      }
      
      // Verificar si la carga existe (filtrada por compañía)
      const loading = await db.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.id, loadingId),
          eq(vehicleLoading.companyId, companyId)
        )
      });
      
      if (!loading) {
        return res.status(404).json({ error: 'Carga no encontrada' });
      }
      
      // Actualizar el estado de la carga a "completed" (filtrado por compañía)
      await db
        .update(vehicleLoading)
        .set({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
        .where(
          and(
            eq(vehicleLoading.id, loadingId),
            eq(vehicleLoading.companyId, companyId)
          )
        );
      
      console.log(`Carga #${loadingId} marcada como completada`);
      
      res.json({
        success: true,
        message: `Carga #${loadingId} marcada como completada exitosamente`
      });
    } catch (error) {
      console.error('Error al completar la carga:', error);
      res.status(500).json({ 
        error: 'Error al completar la carga',
        details: String(error)
      });
    }
  });
  // Asignar ruta a una carga
  app.patch("/api/vehicle-loading/:id/assign-route", async (req: Request, res: Response) => {
    try {
      const loadingId = parseInt(req.params.id);
      const { routeId } = req.body;
      
      if (!routeId || isNaN(Number(routeId))) {
        return res.status(400).json({ error: "ID de ruta inválido" });
      }

      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
      }

      // Verificar si la carga existe (filtrada por compañía)
      const loading = await db.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.id, loadingId),
          eq(vehicleLoading.companyId, companyId)
        )
      });
      
      if (!loading) {
        return res.status(404).json({ error: "Carga no encontrada" });
      }
      
      // Solo permitir asignar rutas a cargas en estado "pending"
      if (loading.status !== "pending") {
        return res.status(400).json({ 
          error: "Solo se pueden asignar rutas a cargas en estado pendiente",
          status: loading.status
        });
      }
      
      // Actualizar la carga con el ID de la ruta (filtrado por compañía)
      const [updatedLoading] = await db.update(vehicleLoading)
        .set({ routeId: Number(routeId) })
        .where(
          and(
            eq(vehicleLoading.id, loadingId),
            eq(vehicleLoading.companyId, companyId)
          )
        )
        .returning();
      
      res.status(200).json(updatedLoading);
    } catch (error) {
      console.error("Error asignando ruta a la carga:", error);
      res.status(500).json({ error: "Error al asignar ruta a la carga" });
    }
  });
  // Delete vehicle loading and its items
  app.delete("/api/vehicle-loading/:id", async (req: Request, res: Response) => {
    try {
      const loadingId = parseInt(req.params.id);
      
      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
      }
      
      // Verificar si la carga existe (filtrada por compañía)
      const loading = await db.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.id, loadingId),
          eq(vehicleLoading.companyId, companyId)
        )
      });
      
      if (!loading) {
        return res.status(404).json({ error: "Carga no encontrada" });
      }
      
      // Solo permitir eliminar cargas en estado "pending"
      if (loading.status !== "pending") {
        return res.status(400).json({ 
          error: "Solo se pueden eliminar cargas en estado pendiente",
          status: loading.status
        });
      }
      
      // No permitir eliminar cargas con ruta asignada
      if (loading.routeId) {
        return res.status(400).json({ 
          error: "No se puede eliminar esta carga porque tiene una ruta asignada",
          routeId: loading.routeId
        });
      }
      
      // Primero eliminar los items de la carga (filtrados por compañía a través de la carga)
      await db.delete(vehicleLoadingItems).where(eq(vehicleLoadingItems.loadingId, loadingId));
      
      // Luego eliminar la carga (filtrada por compañía)
      await db.delete(vehicleLoading).where(
        and(
          eq(vehicleLoading.id, loadingId),
          eq(vehicleLoading.companyId, companyId)
        )
      );
      
      res.status(200).json({ success: true, message: "Carga eliminada correctamente" });
    } catch (error) {
      console.error("Error deleting vehicle loading:", error);
      res.status(500).json({ error: "Error al eliminar la carga" });
    }
  });
  // Get all vehicle loadings
  app.get("/api/vehicle-loading", async (_req: Request, res: Response) => {
    try {
      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
      }
      
      const loadings = await db.query.vehicleLoading.findMany({
        where: eq(vehicleLoading.companyId, companyId),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true,
          route: true,
        },
        orderBy: (vehicleLoading, { desc }) => [desc(vehicleLoading.date)]
      });

      res.json(loadings);
    } catch (error) {
      console.error("Error fetching vehicle loadings:", error);
      res.status(500).json({ error: "Error al obtener las cargas" });
    }
  });

  // Get pending vehicle loadings
  app.get("/api/vehicle-loading/pending", async (_req: Request, res: Response) => {
    try {
      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
      }
      
      const loadings = await db.query.vehicleLoading.findMany({
        where: and(
          eq(vehicleLoading.status, "pending"),
          eq(vehicleLoading.companyId, companyId)
        ),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true,
          route: true,
        },
        orderBy: (vehicleLoading, { desc }) => [desc(vehicleLoading.date)]
      });

      res.json(loadings);
    } catch (error) {
      console.error("Error fetching pending loadings:", error);
      res.status(500).json({ error: "Error al obtener cargas pendientes" });
    }
  });

  // Get specific vehicle loading with items
  app.get("/api/vehicle-loading/:id", async (req: Request, res: Response) => {
    try {
      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
      }
      
      const loading = await db.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.id, parseInt(req.params.id)),
          eq(vehicleLoading.companyId, companyId)
        ),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true,
          route: true,
        }
      });

      if (!loading) {
        return res.status(404).json({ error: "Carga no encontrada" });
      }

      res.json(loading);
    } catch (error) {
      console.error("Error fetching vehicle loading:", error);
      res.status(500).json({ error: "Error al obtener la carga" });
    }
  });

  // Create new vehicle loading with items
  app.post("/api/vehicle-loading", async (req: Request, res: Response) => {
    try {
      // Get company ID from context for multi-tenant security
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
      }
      
      // Validar y verificar los campos antes de crear la carga
      console.log("POST /api/vehicle-loading - Body recibido:", req.body);

      // Validar y convertir los IDs numéricos
      const truckId = Number(req.body.truckId);
      const driverId = Number(req.body.driverId);
      
      if (isNaN(truckId) || truckId <= 0) {
        return res.status(400).json({ error: "ID de camión inválido" });
      }
      
      if (isNaN(driverId) || driverId <= 0) {
        return res.status(400).json({ error: "ID de conductor inválido" });
      }
      
      const assistantId = req.body.assistantId ? Number(req.body.assistantId) : null;
      if (assistantId !== null && (isNaN(assistantId) || assistantId <= 0)) {
        return res.status(400).json({ error: "ID de asistente inválido" });
      }
      
      const routeId = req.body.routeId !== undefined && req.body.routeId !== null 
        ? Number(req.body.routeId) 
        : null;
      
      if (routeId !== null && (isNaN(routeId) || routeId <= 0)) {
        return res.status(400).json({ error: "ID de ruta inválido" });
      }
      
      console.log(`IDs validados - truck: ${truckId}, driver: ${driverId}, assistant: ${assistantId}, route: ${routeId}, companyId: ${companyId}`);
      
      const [loading] = await db.insert(vehicleLoading).values({
        truckId,
        driverId,
        assistantId,
        routeId,
        companyId,
        status: "pending",
        initialCash: req.body.initialCash,
        notes: req.body.notes,
      }).returning();

      console.log(`Carga creada con ID: ${loading.id}, routeId: ${loading.routeId}, companyId: ${companyId}`);

      if (req.body.items && req.body.items.length > 0) {
        const itemsToInsert = req.body.items.map((item: any) => ({
          loadingId: loading.id,
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          returnedQuantity: 0,
          notes: item.notes,
        }));

        await db.insert(vehicleLoadingItems).values(itemsToInsert).returning();
        console.log(`Insertados ${itemsToInsert.length} productos en la carga ${loading.id}`);
      }

      const completeLoading = await db.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.id, loading.id),
          eq(vehicleLoading.companyId, companyId)
        ),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true,
          route: true,
        }
      });

      res.status(201).json(completeLoading);
    } catch (error) {
      console.error("Error creating vehicle loading:", error);
      res.status(500).json({ error: "Error al crear la carga" });
    }
  });
}