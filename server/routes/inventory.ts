import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { 
  insertInventoryMovementSchema, 
  insertInventoryAdjustmentSchema,
  insertStockAlertSchema,
  products
} from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";

export async function registerInventoryRoutes(app: Express) {
  // Rutas para movimientos de inventario
  app.get("/api/inventory/movements", async (req: Request, res: Response) => {
    try {
      const productId = req.query.productId ? Number(req.query.productId) : undefined;
      const movementType = req.query.type as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const movements = await storage.listInventoryMovements(
        productId,
        movementType,
        startDate,
        endDate
      );
      res.json(movements);
    } catch (error) {
      console.error("Error al obtener movimientos de inventario:", error);
      res.status(500).json({ error: "Error al obtener movimientos de inventario" });
    }
  });

  app.get("/api/inventory/movements/product/:id", async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);
      const movements = await storage.getProductInventoryHistory(productId);
      res.json(movements);
    } catch (error) {
      console.error("Error al obtener historial de producto:", error);
      res.status(500).json({ error: "Error al obtener historial de inventario del producto" });
    }
  });

  app.post("/api/inventory/movements", async (req: Request, res: Response) => {
    try {
      const movementData = insertInventoryMovementSchema.parse(req.body);
      
      // Si es una entrada o salida directa, actualizar el stock del producto
      const productId = movementData.productId;
      const [product] = await db.select().from(products).where(eq(products.id, productId));
      
      if (!product) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      
      // Completar información del movimiento
      const previousStock = product.stock;
      const newStock = previousStock + movementData.quantity;
      
      const movement = {
        ...movementData,
        previousStock,
        newStock,
        createdBy: req.body.user?.id || null,
        createdAt: new Date()
      };
      
      const newMovement = await storage.createInventoryMovement(movement);
      
      // Actualizar el stock del producto
      if (movementData.movementType === "purchase" || 
          movementData.movementType === "return" || 
          movementData.movementType === "adjustment") {
        await storage.updateProductStock(productId, movementData.quantity);
      }
      
      res.status(201).json(newMovement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error al crear movimiento de inventario:", error);
        res.status(500).json({ error: "Error al crear movimiento de inventario" });
      }
    }
  });

  // Rutas para ajustes de inventario
  app.get("/api/inventory/adjustments", async (_req: Request, res: Response) => {
    try {
      const adjustments = await storage.listInventoryAdjustments();
      res.json(adjustments);
    } catch (error) {
      console.error("Error al obtener ajustes de inventario:", error);
      res.status(500).json({ error: "Error al obtener ajustes de inventario" });
    }
  });

  app.get("/api/inventory/adjustments/:id", async (req: Request, res: Response) => {
    try {
      const adjustmentId = Number(req.params.id);
      const adjustment = await storage.getInventoryAdjustment(adjustmentId);
      
      if (!adjustment) {
        return res.status(404).json({ error: "Ajuste de inventario no encontrado" });
      }
      
      res.json(adjustment);
    } catch (error) {
      console.error("Error al obtener ajuste de inventario:", error);
      res.status(500).json({ error: "Error al obtener ajuste de inventario" });
    }
  });

  app.post("/api/inventory/adjustments", async (req: Request, res: Response) => {
    try {
      const adjustmentData = insertInventoryAdjustmentSchema.parse(req.body);
      
      // Asegurarse de que cada producto existe antes de crear el ajuste
      for (const item of adjustmentData.items) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        
        if (!product) {
          return res.status(404).json({ 
            error: `Producto con ID ${item.productId} no encontrado` 
          });
        }
      }
      
      // Creamos el ajuste sin el campo createdBy que no está en el schema
      const newAdjustment = await storage.createInventoryAdjustment(adjustmentData);
      
      res.status(201).json(newAdjustment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error al crear ajuste de inventario:", error);
        res.status(500).json({ error: "Error al crear ajuste de inventario" });
      }
    }
  });

  app.patch("/api/inventory/adjustments/:id/status", async (req: Request, res: Response) => {
    try {
      const adjustmentId = Number(req.params.id);
      const { status } = req.body;
      
      if (!status || !["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Estado no válido" });
      }
      
      const updatedAdjustment = await storage.updateInventoryAdjustmentStatus(
        adjustmentId,
        status as "pending" | "approved" | "rejected",
        req.body.user?.id
      );
      
      res.json(updatedAdjustment);
    } catch (error) {
      console.error("Error al actualizar estado de ajuste:", error);
      res.status(500).json({ error: "Error al actualizar estado de ajuste" });
    }
  });

  // Rutas para alertas de stock bajo
  app.get("/api/inventory/stock-alerts", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as "active" | "resolved" | "ignored" | undefined;
      const alerts = await storage.listStockAlerts(status);
      res.json(alerts);
    } catch (error) {
      console.error("Error al obtener alertas de stock:", error);
      res.status(500).json({ error: "Error al obtener alertas de stock" });
    }
  });

  app.post("/api/inventory/stock-alerts", async (req: Request, res: Response) => {
    try {
      const alertData = insertStockAlertSchema.parse(req.body);
      const newAlert = await storage.createStockAlert(alertData);
      res.status(201).json(newAlert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error al crear alerta de stock:", error);
        res.status(500).json({ error: "Error al crear alerta de stock" });
      }
    }
  });

  app.patch("/api/inventory/stock-alerts/:id/status", async (req: Request, res: Response) => {
    try {
      const alertId = Number(req.params.id);
      const { status } = req.body;
      
      if (!status || !["active", "resolved", "ignored"].includes(status)) {
        return res.status(400).json({ error: "Estado no válido" });
      }
      
      const updatedAlert = await storage.updateStockAlertStatus(
        alertId,
        status as "active" | "resolved" | "ignored",
        req.body.user?.id
      );
      
      res.json(updatedAlert);
    } catch (error) {
      console.error("Error al actualizar estado de alerta:", error);
      res.status(500).json({ error: "Error al actualizar estado de alerta" });
    }
  });

  app.post("/api/inventory/check-low-stock", async (_req: Request, res: Response) => {
    try {
      const newAlerts = await storage.checkAndCreateLowStockAlerts();
      res.json(newAlerts);
    } catch (error) {
      console.error("Error al verificar stock bajo:", error);
      res.status(500).json({ error: "Error al verificar stock bajo" });
    }
  });
}