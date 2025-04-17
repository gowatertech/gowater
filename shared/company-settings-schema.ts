import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { companies } from "./platform-schema";
import { provinces, municipalities } from "./schema";

// Configuraciones por empresa
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id).unique(),
  logo: text("logo"),
  name: text("name").notNull(),
  rnc: text("rnc"),
  street: text("street").notNull(),
  streetNumber: text("street_number").notNull(),
  provinceId: integer("province_id").notNull().references(() => provinces.id),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  contactPhone: text("contact_phone").notNull(),
  email: text("email"),
  country: text("country").notNull(),
  currency: text("currency").notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0.00"),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
});

// Relaciones entre tablas
export const companySettingsRelations = relations(companySettings, ({ one }) => ({
  company: one(companies, {
    fields: [companySettings.companyId],
    references: [companies.id],
  }),
  province: one(provinces, {
    fields: [companySettings.provinceId],
    references: [provinces.id],
  }),
  municipality: one(municipalities, {
    fields: [companySettings.municipalityId],
    references: [municipalities.id],
  }),
}));

// Esquemas de inserción para validación Zod
export const insertCompanySettingsSchema = z.object({
  companyId: z.number().int().positive(),
  logo: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  rnc: z.string().optional(),
  street: z.string().min(1, "La dirección es requerida"),
  streetNumber: z.string().min(1, "El número es requerido"),
  provinceId: z.number().int().positive(),
  municipalityId: z.number().int().positive(),
  contactPhone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Correo electrónico inválido").optional(),
  country: z.string().min(1, "El país es requerido"),
  currency: z.string().min(1, "La moneda es requerida"),
  tax: z.number().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

// Tipos inferidos
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;