// Módulo para conectarse a la base de datos
import pg from 'pg';
const { Pool } = pg;
import { getCurrentCompanyId, setCurrentCompanyId } from './company-db.js';

// Configuración de conexión a la BD
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Variable de entorno DATABASE_URL no definida");
  process.exit(1);
}

// Crear un pool de conexiones
export const pool = new Pool({
  connectionString: databaseUrl
});

// Promesa para verificar la conexión
export const poolPromise = pool.connect()
  .then(client => {
    client.release();
    return pool;
  })
  .catch(err => {
    console.error("Error al conectar a la base de datos:", err);
    throw err;
  });

// NOTE: companyId should be set dynamically based on user's session/authentication
// Never use hardcoded values in production to prevent multi-tenant data leaks

export default {
  pool,
  poolPromise
};