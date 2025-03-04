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
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  coordinates: text("coordinates"), // For route planning
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
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  routeId: integer("route_id"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "delivered", "cancelled"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "check", "credit_card"] }),
  date: timestamp("date").notNull(),
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

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertCustomerSchema = createInsertSchema(customers);
export const insertProductSchema = createInsertSchema(products);
export const insertTruckSchema = createInsertSchema(trucks);
export const insertRouteSchema = createInsertSchema(routes);
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertSettingsSchema = createInsertSchema(settings);

// Export types
export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Truck = typeof trucks.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Settings = typeof settings.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
