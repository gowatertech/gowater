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
  planId: z.number().int().positive(),
  expirationDate: z.string().datetime(),
});

export const insertPlanSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.number().positive("El precio debe ser positivo"),
  description: z.string().optional(),
  maxUsers: z.number().int().positive(),
  maxTrucks: z.number().int().positive(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const insertMembershipInvoiceSchema = z.object({
  companyId: z.number().int().positive(),
  planId: z.number().int().positive(),
  amount: z.number().positive("El monto debe ser positivo"),
  status: z.enum(["pending", "paid", "cancelled", "overdue"]).default("pending"),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

// Tipos inferidos
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

export type InsertMembershipInvoice = z.infer<typeof insertMembershipInvoiceSchema>;
export type MembershipInvoice = typeof membershipInvoices.$inferSelect;