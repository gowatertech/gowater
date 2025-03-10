import type { Express } from "express";
import { createServer } from "http";
import express from 'express';
import { db } from './db';
import { products, trucks, insertTruckSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Configurar express
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Products endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db
        .select()
        .from(products)
        .orderBy(products.name);
      res.json(allProducts);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Trucks endpoints
  app.get("/api/trucks", async (req, res) => {
    try {
      const allTrucks = await db
        .select()
        .from(trucks)
        .orderBy(trucks.plate);
      res.json(allTrucks);
    } catch (error) {
      console.error("Error al obtener vehículos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/trucks", async (req, res) => {
    try {
      console.log("POST /api/trucks - Received data:", req.body);

      // Convert the year and capacity to numbers explicitly
      const truckData = {
        brand: String(req.body.brand || '').trim(),
        model: String(req.body.model || '').trim(),
        year: Number(req.body.year),
        plate: String(req.body.plate || '').trim().toUpperCase(),
        capacity: Number(req.body.capacity),
        status: req.body.status || 'available'
      };

      console.log("POST /api/trucks - Processed data:", truckData);

      const result = insertTruckSchema.safeParse(truckData);

      if (!result.success) {
        console.error("POST /api/trucks - Validation error:", result.error.format());
        return res.status(400).json({ 
          error: "Error de validación",
          details: result.error.format()
        });
      }

      const [truck] = await db
        .insert(trucks)
        .values(result.data)
        .returning();

      console.log("POST /api/trucks - Created truck:", truck);
      res.json(truck);
    } catch (error) {
      console.error("Error al crear vehículo:", error);
      res.status(500).json({ 
        error: "Error al crear el vehículo",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return createServer(app);
}