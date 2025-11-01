import {
  users, customers, products, routes, orders, orderItems,
  settings as settingsTable, trucks, invoices, payments,
  recurringOrders, recurringOrderItems, transactions,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Product, type InsertProduct,
  type Route, type InsertRoute,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Settings, type InsertSettings,
  type Truck, type InsertTruck,
  customerOrders, type CustomerOrders, type InsertCustomerOrders,
  bottleReturns,
  type BottleReturn, type InsertBottleReturn,
  type Payment, type InsertPayment, insertPaymentSchema,
  type RecurringOrder, type InsertRecurringOrder,
  type RecurringOrderItem, type InsertRecurringOrderItem,
  type Transaction, type InsertTransaction
} from "@shared/schema";
import { db } from "./db";
import { getCurrentCompanyId, withCompanyUpdate } from "./company-db";
import { getNowRD } from "./date-utils";
import { eq, inArray, and, sql, isNotNull, desc } from "drizzle-orm";

export interface DriverLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User>;
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

  // Routes
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  listRoutes(): Promise<Route[]>;
  updateRouteStatus(id: number, status: "pending" | "in_progress" | "completed", currentLocation?: string): Promise<Route>;
  updateRouteProgress(id: number, currentLocation: string, lastUpdate: Date): Promise<Route>;
  updateOrderDeliveryTimes(routeId: number, updates: Partial<Order>[]): Promise<Order[]>;
  deleteRoute(id: number): Promise<Route | undefined>;

  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  listOrders(): Promise<Order[]>;
  updateOrderStatus(id: number, status: "pending" | "in_transit" | "delivered" | "cancelled"): Promise<Order>;

  // Order Items
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  listOrderItems(orderId: number): Promise<OrderItem[]>;

  // Customer Orders
  getCustomerOrders(customerId: number): Promise<CustomerOrders[]>;
  createCustomerOrder(customerOrder: InsertCustomerOrders): Promise<CustomerOrders>;
  updateCustomerOrderStats(customerId: number): Promise<CustomerOrders>;

  // Driver Location
  updateDriverLocation(driverId: number, location: DriverLocation): Promise<User>;
  getDriverLocation(driverId: number): Promise<DriverLocation | null>;

  // Settings
  getSettings(companyId: number): Promise<Settings | undefined>;
  createDefaultSettings(companyId: number, companyName: string): Promise<Settings | undefined>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;

  // Métodos para manejo de envases retornables
  createBottleReturn(bottleReturn: InsertBottleReturn): Promise<BottleReturn>;
  updateBottleReturn(id: number, returnedQuantity: number): Promise<BottleReturn>;
  getBottleReturnsByOrder(orderId: number): Promise<BottleReturn[]>;
  getBottleReturnsByDriver(driverId: number): Promise<BottleReturn[]>;

  // Trucks
  getTruck(id: number): Promise<Truck | undefined>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  listTrucks(): Promise<Truck[]>;
  updateTruck(id: number, truck: Partial<InsertTruck>): Promise<Truck>;
  updateTruckStatus(id: number, status: "disponible" | "en_reparacion" | "en_ruta"): Promise<Truck>;
  
  // Payments
  registerPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByInvoice(invoiceId: number): Promise<Payment[]>;
  
  // Recurring Orders (Pedidos Recurrentes)
  getRecurringOrder(id: number): Promise<RecurringOrder | undefined>;
  createRecurringOrder(recurringOrder: InsertRecurringOrder): Promise<RecurringOrder>;
  listRecurringOrders(): Promise<RecurringOrder[]>;
  listCustomerRecurringOrders(customerId: number): Promise<RecurringOrder[]>;
  updateRecurringOrder(id: number, data: Partial<InsertRecurringOrder>): Promise<RecurringOrder>;
  updateRecurringOrderStatus(id: number, status: "active" | "paused" | "completed" | "cancelled"): Promise<RecurringOrder>;
  deleteRecurringOrder(id: number): Promise<void>;
  
  // Recurring Order Items
  createRecurringOrderItem(item: InsertRecurringOrderItem): Promise<RecurringOrderItem>;
  listRecurringOrderItems(recurringOrderId: number): Promise<RecurringOrderItem[]>;
  updateRecurringOrderItem(id: number, item: Partial<InsertRecurringOrderItem>): Promise<RecurringOrderItem>;
  deleteRecurringOrderItem(id: number): Promise<void>;
  generateOrderFromRecurring(recurringOrderId: number): Promise<Order>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getCustomerTransactions(customerId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  getCustomerBalanceFromTransactions(customerId: number): Promise<{
    totalDebits: string;
    totalCredits: string;
    balance: string;
    transactions: Transaction[];
  }>;
  generateDocumentNumber(documentType: "FT" | "RI" | "ANT" | "CXC" | "GS" | "NC" | "ND"): Promise<string>;
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Intentar buscar usuario por email
    let [user] = await db.select().from(users).where(eq(users.email, email));
    
    // Si no se encuentra por email, intentar por username para compatibilidad
    if (!user && email.includes('@')) {
      const username = email.split('@')[0]; // Tomar la parte antes del @
      [user] = await db.select().from(users).where(eq(users.username, username));
    }
    
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
  
  async updateUserPassword(id: number, hashedPassword: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Customers
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values([customer]).returning();
    return newCustomer;
  }

  async listCustomers(): Promise<Customer[]> {
    // Utilizamos la función withCompany para asegurar que se aplique el filtro de compañía
    // Esto garantiza que solo se devuelvan los clientes de la compañía actual
    const companyId = getCurrentCompanyId();
    
    return db.select()
      .from(customers)
      .where(eq(customers.companyId, companyId || 0));
  }

  async updateCustomerBalance(id: number, amount: number): Promise<Customer> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new Error("Cliente no encontrado");

    // Actualizar el límite de crédito en lugar del balance
    const newCreditLimit = (parseFloat(customer.creditlimit) - amount).toFixed(2);
    const [updatedCustomer] = await db
      .update(customers)
      .set({ creditlimit: newCreditLimit })
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
    const [newProduct] = await db.insert(products).values([product]).returning();
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

  // Routes
  async getRoute(id: number): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route;
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const routeData = {
      ...route,
      date: new Date(route.date),
      startTime: route.startTime ? new Date(route.startTime) : null,
      endTime: route.endTime ? new Date(route.endTime) : null,
      lastUpdate: route.lastUpdate ? new Date(route.lastUpdate) : null,
      driverStartedAt: route.driverStartedAt ? new Date(route.driverStartedAt) : null,
    };
    const [newRoute] = await db.insert(routes).values([routeData]).returning();
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
  
  async deleteRoute(id: number): Promise<Route | undefined> {
    try {
      // Primero, verificamos si la ruta existe
      const [existingRoute] = await db
        .select()
        .from(routes)
        .where(eq(routes.id, id))
        .limit(1);
      
      if (!existingRoute) {
        return undefined;
      }
      
      // Si hay órdenes asociadas a esta ruta, las desvinculamos
      await db
        .update(orders)
        .set({ routeId: null })
        .where(eq(orders.routeId, id));
      
      // Eliminamos la ruta
      const [deletedRoute] = await db
        .delete(routes)
        .where(eq(routes.id, id))
        .returning();
      
      return deletedRoute;
    } catch (error) {
      console.error(`Error al eliminar la ruta ${id}:`, error);
      throw error;
    }
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

      const orderData = {
        ...order,
        date: new Date(order.date),
        total: total.toString(),
        estimatedDeliveryTime: order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime) : null,
        actualDeliveryTime: order.actualDeliveryTime ? new Date(order.actualDeliveryTime) : null,
      };

      const [newOrder] = await db.insert(orders).values(orderData).returning();
      return newOrder;
    } catch (error) {
      console.error('Error en createOrder:', error);
      throw error;
    }
  }

  async listOrders(): Promise<Order[]> {
    return db.select().from(orders);
  }

  async updateOrderStatus(id: number, status: "pending" | "in_transit" | "delivered" | "cancelled"): Promise<Order> {
    // Primero verificamos que el pedido exista para la empresa actual
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));

    if (!order) throw new Error("Order not found");

    // Obtenemos el companyId del contexto
    const companyId = getCurrentCompanyId();
    
    // Actualizar el estado del pedido
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId || 0)))
      .returning();

    return updatedOrder;
  }

  // Order Items
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(orderItems).values([orderItem]).returning();
    return newOrderItem;
  }

  async listOrderItems(orderId: number): Promise<OrderItem[]> {
    return db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
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
      .values([{
        customerId: customerOrder.customerId,
        orderType: customerOrder.orderType,
        frequency: customerOrder.frequency,
        status: customerOrder.status,
        totalOrders: customerOrder.totalOrders,
        averageOrderValue: customerOrder.averageOrderValue,
        notes: customerOrder.notes,
        lastOrderDate: customerOrder.lastOrderDate ? new Date(customerOrder.lastOrderDate) : null,
        preferredPaymentMethod: customerOrder.preferredPaymentMethod
      }])
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

  async updateDriverLocation(
    driverId: number,
    location: DriverLocation
  ): Promise<User> {
    const locationString = `${location.latitude},${location.longitude}`;
    const [updatedUser] = await db
      .update(users)
      .set({
        currentLocation: locationString,
        lastLocationUpdate: location.timestamp
      })
      .where(eq(users.id, driverId))
      .returning();

    return updatedUser;
  }

  async getDriverLocation(driverId: number): Promise<DriverLocation | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, driverId));

    if (!user || !user.currentLocation || !user.lastLocationUpdate) {
      return null;
    }

    const locationParts = user.currentLocation.split(',');
    if (locationParts.length !== 2) {
      console.warn(`Invalid location format for driver ${driverId}: ${user.currentLocation}`);
      return null;
    }

    const [latitude, longitude] = locationParts.map(Number);
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn(`Invalid location coordinates for driver ${driverId}: ${user.currentLocation}`);
      return null;
    }

    return {
      latitude,
      longitude,
      timestamp: new Date(user.lastLocationUpdate)
    };
  }

  // Settings
  async getSettings(companyId: number): Promise<Settings | undefined> {
    try {
      if (!companyId) {
        console.error("Storage - getSettings: No se proporcionó un ID de compañía válido");
        throw new Error("Se requiere un ID de compañía válido");
      }
      
      // Importar tabla de settings
      const { settings } = await import('@shared/schema');
      
      const result = await db
        .select()
        .from(settings)
        .where(eq(settings.companyId, companyId));
      
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Storage - getSettings: Error al obtener configuración para compañía ${companyId}:`, error);
      throw error;
    }
  }
  
  async createDefaultSettings(companyId: number, companyName: string): Promise<Settings | undefined> {
    try {
      // Acceder a tablas directamente desde el schema compartido
      const { settings, provinces, municipalities } = await import('@shared/schema');
      
      // Establecer companyId en el contexto para asegurar filtrado correcto
      const { setCurrentCompanyId } = await import('./company-db');
      setCurrentCompanyId(companyId);
      
      // Las provincias y municipios son datos geográficos que aplican para todo el país
      // No están filtrados por compañía
      
      // Buscar la primera provincia disponible sin filtrar por compañía
      const provincesResult = await db.select().from(provinces).limit(1);
      
      if (!provincesResult || provincesResult.length === 0) {
        console.error("No se encontraron provincias en la base de datos");
        return undefined;
      }
      
      // Buscar el primer municipio disponible para esa provincia
      const municipalitiesResult = await db.select().from(municipalities)
        .where(eq(municipalities.provinceId, provincesResult[0].id))
        .limit(1);
      
      if (!municipalitiesResult || municipalitiesResult.length === 0) {
        console.error("No se encontraron municipios para la provincia");
        return undefined;
      }
      
      // Crear configuración mínima con sólo el ID y nombre de la empresa
      const [newSettings] = await db
        .insert(settings)
        .values({
          companyId: companyId,  // Explícitamente asignamos el ID
          name: companyName,
          street: "Por definir",
          streetNumber: "0",
          provinceId: provincesResult[0].id,
          municipalityId: municipalitiesResult[0].id,
          contactPhone: "0000000000",
          country: "República Dominicana",
          currency: "DOP",
          tax: "0.00"
        })
        .returning();
      
      return newSettings;
    } catch (error) {
      console.error(`Storage - createDefaultSettings: Error al crear configuración para compañía ${companyId}:`, error);
      console.error(`Detalle del error:`, error.stack || error.message || error);
      return undefined;
    }
  }

  async updateSettings(settingsData: Partial<InsertSettings>): Promise<Settings> {
    try {
      // Obtener companyId de los datos o del contexto
      const companyId = settingsData.companyId;
      
      if (!companyId) {
        console.error("Storage - updateSettings: No se proporcionó un ID de compañía válido");
        throw new Error("Se requiere un ID de compañía válido para actualizar la configuración");
      }

      // Importar tabla de settings
      const { settings } = await import('@shared/schema');

      // Buscar configuración existente para esta compañía específica
      const [existingSettings] = await db
        .select()
        .from(settings)
        .where(eq(settings.companyId, companyId));

      if (existingSettings) {
        
        // Actualizar asegurando que solo se modifique la configuración de esta compañía
        const [updatedSettings] = await db
          .update(settings)
          .set(settingsData)
          .where(eq(settings.companyId, companyId))
          .returning();
          
        return updatedSettings;
      } else {
        
        // Crear nueva configuración para esta compañía específica
        const [newSettings] = await db
          .insert(settings)
          .values(settingsData as InsertSettings)
          .returning();
          
        return newSettings;
      }
    } catch (error) {
      console.error(`Storage - updateSettings: Error al actualizar configuración:`, error);
      throw error;
    }
  }

  // Implementación de métodos para envases retornables
  async createBottleReturn(bottleReturn: InsertBottleReturn): Promise<BottleReturn> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, bottleReturn.productId));

    if (!product || !product.isReturnable) {
      throw new Error("El producto no es retornable");
    }

    const depositAmount = product.depositAmount || "0.00";

    const initialBottleReturn = {
      orderId: bottleReturn.orderId,
      productId: bottleReturn.productId,
      expectedQuantity: bottleReturn.expectedQuantity,
      returnedQuantity: bottleReturn.returnedQuantity,
      returnDate: new Date(bottleReturn.returnDate),
      status: "pending" as const,
      pendingQuantity: bottleReturn.expectedQuantity,
      amountCharged: "0.00",
      depositAmount: depositAmount,
      automaticAlert: bottleReturn.automaticAlert,
      manuallyAssigned: bottleReturn.manuallyAssigned,
      responsibleType: bottleReturn.responsibleType,
      customerPercentage: bottleReturn.customerPercentage,
      driverPercentage: bottleReturn.driverPercentage,
      chargeMethod: bottleReturn.chargeMethod,
      justification: bottleReturn.justification
    };

    const [newReturn] = await db.insert(bottleReturns).values([initialBottleReturn]).returning();
    return newReturn;
  }

  async updateBottleReturn(id: number, returnedQuantity: number): Promise<BottleReturn> {
    const [bottleReturn] = await db
      .select()
      .from(bottleReturns)
      .where(eq(bottleReturns.id, id));

    if (!bottleReturn) throw new Error("Devolución de envase no encontrada");

    const depositAmount = bottleReturn.depositAmount || "0.00";
    const pendingQuantity = bottleReturn.expectedQuantity - returnedQuantity;
    const status = pendingQuantity === 0 ? "complete" as const : "incomplete" as const;
    const amountCharged = pendingQuantity > 0
      ? (pendingQuantity * parseFloat(depositAmount)).toFixed(2)
      : "0.00";

    const [updatedReturn] = await db
      .update(bottleReturns)
      .set({
        returnedQuantity,
        pendingQuantity,
        status,
        amountCharged
      })
      .where(eq(bottleReturns.id, id))
      .returning();

    return updatedReturn;
  }

  async getBottleReturnsByOrder(orderId: number): Promise<BottleReturn[]> {
    return db
      .select()
      .from(bottleReturns)
      .where(eq(bottleReturns.orderId, orderId));
  }

  async getBottleReturnsByDriver(driverId: number): Promise<BottleReturn[]> {
    // Primero obtenemos todas las órdenes del conductor
    const routesWithDriver = await db
      .select()
      .from(routes)
      .where(eq(routes.driverId, driverId));

    const routeIds = routesWithDriver.map(route => route.id);

    // Luego obtenemos las órdenes asociadas a esas rutas
    const ordersInRoutes = await db
      .select()
      .from(orders)
      .where(inArray(orders.routeId, routeIds));

    const orderIds = ordersInRoutes.map(order => order.id);

    // Finalmente obtenemos las devoluciones de envases para esas órdenes
    return db
      .select()
      .from(bottleReturns)
      .where(inArray(bottleReturns.orderId, orderIds));
  }

  // Trucks
  async getTruck(id: number): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck;
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const [newTruck] = await db.insert(trucks).values([truck]).returning();
    return newTruck;
  }

  async listTrucks(companyId?: number): Promise<Truck[]> {
    // Si se proporciona un companyId específico, lo usamos; de lo contrario, intentamos obtenerlo del contexto
    const effectiveCompanyId = companyId || getCurrentCompanyId();
    
    if (!effectiveCompanyId) {
      console.warn("Storage - listTrucks: No hay companyId disponible");
      return [];
    }
    
    return db
      .select()
      .from(trucks)
      .where(eq(trucks.companyId, effectiveCompanyId));
  }

  async updateTruck(id: number, truck: Partial<InsertTruck>): Promise<Truck> {
    const [updatedTruck] = await db
      .update(trucks)
      .set(truck)
      .where(eq(trucks.id, id))
      .returning();
    return updatedTruck;
  }

  async updateTruckStatus(id: number, status: "disponible" | "en_reparacion" | "en_ruta"): Promise<Truck> {
    const [updatedTruck] = await db
      .update(trucks)
      .set({ status })
      .where(eq(trucks.id, id))
      .returning();
    return updatedTruck;
  }
  
  // Payment methods
  async registerPayment(payment: InsertPayment): Promise<Payment> {
    try {
      // Obtener el companyId del contexto o del pago
      const companyId = payment.companyId || getCurrentCompanyId();
      
      if (!companyId) {
        console.error("Storage - registerPayment: No se encontró companyId");
        throw new Error("No se encontró companyId para registrar el pago");
      }
      
      // Asegurar que el pago tenga companyId
      const paymentData = {
        ...payment,
        companyId
      };
      
      // Validar datos del pago
      const validationResult = insertPaymentSchema.safeParse(paymentData);
      if (!validationResult.success) {
        console.error("Storage - registerPayment: Error de validación:", validationResult.error);
        throw new Error(`Error de validación: ${validationResult.error}`);
      }
      
      // Convertir el amount a string con 2 decimales si es necesario
      let amount = payment.amount;
      if (typeof amount === 'number') {
        amount = amount.toFixed(2);
      }
      
      // Registrar el pago con datos validados
      const [newPayment] = await db
        .insert(payments)
        .values(validationResult.data)
        .returning();
      
      // Solo actualizar el estado de la factura si no es un anticipo
      if (payment.invoiceId && !payment.isAdvance) {
        await db
          .update(invoices)
          .set({ status: "paid" })
          .where(
            and(
              eq(invoices.id, payment.invoiceId),
              eq(invoices.companyId, companyId)
            )
          ); // Asegurar que solo se actualice la factura de la misma empresa
      }
      
      return newPayment;
    } catch (error) {
      console.error("Storage - registerPayment: Error al registrar pago:", error);
      throw error;
    }
  }
  
  // Registrar un anticipo (pago sin factura asociada)
  async registerAdvancePayment(customerId: number, amount: string, paymentMethod: "cash" | "credit" | "card" | "transfer", reference?: string, notes?: string): Promise<Payment> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      throw new Error("No se encontró companyId para registrar el anticipo");
    }
    
    // Generar número de documento secuencial para el anticipo
    const lastAdvance = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.companyId, companyId),
          eq(payments.isAdvance, true),
          isNotNull(payments.documentNumber)
        )
      )
      .orderBy(desc(payments.id))
      .limit(1);
    
    let documentNumber = "ANT-001";
    if (lastAdvance.length > 0 && lastAdvance[0].documentNumber) {
      // Extraer el número del último anticipo y incrementar
      const match = lastAdvance[0].documentNumber.match(/ANT-(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1]) + 1;
        documentNumber = `ANT-${nextNumber.toString().padStart(3, '0')}`;
      }
    }
    
    const advancePayment: InsertPayment = {
      customerId,
      companyId,
      amount,
      paymentMethod,
      reference,
      notes: notes || "Anticipo registrado",
      isAdvance: true,
      invoiceId: null,
      documentNumber
    };
    
    const payment = await this.registerPayment(advancePayment);
    
    // Obtener nombre del cliente para el texto de la transacción
    const [customer] = await db
      .select({ businessname: customers.businessname })
      .from(customers)
      .where(eq(customers.id, customerId));
    
    const customerName = customer?.businessname || "Cliente";
    
    // Crear transacción ANT (Anticipo) en el historial de transacciones
    await this.createTransaction({
      customerId,
      documentType: "ANT",
      type: "credit", // Los anticipos son CRÉDITOS (reducen la deuda)
      amount,
      description: `Anticipo - ${customerName}`,
      reference: payment.id.toString()
    });
    
    return payment;
  }
  
  // Obtener anticipos disponibles de un cliente (pagos sin factura asociada)
  async getCustomerAvailableAdvances(customerId: number): Promise<Payment[]> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return [];
    }
    
    return db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.customerId, customerId),
          eq(payments.companyId, companyId),
          eq(payments.isAdvance, true),
          sql`${payments.invoiceId} IS NULL` // Anticipos que aún no han sido aplicados a ninguna factura
        )
      )
      .orderBy(payments.date);
  }
  
  // Calcular el balance de un cliente
  async getCustomerBalance(customerId: number): Promise<{
    customerBalance: string;
    creditLimit: string;
    totalPendingInvoices: string;
    totalAvailableAdvances: string;
    netBalance: string;
  }> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return {
        customerBalance: "0.00",
        creditLimit: "0.00",
        totalPendingInvoices: "0.00",
        totalAvailableAdvances: "0.00",
        netBalance: "0.00"
      };
    }
    
    // Obtener límite de crédito del cliente
    const [customer] = await db
      .select({
        creditLimit: customers.creditlimit
      })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.companyId, companyId)
        )
      );
    
    const creditLimit = customer?.creditLimit || "0.00";
    
    // CALCULAR BALANCE DESDE TRANSACCIONES (igual que en Transacciones Históricas)
    // Balance = Total Débitos - Total Créditos
    const customerTransactions = await this.getCustomerTransactions(customerId);
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    customerTransactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount.toString());
      if (transaction.type === "debit") {
        totalDebits += amount;
      } else {
        totalCredits += amount;
      }
    });
    
    const balanceFromTransactions = (totalDebits - totalCredits).toFixed(2);
    
    // Calcular total de facturas pendientes (para mostrar en la UI)
    const allPendingInvoices = await db
      .select({
        id: invoices.id,
        total: invoices.total
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, customerId),
          eq(invoices.companyId, companyId),
          eq(invoices.status, "pending")
        )
      );
    
    let totalPendingInvoices = 0;
    
    for (const invoice of allPendingInvoices) {
      const paymentsForInvoice = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id));
      
      const totalPaid = paymentsForInvoice.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
      const pendingAmount = parseFloat(invoice.total) - totalPaid;
      
      if (pendingAmount > 0) {
        totalPendingInvoices += pendingAmount;
      }
    }
    
    const totalPendingInvoicesStr = totalPendingInvoices.toFixed(2);
    
    // Calcular total de anticipos disponibles
    const availableAdvancesResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)::numeric(10,2)`
      })
      .from(payments)
      .where(
        and(
          eq(payments.customerId, customerId),
          eq(payments.companyId, companyId),
          eq(payments.isAdvance, true),
          sql`${payments.invoiceId} IS NULL`
        )
      );
    
    const totalAvailableAdvances = availableAdvancesResult[0]?.total || "0.00";
    
    // Balance Total = Balance desde Transacciones (Débitos - Créditos)
    // Esto coincide con el cálculo en la pestaña "Transacciones"
    const netBalance = balanceFromTransactions;
    
    return {
      customerBalance: balanceFromTransactions,
      creditLimit,
      totalPendingInvoices: totalPendingInvoicesStr,
      totalAvailableAdvances: totalAvailableAdvances,
      netBalance
    };
  }
  
  async getPaymentsByInvoice(invoiceId: number): Promise<Payment[]> {
    try {
      const result = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId));
      
      return result;
    } catch (error) {
      console.error("Storage - getPaymentsByInvoice: Error al consultar pagos:", error);
      throw error;
    }
  }
  
  // Aplicar automáticamente anticipos disponibles a una factura
  async applyAdvancePaymentsToInvoice(invoiceId: number): Promise<{
    appliedAmount: string;
    remainingBalance: string;
    appliedPayments: Payment[];
  }> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      throw new Error("No se encontró companyId para aplicar anticipos");
    }
    
    // Obtener la factura
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.companyId, companyId)
        )
      );
    
    if (!invoice) {
      throw new Error("Factura no encontrada");
    }
    
    // Solo aplicar anticipos a facturas pendientes
    if (invoice.status !== "pending") {
      console.log(`⚠️ No se aplicarán anticipos a factura #${invoiceId} porque no está pendiente (status: ${invoice.status})`);
      return {
        appliedAmount: "0.00",
        remainingBalance: invoice.total,
        appliedPayments: []
      };
    }
    
    // Obtener anticipos disponibles del cliente (ordenados por fecha para aplicar los más antiguos primero)
    const availableAdvances = await this.getCustomerAvailableAdvances(invoice.customerId);
    
    if (availableAdvances.length === 0) {
      console.log(`ℹ️ No hay anticipos disponibles para aplicar a factura #${invoiceId}`);
      return {
        appliedAmount: "0.00",
        remainingBalance: invoice.total,
        appliedPayments: []
      };
    }
    
    let remainingBalance = parseFloat(invoice.total);
    const appliedPayments: Payment[] = [];
    let totalApplied = 0;
    
    // Aplicar anticipos hasta cubrir el total de la factura
    for (const advance of availableAdvances) {
      if (remainingBalance <= 0.01) break; // Tolerancia de 1 centavo
      
      const advanceAmount = parseFloat(advance.amount);
      
      // Si el anticipo cubre todo o parte del balance restante
      if (advanceAmount <= remainingBalance) {
        // Aplicar todo el anticipo
        await db
          .update(payments)
          .set({ invoiceId: invoiceId })
          .where(eq(payments.id, advance.id));
        
        remainingBalance -= advanceAmount;
        totalApplied += advanceAmount;
        appliedPayments.push(advance);
        
        console.log(`✅ Anticipo #${advance.id} ($${advanceAmount}) aplicado completamente a factura #${invoiceId}`);
      } else {
        // El anticipo es MAYOR que el balance restante
        // Dividir el anticipo: aplicar solo lo necesario y dejar el exceso disponible
        
        const amountToApply = remainingBalance;
        const amountToKeep = advanceAmount - remainingBalance;
        
        console.log(`🔄 Dividiendo anticipo #${advance.id}: Aplicar $${amountToApply.toFixed(2)} a factura, Mantener $${amountToKeep.toFixed(2)} disponible`);
        
        // Actualizar el anticipo original con el exceso (sin vincular a factura)
        await db
          .update(payments)
          .set({ amount: amountToKeep.toFixed(2) })
          .where(eq(payments.id, advance.id));
        
        // Crear un nuevo pago con el monto exacto para cubrir la factura
        const [newPayment] = await db
          .insert(payments)
          .values({
            companyId: advance.companyId,
            customerId: advance.customerId,
            invoiceId: invoiceId,
            amount: amountToApply.toFixed(2),
            paymentMethod: advance.paymentMethod,
            date: getNowRD(),
            isAdvance: true,
            notes: `Anticipo aplicado parcialmente de pago #${advance.id}`
          })
          .returning();
        
        totalApplied += amountToApply;
        appliedPayments.push(newPayment);
        
        console.log(`✅ Anticipo dividido: Nuevo pago #${newPayment.id} ($${amountToApply.toFixed(2)}) aplicado a factura #${invoiceId}`);
        console.log(`✅ Anticipo #${advance.id} actualizado a $${amountToKeep.toFixed(2)} (disponible para futuras facturas)`);
        
        remainingBalance = 0;
        break;
      }
    }
    
    // NO actualizar el balance del cliente cuando se aplican anticipos
    // El balance ya fue ajustado cuando se registró el anticipo (balance -= anticipo)
    // Solo se debe aumentar el balance con el monto pendiente que quede (esto se hace en routes.ts)
    
    // Si la factura quedó completamente pagada con los anticipos, actualizar su estado
    if (remainingBalance <= 0.01) { // Tolerancia de 1 centavo por redondeo
      await db
        .update(invoices)
        .set({ status: "paid" })
        .where(eq(invoices.id, invoiceId));
      
      console.log(`✅ Factura #${invoiceId} marcada como pagada después de aplicar anticipos`);
    }
    
    return {
      appliedAmount: totalApplied.toFixed(2),
      remainingBalance: Math.max(0, remainingBalance).toFixed(2),
      appliedPayments
    };
  }

  // Implementación de métodos para pedidos recurrentes a través del servicio
  async getRecurringOrder(id: number): Promise<RecurringOrder | undefined> {
    // Esto será implementado por el servicio de pedidos recurrentes
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.getRecurringOrder(id);
  }

  async createRecurringOrder(recurringOrder: InsertRecurringOrder): Promise<RecurringOrder> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.createRecurringOrder(recurringOrder);
  }

  async listRecurringOrders(): Promise<RecurringOrder[]> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.listRecurringOrders();
  }

  async listCustomerRecurringOrders(customerId: number): Promise<RecurringOrder[]> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.listCustomerRecurringOrders(customerId);
  }

  async updateRecurringOrder(id: number, data: Partial<InsertRecurringOrder>): Promise<RecurringOrder> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.updateRecurringOrder(id, data);
  }

  async updateRecurringOrderStatus(id: number, status: "active" | "paused" | "completed" | "cancelled"): Promise<RecurringOrder> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.updateRecurringOrderStatus(id, status);
  }

  async deleteRecurringOrder(id: number): Promise<void> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.deleteRecurringOrder(id);
  }

  async createRecurringOrderItem(item: InsertRecurringOrderItem): Promise<RecurringOrderItem> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.createRecurringOrderItem(item);
  }

  async listRecurringOrderItems(recurringOrderId: number): Promise<RecurringOrderItem[]> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.listRecurringOrderItems(recurringOrderId);
  }

  async updateRecurringOrderItem(id: number, item: Partial<InsertRecurringOrderItem>): Promise<RecurringOrderItem> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.updateRecurringOrderItem(id, item);
  }

  async deleteRecurringOrderItem(id: number): Promise<void> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.deleteRecurringOrderItem(id);
  }

  async generateOrderFromRecurring(recurringOrderId: any): Promise<Order> {
    try {
      // Normalización mejorada del ID
      let numericId: number;
      
      // Caso 1: El ID es un objeto con propiedad 'id'
      if (typeof recurringOrderId === 'object' && recurringOrderId !== null) {
        if ('id' in recurringOrderId) {
          numericId = Number(recurringOrderId.id);
        } else if ('recurringOrderId' in recurringOrderId) {
          numericId = Number(recurringOrderId.recurringOrderId);
        } else {
          // Buscar cualquier propiedad que contenga un número como valor
          const numberProps = Object.entries(recurringOrderId)
            .filter(([_, value]) => !isNaN(Number(value)))
            .map(([_, value]) => Number(value));
            
          numericId = numberProps.length > 0 ? numberProps[0] : NaN;
        }
      } 
      // Caso 2: El ID es un string (posiblemente con caracteres no numéricos)
      else if (typeof recurringOrderId === 'string') {
        // Extraer todos los dígitos del string
        const cleanId = recurringOrderId.replace(/[^0-9]/g, '');
        numericId = cleanId ? parseInt(cleanId, 10) : NaN;
      } 
      // Caso 3: Es un número o cualquier otro tipo
      else {
        numericId = Number(recurringOrderId);
      }
      
      // Validación más permisiva: si es NaN o <= 0, intentamos recuperar
      if (isNaN(numericId) || numericId <= 0) {
        try {
          // Obtener todos los pedidos recurrentes y usar el más reciente
          const { recurringOrdersService } = await import('./recurring-orders');
          const allRecurringOrders = await this.listRecurringOrders();
          
          if (allRecurringOrders && allRecurringOrders.length > 0) {
            // Ordenar por ID descendente (suponiendo que IDs más altos son más recientes)
            const sortedOrders = [...allRecurringOrders].sort((a, b) => b.id - a.id);
            numericId = sortedOrders[0].id;
          } else {
            // Segunda alternativa: usar el método de servicio
            const latestOrder = await recurringOrdersService.getNewestRecurringOrder();
            if (latestOrder) {
              numericId = latestOrder.id;
            } else {
              console.error(`No se encontraron pedidos recurrentes en el sistema`);
              throw new Error("No se encontraron pedidos recurrentes en el sistema");
            }
          }
        } catch (recoveryError) {
          console.error("Error al intentar recuperar pedido recurrente:", recoveryError);
          throw new Error("ID de pedido recurrente inválido - No hay pedidos disponibles");
        }
      }
      
      // Usar el servicio con el ID normalizado
      const { recurringOrdersService } = await import('./recurring-orders');
      return recurringOrdersService.generateOrderFromRecurring(numericId);
    } catch (error) {
      console.error("Error en storage.generateOrderFromRecurring:", error);
      throw error;
    }
  }

  // Transactions
  async generateDocumentNumber(documentType: "FT" | "RI" | "ANT" | "CXC" | "GS" | "NC" | "ND"): Promise<string> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      throw new Error("No se encontró companyId para generar número de documento");
    }

    // Obtener el último número para este tipo de documento
    const maxNumberResult = await db
      .select({
        maxNumber: sql<string>`MAX(CAST(SUBSTRING(${transactions.documentNumber} FROM '[0-9]+') AS INTEGER))`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.companyId, companyId),
          eq(transactions.documentType, documentType)
        )
      );

    const maxNumber = parseInt(maxNumberResult[0]?.maxNumber || "0", 10);
    const nextNumber = maxNumber + 1;

    // Formato: TIPO-0001, TIPO-0002, etc.
    return `${documentType}-${nextNumber.toString().padStart(4, '0')}`;
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      throw new Error("No se encontró companyId para crear transacción");
    }

    // Usar transacción DB para garantizar numeración secuencial segura ante concurrencia
    const [transaction] = await db.transaction(async (tx) => {
      // Lockear la tabla para evitar race conditions en numeración
      // Esto asegura que solo una transacción pueda generar números a la vez
      await tx.execute(sql`LOCK TABLE ${transactions} IN SHARE ROW EXCLUSIVE MODE`);
      
      // Obtener el último número para este tipo de documento
      const maxNumberResult = await tx
        .select({
          maxNumber: sql<string>`MAX(CAST(SUBSTRING(${transactions.documentNumber} FROM '[0-9]+') AS INTEGER))`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.companyId, companyId),
            eq(transactions.documentType, transactionData.documentType)
          )
        );

      const maxNumber = parseInt(maxNumberResult[0]?.maxNumber || "0", 10);
      const nextNumber = maxNumber + 1;
      const documentNumber = `${transactionData.documentType}-${nextNumber.toString().padStart(4, '0')}`;

      // Insertar con el número generado dentro de la transacción
      return await tx.insert(transactions).values({
        ...transactionData,
        companyId,
        documentNumber,
        date: transactionData.date || getNowRD()
      }).returning();
    });

    console.log(`✅ Transacción ${transaction.documentNumber} creada exitosamente`);
    return transaction;
  }

  async getCustomerTransactions(customerId: number): Promise<Transaction[]> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      throw new Error("No se encontró companyId para obtener transacciones");
    }

    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.companyId, companyId),
          eq(transactions.customerId, customerId)
        )
      )
      .orderBy(desc(transactions.date), desc(transactions.id));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      throw new Error("No se encontró companyId para obtener transacciones");
    }

    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.companyId, companyId))
      .orderBy(desc(transactions.date), desc(transactions.id));
  }

  async getCustomerBalanceFromTransactions(customerId: number): Promise<{
    totalDebits: string;
    totalCredits: string;
    balance: string;
    transactions: Transaction[];
  }> {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      throw new Error("No se encontró companyId para calcular balance");
    }

    // Obtener todas las transacciones del cliente
    const customerTransactions = await this.getCustomerTransactions(customerId);

    // Calcular totales
    let totalDebits = 0;
    let totalCredits = 0;

    customerTransactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount.toString());
      if (transaction.type === "debit") {
        totalDebits += amount;
      } else {
        totalCredits += amount;
      }
    });

    const balance = totalDebits - totalCredits;

    return {
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      balance: balance.toFixed(2),
      transactions: customerTransactions
    };
  }
}

export const storage = new DatabaseStorage();