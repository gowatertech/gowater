import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { companies } from "./platform-schema";
import { users } from "./schema";

// Usuarios de la plataforma (platform_admins, company_admins)
export const platformUsers = pgTable("platform_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", {
    enum: ["platform_admin", "company_admin"]
  }).notNull(),
  companyId: integer("company_id").references(() => companies.id),
  active: boolean("active").notNull().default(true),
  phone: text("phone"),
  lastLogin: timestamp("last_login"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relaciones entre tablas
export const platformUsersRelations = relations(platformUsers, ({ one }) => ({
  company: one(companies, {
    fields: [platformUsers.companyId],
    references: [companies.id],
  }),
}));

// Esquemas de inserción para validación Zod
export const insertPlatformUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["platform_admin", "company_admin"]),
  companyId: z.number().int().positive().optional(),
  phone: z.string().optional(),
  active: z.boolean().default(true),
});

// Tipos inferidos
export type InsertPlatformUser = z.infer<typeof insertPlatformUserSchema>;
export type PlatformUser = typeof platformUsers.$inferSelect;

// Modificación para añadir companyId a los usuarios regulares existentes
export const userCompany = pgTable("user_company", {
  userId: integer("user_id").notNull().references(() => users.id).primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
});

// Relaciones para user_company
export const userCompanyRelations = relations(userCompany, ({ one }) => ({
  user: one(users, {
    fields: [userCompany.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [userCompany.companyId],
    references: [companies.id],
  })
}));