import {
  users, customers, products, routes, orders, orderItems,
  settings as settingsTable, trucks,
  inventoryMovements, inventoryAdjustments, inventoryAdjustmentItems, stockAlerts,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Product, type InsertProduct,
  type Route, type InsertRoute,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Settings, type InsertSettings,
  type Truck, type InsertTruck,
  type InventoryMovement, type InsertInventoryMovement,
  type InventoryAdjustment, type InventoryAdjustmentItem, type InsertInventoryAdjustment,
  type StockAlert, type InsertStockAlert,
  customerOrders, type CustomerOrders, type InsertCustomerOrders,
  bottleReturns,
  type BottleReturn, type InsertBottleReturn
} from "@shared/schema";
import { db } from "./db";
import { eq, inArray, desc, gte, lte, isNotNull, lt, and } from "drizzle-orm";

export interface DriverLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

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

  // Routes
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  listRoutes(): Promise<Route[]>;
  updateRouteStatus(id: number, status: "pending" | "in_progress" | "completed", currentLocation?: string): Promise<Route>;
  updateRouteProgress(id: number, currentLocation: string, lastUpdate: Date): Promise<Route>;
  updateOrderDeliveryTimes(routeId: number, updates: Partial<Order>[]): Promise<Order[]>;

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
  
  // Gestión de inventario
  createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement>;
  listInventoryMovements(productId?: number, movementType?: string, startDate?: Date, endDate?: Date): Promise<InventoryMovement[]>;
  getProductInventoryHistory(productId: number): Promise<InventoryMovement[]>;
  
  // Ajustes de inventario
  createInventoryAdjustment(adjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment>;
  getInventoryAdjustment(id: number): Promise<InventoryAdjustment | undefined>;
  listInventoryAdjustments(): Promise<InventoryAdjustment[]>;
  updateInventoryAdjustmentStatus(id: number, status: "pending" | "approved" | "rejected", approvedBy?: number): Promise<InventoryAdjustment>;
  
  // Alertas de stock bajo
  createStockAlert(alert: InsertStockAlert): Promise<StockAlert>;
  listStockAlerts(status?: "active" | "resolved" | "ignored"): Promise<StockAlert[]>;
  updateStockAlertStatus(id: number, status: "active" | "resolved" | "ignored", resolvedBy?: number): Promise<StockAlert>;
  checkAndCreateLowStockAlerts(): Promise<StockAlert[]>;
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

  // Implementación de los métodos de gestión de inventario
  async createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
    const [newMovement] = await db.insert(inventoryMovements).values(movement).returning();
    return newMovement;
  }

  async listInventoryMovements(
    productId?: number, 
    movementType?: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<InventoryMovement[]> {
    let query = db.select().from(inventoryMovements);
    
    if (productId) {
      query = query.where(eq(inventoryMovements.productId, productId));
    }
    
    if (movementType) {
      query = query.where(eq(inventoryMovements.movementType, movementType as any));
    }
    
    if (startDate) {
      query = query.where(gte(inventoryMovements.createdAt, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(inventoryMovements.createdAt, endDate));
    }
    
    return query.orderBy(desc(inventoryMovements.createdAt));
  }

  async getProductInventoryHistory(productId: number): Promise<InventoryMovement[]> {
    return db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.productId, productId))
      .orderBy(desc(inventoryMovements.createdAt));
  }

  // Métodos para ajustes de inventario
  async createInventoryAdjustment(adjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment> {
    // Transacción para crear ajuste y sus items
    return db.transaction(async (tx) => {
      // 1. Insertar el ajuste principal
      const [newAdjustment] = await tx
        .insert(inventoryAdjustments)
        .values({
          reason: adjustment.reason,
          notes: adjustment.notes,
          status: adjustment.status,
          createdBy: adjustment.createdBy || null,
          createdAt: new Date()
        })
        .returning();

      // 2. Insertar los items del ajuste
      for (const item of adjustment.items) {
        await tx.insert(inventoryAdjustmentItems).values({
          adjustmentId: newAdjustment.id,
          productId: item.productId,
          previousQuantity: item.previousQuantity,
          newQuantity: item.newQuantity,
          difference: item.difference,
          notes: item.notes || null
        });

        // 3. Si el ajuste es aprobado, actualizar el stock del producto y registrar el movimiento
        if (adjustment.status === "approved") {
          const [product] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId));

          if (product) {
            // Actualizar el stock
            await tx
              .update(products)
              .set({ stock: item.newQuantity })
              .where(eq(products.id, item.productId));

            // Registrar el movimiento
            await tx.insert(inventoryMovements).values({
              productId: item.productId,
              quantity: item.difference,
              previousStock: item.previousQuantity,
              newStock: item.newQuantity,
              movementType: "adjustment",
              referenceId: newAdjustment.id,
              referenceType: "adjustment",
              notes: item.notes || adjustment.notes || null,
              createdBy: adjustment.createdBy || null
            });
          }
        }
      }

      return newAdjustment;
    });
  }

  async getInventoryAdjustment(id: number): Promise<InventoryAdjustment | undefined> {
    const [adjustment] = await db
      .select()
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.id, id));

    return adjustment;
  }

  async listInventoryAdjustments(): Promise<InventoryAdjustment[]> {
    return db
      .select()
      .from(inventoryAdjustments)
      .orderBy(desc(inventoryAdjustments.createdAt));
  }

  async updateInventoryAdjustmentStatus(
    id: number, 
    status: "pending" | "approved" | "rejected", 
    approvedBy?: number
  ): Promise<InventoryAdjustment> {
    return db.transaction(async (tx) => {
      // 1. Actualizar el estado del ajuste
      const [adjustment] = await tx
        .update(inventoryAdjustments)
        .set({ 
          status, 
          approvedBy: approvedBy || null,
          approvedAt: status === "approved" ? new Date() : null
        })
        .where(eq(inventoryAdjustments.id, id))
        .returning();

      // 2. Si el estado es "approved", aplicar los cambios al inventario
      if (status === "approved") {
        const items = await tx
          .select()
          .from(inventoryAdjustmentItems)
          .where(eq(inventoryAdjustmentItems.adjustmentId, id));

        for (const item of items) {
          // Actualizar stock del producto
          await tx
            .update(products)
            .set({ stock: item.newQuantity })
            .where(eq(products.id, item.productId));

          // Registrar el movimiento
          await tx.insert(inventoryMovements).values({
            productId: item.productId,
            quantity: item.difference,
            previousStock: item.previousQuantity,
            newStock: item.newQuantity,
            movementType: "adjustment",
            referenceId: id,
            referenceType: "adjustment",
            notes: item.notes || adjustment.notes || null,
            createdBy: approvedBy || null
          });
        }
      }

      return adjustment;
    });
  }

  // Métodos para alertas de stock bajo
  async createStockAlert(alert: InsertStockAlert): Promise<StockAlert> {
    const [newAlert] = await db.insert(stockAlerts).values(alert).returning();
    return newAlert;
  }

  async listStockAlerts(status?: "active" | "resolved" | "ignored"): Promise<StockAlert[]> {
    let query = db.select().from(stockAlerts);
    
    if (status) {
      query = query.where(eq(stockAlerts.status, status));
    }
    
    return query.orderBy(desc(stockAlerts.createdAt));
  }

  async updateStockAlertStatus(
    id: number, 
    status: "active" | "resolved" | "ignored", 
    resolvedBy?: number
  ): Promise<StockAlert> {
    const updates: Partial<StockAlert> = { 
      status,
      resolvedBy: resolvedBy || null
    };
    
    if (status === "resolved" || status === "ignored") {
      updates.resolvedAt = new Date();
    }
    
    const [updatedAlert] = await db
      .update(stockAlerts)
      .set(updates)
      .where(eq(stockAlerts.id, id))
      .returning();
      
    return updatedAlert;
  }

  async checkAndCreateLowStockAlerts(): Promise<StockAlert[]> {
    // 1. Obtener todos los productos con stock por debajo del mínimo
    const lowStockProducts = await db
      .select()
      .from(products)
      .where(
        and(
          isNotNull(products.minStock),
          lt(products.stock, products.minStock)
        )
      );
    
    // 2. Verificar alertas existentes activas
    const newAlerts: StockAlert[] = [];
    
    for (const product of lowStockProducts) {
      // Buscar si ya existe una alerta activa para este producto
      const [existingAlert] = await db
        .select()
        .from(stockAlerts)
        .where(
          and(
            eq(stockAlerts.productId, product.id),
            eq(stockAlerts.status, "active")
          )
        );
      
      // Si no hay alerta activa, crear una nueva
      if (!existingAlert) {
        const [newAlert] = await db
          .insert(stockAlerts)
          .values({
            productId: product.id,
            currentStock: product.stock,
            minStock: product.minStock!,
            status: "active",
            createdAt: new Date()
          })
          .returning();
          
        newAlerts.push(newAlert);
      }
    }
    
    return newAlerts;
  }
}

export const storage = new DatabaseStorage();