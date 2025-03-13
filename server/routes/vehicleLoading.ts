import { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { vehicleLoading, vehicleLoadingItems } from "@shared/schema";

export async function registerVehicleLoadingRoutes(app: Express) {
  // Get pending vehicle loadings
  app.get("/api/vehicle-loading/pending", async (_req: Request, res: Response) => {
    try {
      const loadings = await db.query.vehicleLoading.findMany({
        where: eq(vehicleLoading.status, "pending"),
        with: {
          items: true,
          truck: true,
          driver: true,
        },
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
}
