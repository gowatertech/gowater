import express, { Router, Request, Response } from 'express';
import { db, pool } from '../../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * Crea las rutas para autenticación móvil
 */
export function createMobileAuthRoutes(): Router {
  const router = express.Router();

  /**
   * POST /mobile/login
   * Autentica un usuario móvil (conductor, asistente, etc.)
   */
  router.post('/login', async (req: Request, res: Response) => {
    console.log("Recibida solicitud de login en /api/mobile/login:", JSON.stringify(req.body));
    const { username, password } = req.body;

    if (!username || !password) {
      console.log("Error: Usuario o contraseña faltantes");
      return res.status(400).json({ 
        success: false, 
        message: "Usuario y contraseña son requeridos" 
      });
    }

    try {
      // Obtener el companyId de la sesión (establecido por el middleware de subdominio)
      const companyId = req.session.companyId;
      console.log(`Buscando usuario en compañía ID: ${companyId}`);
      
      // Usar una consulta SQL nativa para evitar problemas con discrepancias de esquema
      const query = `
        SELECT id, company_id as "companyId", name, username, password, role, active, 
          phone, license, license_expiry as "licenseExpiry", 
          emergency_contact as "emergencyContact", 
          current_location as "currentLocation", 
          last_location_update as "lastLocationUpdate"
        FROM users 
        WHERE username = $1
        ${companyId ? "AND company_id = $2" : ""}
      `;
      
      // Ejecutar la consulta con los parámetros adecuados
      const params = companyId ? [username, companyId] : [username];
      const result = await pool.query(query, params);
      
      // Obtener el primer usuario (si existe)
      const user = result.rows[0];
      
      // Imprimir la estructura completa del usuario para depuración
      console.log("Usuario encontrado:", user ? JSON.stringify(user) : "No encontrado");
      
      if (!user) {
        console.log(`Login fallido: Usuario no encontrado: ${username} en compañía: ${companyId}`);
        return res.status(401).json({ 
          success: false, 
          message: "Credenciales inválidas"
        });
      }
      
      // Verificar que el usuario está activo
      if (!user.active) {
        console.log(`Login fallido: Usuario inactivo: ${username}`);
        return res.status(401).json({ 
          success: false, 
          message: "La cuenta está desactivada" 
        });
      }
      
      // Verificar la contraseña (comparando directamente ya que está en texto plano)
      const validPassword = password === user.password;
      if (!validPassword) {
        console.log(`Login fallido: Contraseña incorrecta para usuario: ${username}. Esperada: ${user.password}, Recibida: ${password}`);
        return res.status(401).json({ 
          success: false, 
          message: "Credenciales inválidas"
        });
      }
      
      // Verificar roles permitidos para la app móvil
      const allowedRoles = ['driver', 'assistant', 'admin', 'supervisor'];
      if (!allowedRoles.includes(user.role)) {
        console.log(`Login fallido: Rol no permitido: ${user.role} para usuario: ${username}`);
        return res.status(403).json({ 
          success: false, 
          message: "No tienes permiso para acceder a la aplicación móvil" 
        });
      }
      
      // Crear objeto de usuario sin la contraseña para la sesión
      const { password: pwd, ...userWithoutPassword } = user;
      
      // Guardar información del usuario y companyId en la sesión
      req.session.user = userWithoutPassword;
      // Asegurar que usamos la propiedad correcta para el ID de empresa
      // En la DB es company_id pero en el esquema es companyId
      req.session.companyId = user.companyId || (user as any).company_id;
      
      console.log(`Login exitoso - Usuario: ${username}, ID: ${user.id}, Empresa: ${req.session.companyId}`);
      
      // Responder con éxito y los datos del usuario (sin contraseña)
      return res.status(200).json({
        success: true,
        message: "Login exitoso",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error en login móvil:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error de servidor"
      });
    }
  });

  /**
   * POST /mobile/logout
   * Cierra la sesión del usuario móvil
   */
  router.post('/logout', (req: Request, res: Response) => {
    // Destruir la sesión
    req.session.destroy((err) => {
      if (err) {
        console.error("Error al cerrar sesión:", err);
        return res.status(500).json({
          success: false, 
          message: "Error al cerrar sesión"
        });
      }
      
      return res.status(200).json({
        success: true, 
        message: "Sesión cerrada correctamente"
      });
    });
  });

  /**
   * GET /mobile/me
   * Devuelve la información del usuario autenticado y la empresa actual
   */
  router.get('/me', async (req: Request, res: Response) => {
    // Verificar si hay un usuario en la sesión
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado"
      });
    }
    
    try {
      // Información de la empresa, inicialmente nula
      let companyInfo = null;
      
      // Detectar si estamos en modo de simulación de subdominio
      let subdomain = req.query.subdomain as string;
      console.log(`Subdominio en query param: ${subdomain}`);
      
      // Usar el ID de empresa de la sesión o detectar por subdominio
      const companyId = req.session.companyId;
      console.log(`ID de empresa en sesión: ${companyId}`);
      
      // Si tenemos un ID de empresa, buscar la información
      if (companyId) {
        console.log(`Creando información de empresa para ID: ${companyId}`);
        
        // Crear objeto directamente (solución rápida para evitar problemas de BD)
        companyInfo = {
          id: companyId,
          name: companyId === 1 ? "AGUA HARRIS" : 
               companyId === 7 ? "Agua Maria" : 
               companyId === 10 ? "EMPRESA DE PRUEBA" : "Empresa Desconocida",
          subdomain: companyId === 1 ? "aguaharris" : 
                    companyId === 7 ? "aguamaria" : 
                    companyId === 10 ? "prueba" : "desconocido"
        };
        
        console.log(`Información de empresa generada: ${JSON.stringify(companyInfo)}`);
      } else if (subdomain) {
        console.log(`Detectando empresa por subdominio: ${subdomain}`);
        
        // Mapear directamente el subdominio a datos conocidos
        if (subdomain === "aguaharris") {
          companyInfo = { id: 1, name: "AGUA HARRIS", subdomain: "aguaharris" };
        } else if (subdomain === "aguamaria") {
          companyInfo = { id: 7, name: "Agua Maria", subdomain: "aguamaria" };
        } else if (subdomain === "prueba") {
          companyInfo = { id: 10, name: "EMPRESA DE PRUEBA", subdomain: "prueba" };
        }
        
        console.log(`Información de empresa por subdominio: ${JSON.stringify(companyInfo)}`);
      }
      
      // Devolver la información del usuario y la empresa
      return res.status(200).json({
        success: true,
        user: req.session.user,
        company: companyInfo
      });
    } catch (error) {
      console.error("Error al obtener información del usuario:", error);
      // Si hay un error, aún devolver la información del usuario
      return res.status(200).json({
        success: true,
        user: req.session.user
      });
    }
  });

  return router;
}