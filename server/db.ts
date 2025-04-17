import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

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
export const db = drizzle({ client: pool, schema });