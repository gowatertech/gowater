import {
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Product, type InsertProduct,
  type Truck, type InsertTruck,
  type Route, type InsertRoute,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Settings, type InsertSettings
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;

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
  updateRouteStatus(id: number, status: string): Promise<Route>;

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private products: Map<number, Product>;
  private trucks: Map<number, Truck>;
  private routes: Map<number, Route>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private settings: Settings | undefined;

  private currentIds: {
    users: number;
    customers: number;
    products: number;
    trucks: number;
    routes: number;
    orders: number;
    orderItems: number;
  };

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.products = new Map();
    this.trucks = new Map();
    this.routes = new Map();
    this.orders = new Map();
    this.orderItems = new Map();

    this.currentIds = {
      users: 1,
      customers: 1,
      products: 1,
      trucks: 1,
      routes: 1,
      orders: 1,
      orderItems: 1,
    };

    // Initialize default settings
    this.settings = {
      id: 1,
      name: "GoWater",
      address: "Santo Domingo, Dominican Republic",
      phone: "+1 809-555-0123",
      logo: "",
      driverCommission: 3,
      assistantCommission: 2,
    };
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Customers
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.currentIds.customers++;
    const newCustomer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async listCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async updateCustomerBalance(id: number, amount: number): Promise<Customer> {
    const customer = this.customers.get(id);
    if (!customer) throw new Error("Customer not found");
    
    const updatedCustomer = {
      ...customer,
      balance: parseFloat(customer.balance.toString()) + amount,
    };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  // Products
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentIds.products++;
    const newProduct = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async listProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async updateProductStock(id: number, quantity: number): Promise<Product> {
    const product = this.products.get(id);
    if (!product) throw new Error("Product not found");
    
    const updatedProduct = {
      ...product,
      stock: product.stock + quantity,
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  // Trucks
  async getTruck(id: number): Promise<Truck | undefined> {
    return this.trucks.get(id);
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const id = this.currentIds.trucks++;
    const newTruck = { ...truck, id };
    this.trucks.set(id, newTruck);
    return newTruck;
  }

  async listTrucks(): Promise<Truck[]> {
    return Array.from(this.trucks.values());
  }

  async updateTruckStatus(id: number, status: string): Promise<Truck> {
    const truck = this.trucks.get(id);
    if (!truck) throw new Error("Truck not found");
    
    const updatedTruck = { ...truck, status };
    this.trucks.set(id, updatedTruck);
    return updatedTruck;
  }

  // Routes
  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const id = this.currentIds.routes++;
    const newRoute = { ...route, id };
    this.routes.set(id, newRoute);
    return newRoute;
  }

  async listRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }

  async updateRouteStatus(id: number, status: string): Promise<Route> {
    const route = this.routes.get(id);
    if (!route) throw new Error("Route not found");
    
    const updatedRoute = { ...route, status };
    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }

  // Orders
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentIds.orders++;
    const newOrder = { ...order, id };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async listOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error("Order not found");
    
    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Order Items
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.currentIds.orderItems++;
    const newOrderItem = { ...orderItem, id };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  async listOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId,
    );
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async updateSettings(settings: InsertSettings): Promise<Settings> {
    this.settings = { ...settings, id: 1 };
    return this.settings;
  }
}

export const storage = new MemStorage();
