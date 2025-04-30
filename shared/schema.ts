import { pgTable, serial, text, boolean, integer, timestamp, pgEnum, numeric, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enumeración para roles de usuario
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "supervisor",
  "cashier",
  "driver",
  "assistant"
]);

// Enumeración para estados de leads
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "converted", 
  "declined"
]);

// Tabla de usuarios
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email"),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("admin").notNull(),
  active: boolean("active").default(true),
  phone: text("phone"),
  license: text("license"),
  licenseExpiry: timestamp("license_expiry"),
  emergencyContact: text("emergency_contact"),
  companyId: integer("company_id").notNull()
});

// Tabla de empresas
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  active: boolean("active").default(true),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Tabla de clientes
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  businessname: text("businessname").notNull(),
  managername: text("managername").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  street: text("street").notNull(),
  streetnumber: text("streetnumber").notNull(),
  reference: text("reference"),
  coordinates: text("coordinates"),
  zoneid: integer("zoneid"),
  provinceid: integer("provinceid"),
  municipalityid: integer("municipalityid"),
  creditlimit: text("creditlimit").default("0"),
  balance: text("balance").default("0"),
  active: boolean("active").default(true),
  companyId: integer("company_id").notNull()
});

// Tabla de leads de empresas interesadas
export const companyLeads = pgTable("company_leads", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  businessDescription: text("business_description"),
  estimatedUsers: integer("estimated_users"),
  status: leadStatusEnum("status").default("new").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Tabla de productos
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  stock: integer("stock").default(0),
  isReturnable: boolean("is_returnable").default(false),
  depositAmount: text("deposit_amount").default("0"),
  icon: text("icon"),
  hasCommission: boolean("has_commission").default(false),
  isCommissionable: boolean("is_commissionable").default(false),
  driverCommissionValue: text("driver_commission_value").default("0"),
  helperCommissionValue: text("helper_commission_value").default("0"),
  companyId: integer("company_id").notNull()
});

// Tabla de rutas
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  status: text("status").default("pending").notNull(),
  driverId: integer("driver_id"),
  assistantId: integer("assistant_id"),
  truckId: integer("truck_id"),
  stops: jsonb("stops").default([]),
  optimized: boolean("optimized").default(false),
  distance: text("distance"),
  duration: text("duration"),
  companyId: integer("company_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Tabla de almacenes
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  coordinates: text("coordinates"),
  isDefault: boolean("is_default").default(false),
  capacity: integer("capacity"),
  active: boolean("active").default(true),
  companyId: integer("company_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Tabla de lotes de producción
export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  batchNumber: text("batch_number").notNull(),
  productionDate: timestamp("production_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  cost: text("cost"),
  status: text("status").default("pending").notNull(),
  warehouseId: integer("warehouse_id"),
  notes: text("notes"),
  companyId: integer("company_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Definición de tipos para la validación
export const insertUserSchema = createInsertSchema(users, {
  // Añadimos reglas de validación adicionales
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(50),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6),
  role: z.enum(["admin", "supervisor", "cashier", "driver", "assistant"]),
  companyId: z.number().int().positive()
});

export const insertCompanySchema = createInsertSchema(companies, {
  name: z.string().min(2).max(100),
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, {
    message: "Subdomain can only contain lowercase letters, numbers, and hyphens"
  })
});

export const insertCustomerSchema = createInsertSchema(customers, {
  businessname: z.string().min(2).max(100),
  managername: z.string().min(2).max(100),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  street: z.string().min(2),
  streetnumber: z.string(),
  reference: z.string().optional(),
  coordinates: z.string().optional(),
  companyId: z.number().int().positive()
});

export const insertProductSchema = createInsertSchema(products, {
  name: z.string().min(2).max(100),
  price: z.string(),
  stock: z.number().int(),
  isReturnable: z.boolean(),
  depositAmount: z.string(),
  icon: z.string().optional(),
  companyId: z.number().int().positive()
});

export const insertCompanyLeadSchema = createInsertSchema(companyLeads, {
  companyName: z.string().min(2).max(100),
  contactName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7),
  businessDescription: z.string().optional(),
  estimatedUsers: z.number().int().positive().optional(),
});

export const insertRouteSchema = createInsertSchema(routes, {
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  date: z.date().or(z.string().pipe(z.coerce.date())),
  status: z.string().default("pending"),
  driverId: z.number().int().positive().optional(),
  assistantId: z.number().int().positive().optional(),
  truckId: z.number().int().positive().optional(),
  stops: z.any().optional(),
  companyId: z.number().int().positive()
});

export const insertWarehouseSchema = createInsertSchema(warehouses, {
  name: z.string().min(2).max(100),
  address: z.string().optional(),
  coordinates: z.string().optional(),
  isDefault: z.boolean().optional(),
  capacity: z.number().int().optional(),
  active: z.boolean().optional(),
  companyId: z.number().int().positive()
});

export const insertProductionBatchSchema = createInsertSchema(productionBatches, {
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  batchNumber: z.string().min(1),
  productionDate: z.date().or(z.string().pipe(z.coerce.date())),
  expiryDate: z.date().or(z.string().pipe(z.coerce.date())).optional(),
  cost: z.string().optional(),
  status: z.string().default("pending"),
  warehouseId: z.number().int().positive().optional(),
  notes: z.string().optional(),
  companyId: z.number().int().positive()
});

// Tipos inferidos
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type CompanyLead = typeof companyLeads.$inferSelect;
export type InsertCompanyLead = z.infer<typeof insertCompanyLeadSchema>;