import {
  users, customers, products, routes, orders, orderItems,
  settings as settingsTable, trucks, invoices, payments,
  recurringOrders, recurringOrderItems,
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
  type RecurringOrderItem, type InsertRecurringOrderItem
} from "@shared/schema";
import { db } from "./db";
import { getCurrentCompanyId } from "./company-db";
import { eq, inArray } from "drizzle-orm";

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
  updateOrderStatus(id: number, status: "pending" | "delivered" | "cancelled"): Promise<Order>;

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
  getSettings(): Promise<Settings | undefined>;
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
      console.log(`Usuario no encontrado por email: ${email}, intentando por username`);
      const username = email.split('@')[0]; // Tomar la parte antes del @
      [user] = await db.select().from(users).where(eq(users.username, username));
      if (user) {
        console.log(`Usuario encontrado por username: ${username}`);
      }
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
        console.log(`No se encontró la ruta con ID ${id} para eliminar`);
        return undefined;
      }
      
      // Si hay órdenes asociadas a esta ruta, las desvinculamos
      await db
        .update(orders)
        .set({ routeId: null })
        .where(eq(orders.routeId, id));
      
      console.log(`Órdenes desvinculadas de la ruta ${id}`);
      
      // Eliminamos la ruta
      const [deletedRoute] = await db
        .delete(routes)
        .where(eq(routes.id, id))
        .returning();
      
      console.log(`Ruta ${id} eliminada correctamente`);
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
      .values({
        customerId: customerOrder.customerId,
        orderType: customerOrder.orderType,
        frequency: customerOrder.frequency,
        status: customerOrder.status,
        totalOrders: customerOrder.totalOrders,
        averageOrderValue: customerOrder.averageOrderValue,
        notes: customerOrder.notes,
        lastOrderDate: customerOrder.lastOrderDate ? new Date(customerOrder.lastOrderDate) : null,
        preferredPaymentMethod: customerOrder.preferredPaymentMethod
      })
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

    const [latitude, longitude] = user.currentLocation.split(',').map(Number);
    return {
      latitude,
      longitude,
      timestamp: new Date(user.lastLocationUpdate)
    };
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    try {
      console.log("Storage - getSettings: Consultando base de datos");
      const result = await db.select().from(settingsTable);
      console.log("Storage - getSettings: Resultado:", result);
      return result[0];
    } catch (error) {
      console.error("Error al obtener configuración:", error);
      throw error;
    }
  }

  async updateSettings(settingsData: Partial<InsertSettings>): Promise<Settings> {
    try {
      console.log("Storage - updateSettings: Datos recibidos:", settingsData);

      // Verificación adicional para municipalityId
      if (settingsData.municipalityId) {
        console.log("Storage - Verificando municipalityId:", settingsData.municipalityId);
      } else {
        console.log("Storage - ADVERTENCIA: municipalityId no presente");
      }

      const [existingSettings] = await db.select().from(settingsTable);

      if (existingSettings) {
        console.log("Storage - updateSettings: Actualizando configuración existente");
        const [updatedSettings] = await db
          .update(settingsTable)
          .set(settingsData)
          .where(eq(settingsTable.id, existingSettings.id))
          .returning();
        return updatedSettings;
      } else {
        console.log("Storage - updateSettings: Creando nueva configuración");
        const [newSettings] = await db
          .insert(settingsTable)
          .values({ id: 1, ...settingsData as InsertSettings })
          .returning();
        return newSettings;
      }
    } catch (error) {
      console.error("Error al actualizar configuración:", error);
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
    const [newTruck] = await db.insert(trucks).values(truck).returning();
    return newTruck;
  }

  async listTrucks(): Promise<Truck[]> {
    return db.select().from(trucks);
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
      console.log("Storage - registerPayment: Registrando pago:", payment);
      
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
      
      // Actualizar el estado de la factura a "paid"
      await db
        .update(invoices)
        .set({ status: "paid" })
        .where(
          and(
            eq(invoices.id, payment.invoiceId),
            eq(invoices.companyId, companyId)
          )
        ); // Asegurar que solo se actualice la factura de la misma empresa
      
      console.log("Storage - registerPayment: Pago registrado con ID:", newPayment.id);
      return newPayment;
    } catch (error) {
      console.error("Storage - registerPayment: Error al registrar pago:", error);
      throw error;
    }
  }
  
  async getPaymentsByInvoice(invoiceId: number): Promise<Payment[]> {
    try {
      console.log("Storage - getPaymentsByInvoice: Consultando pagos para factura:", invoiceId);
      
      const result = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId));
      
      console.log(`Storage - getPaymentsByInvoice: ${result.length} pagos encontrados`);
      return result;
    } catch (error) {
      console.error("Storage - getPaymentsByInvoice: Error al consultar pagos:", error);
      throw error;
    }
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

  async generateOrderFromRecurring(recurringOrderId: number): Promise<Order> {
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.generateOrderFromRecurring(recurringOrderId);
  }
}

export const storage = new DatabaseStorage();