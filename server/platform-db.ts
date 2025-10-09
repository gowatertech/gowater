import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as platformSchema from "@shared/platform-schema";

neonConfig.webSocketConstructor = ws;

// Determinar la URL de la base de datos de plataforma según el entorno
let platformDbUrl: string;

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // En producción, usar DATABASE_URL que Replit configura para producción
  // La plataforma usa la misma DB que las operaciones de la empresa
  platformDbUrl = process.env.DATABASE_URL!;
  
  if (!platformDbUrl) {
    throw new Error(
      "DATABASE_URL not set in production for platform operations. Ensure database is enabled in deployment.",
    );
  }
  
  console.log("🟢 [PRODUCTION] Platform using production database");
} else {
  // En desarrollo, usar PLATFORM_DATABASE_URL si existe, sino DATABASE_URL local
  platformDbUrl = process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URL!;
  
  if (!platformDbUrl) {
    throw new Error(
      "No database connection URL available for platform operations. Make sure DATABASE_URL is set.",
    );
  }
  
  console.log("🟡 [DEVELOPMENT] Platform using development database");
}

export const platformPool = new Pool({ connectionString: platformDbUrl });
export const platformDb = drizzle({ 
  client: platformPool, 
  schema: platformSchema
});