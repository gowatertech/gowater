import { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { zones, rutas, users } from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';
import { calculateOptimalRoute, updateEstimatedDeliveryTimes } from './services/routeOptimizer';

// Almacenar las conexiones activas de los conductores
const driverConnections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Configurar WebSocket Server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/backend-ws'
  });

  wss.on('connection', (ws, req) => {
    console.log('Nueva conexión WebSocket desde:', req.socket.remoteAddress);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensaje WebSocket recibido:', data);

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
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error procesando el mensaje'
        }));
      }
    });

    ws.on('error', (error) => {
      console.error('Error en la conexión WebSocket:', error);
    });

    ws.on('close', () => {
      console.log('Conexión WebSocket cerrada');
      // Eliminar la conexión cuando se cierra
      driverConnections.forEach((connection, driverId) => {
        if (connection === ws) {
          console.log('Eliminando conexión del conductor:', driverId);
          driverConnections.delete(driverId);
        }
      });
    });
  });

  // Usuarios
  app.get("/api/usuarios", async (req, res) => {
    try {
      const role = req.query.role as string;
      let listaUsuarios;

      if (role) {
        listaUsuarios = await db
          .select()
          .from(users)
          .where(eq(users.role, role));
      } else {
        listaUsuarios = await db
          .select()
          .from(users);
      }

      res.json(listaUsuarios);
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

  // Obtener ubicación actual de una ruta
  app.get("/api/rutas/:id/ubicacion", async (req, res) => {
    try {
      const ruta = await storage.getRuta(parseInt(req.params.id));
      if (!ruta) {
        return res.status(404).json({ error: "Ruta no encontrada" });
      }

      res.json({
        ubicacionActual: ruta.ubicacionActual,
        ultimaActualizacion: ruta.ultimaActualizacion
      });
    } catch (error) {
      console.error("Error al obtener ubicación de ruta:", error);
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

      const [ruta] = await db
        .insert(rutas)
        .values(datosRuta)
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