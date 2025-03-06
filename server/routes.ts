import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertCustomerSchema,
  insertProductSchema,
  insertTruckSchema,
  insertRouteSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertSettingsSchema,
  insertCustomerOrdersSchema,
  insertZoneSchema,
  zones,
  customers,
  orderItems,
  products,
  orders
} from "@shared/schema";
import { calculateOptimalRoute, updateEstimatedDeliveryTimes } from "./services/routeOptimizer";
import { eq } from 'drizzle-orm';
import { db } from './db';

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

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.listUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ... (resto de rutas de usuarios)

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const allCustomers = await db
        .select()
        .from(customers);

      console.log("Retrieved customers:", allCustomers);
      res.json(allCustomers);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/customers", async (req, res) => {
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    try {
      const [customer] = await db
        .insert(customers)
        .values(result.data)
        .returning();
      res.json(customer);
    } catch (error) {
      console.error("Error al crear cliente:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const allOrders = await db
        .select()
        .from(orders);

      console.log("Retrieved orders:", allOrders);
      res.json(allOrders);
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/orders", async (req, res) => {
    console.log("Recibido POST /api/orders:", req.body);
    const result = insertOrderSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Error de validación:", result.error.format());
      return res.status(400).json({ error: result.error });
    }
    try {
      const order = await storage.createOrder(result.data);
      res.json(order);
    } catch (error) {
      console.error("Error al crear orden:", error);
      res.status(500).json({ message: "Error al crear la orden", error: String(error) });
    }
  });


  // Order Items
  app.get("/api/orders/:orderId/items", async (req, res) => {
    try {
      const items = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          productName: products.name
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, parseInt(req.params.orderId)));

      console.log("Retrieved order items for order", req.params.orderId, ":", items);
      res.json(items);
    } catch (error) {
      console.error("Error al obtener items del pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ... (resto de rutas)

  return httpServer;
}