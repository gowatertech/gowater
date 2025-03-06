import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { 
  users, customers, products, trucks, routes, orders, orderItems, settings,
  invoices, invoiceItems, 
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
  payments,
  insertPaymentSchema,
  insertInvoiceSchema, 
  insertInvoiceItemSchema, 
} from "@shared/schema";
import { calculateOptimalRoute, updateEstimatedDeliveryTimes } from "./services/routeOptimizer";
import { eq, desc } from 'drizzle-orm';
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

  // Zones
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

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db
        .select()
        .from(products);

      console.log("Retrieved products:", allProducts);
      res.json(allProducts);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  // Routes
  app.get("/api/routes", async (req, res) => {
    try {
      const allRoutes = await db
        .select()
        .from(routes);

      console.log("Retrieved routes:", allRoutes);
      res.json(allRoutes);
    } catch (error) {
      console.error("Error al obtener rutas:", error);
      res.status(500).json({ error: String(error) });
    }
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
      const [order] = await db
        .insert(orders)
        .values({
          ...result.data,
          date: new Date(result.data.date)
        })
        .returning();

      // Si el método de pago es efectivo, crear el pago automáticamente
      if (result.data.paymentMethod === "cash") {
        const paymentData = {
          orderId: order.id,
          customerId: result.data.customerId,
          amount: result.data.total,
          paymentMethod: "cash",
          date: new Date(),
        };

        const paymentResult = insertPaymentSchema.safeParse(paymentData);
        if (paymentResult.success) {
          await db
            .insert(payments)
            .values(paymentResult.data)
            .returning();
        }
      }

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

  // Order Items
  app.post("/api/orders/:orderId/items", async (req, res) => {
    console.log("Creando item para pedido:", req.params.orderId, "datos:", req.body);
    try {
      const result = insertOrderItemSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Error de validación:", result.error.format());
        return res.status(400).json({ error: result.error });
      }

      const [item] = await db
        .insert(orderItems)
        .values(result.data)
        .returning();

      console.log("Item creado:", item);
      res.json(item);
    } catch (error) {
      console.error("Error al crear item del pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Payments endpoint
  app.get("/api/payments", async (req, res) => {
    try {
      const allPayments = await db
        .select({
          id: payments.id,
          orderId: payments.orderId,
          customerId: payments.customerId,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          date: payments.date,
          reference: payments.reference,
          notes: payments.notes,
          customerName: customers.name,
        })
        .from(payments)
        .leftJoin(customers, eq(payments.customerId, customers.id))
        .orderBy(desc(payments.date));

      res.json(allPayments);
    } catch (error) {
      console.error("Error al obtener pagos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas para facturas
  app.get("/api/invoices", async (req, res) => {
    try {
      const allInvoices = await db
        .select()
        .from(invoices)
        .orderBy(desc(invoices.date));

      res.json(allInvoices);
    } catch (error) {
      console.error("Error al obtener facturas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    console.log("Recibido POST /api/invoices:", req.body);
    const result = insertInvoiceSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Error de validación:", result.error.format());
      return res.status(400).json({ error: result.error });
    }
    try {
      const [invoice] = await db
        .insert(invoices)
        .values(result.data)
        .returning();

      res.json(invoice);
    } catch (error) {
      console.error("Error al crear factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar factura (para cambiar método de pago)
  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const [invoice] = await db
        .update(invoices)
        .set({
          paymentMethod: req.body.paymentMethod,
          status: req.body.status,
          notes: req.body.notes,
        })
        .where(eq(invoices.id, parseInt(req.params.id)))
        .returning();

      res.json(invoice);
    } catch (error) {
      console.error("Error al actualizar factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas para items de factura
  app.get("/api/invoices/:invoiceId/items", async (req, res) => {
    try {
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, parseInt(req.params.invoiceId)));

      res.json(items);
    } catch (error) {
      console.error("Error al obtener items de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/invoices/:invoiceId/items", async (req, res) => {
    console.log("Creando item para factura:", req.params.invoiceId, "datos:", req.body);
    try {
      const result = insertInvoiceItemSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Error de validación:", result.error.format());
        return res.status(400).json({ error: result.error });
      }

      const [item] = await db
        .insert(invoiceItems)
        .values(result.data)
        .returning();

      // Actualizar el total de la factura
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, parseInt(req.params.invoiceId)));

      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total.toString()), 0);
      const total = (subtotal * 1.18).toFixed(2); // Incluye 18% de ITBIS

      await db
        .update(invoices)
        .set({ total })
        .where(eq(invoices.id, parseInt(req.params.invoiceId)));

      res.json(item);
    } catch (error) {
      console.error("Error al crear item de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas para items de factura
  app.patch("/api/invoices/:invoiceId/items/:itemId", async (req, res) => {
    try {
      const [item] = await db
        .update(invoiceItems)
        .set({
          quantity: req.body.quantity,
          price: req.body.price,
          total: req.body.total,
        })
        .where(eq(invoiceItems.id, parseInt(req.params.itemId)))
        .returning();

      // Actualizar el total de la factura
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, parseInt(req.params.invoiceId)));

      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total.toString()), 0);
      const total = (subtotal * 1.18).toFixed(2); // Incluye 18% de ITBIS

      await db
        .update(invoices)
        .set({ total })
        .where(eq(invoices.id, parseInt(req.params.invoiceId)));

      res.json(item);
    } catch (error) {
      console.error("Error al actualizar item de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return httpServer;
}