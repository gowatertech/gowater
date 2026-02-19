import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Estados de empresa
export type CompanyStatus = "active" | "trial" | "suspended" | "cancelled";

// Empresas (tenants)
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  logo: text("logo"),
  active: boolean("active").notNull().default(true),
  status: text("status", {
    enum: ["active", "trial", "suspended", "cancelled"]
  }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  planId: integer("plan_id").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  // Campos para suspensión
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  gracePeriodEnds: timestamp("grace_period_ends"),
  // Campos para trial/membresía
  trialEndsAt: timestamp("trial_ends_at"),
  lastPaymentDate: timestamp("last_payment_date"),
});

// Ciclos de facturación
export type BillingCycle = "monthly" | "quarterly" | "yearly";

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
  // Ciclos de facturación y trial
  billingCycle: text("billing_cycle", {
    enum: ["monthly", "quarterly", "yearly"]
  }).notNull().default("monthly"),
  trialDays: integer("trial_days").notNull().default(0),
  // Descuentos por pago adelantado
  quarterlyDiscount: decimal("quarterly_discount", { precision: 5, scale: 2 }).default("0"),
  yearlyDiscount: decimal("yearly_discount", { precision: 5, scale: 2 }).default("0"),
  // Días de gracia antes de suspensión
  gracePeriodDays: integer("grace_period_days").notNull().default(7),
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
    enum: ["pending", "paid", "partial", "cancelled", "overdue"]
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
  status: z.enum(["active", "trial", "suspended", "cancelled"]).default("active"),
  planId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  expirationDate: z.string().refine((val) => {
    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val);
  }, "La fecha debe estar en formato YYYY-MM-DD o ISO 8601"),
  // Campos opcionales para suspensión
  suspendedAt: z.string().optional(),
  suspensionReason: z.string().optional(),
  gracePeriodEnds: z.string().optional(),
  // Campos para trial/membresía
  trialEndsAt: z.string().optional(),
  lastPaymentDate: z.string().optional(),
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
  // Ciclos de facturación y trial
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  trialDays: z.union([
    z.number().int().min(0),
    z.string().transform(val => parseInt(val))
  ]).default(0),
  // Descuentos
  quarterlyDiscount: z.union([
    z.number().min(0).max(100),
    z.string().transform(val => parseFloat(val))
  ]).default(0),
  yearlyDiscount: z.union([
    z.number().min(0).max(100),
    z.string().transform(val => parseFloat(val))
  ]).default(0),
  // Días de gracia
  gracePeriodDays: z.union([
    z.number().int().min(0),
    z.string().transform(val => parseInt(val))
  ]).default(7),
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
  // Campo para almacenar la compañía principal del usuario (especialmente para company_admin)
  companyId: integer("company_id").references(() => companies.id),
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
  // CompanyId es opcional, principalmente para usuarios company_admin
  companyId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val)),
    z.undefined()
  ]).optional(),
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

// Configuración global de la plataforma
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Esquema para validación de configuración general
export const platformGeneralSettingsSchema = z.object({
  platformName: z.string().min(2, "El nombre de la plataforma debe tener al menos 2 caracteres"),
  billingCompanyName: z.string().optional(),
  address: z.string().optional(),
  rnc: z.string().optional(),
  supportEmail: z.string().email("Email inválido"),
  supportPhone: z.string().optional(),
  logoUrl: z.string().optional(),
  enableRegistration: z.boolean().default(false),
  maintenanceMode: z.boolean().default(false),
});

// Esquema para validación de configuración de correo
export const platformEmailSettingsSchema = z.object({
  smtpServer: z.string().min(1, "El servidor SMTP es requerido"),
  smtpPort: z.string().min(1, "El puerto SMTP es requerido"),
  smtpUser: z.string().min(1, "El usuario SMTP es requerido"),
  smtpPassword: z.string().optional(),
  senderEmail: z.string().email("Email inválido"),
  senderName: z.string().min(1, "El nombre del remitente es requerido"),
});

// Tipos inferidos
export type PlatformGeneralSettings = z.infer<typeof platformGeneralSettingsSchema>;
export type PlatformEmailSettings = z.infer<typeof platformEmailSettingsSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;

// =============================================
// HISTORIAL DE ESTADOS DE EMPRESA
// =============================================

export const companyStatusHistory = pgTable("company_status_history", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  previousStatus: text("previous_status", {
    enum: ["active", "trial", "suspended", "cancelled"]
  }),
  newStatus: text("new_status", {
    enum: ["active", "trial", "suspended", "cancelled"]
  }).notNull(),
  reason: text("reason"),
  changedBy: integer("changed_by").references(() => platformUsers.id),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  metadata: text("metadata"), // JSON para datos adicionales
});

