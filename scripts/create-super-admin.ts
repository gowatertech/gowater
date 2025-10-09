import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import bcrypt from 'bcrypt';
import { platformUsers } from '../shared/platform-schema';
import * as platformSchema from '../shared/platform-schema';
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

const SUPER_ADMIN_EMAIL = 'superadmin@gowater.com';

async function createSuperAdmin() {
  // Replicar la misma lógica de platform-db.ts para seleccionar la base de datos correcta
  let platformDbUrl: string;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // En producción, usar DATABASE_URL que Replit configura para producción
    platformDbUrl = process.env.DATABASE_URL!;
    
    if (!platformDbUrl) {
      throw new Error('DATABASE_URL not set in production. Ensure database is enabled in deployment.');
    }
    
    console.log('🟢 [PRODUCTION] Creating super admin in production database');
  } else {
    // En desarrollo, usar PLATFORM_DATABASE_URL si existe, sino DATABASE_URL local
    platformDbUrl = process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URL!;
    
    if (!platformDbUrl) {
      throw new Error('No database connection URL available. Make sure DATABASE_URL is set.');
    }
    
    console.log('🟡 [DEVELOPMENT] Creating super admin in development database');
  }

  console.log('🚀 Starting super admin creation process...');

  const pool = new Pool({ connectionString: platformDbUrl });
  const db = drizzle({ client: pool, schema: platformSchema });

  try {
    // Verificar si ya existe el super admin
    const existing = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, SUPER_ADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      console.log('⚠️  Super admin already exists');
      console.log('📧 Email:', SUPER_ADMIN_EMAIL);
      console.log('🆔 ID:', existing[0].id);
      console.log('✅ Role:', existing[0].role);
      return;
    }

    // Solicitar contraseña
    const password = process.argv[2];
    
    if (!password) {
      console.error('❌ Error: Debe proporcionar una contraseña como argumento');
      console.log('📝 Uso: tsx scripts/create-super-admin.ts <contraseña>');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Error: La contraseña debe tener al menos 8 caracteres');
      process.exit(1);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el super admin
    const [superAdmin] = await db
      .insert(platformUsers)
      .values({
        name: 'Super Administrador',
        email: SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'platform_admin',
        active: true,
      })
      .returning();

    console.log('✅ Super admin created successfully!');
    console.log('');
    console.log('📋 Detalles del Super Admin:');
    console.log('  🆔 ID:', superAdmin.id);
    console.log('  📧 Email:', superAdmin.email);
    console.log('  👤 Nombre:', superAdmin.name);
    console.log('  🔐 Role:', superAdmin.role);
    console.log('');
    console.log('🔒 Este usuario tiene protección especial y no puede ser modificado por otros usuarios');
    console.log('');
    console.log('📝 Credenciales de acceso:');
    console.log('  Email:', SUPER_ADMIN_EMAIL);
    console.log('  Contraseña: [la que proporcionaste]');
    console.log('');
    console.log('⚠️  IMPORTANTE: Guarda estas credenciales en un lugar seguro');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar
createSuperAdmin()
  .then(() => {
    console.log('🎉 Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Process failed:', error);
    process.exit(1);
  });
