import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { zones, rutas, users, insertZoneSchema, insertRutaSchema } from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';

// Almacenar las conexiones activas de los conductores
const driverConnections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Configurar WebSocket Server
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

  // Zonas
  app.get("/api/zones", async (req, res) => {
    try {
      const allZones = await db
        .select()
        .from(zones);

      console.log("Retrieved zones:", allZones);
      res.json(allZones);
    } catch (error) {
      console.error("Error al obtener zonas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/zones", async (req, res) => {
    console.log("Creating zone with data:", req.body);

    const result = insertZoneSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Error de validación:", result.error.format());
      return res.status(400).json({ error: result.error.format() });
    }

    try {
      // Validar el formato de las coordenadas antes de insertar
      const coordinates = result.data.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 3) {
        throw new Error("Se requieren al menos 3 puntos para crear una zona");
      }

      // Validar el formato de cada coordenada
      for (const coord of coordinates) {
        if (!/^-?\d+\.\d+,-?\d+\.\d+$/.test(coord)) {
          throw new Error(`Formato de coordenada inválido: ${coord}`);
        }
      }

      const [zone] = await db
        .insert(zones)
        .values(result.data)
        .returning();

      console.log("Created zone:", zone);
      res.json(zone);
    } catch (error) {
      console.error("Error al crear zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/zones/:id", async (req, res) => {
    try {
      const [deletedZone] = await db
        .delete(zones)
        .where(eq(zones.id, parseInt(req.params.id)))
        .returning();

      if (!deletedZone) {
        return res.status(404).json({ error: "Zona no encontrada" });
      }

      console.log("Deleted zone:", deletedZone);
      res.json(deletedZone);
    } catch (error) {
      console.error("Error al eliminar zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      // Si se especifica un rol, filtrar por ese rol
      const role = req.query.role as string;
      let usersList;

      if (role) {
        usersList = await db
          .select()
          .from(users)
          .where(eq(users.role, role));
      } else {
        usersList = await db
          .select()
          .from(users);
      }

      res.json(usersList);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas
  app.get("/api/rutas", async (req, res) => {
    try {
      const todasLasRutas = await db
        .select()
        .from(rutas);

      console.log("Rutas recuperadas:", todasLasRutas);
      res.json(todasLasRutas);
    } catch (error) {
      console.error("Error al obtener rutas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/rutas", async (req, res) => {
    console.log("Creando ruta con datos:", req.body);

    try {
      const datosRuta = {
        ...req.body,
        fecha: new Date(req.body.fecha),
        conductorId: Number(req.body.conductorId),
        camionId: 1,
        estado: "pendiente",
        completada: false
      };

      console.log("Datos procesados de la ruta:", datosRuta);

      const result = insertRutaSchema.safeParse(datosRuta);

      if (!result.success) {
        console.error("Error de validación:", result.error.format());
        return res.status(400).json({ error: result.error.format() });
      }

      const [ruta] = await db
        .insert(rutas)
        .values(result.data)
        .returning();

      console.log("Ruta creada:", ruta);
      res.json(ruta);
    } catch (error) {
      console.error("Error al crear ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return httpServer;
}