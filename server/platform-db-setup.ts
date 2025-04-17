import { sql } from "drizzle-orm";
import { platformDb } from "./platform-db";
import bcrypt from "bcrypt";

// Función para crear todas las tablas necesarias para la plataforma
export async function setupPlatformTables() {
  try {
    console.log("Iniciando configuración de tablas de plataforma...");

    // Crear tabla de empresas
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subdomain TEXT NOT NULL UNIQUE,
        logo TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        plan_id INTEGER NOT NULL,
        expiration_date TIMESTAMP NOT NULL
      )
    `);
    console.log("Tabla 'companies' creada o ya existente");

    // Crear tabla de planes
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        max_users INTEGER NOT NULL,
        max_trucks INTEGER NOT NULL,
        features TEXT[],
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);
    console.log("Tabla 'plans' creada o ya existente");

    // Crear tabla de facturas de membresía
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS membership_invoices (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        plan_id INTEGER NOT NULL REFERENCES plans(id),
        amount DECIMAL(10, 2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        invoice_date TIMESTAMP NOT NULL DEFAULT NOW(),
        due_date TIMESTAMP NOT NULL,
        paid_date TIMESTAMP,
        payment_method TEXT,
        notes TEXT
      )
    `);
    console.log("Tabla 'membership_invoices' creada o ya existente");

    // Crear tabla de usuarios de plataforma
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        company_id INTEGER REFERENCES companies(id),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        phone TEXT,
        last_login TIMESTAMP,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Tabla 'platform_users' creada o ya existente");

    // Crear tabla de configuraciones de empresa
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS company_settings (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) UNIQUE,
        logo TEXT,
        name TEXT NOT NULL,
        rnc TEXT,
        street TEXT NOT NULL,
        street_number TEXT NOT NULL,
        province_id INTEGER NOT NULL,
        municipality_id INTEGER NOT NULL,
        contact_phone TEXT NOT NULL,
        email TEXT,
        country TEXT NOT NULL,
        currency TEXT NOT NULL,
        tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        latitude DECIMAL(10, 6),
        longitude DECIMAL(10, 6)
      )
    `);
    console.log("Tabla 'company_settings' creada o ya existente");

    // Crear tabla de asignación de usuarios a empresas
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS user_company (
        user_id INTEGER NOT NULL REFERENCES platform_users(id),
        company_id INTEGER NOT NULL REFERENCES companies(id),
        PRIMARY KEY (user_id, company_id)
      )
    `);
    console.log("Tabla 'user_company' creada o ya existente");

    console.log("Configuración de tablas de plataforma completada con éxito");
    return true;
  } catch (error) {
    console.error("Error al configurar tablas de plataforma:", error);
    return false;
  }
}

// Función para insertar datos iniciales (plan y admin)
export async function insertInitialPlatformData() {
  try {
    console.log("Iniciando inserción de datos iniciales de plataforma...");

    // Verificar si ya existen planes
    const existingPlans = await platformDb.execute(sql`SELECT COUNT(*) FROM plans`);
    const plansCount = parseInt(existingPlans.rows[0].count as string);

    if (plansCount === 0) {
      // Insertar plan básico
      await platformDb.execute(sql`
        INSERT INTO plans (name, price, description, max_users, max_trucks, features, is_active)
        VALUES ('Plan Básico', 99.99, 'Plan básico para pequeñas empresas', 5, 3, ARRAY['Gestión de usuarios', 'Rutas básicas', 'Reportes básicos'], TRUE)
      `);

      // Insertar plan profesional
      await platformDb.execute(sql`
        INSERT INTO plans (name, price, description, max_users, max_trucks, features, is_active)
        VALUES ('Plan Profesional', 199.99, 'Plan profesional con características avanzadas', 15, 10, ARRAY['Gestión de usuarios', 'Rutas avanzadas', 'Reportes avanzados', 'Optimización de rutas', 'API REST'], TRUE)
      `);

      // Insertar plan empresarial
      await platformDb.execute(sql`
        INSERT INTO plans (name, price, description, max_users, max_trucks, features, is_active)
        VALUES ('Plan Empresarial', 299.99, 'Plan empresarial con todas las características', 50, 30, ARRAY['Gestión de usuarios', 'Rutas avanzadas', 'Reportes avanzados', 'Optimización de rutas', 'API REST', 'Soporte 24/7', 'Personalización'], TRUE)
      `);

      console.log("Planes insertados correctamente");
    } else {
      console.log("Ya existen planes en la base de datos, omitiendo inserción");
    }

    // Verificar si ya existen administradores de plataforma
    const existingAdmins = await platformDb.execute(sql`
      SELECT COUNT(*) FROM platform_users WHERE role = 'platform_admin'
    `);
    const adminsCount = parseInt(existingAdmins.rows[0].count as string);

    if (adminsCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin12345', salt);

      // Insertar administrador de plataforma
      await platformDb.execute(sql`
        INSERT INTO platform_users (name, email, password, role, active)
        VALUES ('Administrador', 'admin@plataforma.com', ${hashedPassword}, 'platform_admin', TRUE)
      `);

      console.log("Administrador de plataforma creado correctamente");
      console.log("Email: admin@plataforma.com");
      console.log("Contraseña: admin12345");
    } else {
      console.log("Ya existen administradores de plataforma, omitiendo inserción");
    }

    console.log("Inserción de datos iniciales de plataforma completada con éxito");
    return true;
  } catch (error) {
    console.error("Error al insertar datos iniciales de plataforma:", error);
    return false;
  }
}

// Función principal para configurar la plataforma
export async function setupPlatform() {
  console.log("Iniciando configuración de plataforma...");
  
  const tablesSetup = await setupPlatformTables();
  if (!tablesSetup) {
    console.error("Error en la configuración de tablas, abortando");
    return false;
  }
  
  const dataInserted = await insertInitialPlatformData();
  if (!dataInserted) {
    console.error("Error en la inserción de datos iniciales, abortando");
    return false;
  }
  
  console.log("Configuración de plataforma completada con éxito");
  return true;
}