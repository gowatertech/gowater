import {
  users, customers, products, trucks, routes, orders, orderItems, settings,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Product, type InsertProduct,
  type Truck, type InsertTruck,
  type Route, type InsertRoute,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Settings, type InsertSettings,
  customerOrders, type CustomerOrders, type InsertCustomerOrders,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deactivateUser(id: number): Promise<void>;

  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  listCustomers(): Promise<Customer[]>;
  updateCustomerBalance(id: number, amount: number): Promise<Customer>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  listProducts(): Promise<Product[]>;
  updateProductStock(id: number, quantity: number): Promise<Product>;

  // Trucks
  getTruck(id: number): Promise<Truck | undefined>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  listTrucks(): Promise<Truck[]>;
  updateTruckStatus(id: number, status: string): Promise<Truck>;

  // Routes
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  listRoutes(): Promise<Route[]>;
  updateRouteStatus(id: number, status: string, currentLocation?: string): Promise<Route>;
  updateRouteProgress(id: number, currentLocation: string, lastUpdate: Date): Promise<Route>;
  updateOrderDeliveryTimes(routeId: number, updates: Partial<Order>[]): Promise<Order[]>;

  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  listOrders(): Promise<Order[]>;
  updateOrderStatus(id: number, status: string): Promise<Order>;

  // Order Items
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  listOrderItems(orderId: number): Promise<OrderItem[]>;

  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: InsertSettings): Promise<Settings>;

  // Customer Orders
  getCustomerOrders(customerId: number): Promise<CustomerOrders[]>;
  createCustomerOrder(customerOrder: InsertCustomerOrders): Promise<CustomerOrders>;
  updateCustomerOrderStats(customerId: number): Promise<CustomerOrders>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async listUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deactivateUser(id: number): Promise<void> {
    await db
      .update(users)
      .set({ active: false })
      .where(eq(users.id, id));
  }

  // Customers
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async listCustomers(): Promise<Customer[]> {
    return db.select().from(customers);
  }

  async updateCustomerBalance(id: number, amount: number): Promise<Customer> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new Error("Customer not found");

    const newBalance = parseFloat(customer.balance) + amount;
    const [updatedCustomer] = await db
      .update(customers)
      .set({ balance: newBalance.toString() })
      .where(eq(customers.id, id))
      .returning();

    return updatedCustomer;
  }

  // Products
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async listProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async updateProductStock(id: number, quantity: number): Promise<Product> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (!product) throw new Error("Product not found");

    const [updatedProduct] = await db
      .update(products)
      .set({ stock: product.stock + quantity })
      .where(eq(products.id, id))
      .returning();

    return updatedProduct;
  }

  // Trucks
  async getTruck(id: number): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck;
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const [newTruck] = await db.insert(trucks).values(truck).returning();
    return newTruck;
  }

  async listTrucks(): Promise<Truck[]> {
    return db.select().from(trucks);
  }

  async updateTruckStatus(id: number, status: "available" | "on_route" | "maintenance"): Promise<Truck> {
    const [truck] = await db
      .select()
      .from(trucks)
      .where(eq(trucks.id, id));

    if (!truck) throw new Error("Truck not found");

    const [updatedTruck] = await db
      .update(trucks)
      .set({ status })
      .where(eq(trucks.id, id))
      .returning();

    return updatedTruck;
  }

  // Routes
  async getRoute(id: number): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route;
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const [newRoute] = await db.insert(routes).values([route]).returning();
    return newRoute;
  }

  async listRoutes(): Promise<Route[]> {
    return db.select().from(routes);
  }

  async updateRouteStatus(
    id: number,
    status: "pending" | "in_progress" | "completed",
    currentLocation?: string
  ): Promise<Route> {
    const updates: Partial<Route> = {
      status,
      lastUpdate: new Date()
    };

    if (currentLocation) {
      updates.currentLocation = currentLocation;
    }

    if (status === "in_progress" && !updates.startTime) {
      updates.startTime = new Date();
    } else if (status === "completed" && !updates.endTime) {
      updates.endTime = new Date();
    }

    const [route] = await db
      .update(routes)
      .set(updates)
      .where(eq(routes.id, id))
      .returning();

    return route;
  }

  async updateRouteProgress(
    id: number,
    currentLocation: string,
    lastUpdate: Date
  ): Promise<Route> {
    const [route] = await db
      .update(routes)
      .set({
        currentLocation,
        lastUpdate
      })
      .where(eq(routes.id, id))
      .returning();

    return route;
  }

  async updateOrderDeliveryTimes(
    routeId: number,
    updates: Partial<Order>[]
  ): Promise<Order[]> {
    const updatedOrders: Order[] = [];

    for (const update of updates) {
      if (!update.id) continue;

      const [order] = await db
        .update(orders)
        .set(update)
        .where(eq(orders.id, update.id))
        .returning();

      updatedOrders.push(order);
    }

    return updatedOrders;
  }

  // Orders
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    try {
      const total = parseFloat(order.total);
      if (isNaN(total)) {
        throw new Error("El total debe ser un número válido");
      }

      // Convertir los tipos según lo que espera PostgreSQL
      const orderData = {
        ...order,
        date: new Date(order.date), // Convertir a Date para PostgreSQL
        total: total.toString(),  // Mantener como string para PostgreSQL
      };

      // Insertar en la base de datos
      const [newOrder] = await db.insert(orders).values([orderData]).returning();
      return newOrder;
    } catch (error) {
      console.error('Error en createOrder:', error);
      throw error;
    }
  }

  async listOrders(): Promise<Order[]> {
    return db.select().from(orders);
  }

  async updateOrderStatus(id: number, status: "pending" | "delivered" | "cancelled"): Promise<Order> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));

    if (!order) throw new Error("Order not found");

    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    return updatedOrder;
  }

  // Order Items
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(orderItems).values(orderItem).returning();
    return newOrderItem;
  }

  async listOrderItems(orderId: number): Promise<OrderItem[]> {
    return db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const [settings] = await db.select().from(settings);
    return settings;
  }

  async updateSettings(settingsData: InsertSettings): Promise<Settings> {
    const [existingSettings] = await db.select().from(settings);
    if (existingSettings) {
      const [updatedSettings] = await db
        .update(settings)
        .set(settingsData)
        .where(eq(settings.id, existingSettings.id))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(settings)
        .values({ ...settingsData, id: 1 })
        .returning();
      return newSettings;
    }
  }

  // Customer Orders
  async getCustomerOrders(customerId: number): Promise<CustomerOrders[]> {
    return db
      .select()
      .from(customerOrders)
      .where(eq(customerOrders.customerId, customerId));
  }

  async createCustomerOrder(customerOrder: InsertCustomerOrders): Promise<CustomerOrders> {
    const [newCustomerOrder] = await db
      .insert(customerOrders)
      .values(customerOrder)
      .returning();
    return newCustomerOrder;
  }

  async updateCustomerOrderStats(customerId: number): Promise<CustomerOrders> {
    // Calcular estadísticas basadas en los pedidos del cliente
    const ordersList = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId));

    const totalOrders = ordersList.length;
    const totalValue = ordersList.reduce(
      (sum, order) => sum + parseFloat(order.total.toString()),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
    const lastOrderDate = ordersList.length > 0
      ? ordersList[ordersList.length - 1].date
      : null;

    const [updated] = await db
      .update(customerOrders)
      .set({
        totalOrders,
        averageOrderValue: averageOrderValue.toString(),
        lastOrderDate
      })
      .where(eq(customerOrders.customerId, customerId))
      .returning();

    return updated;
  }
}

export const storage = new DatabaseStorage();