import { db } from "../server/db";
import { users, companies } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTables() {
  console.log("Creando tablas...");
  
  try {
    // Verificamos si las tablas ya existen para evitar errores
    const result = await db.execute(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'users'
      );
    `);
    
    const tablesExist = result.rows[0]?.exists;
    
    if (!tablesExist) {
      console.log("Creando tablas de usuarios y compañías...");
      
      // Crear enumeración para roles de usuario
      await db.execute(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'cashier', 'driver', 'assistant');
            END IF;
        END$$;
      `);
      
      // Crear enumeración para estados de leads
      await db.execute(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
                CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'converted', 'declined');
            END IF;
        END$$;
      `);
      
      // Crear tabla companies
      await db.execute(`
        CREATE TABLE IF NOT EXISTS companies (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          subdomain TEXT NOT NULL UNIQUE,
          active BOOLEAN DEFAULT TRUE,
          logo_url TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          address TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      // Crear tabla users
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          email TEXT,
          password TEXT NOT NULL,
          role user_role DEFAULT 'admin' NOT NULL,
          active BOOLEAN DEFAULT TRUE,
          phone TEXT,
          license TEXT,
          license_expiry TIMESTAMP,
          emergency_contact TEXT,
          company_id INTEGER NOT NULL
        );
      `);
      
      // Crear tabla company_leads
      await db.execute(`
        CREATE TABLE IF NOT EXISTS company_leads (
          id SERIAL PRIMARY KEY,
          company_name TEXT NOT NULL,
          contact_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          business_description TEXT,
          estimated_users INTEGER,
          status lead_status DEFAULT 'new' NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log("Tablas creadas correctamente.");
      
      // Insertar compañía por defecto
      const companyResult = await db.execute(`
        INSERT INTO companies (name, subdomain, active)
        VALUES ('Empresa Predeterminada', 'default', TRUE)
        RETURNING id;
      `);
      
      const companyId = companyResult.rows[0]?.id;
      
      // Insertar usuario administrador por defecto
      const hashedPassword = await hashPassword('admin123');
      await db.execute(`
        INSERT INTO users (name, username, password, role, company_id)
        VALUES ('Administrador', 'admin', '${hashedPassword}', 'admin', ${companyId});
      `);
      
      console.log("Datos iniciales creados correctamente.");
    } else {
      console.log("Las tablas ya existen, omitiendo creación.");
    }
  } catch (error) {
    console.error("Error al crear tablas:", error);
  }
}

export async function runMigrations() {
  console.log("Ejecutando migraciones...");
  await createTables();
  console.log("Migraciones completadas.");
}

// Esta función se puede ejecutar directamente
// o desde server/index.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error en migraciones:", error);
      process.exit(1);
    });
}