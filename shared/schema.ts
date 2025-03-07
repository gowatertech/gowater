import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (drivers, admins, etc.)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { 
    enum: ["admin", "supervisor", "cashier", "driver", "assistant"] 
  }).notNull(),
  active: boolean("active").notNull().default(true),
  phone: text("phone"),
  license: text("license"),
  licenseExpiry: timestamp("license_expiry", { mode: 'string' }),
  hireDate: timestamp("hire_date").notNull().defaultNow(),
  emergencyContact: text("emergency_contact"),
  currentLocation: text("current_location"),
  lastLocationUpdate: timestamp("last_location_update"),
});

// Schema simplificado para usuarios
export const insertUserSchema = createInsertSchema(users)
  .extend({
    role: z.enum(["admin", "supervisor", "cashier", "driver", "assistant"]),
    phone: z.string().optional(),
    license: z.string().optional(),
    licenseExpiry: z.string().optional(),
    emergencyContact: z.string().optional(),
    currentLocation: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/).optional(),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'driver') {
      if (!data.license) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número de licencia requerido para conductores",
          path: ["license"]
        });
      }
      if (!data.licenseExpiry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fecha de vencimiento de licencia requerida para conductores",
          path: ["licenseExpiry"]
        });
      }
    }
  });

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  email: text("email"),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  coordinates: text("coordinates"), // "lat,lng"
  zoneId: integer("zone_id").references(() => zones.id),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  icon: text("icon"), // Nuevo campo para el ícono
});

// Production Batches - Para registrar cargas de inventario
export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  warehouse: text("warehouse").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  userId: integer("user_id").notNull().references(() => users.id),
  notes: text("notes"),
});

// Trucks
export const trucks = pgTable("trucks", {
  id: serial("id").primaryKey(),
  plate: text("plate").notNull().unique(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["available", "on_route", "maintenance"] }).notNull(),
});

// Routes
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  assistantId: integer("assistant_id").references(() => users.id),
  truckId: integer("truck_id").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  estimatedDuration: integer("estimated_duration"), // en minutos
  actualDuration: integer("actual_duration"), // en minutos
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }), // en kilómetros
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }), // total de ingresos
  deliverySequence: text("delivery_sequence").array(), // Array de IDs de pedidos en orden óptimo
  currentLocation: text("current_location"), // Coordenadas actuales "lat,lng"
  lastUpdate: timestamp("last_update"),
  driverStartedAt: timestamp("driver_started_at"), // Cuando el conductor inició la ruta
  isCompleted: boolean("is_completed").notNull().default(false),
  stops: text("stops").array(), // Array de paradas con detalles
});

// Orders - Agregar solo el campo de método de pago
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  routeId: integer("route_id"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "in_transit", "delivered", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull(),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  deliverySequence: integer("delivery_sequence"),
  deliveryCoordinates: text("delivery_coordinates"),
  notes: text("notes"),
});

// Nueva tabla de pagos
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  reference: text("reference"), // Para pagos con tarjeta/crédito
  notes: text("notes"),
});

// Bills (Facturas)
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: serial("bill_number").unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes").notNull(),
});

// Bill Items (Items de Factura)
export const billItems = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

// Company Settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  logo: text("logo"),
  driverCommission: decimal("driver_commission", { precision: 10, scale: 2 }).notNull(),
  assistantCommission: decimal("assistant_commission", { precision: 10, scale: 2 }).notNull(),
});

// Pedidos por Tipo de Cliente
export const customerOrders = pgTable("customer_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  orderType: text("order_type", { enum: ["regular", "wholesale", "special"] }).notNull(),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "occasional"] }).notNull(),
  lastOrderDate: timestamp("last_order_date"),
  totalOrders: integer("total_orders").notNull().default(0),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).notNull().default("0"),
  preferredPaymentMethod: text("preferred_payment_method", { enum: ["cash", "check", "credit_card"] }),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  notes: text("notes"),
});

