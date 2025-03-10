import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { storage } from "./storage";
import { trucks, insertTruckSchema, products } from "@shared/schema";
import { db } from './db';
import { eq, and, sql } from 'drizzle-orm';
import express from 'express';

// Configurar multer para manejar la carga de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express) {
  // Configurar express primero
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
      console.log("GET /api/trucks - Obteniendo lista de vehículos");
      const allTrucks = await db
        .select()
        .from(trucks)
        .orderBy(trucks.plate);

      console.log("GET /api/trucks - Vehículos encontrados:", allTrucks.length);
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

  // Configurar WebSocket después de las rutas API
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  wss.on('connection', (ws) => {
    console.log('Nueva conexión WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'driver_location') {
          // Almacenar la conexión del conductor
          driverConnections.set(data.driverId, ws);

          // Actualizar ubicación en la base de datos
          await storage.updateDriverLocation(data.driverId, {
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date()
          });

          // Broadcast a todos los clientes conectados
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'location_update',
                driverId: data.driverId,
                location: {
                  latitude: data.latitude,
                  longitude: data.longitude,
                  timestamp: new Date()
                }
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error procesando mensaje WebSocket:', error);
      }
    });

    ws.on('close', () => {
      // Eliminar la conexión cuando se cierra
      driverConnections.forEach((connection, driverId) => {
        if (connection === ws) {
          driverConnections.delete(driverId);
        }
      });
    });
  });

  return httpServer;
}

const driverConnections = new Map<number, WebSocket>();