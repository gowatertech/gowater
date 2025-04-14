import { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { vehicleLoading, vehicleLoadingItems, products } from "@shared/schema";

export async function registerVehicleLoadingRoutes(app: Express) {
  // Endpoint para completar una carga (marcarla como completada)
  app.post("/api/vehicle-loading/:id/complete", async (req: Request, res: Response) => {
    try {
      const loadingId = parseInt(req.params.id);
      
      if (!loadingId || isNaN(loadingId)) {
        return res.status(400).json({ error: 'ID de carga inválido' });
      }
      
      // Verificar si la carga existe
      const loading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, loadingId)
      });
      
      if (!loading) {
        return res.status(404).json({ error: 'Carga no encontrada' });
      }
      
      // Actualizar el estado de la carga a "completed"
      await db
        .update(vehicleLoading)
        .set({
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(vehicleLoading.id, loadingId));
      
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

      // Verificar si la carga existe
      const loading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, loadingId)
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
      
      // Actualizar la carga con el ID de la ruta
      const [updatedLoading] = await db.update(vehicleLoading)
        .set({ routeId: Number(routeId) })
        .where(eq(vehicleLoading.id, loadingId))
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
      
      // Verificar si la carga existe
      const loading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, loadingId)
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
      
      // Primero eliminar los items de la carga
      await db.delete(vehicleLoadingItems).where(eq(vehicleLoadingItems.loadingId, loadingId));
      
      // Luego eliminar la carga
      await db.delete(vehicleLoading).where(eq(vehicleLoading.id, loadingId));
      
      res.status(200).json({ success: true, message: "Carga eliminada correctamente" });
    } catch (error) {
      console.error("Error deleting vehicle loading:", error);
      res.status(500).json({ error: "Error al eliminar la carga" });
    }
  });
  // Get all vehicle loadings
  app.get("/api/vehicle-loading", async (_req: Request, res: Response) => {
    try {
      const loadings = await db.query.vehicleLoading.findMany({
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
      const loadings = await db.query.vehicleLoading.findMany({
        where: eq(vehicleLoading.status, "pending"),
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
      const loading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, parseInt(req.params.id)),
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
      const [loading] = await db.insert(vehicleLoading).values({
        date: new Date(),
        truckId: req.body.truckId,
        driverId: req.body.driverId,
        assistantId: req.body.assistantId,
        status: "pending",
        initialCash: req.body.initialCash,
        notes: req.body.notes,
        createdAt: new Date(),
      }).returning();

      if (req.body.items && req.body.items.length > 0) {
        const itemsToInsert = req.body.items.map((item: any) => ({
          loadingId: loading.id,
          productId: item.productId,
          quantity: item.quantity,
          returnedQuantity: 0,
          notes: item.notes,
        }));

        await db.insert(vehicleLoadingItems).values(itemsToInsert).returning();
      }

      const completeLoading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, loading.id),
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