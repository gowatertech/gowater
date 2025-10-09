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

// Determinar la URL de la base de datos según el entorno
let companyDbUrl: string;

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

if (isProduction) {
  // En producción, usar DATABASE_URL que Replit configura automáticamente para producción
  // NUNCA usar COMPANY_DATABASE_URL en producción a menos que esté explícitamente configurado
  companyDbUrl = process.env.DATABASE_URL!;
  
  if (!companyDbUrl) {
    throw new Error(
      "DATABASE_URL not set in production. Ensure database is enabled in deployment settings.",
    );
  }
  
  console.log("🟢 [PRODUCTION] Using production database");
} else {
  // En desarrollo, usar COMPANY_DATABASE_URL si existe, sino DATABASE_URL local
  companyDbUrl = process.env.COMPANY_DATABASE_URL || process.env.DATABASE_URL!;
  
  if (!companyDbUrl) {
    throw new Error(
      "No database connection URL available for development. Make sure DATABASE_URL is set.",
    );
  }
  
  console.log("🟡 [DEVELOPMENT] Using development database");
}

export const pool = new Pool({ connectionString: companyDbUrl });
export const db = drizzle({ client: pool, schema: schemaSimple });