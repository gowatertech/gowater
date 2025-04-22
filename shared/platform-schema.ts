import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Empresas (tenants)
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  logo: text("logo"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  planId: integer("plan_id").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
});

// Planes de membresía
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  maxUsers: integer("max_users").notNull(),
  maxTrucks: integer("max_trucks").notNull(),
  features: text("features").array(),
  isActive: boolean("is_active").notNull().default(true),
});

// Relaciones entre tablas
export const companiesRelations = relations(companies, ({ one }) => ({
  plan: one(plans, {
    fields: [companies.planId],
    references: [plans.id],
  }),
}));

// Facturación de membresías
export const membershipInvoices = pgTable("membership_invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  planId: integer("plan_id").notNull().references(() => plans.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status", {
    enum: ["pending", "paid", "cancelled", "overdue"]
  }).notNull().default("pending"),
  invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
});

// Esquemas de inserción para validación Zod
export const insertCompanySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  subdomain: z.string().min(3, "El subdominio debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9]+$/, "El subdominio solo puede contener letras minúsculas y números"),
  logo: z.string().optional(),
  active: z.boolean().default(true),
  planId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  expirationDate: z.string().refine((val) => {
    // Acepta tanto el formato ISO completo como solo la fecha YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val);
  }, "La fecha debe estar en formato YYYY-MM-DD o ISO 8601"),
});

export const insertPlanSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.union([
    z.number().positive("El precio debe ser positivo"), 
    z.string().transform(val => parseFloat(val))
  ]),
  description: z.string().optional(),
  maxUsers: z.union([
    z.number().int().positive(), 
    z.string().transform(val => parseInt(val))
  ]),
  maxTrucks: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const insertMembershipInvoiceSchema = z.object({
  companyId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  planId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  amount: z.union([
    z.number().positive("El monto debe ser positivo"),
    z.string().transform(val => parseFloat(val))
  ]),
  status: z.enum(["pending", "paid", "cancelled", "overdue"]).default("pending"),
  dueDate: z.string().refine((val) => {
    // Acepta tanto el formato ISO completo como solo la fecha YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val);
  }, "La fecha debe estar en formato YYYY-MM-DD o ISO 8601"),
  notes: z.string().optional(),
});

// Usuarios de la plataforma
export const platformUsers = pgTable("platform_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", {
    enum: ["platform_admin", "company_admin", "support"]
  }).notNull(),
  // Removido el campo isPlatformUser que no existe en la base de datos
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Asignación de usuarios a empresas
export const userCompanies = pgTable("user_companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => platformUsers.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  role: text("role", {
    enum: ["owner", "admin", "standard"]
  }).notNull().default("standard"),
});

// Configuraciones específicas de empresa
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id).unique(),
  settings: text("settings"), // JSON serializado
  theme: text("theme").default("default"),
  currency: text("currency").default("DOP"),
  timezone: text("timezone").default("America/Santo_Domingo"),
  language: text("language").default("es"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Esquemas de inserción para validación Zod
export const insertPlatformUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["platform_admin", "company_admin", "support"]),
  active: z.boolean().default(true),
});

export const insertUserCompanySchema = z.object({
  userId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  companyId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  role: z.enum(["owner", "admin", "standard"]).default("standard"),
});

export const insertCompanySettingsSchema = z.object({
  companyId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  settings: z.string().optional(),
  theme: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  contactEmail: z.string().email("Correo electrónico inválido").optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
});

// Tipos inferidos
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

export type InsertMembershipInvoice = z.infer<typeof insertMembershipInvoiceSchema>;
export type MembershipInvoice = typeof membershipInvoices.$inferSelect;

export type InsertPlatformUser = z.infer<typeof insertPlatformUserSchema>;
export type PlatformUser = typeof platformUsers.$inferSelect;

export type InsertUserCompany = z.infer<typeof insertUserCompanySchema>;
export type UserCompany = typeof userCompanies.$inferSelect;

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;