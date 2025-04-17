import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as platformSchema from "@shared/platform-schema";
import * as companySettingsSchema from "@shared/company-settings-schema";
import * as platformUsersSchema from "@shared/platform-users-schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.PLATFORM_DATABASE_URL) {
  console.warn(
    "PLATFORM_DATABASE_URL not set, falling back to DATABASE_URL for platform operations",
  );
}

// Si no está disponible PLATFORM_DATABASE_URL, usar la misma de la empresa (DATABASE_URL)
const platformDbUrl = process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URL;

if (!platformDbUrl) {
  throw new Error(
    "No database connection URL available. Make sure either DATABASE_URL or PLATFORM_DATABASE_URL is set.",
  );
}

// Combinamos todos los esquemas relacionados con la plataforma
const platformSchemas = {
  ...platformSchema,
  ...companySettingsSchema,
  ...platformUsersSchema
};

export const platformPool = new Pool({ connectionString: platformDbUrl });
export const platformDb = drizzle({ 
  client: platformPool, 
  schema: platformSchemas
});