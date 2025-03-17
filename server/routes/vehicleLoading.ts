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

  // Create new vehicle loading with items
  app.post("/api/vehicle-loading", async (req: Request, res: Response) => {
    try {
      // Insert vehicle loading first
      const [loading] = await db.insert(vehicleLoading).values({
        truckId: req.body.truckId,
        driverId: req.body.driverId,
        assistantId: req.body.assistantId,
        status: "pending",
        initialCash: req.body.initialCash,
        notes: req.body.notes,
        date: new Date(),
        createdAt: new Date(),
      }).returning();

      console.log("Created loading:", loading);

      // Insert all items
      if (req.body.items && req.body.items.length > 0) {
        const itemsToInsert = req.body.items.map((item: any) => ({
          loadingId: loading.id,
          productId: item.productId,
          quantity: item.quantity,
          returnedQuantity: 0,
          notes: item.notes,
        }));

        const items = await db.insert(vehicleLoadingItems).values(itemsToInsert).returning();
        console.log("Created items:", items);
      }

      // Get complete loading with relations
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
        }
      });

      res.status(201).json(completeLoading);
    } catch (error) {
      console.error("Error creating vehicle loading:", error);
      res.status(500).json({ error: "Error al crear la carga" });
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