import { pgTable, text, serial, integer, decimal } from "drizzle-orm/pg-core";
import { z } from "zod";

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  icon: text("icon"),
});

export const insertProductSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido"),
  price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
  stock: z.number().default(0),
  icon: z.string().optional(),
});

// Trucks
export const trucks = pgTable("trucks", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  plate: text("plate").notNull().unique(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["available", "on_route", "maintenance"] }).notNull().default("available"),
});

export const insertTruckSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().min(1990, "Year must be greater than 1990"),
  plate: z.string().min(1, "Plate is required"),
  capacity: z.number().min(1, "Capacity must be greater than 0"),
  status: z.enum(["available", "on_route", "maintenance"]).default("available"),
});

// Settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  country: text("country").notNull(),
  currency: text("currency").notNull(),
});

export const insertSettingsSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  contactPhone: z.string().min(1, "El teléfono es requerido"),
  country: z.string().min(1, "El país es requerido"),
  currency: z.string().min(1, "La moneda es requerida"),
});

// Provinces and Municipalities
export const provinces = pgTable("provinces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const municipalities = pgTable("municipalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  businessname: text("businessname").notNull(),
  phone: text("phone").notNull(),
  provinceId: integer("province_id").references(() => provinces.id),
  municipalityId: integer("municipality_id").references(() => municipalities.id),
});

export const insertCustomerSchema = z.object({
  businessname: z.string().min(1, "El nombre del negocio es requerido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  provinceId: z.number().optional(),
  municipalityId: z.number().optional(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "in_transit", "delivered", "cancelled"] }).notNull(),
  date: text("date").notNull(),
});

export const insertOrderSchema = z.object({
  customerId: z.number(),
  total: z.string().regex(/^\d+\.\d{2}$/, "El total debe tener 2 decimales"),
  status: z.enum(["pending", "in_transit", "delivered", "cancelled"]),
  date: z.string(),
});

// Routes
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  driverId: integer("driver_id").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).notNull().default("pending"),
  date: text("date").notNull(),
});

export const insertRouteSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  driverId: z.number({ required_error: "Se requiere un conductor" }),
  date: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
});

// Type exports
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Province = typeof provinces.$inferSelect;
export type Municipality = typeof municipalities.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;