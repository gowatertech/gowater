import { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { routeSettlements, routeSettlementItems, insertRouteSettlementSchema } from "@shared/schema";

export async function registerRouteSettlements(app: Express) {
  // Crear nuevo cuadre de ruta
  app.post("/api/route-settlements", async (req: Request, res: Response) => {
    try {
      const result = insertRouteSettlementSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: "Error de validación",
          details: result.error.format()
        });
      }

      // Crear el registro principal
      const [settlement] = await db
        .insert(routeSettlements)
        .values({
          vehicleLoadingId: result.data.vehicleLoadingId,
          totalCashReceived: result.data.totalCashReceived,
          totalCreditReceived: result.data.totalCreditReceived,
          totalInvoiced: result.data.totalInvoiced,
          cashDifference: (
            Number(result.data.totalCashReceived) + 
            Number(result.data.totalCreditReceived) - 
            Number(result.data.totalInvoiced)
          ).toFixed(2),
          notes: result.data.notes,
        })
        .returning();

      // Crear los items
      if (result.data.items?.length) {
        await db
          .insert(routeSettlementItems)
          .values(
            result.data.items.map(item => ({
              settlementId: settlement.id,
              ...item,
              difference: 
                item.loadedQuantity - 
                (item.returnedQuantity + item.soldQuantity)
            }))
          );
      }

      res.json(settlement);
    } catch (error) {
      console.error("Error al crear cuadre de ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Obtener cuadre de ruta por ID
  app.get("/api/route-settlements/:id", async (req: Request, res: Response) => {
    try {
      const settlement = await db.query.routeSettlements.findFirst({
        where: eq(routeSettlements.id, parseInt(req.params.id)),
        with: {
          items: {
            with: {
              product: true
            }
          },
          vehicleLoading: true
        }
      });

      if (!settlement) {
        return res.status(404).json({ error: "Cuadre de ruta no encontrado" });
      }

      res.json(settlement);
    } catch (error) {
      console.error("Error al obtener cuadre de ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });
}