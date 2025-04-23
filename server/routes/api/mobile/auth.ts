import express, { Router, Request, Response } from 'express';
import { db } from '../../../db';
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Usuario y contraseña son requeridos" 
      });
    }

    try {
      // Buscar el usuario por nombre de usuario
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (!user) {
        console.log(`Login fallido: Usuario no encontrado: ${username}`);
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
      req.session.companyId = user.company_id;
      
      console.log(`Login exitoso - Usuario: ${username}, ID: ${user.id}, Empresa: ${user.company_id}`);
      
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
   * Devuelve la información del usuario autenticado
   */
  router.get('/me', (req: Request, res: Response) => {
    // Verificar si hay un usuario en la sesión
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado"
      });
    }
    
    // Devolver la información del usuario
    return res.status(200).json({
      success: true,
      user: req.session.user
    });
  });

  return router;
}