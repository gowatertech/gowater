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
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        plan_id INTEGER NOT NULL,
        expiration_date TIMESTAMP NOT NULL,
        suspended_at TIMESTAMP,
        suspension_reason TEXT,
        grace_period_ends TIMESTAMP,
        trial_ends_at TIMESTAMP,
        last_payment_date TIMESTAMP
      )
    `);
    console.log("Tabla 'companies' creada o ya existente");
    
    // Añadir columnas nuevas si no existen (para migraciones)
    await platformDb.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'status') THEN
          ALTER TABLE companies ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'suspended_at') THEN
          ALTER TABLE companies ADD COLUMN suspended_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'suspension_reason') THEN
          ALTER TABLE companies ADD COLUMN suspension_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'grace_period_ends') THEN
          ALTER TABLE companies ADD COLUMN grace_period_ends TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'trial_ends_at') THEN
          ALTER TABLE companies ADD COLUMN trial_ends_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'last_payment_date') THEN
          ALTER TABLE companies ADD COLUMN last_payment_date TIMESTAMP;
        END IF;
      END $$
    `);
    console.log("Columnas de suspensión añadidas a 'companies'");

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
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        billing_cycle TEXT NOT NULL DEFAULT 'monthly',
        trial_days INTEGER NOT NULL DEFAULT 0,
        quarterly_discount DECIMAL(5, 2) DEFAULT 0,
        yearly_discount DECIMAL(5, 2) DEFAULT 0,
        grace_period_days INTEGER NOT NULL DEFAULT 7
      )
    `);
    console.log("Tabla 'plans' creada o ya existente");
    
    // Añadir columnas nuevas de planes si no existen
    await platformDb.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'billing_cycle') THEN
          ALTER TABLE plans ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'monthly';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'trial_days') THEN
          ALTER TABLE plans ADD COLUMN trial_days INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'quarterly_discount') THEN
          ALTER TABLE plans ADD COLUMN quarterly_discount DECIMAL(5, 2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'yearly_discount') THEN
          ALTER TABLE plans ADD COLUMN yearly_discount DECIMAL(5, 2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'grace_period_days') THEN
          ALTER TABLE plans ADD COLUMN grace_period_days INTEGER NOT NULL DEFAULT 7;
        END IF;
      END $$
    `);
    console.log("Columnas de membresía añadidas a 'plans'");

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
        is_platform_user BOOLEAN NOT NULL DEFAULT TRUE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Tabla 'platform_users' creada o ya existente");

    // Crear tabla de asignación de usuarios a empresas
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS user_companies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES platform_users(id),
        company_id INTEGER NOT NULL REFERENCES companies(id),
        assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        role TEXT NOT NULL DEFAULT 'standard'
      )
    `);
    console.log("Tabla 'user_companies' creada o ya existente");

    // Crear tabla de configuraciones de empresa
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS company_settings (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) UNIQUE,
        settings TEXT,
        theme TEXT DEFAULT 'default',
        currency TEXT DEFAULT 'DOP',
        timezone TEXT DEFAULT 'America/Santo_Domingo',
        language TEXT DEFAULT 'es',
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        logo_url TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Tabla 'company_settings' creada o ya existente");

    // Crear tabla de configuración global de la plataforma
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Tabla 'platform_settings' creada o ya existente");

    // Crear tabla de historial de estados de empresa
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS company_status_history (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        previous_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT,
        changed_by INTEGER REFERENCES platform_users(id),
        changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata TEXT
      )
    `);
    console.log("Tabla 'company_status_history' creada o ya existente");

    // Crear tabla de notificaciones de plataforma
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_notifications (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        scheduled_for TIMESTAMP,
        sent_at TIMESTAMP,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata TEXT
      )
    `);
    console.log("Tabla 'platform_notifications' creada o ya existente");

    // Crear tabla de métricas de plataforma
    await platformDb.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_metrics (
        id SERIAL PRIMARY KEY,
        metric_date TIMESTAMP NOT NULL,
        mrr DECIMAL(12, 2) NOT NULL DEFAULT 0,
        total_companies INTEGER NOT NULL DEFAULT 0,
        active_companies INTEGER NOT NULL DEFAULT 0,
        trial_companies INTEGER NOT NULL DEFAULT 0,
        suspended_companies INTEGER NOT NULL DEFAULT 0,
        cancelled_companies INTEGER NOT NULL DEFAULT 0,
        total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
        pending_invoices INTEGER NOT NULL DEFAULT 0,
        overdue_invoices INTEGER NOT NULL DEFAULT 0,
        overdue_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        new_companies_this_month INTEGER NOT NULL DEFAULT 0,
        churned_companies_this_month INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Tabla 'platform_metrics' creada o ya existente");

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