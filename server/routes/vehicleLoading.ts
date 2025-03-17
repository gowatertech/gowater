import { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { vehicleLoading, vehicleLoadingItems, products } from "@shared/schema";

export async function registerVehicleLoadingRoutes(app: Express) {
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
        },
        orderBy: (vehicleLoading, { desc }) => [desc(vehicleLoading.date)]
      });

      // Debug log
      console.log("Loadings with items:", JSON.stringify(loadings, null, 2));
      res.json(loadings);
    } catch (error) {
      console.error("Error fetching vehicle loadings:", error);
      res.status(500).json({ error: "Error al obtener las cargas" });
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

      // Debug log
      console.log("Loading details:", JSON.stringify(loading, null, 2));
      res.json(loading);
    } catch (error) {
      console.error("Error fetching vehicle loading:", error);
      res.status(500).json({ error: "Error al obtener la carga" });
    }
  });
}