// Zonas
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  coordinates: text("coordinates").array().notNull(), // Array de coordenadas que forman el polígono
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// Invoices (Facturas)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: serial("invoice_number").unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "credit", "card"] }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes"),
});

// Invoice Items (Items de Factura)
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// Create insert schemas
export const insertCustomerSchema = createInsertSchema(customers);
export const insertProductSchema = createInsertSchema(products);
export const insertTruckSchema = createInsertSchema(trucks);
export const insertRouteSchema = createInsertSchema(routes)
  .extend({
    name: z.string().min(1, "El nombre de la ruta es requerido"),
    driverId: z.number({ required_error: "Debe seleccionar un conductor" }),
    date: z.coerce.date({ required_error: "La fecha es requerida" }),
    truckId: z.number().default(1),
    status: z.enum(["pending", "in_progress", "completed"], {
      required_error: "El estado es requerido",
      invalid_type_error: "Estado inválido",
      description: "Estado de la ruta"
    }).default("pending"),
    isCompleted: z.boolean().default(false),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    estimatedDuration: z.number().optional(),
    actualDuration: z.number().optional(),
    totalDistance: z.string().regex(/^\d+\.\d{2}$/, "La distancia debe tener 2 decimales").optional(),
    totalRevenue: z.string().regex(/^\d+\.\d{2}$/, "El ingreso debe tener 2 decimales").optional(),
    deliverySequence: z.array(z.string()).optional(),
    currentLocation: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/, "Formato de ubicación inválido").optional(),
    lastUpdate: z.string().datetime().optional(),
    driverStartedAt: z.string().datetime().optional(),
    stops: z.array(z.string()).optional(),
  })
  .transform((data) => ({
    ...data,
    truckId: data.truckId || 1,
    status: data.status || "pending",
    isCompleted: data.isCompleted ?? false
  }));
export const insertOrderSchema = createInsertSchema(orders, {
  customerId: z.number(),
  total: z.string().regex(/^\d+\.\d{2}$/, "El total debe tener 2 decimales"),
  status: z.enum(["pending", "in_transit", "delivered", "cancelled"]),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  date: z.string().datetime("La fecha debe estar en formato ISO"),
  routeId: z.number().nullable(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  actualDeliveryTime: z.string().datetime().optional(),
  deliverySequence: z.number().optional(),
  deliveryCoordinates: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/).optional(),
  notes: z.string().optional(),
}).strict();
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertSettingsSchema = createInsertSchema(settings);
export const insertCustomerOrdersSchema = createInsertSchema(customerOrders);
export const insertZoneSchema = createInsertSchema(zones, {
  coordinates: z.array(z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/)),
});

// Schema para pagos
export const insertPaymentSchema = createInsertSchema(payments, {
  invoiceId: z.number(),
  customerId: z.number(),
  amount: z.string().regex(/^\d+\.\d{2}$/, "El monto debe tener 2 decimales"),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Agregar los schemas de inserción
export const insertBillSchema = createInsertSchema(bills, {
  status: z.enum(["pending", "paid", "cancelled"]),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  notes: z.string().max(200),
});

export const insertBillItemSchema = createInsertSchema(billItems);

// Schemas para las nuevas tablas
export const insertInvoiceSchema = createInsertSchema(invoices, {
  status: z.enum(["pending", "paid", "cancelled"]),
  paymentMethod: z.enum(["cash", "credit", "card"]),
  notes: z.string().max(200).optional(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems);

export const insertProductionBatchSchema = createInsertSchema(productionBatches);

// Export types
export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Truck = typeof trucks.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type CustomerOrders = typeof customerOrders.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillItem = typeof billItems.$inferSelect;

// Nuevos tipos
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;


// Definir el tipo para la ubicación del conductor
export type DriverLocation = {
  latitude: number;
  longitude: number;
  timestamp: Date;
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type InsertCustomerOrders = z.infer<typeof insertCustomerOrdersSchema>;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;