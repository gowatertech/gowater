import { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { vehicleLoading, vehicleLoadingItems } from "@shared/schema";

export async function registerRouteSettlements(app: Express) {
  // Crear nuevo cuadre de vehículo
  app.post("/api/route-settlements", async (req: Request, res: Response) => {
    try {
      const { vehicleLoadingId, totalCashReceived, totalCreditReceived, totalInvoiced, notes, items, cashDifference } = req.body;

      // Validar datos básicos
      if (!vehicleLoadingId || !totalCashReceived || !totalCreditReceived || !totalInvoiced || !items || !Array.isArray(items)) {
        return res.status(400).json({
          error: "Datos incompletos o inválidos",
          message: "Todos los campos requeridos deben ser proporcionados"
        });
      }

      // 1. Verificar que la carga exista y esté pendiente
      const loading = await db.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.id, vehicleLoadingId),
          eq(vehicleLoading.status, "pending")
        )
      });

      if (!loading) {
        return res.status(404).json({
          error: "Carga no encontrada",
          message: "La carga especificada no existe o ya ha sido completada"
        });
      }

      // 2. Actualizar estado de la carga a "completed"
      await db
        .update(vehicleLoading)
        .set({
          status: "completed",
          completedAt: new Date().toISOString()
        })
        .where(eq(vehicleLoading.id, vehicleLoadingId));

      // 3. Actualizar las cantidades devueltas de cada item
      for (const item of items) {
        await db
          .update(vehicleLoadingItems)
          .set({
            returnedQuantity: item.returnedQuantity
          })
          .where(and(
            eq(vehicleLoadingItems.loadingId, vehicleLoadingId),
            eq(vehicleLoadingItems.productId, item.productId)
          ));
      }

      // 4. Obtener la carga actualizada con todos sus items
      const updatedLoading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, vehicleLoadingId),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true
        }
      });

      // 5. Responder con la carga actualizada
      res.json({
        message: "Cuadre de vehículo completado exitosamente",
        loading: updatedLoading,
        settlement: {
          vehicleLoadingId,
          totalCashReceived,
          totalCreditReceived,
          totalInvoiced,
          cashDifference,
          notes,
          settlementDate: new Date().toISOString(),
          status: "completed"
        }
      });
    } catch (error) {
      console.error("Error al procesar cuadre de vehículo:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        message: String(error)
      });
    }
  });

  // Obtener cuadre de vehículo por ID de carga
  app.get("/api/route-settlements/:loadingId", async (req: Request, res: Response) => {
    try {
      const loadingId = parseInt(req.params.loadingId);
      
      // Obtener la carga con sus items
      const loading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, loadingId),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true
        }
      });

      if (!loading) {
        return res.status(404).json({
          error: "Carga no encontrada",
          message: "La carga especificada no existe"
        });
      }

      // Verificar si ya fue completada
      if (loading.status !== "completed") {
        return res.status(400).json({
          error: "Cuadre no disponible",
          message: "No hay un cuadre completado para esta carga"
        });
      }

      res.json({
        loading
      });
    } catch (error) {
      console.error("Error al obtener cuadre de vehículo:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        message: String(error)
      });
    }
  });
}