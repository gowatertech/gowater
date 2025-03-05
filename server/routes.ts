import type { Express } from "express";
import { createServer } from "http";
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
  customers
} from "@shared/schema";
import { calculateOptimalRoute, updateEstimatedDeliveryTimes } from "./services/routeOptimizer";
import { eq } from 'drizzle-orm';
import { db } from './db';

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Users
  app.get("/api/users", async (req, res) => {
    const users = await storage.listUsers();
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const user = await storage.createUser(result.data);
    res.json(user);
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = insertUserSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const user = await storage.updateUser(parseInt(id), result.data);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deactivateUser(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    const customers = await storage.listCustomers();
    res.json(customers);
  });

  app.post("/api/customers", async (req, res) => {
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const customer = await storage.createCustomer(result.data);
    res.json(customer);
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const products = await storage.listProducts();
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    const result = insertProductSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const product = await storage.createProduct(result.data);
    res.json(product);
  });

  // Trucks
  app.get("/api/trucks", async (req, res) => {
    const trucks = await storage.listTrucks();
    res.json(trucks);
  });

  app.post("/api/trucks", async (req, res) => {
    const result = insertTruckSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const truck = await storage.createTruck(result.data);
    res.json(truck);
  });

  // Routes
  app.get("/api/routes", async (req, res) => {
    const routes = await storage.listRoutes();
    res.json(routes);
  });

  app.post("/api/routes", async (req, res) => {
    const result = insertRouteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const route = await storage.createRoute(result.data);
    res.json(route);
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    const orders = await storage.listOrders();
    res.json(orders);
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
    const items = await storage.listOrderItems(parseInt(req.params.orderId));
    res.json(items);
  });

  app.post("/api/orders/:orderId/items", async (req, res) => {
    const result = insertOrderItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const item = await storage.createOrderItem(result.data);
    res.json(item);
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.post("/api/settings", async (req, res) => {
    const result = insertSettingsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const settings = await storage.updateSettings(result.data);
    res.json(settings);
  });

  // Customer Orders
  app.get("/api/customer-orders/:customerId", async (req, res) => {
    const customerOrders = await storage.getCustomerOrders(parseInt(req.params.customerId));
    res.json(customerOrders);
  });

  app.post("/api/customer-orders", async (req, res) => {
    const result = insertCustomerOrdersSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const customerOrder = await storage.createCustomerOrder(result.data);

    // Actualizar estadísticas
    const updatedStats = await storage.updateCustomerOrderStats(result.data.customerId);
    res.json(updatedStats);
  });

  // Dashboard Stats
  app.get("/api/stats/sales", async (req, res) => {
    try {
      const orders = await storage.listOrders();
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

      // Calcular ventas totales y del mes anterior
      const currentMonthSales = orders
        .filter(order => new Date(order.date) >= lastMonth)
        .reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);

      const previousMonthSales = orders
        .filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, lastMonth.getDate()) &&
                 orderDate < lastMonth;
        })
        .reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);

      const percentageChange = previousMonthSales === 0 ? 100 : 
        ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100;

      res.json({
        totalSales: currentMonthSales.toFixed(2),
        percentageChange: percentageChange.toFixed(1)
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/stats/sales-trend", async (req, res) => {
    try {
      const orders = await storage.listOrders();
      const salesByDate = new Map();

      // Agrupar ventas por fecha
      orders.forEach(order => {
        const date = new Date(order.date).toISOString().split('T')[0];
        const total = parseFloat(order.total.toString());
        salesByDate.set(date, (salesByDate.get(date) || 0) + total);
      });

      // Convertir a array y ordenar por fecha
      const trend = Array.from(salesByDate.entries())
        .map(([date, sales]) => ({ date, sales }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Últimos 7 días

      res.json(trend);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/stats/order-status", async (req, res) => {
    try {
      const orders = await storage.listOrders();
      const status = {
        pending: 0,
        delivered: 0,
        cancelled: 0
      };

      orders.forEach(order => {
        status[order.status]++;
      });

      const statusData = [
        { name: "Entregados", value: status.delivered, color: '#0088FE' },
        { name: "Pendientes", value: status.pending, color: '#00C49F' },
        { name: "Cancelados", value: status.cancelled, color: '#FF0000' }
      ];

      res.json(statusData);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/stats/top-customers", async (req, res) => {
    try {
      const orders = await storage.listOrders();
      const customers = await storage.listCustomers();

      // Contar pedidos por cliente
      const ordersByCustomer = orders.reduce((acc, order) => {
        acc[order.customerId] = (acc[order.customerId] || 0) + 1;
        return acc;
      }, {});

      // Crear array de top clientes
      const topCustomers = Object.entries(ordersByCustomer)
        .map(([customerId, count]) => ({
          name: customers.find(c => c.id === parseInt(customerId))?.name || 'Cliente Desconocido',
          orders: count
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);

      res.json(topCustomers);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // New endpoints for route optimization and tracking
  app.post("/api/routes/optimize", async (req, res) => {
    try {
      const { orderIds } = req.body;

      // Obtener los pedidos
      const orders = await Promise.all(
        orderIds.map(async (id: number) => {
          const order = await storage.getOrder(id);
          return order;
        })
      );

      // Filtrar pedidos válidos
      const validOrders = orders.filter((order): order is NonNullable<typeof order> => 
        order !== undefined && order.deliveryCoordinates !== null && order.deliveryCoordinates !== undefined
      );

      if (validOrders.length === 0) {
        return res.status(400).json({ error: "No hay pedidos válidos para optimizar" });
      }

      // Calcular la ruta óptima
      const optimizedRoute = calculateOptimalRoute(validOrders);

      res.json(optimizedRoute);
    } catch (error) {
      console.error("Error en /api/routes/optimize:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/routes/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentLocation } = req.body;

      // Actualizar estado de la ruta
      const route = await storage.updateRouteStatus(
        parseInt(id),
        "in_progress",
        currentLocation
      );

      // Obtener pedidos de la ruta
      const orders = await Promise.all(
        (route.deliverySequence || []).map(orderId => 
          storage.getOrder(parseInt(orderId))
        )
      );

      // Actualizar tiempos estimados
      const updatedOrders = updateEstimatedDeliveryTimes(
        route,
        orders.filter((o): o is Order => o !== undefined),
        new Date()
      );

      // Guardar actualizaciones
      await storage.updateOrderDeliveryTimes(route.id, updatedOrders);

      res.json({ route, orders: updatedOrders });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/routes/:id/location", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentLocation } = req.body;

      const route = await storage.updateRouteProgress(
        parseInt(id),
        currentLocation,
        new Date()
      );

      res.json(route);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/routes/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentLocation } = req.body;

      const route = await storage.updateRouteStatus(
        parseInt(id),
        "completed",
        currentLocation
      );

      res.json(route);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });


  // Zonas
  app.get("/api/zones", async (req, res) => {
    try {
      const allZones = await db.select().from(zones);
      res.json(allZones);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/zones", async (req, res) => {
    try {
      const result = insertZoneSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const [zone] = await db.insert(zones).values(result.data).returning();
      res.json(zone);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.put("/api/customers/:id/zone", async (req, res) => {
    try {
      const { id } = req.params;
      const { zoneId } = req.body;

      const [customer] = await db
        .update(customers)
        .set({ zoneId })
        .where(eq(customers.id, parseInt(id)))
        .returning();

      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  return httpServer;
}