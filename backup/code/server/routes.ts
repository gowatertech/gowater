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
  insertCustomerOrdersSchema
} from "@shared/schema";

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

  return httpServer;
}