export const insertCompanyStatusHistorySchema = z.object({
  companyId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  previousStatus: z.enum(["active", "trial", "suspended", "cancelled"]).optional(),
  newStatus: z.enum(["active", "trial", "suspended", "cancelled"]),
  reason: z.string().optional(),
  changedBy: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]).optional(),
  metadata: z.string().optional(),
});

export type InsertCompanyStatusHistory = z.infer<typeof insertCompanyStatusHistorySchema>;
export type CompanyStatusHistory = typeof companyStatusHistory.$inferSelect;

// =============================================
// NOTIFICACIONES DE PLATAFORMA
// =============================================

export type NotificationType = "payment_reminder" | "suspension_warning" | "trial_ending" | "invoice_generated" | "payment_received" | "company_suspended" | "company_reactivated";

export const platformNotifications = pgTable("platform_notifications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  type: text("type", {
    enum: ["payment_reminder", "suspension_warning", "trial_ending", "invoice_generated", "payment_received", "company_suspended", "company_reactivated"]
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status", {
    enum: ["pending", "sent", "failed", "read"]
  }).notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  metadata: text("metadata"), // JSON para datos adicionales como invoiceId, etc.
});

export const insertPlatformNotificationSchema = z.object({
  companyId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  type: z.enum(["payment_reminder", "suspension_warning", "trial_ending", "invoice_generated", "payment_received", "company_suspended", "company_reactivated"]),
  title: z.string().min(1),
  message: z.string().min(1),
  status: z.enum(["pending", "sent", "failed", "read"]).default("pending"),
  scheduledFor: z.string().optional(),
  metadata: z.string().optional(),
});

export type InsertPlatformNotification = z.infer<typeof insertPlatformNotificationSchema>;
export type PlatformNotification = typeof platformNotifications.$inferSelect;

// =============================================
// MÉTRICAS DE PLATAFORMA (para cache de KPIs)
// =============================================

export const platformMetrics = pgTable("platform_metrics", {
  id: serial("id").primaryKey(),
  metricDate: timestamp("metric_date").notNull(),
  mrr: decimal("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCompanies: integer("total_companies").notNull().default(0),
  activeCompanies: integer("active_companies").notNull().default(0),
  trialCompanies: integer("trial_companies").notNull().default(0),
  suspendedCompanies: integer("suspended_companies").notNull().default(0),
  cancelledCompanies: integer("cancelled_companies").notNull().default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  pendingInvoices: integer("pending_invoices").notNull().default(0),
  overdueInvoices: integer("overdue_invoices").notNull().default(0),
  overdueAmount: decimal("overdue_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  newCompaniesThisMonth: integer("new_companies_this_month").notNull().default(0),
  churnedCompaniesThisMonth: integer("churned_companies_this_month").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlatformMetricsSchema = z.object({
  metricDate: z.string(),
  mrr: z.union([z.number(), z.string()]).optional(),
  totalCompanies: z.number().int().optional(),
  activeCompanies: z.number().int().optional(),
  trialCompanies: z.number().int().optional(),
  suspendedCompanies: z.number().int().optional(),
  cancelledCompanies: z.number().int().optional(),
  totalRevenue: z.union([z.number(), z.string()]).optional(),
  pendingInvoices: z.number().int().optional(),
  overdueInvoices: z.number().int().optional(),
  overdueAmount: z.union([z.number(), z.string()]).optional(),
  newCompaniesThisMonth: z.number().int().optional(),
  churnedCompaniesThisMonth: z.number().int().optional(),
});

export type InsertPlatformMetrics = z.infer<typeof insertPlatformMetricsSchema>;
export type PlatformMetrics = typeof platformMetrics.$inferSelect;

// =============================================
// COBROS DE PLATAFORMA
// =============================================

export const platformPayments = pgTable("platform_payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  invoiceId: integer("invoice_id").references(() => membershipInvoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  paymentMethod: text("payment_method", {
    enum: ["transfer", "cash", "card", "check", "other"]
  }).notNull().default("transfer"),
  concept: text("concept").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  status: text("status", {
    enum: ["completed", "pending", "cancelled"]
  }).notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlatformPaymentSchema = z.object({
  companyId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val))
  ]),
  invoiceId: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val)),
    z.null()
  ]).optional().nullable(),
  amount: z.union([
    z.number().positive("El monto debe ser positivo"),
    z.string().transform(val => parseFloat(val))
  ]),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(["transfer", "cash", "card", "check", "other"]).default("transfer"),
  concept: z.string().min(1, "El concepto es requerido"),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["completed", "pending", "cancelled"]).default("completed"),
});

export type InsertPlatformPayment = z.infer<typeof insertPlatformPaymentSchema>;
export type PlatformPayment = typeof platformPayments.$inferSelect;