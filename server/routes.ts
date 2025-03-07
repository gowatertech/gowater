import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { zones, insertZoneSchema } from "@shared/schema";
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

  app.post("/api/products", async (req, res) => {
    const result = insertProductSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Error de validación:", result.error.format());
      return res.status(400).json({ error: result.error });
    }
    try {
      const [product] = await db
        .insert(products)
        .values(result.data)
        .returning();

      console.log("Producto creado:", product);
      res.json(product);
    } catch (error) {
      console.error("Error al crear producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    const result = insertProductSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Error de validación:", result.error.format());
      return res.status(400).json({ error: result.error });
    }
    try {
      const [product] = await db
        .update(products)
        .set({
          name: result.data.name,
          price: result.data.price,
          stock: result.data.stock,
          icon: result.data.icon,
        })
        .where(eq(products.id, parseInt(req.params.id)))
        .returning();

      console.log("Producto actualizado:", product);
      res.json(product);
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const [product] = await db
        .delete(products)
        .where(eq(products.id, parseInt(req.params.id)))
        .returning();

      if (!product) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      console.log("Producto eliminado:", product);
      res.json(product);
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  // Production Batches
  app.get("/api/production-batches", async (req, res) => {
    try {
      const batches = await db
        .select({
          id: productionBatches.id,
          productId: productionBatches.productId,
          quantity: productionBatches.quantity,
          cost: productionBatches.cost,
          warehouse: productionBatches.warehouse,
          date: productionBatches.date,
          userId: productionBatches.userId,
          notes: productionBatches.notes,
          productName: products.name,
          userName: users.name,
        })
        .from(productionBatches)
        .leftJoin(products, eq(productionBatches.productId, products.id))
        .leftJoin(users, eq(productionBatches.userId, users.id))
        .orderBy(desc(productionBatches.date));

      res.json(batches);
    } catch (error) {
      console.error("Error al obtener lotes de producción:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/production-batches", async (req, res) => {
    const result = insertProductionBatchSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Error de validación:", result.error.format());
      return res.status(400).json({ error: result.error });
    }

    try {
      // Iniciar transacción para actualizar tanto el lote como el stock
      const [batch] = await db.transaction(async (tx) => {
        // Crear el lote
        const [newBatch] = await tx
          .insert(productionBatches)
          .values(result.data)
          .returning();

        // Actualizar el stock del producto
        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${result.data.quantity}`,
          })
          .where(eq(products.id, result.data.productId));

        return [newBatch];
      });

      console.log("Lote de producción creado:", batch);
      res.json(batch);
    } catch (error) {
      console.error("Error al crear lote de producción:", error);
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
          customerId: result.data.customerId, // Added customerId
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
          invoiceId: payments.invoiceId,
          customerId: payments.customerId,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          date: payments.date,
          reference: payments.reference,
          notes: payments.notes,
          customerName: customers.name,
          invoiceNumber: invoices.invoiceNumber
        })
        .from(payments)
        .leftJoin(customers, eq(payments.customerId, customers.id))
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .orderBy(desc(payments.date));

      console.log("Retrieved payments:", allPayments);
      res.json(allPayments);
    } catch (error) {
      console.error("Error al obtener pagos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar la ruta de pagos para validar montos
  app.post("/api/payments", async (req, res) => {
    try {
      console.log("Processing payment request:", req.body);

      // Obtener la factura primero para validar el monto
      const [invoice] = await db
        .select({
          id: invoices.id,
          total: invoices.total,
          totalPaid: sql<string>`COALESCE((
            SELECT SUM(CAST(${payments.amount} AS DECIMAL(10,2)))::TEXT
            FROM ${payments}
            WHERE ${payments.invoiceId} = ${invoices.id}
          ), '0.00')`
        })
        .from(invoices)
        .where(eq(invoices.id, req.body.invoiceId));

      if (!invoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      const totalInvoice = parseFloat(invoice.total);
      const totalPaid = parseFloat(invoice.totalPaid);
      const paymentAmount = parseFloat(req.body.amount);
      const pendingAmount = totalInvoice - totalPaid;

      console.log("Payment validation:", {
        totalInvoice,
        totalPaid,
        paymentAmount,
        pendingAmount
      });

      if (paymentAmount > pendingAmount) {
        return res.status(400).json({ 
          error: `El monto (${paymentAmount.toFixed(2)}) excede el saldo pendiente (${pendingAmount.toFixed(2)})` 
        });
      }

      const paymentData = {
        invoiceId: req.body.invoiceId,
        customerId: req.body.customerId,
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod || "cash",
        date: new Date(),
        reference: req.body.reference || "",
        notes: req.body.notes || `Pago de factura #${req.body.invoiceId}`
      };

      // Crear el pago
      const [payment] = await db
        .insert(payments)
        .values(paymentData)
        .returning();

      console.log("Payment created:", payment);

      // Verificar si con este pago la factura está completamente pagada
      const newTotalPaid = totalPaid + paymentAmount;
      if (newTotalPaid >= totalInvoice) {
        await db
          .update(invoices)
          .set({ status: "paid" })
          .where(eq(invoices.id, req.body.invoiceId));
        console.log("Invoice marked as paid");
      }

      res.json(payment);
    } catch (error) {
      console.error("Error al procesar pago:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas para facturas
  app.get("/api/invoices", async (req, res) => {
    try {
      const allInvoices = await db
        .select({
          id: invoices.id,
          customerId: invoices.customerId,
          customerName: customers.name,
          businessName: customers.businessName,
          total: invoices.total,
          status: invoices.status,
          paymentMethod: invoices.paymentMethod,
          date: invoices.date,
          notes: invoices.notes,
          totalPaid: sql<string>`COALESCE((
            SELECT SUM(CAST(${payments.amount} AS DECIMAL(10,2)))::TEXT
            FROM ${payments}
            WHERE ${payments.invoiceId} = ${invoices.id}
          ), '0.00')`,
          pendingAmount: sql<string>`(CAST(${invoices.total} AS DECIMAL(10,2)) - 
            COALESCE((
              SELECT SUM(CAST(${payments.amount} AS DECIMAL(10,2)))
              FROM ${payments}
              WHERE ${payments.invoiceId} = ${invoices.id}
            ), 0))::TEXT`,
          invoiceNumber: invoices.invoiceNumber
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .orderBy(desc(invoices.date));

      // Verificación detallada de totales para cada factura
      for (const invoice of allInvoices) {
        // Convertir valores a números con 2 decimales para el log
        const total = Number(parseFloat(invoice.total).toFixed(2));
        const totalPaid = Number(parseFloat(invoice.totalPaid).toFixed(2));
        const pendingAmount = Number(parseFloat(invoice.pendingAmount).toFixed(2));

        console.log(`Factura ${invoice.id} - Desglose:`, {
          total,
          totalPaid,
          pendingAmount,
          status: invoice.status
        });
        
        // Verificar si el saldo pendiente es cero y actualizar el estado a 'paid'
        if (pendingAmount <= 0 && invoice.status !== 'paid') {
          await db
            .update(invoices)
            .set({ status: "paid" })
            .where(eq(invoices.id, invoice.id));
          
          console.log(`Factura ${invoice.id} actualizada automáticamente a pagada`);
          invoice.status = 'paid';
        }
      }

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