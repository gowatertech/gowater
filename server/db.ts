import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as fullSchema from "@shared/schema";
import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// Actualizado para incluir el campo email y mantener la coherencia con el modelo completo
export const usersSimple = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  username: text("username").notNull(),
  email: text("email"), // Añadimos campo email para mantener coherencia
  password: text("password").notNull(),
  role: text("role").notNull(),
  active: boolean("active").notNull().default(true),
  phone: text("phone"),
  license: text("license"),
  licenseExpiry: timestamp("license_expiry", { mode: 'string' }),
  hireDate: timestamp("hire_date").notNull().defaultNow(),
  emergencyContact: text("emergency_contact"),
  currentLocation: text("current_location"),
  lastLocationUpdate: timestamp("last_location_update"),
});

// Crear esquema simplificado para usar en las consultas actuales
const schemaSimple = {
  ...fullSchema,
  users: usersSimple,
};

neonConfig.webSocketConstructor = ws;

if (!process.env.COMPANY_DATABASE_URL) {
  console.warn(
    "COMPANY_DATABASE_URL not set, falling back to DATABASE_URL for company operations",
  );
}

// Si no está disponible COMPANY_DATABASE_URL, usar la misma base de datos principal (DATABASE_URL)
const companyDbUrl = process.env.COMPANY_DATABASE_URL || process.env.DATABASE_URL;

if (!companyDbUrl) {
  throw new Error(
    "No database connection URL available. Make sure either DATABASE_URL or COMPANY_DATABASE_URL is set.",
  );
}

export const pool = new Pool({ connectionString: companyDbUrl });
export const db = drizzle({ client: pool, schema: schemaSimple });