import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { platformUsers, plans } from "../shared/platform-schema";
import { eq } from "drizzle-orm";

// La URL de la base de datos de desarrollo (origen de los datos)
const devDatabaseUrl = process.env.DATABASE_URL;

// La URL de la base de datos de producción (destino de los datos)
// Debe configurarse como variable de entorno PRODUCTION_DATABASE_URL
const prodDatabaseUrl = process.env.PRODUCTION_DATABASE_URL;

if (!devDatabaseUrl) {
  console.error("❌ DATABASE_URL no está configurada");
  process.exit(1);
}

if (!prodDatabaseUrl) {
  console.error("❌ PRODUCTION_DATABASE_URL no está configurada");
  console.error("💡 Configura la variable de entorno PRODUCTION_DATABASE_URL con la URL de la base de datos de producción");
  process.exit(1);
}

if (devDatabaseUrl === prodDatabaseUrl) {
  console.error("❌ DATABASE_URL y PRODUCTION_DATABASE_URL son iguales");
  console.error("⚠️  Esto copiaría los datos a la misma base de datos");
  process.exit(1);
}

const devSql = neon(devDatabaseUrl);
const devDb = drizzle(devSql);

const prodSql = neon(prodDatabaseUrl);
const prodDb = drizzle(prodSql);

async function copySuperAdminToProduction() {
  console.log("\n🔐 Copiando Super Admin a producción...");
  
  // Obtener super admin de desarrollo
  const devSuperAdmins = await devDb
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.email, "superadmin@gowater.com"));

  if (devSuperAdmins.length === 0) {
    console.log("⚠️  Super admin no existe en desarrollo");
    return;
  }

  const devSuperAdmin = devSuperAdmins[0];

  // Verificar si ya existe en producción
  const prodSuperAdmins = await prodDb
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.email, "superadmin@gowater.com"));

  if (prodSuperAdmins.length > 0) {
    console.log("⚠️  Super admin ya existe en producción (ID: " + prodSuperAdmins[0].id + ")");
    return;
  }

  // Copiar a producción
  const newSuperAdmin = await prodDb
    .insert(platformUsers)
    .values({
      name: devSuperAdmin.name,
      email: devSuperAdmin.email,
      password: devSuperAdmin.password, // Ya está hasheada
      role: devSuperAdmin.role,
    })
    .returning();

  console.log("✅ Super admin copiado a producción");
  console.log("  🆔 ID: " + newSuperAdmin[0].id);
  console.log("  📧 Email: " + newSuperAdmin[0].email);
  console.log("  👤 Nombre: " + newSuperAdmin[0].name);
}

async function copyPlansToProduction() {
  console.log("\n📋 Copiando planes a producción...");
  
  // Obtener todos los planes de desarrollo
  const devPlans = await devDb.select().from(plans).orderBy(plans.id);

  if (devPlans.length === 0) {
    console.log("⚠️  No hay planes en desarrollo");
    return;
  }

  console.log(`📦 Encontrados ${devPlans.length} planes en desarrollo`);

  let copied = 0;
  let skipped = 0;

  for (const plan of devPlans) {
    // Verificar si ya existe en producción (por nombre)
    const existingPlans = await prodDb
      .select()
      .from(plans)
      .where(eq(plans.name, plan.name));

    if (existingPlans.length > 0) {
      console.log(`  ⏭️  Plan "${plan.name}" ya existe en producción`);
      skipped++;
      continue;
    }

    // Copiar plan a producción (sin el ID para que se genere automáticamente)
    await prodDb.insert(plans).values({
      name: plan.name,
      price: plan.price,
      description: plan.description,
      maxUsers: plan.maxUsers,
      maxTrucks: plan.maxTrucks,
      features: plan.features,
      isActive: plan.isActive,
    });

    console.log(`  ✅ Plan "${plan.name}" copiado a producción`);
    copied++;
  }

  console.log(`\n📊 Resumen:`);
  console.log(`  ✅ Copiados: ${copied}`);
  console.log(`  ⏭️  Omitidos (ya existían): ${skipped}`);
}

async function main() {
  console.log("🚀 Iniciando copia de datos a producción...");
  console.log("📊 Origen: DATABASE_URL (desarrollo)");
  console.log("🎯 Destino: PRODUCTION_DATABASE_URL (producción)\n");

  try {
    await copySuperAdminToProduction();
    await copyPlansToProduction();
    
    console.log("\n🎉 ¡Proceso completado exitosamente!");
    console.log("\n📝 Credenciales del Super Admin:");
    console.log("  📧 Email: superadmin@gowater.com");
    console.log("  🔑 Contraseña: SuperAdmin123");
  } catch (error) {
    console.error("\n❌ Error durante el proceso:", error);
    process.exit(1);
  }
}

main();
