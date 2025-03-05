import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (drivers, assistants, admins)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "driver", "assistant"] }).notNull(),
  active: boolean("active").notNull().default(true),
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
  driverId: integer("driver_id").notNull(),
  assistantId: integer("assistant_id"),
  truckId: integer("truck_id").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  estimatedDuration: integer("estimated_duration"), // en minutos
  actualDuration: integer("actual_duration"), // en minutos
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }), // en kilómetros
  deliverySequence: text("delivery_sequence").array(), // Array de IDs de pedidos en orden óptimo
  currentLocation: text("current_location"), // Coordenadas actuales "lat,lng"
  lastUpdate: timestamp("last_update"),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  routeId: integer("route_id"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "in_transit", "delivered", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "check", "credit_card"] }).notNull(),
  date: timestamp("date").notNull(),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  deliverySequence: integer("delivery_sequence"), // Posición en la ruta
  // Heredar coordenadas del cliente o usar específicas para este pedido
  deliveryCoordinates: text("delivery_coordinates"), // "lat,lng"
  notes: text("notes"),
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


// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertCustomerSchema = createInsertSchema(customers);
export const insertProductSchema = createInsertSchema(products);
export const insertTruckSchema = createInsertSchema(trucks);
export const insertRouteSchema = createInsertSchema(routes, {
  // Campos opcionales para la creación inicial
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  estimatedDuration: z.number().optional(),
  actualDuration: z.number().optional(),
  totalDistance: z.string().regex(/^\d+\.\d{2}$/).optional(),
  deliverySequence: z.array(z.string()).optional(),
  currentLocation: z.string().regex(/^-?\d+\.\d+,-?\d+\.\d+$/).optional(),
  lastUpdate: z.string().datetime().optional(),
});
export const insertOrderSchema = createInsertSchema(orders, {
  customerId: z.number(),
  total: z.string().regex(/^\d+\.\d{2}$/, "El total debe tener 2 decimales"),
  status: z.enum(["pending", "in_transit", "delivered", "cancelled"]),
  paymentMethod: z.enum(["cash", "check", "credit_card"]),
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