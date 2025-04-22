import express, { Request, Response, Router } from 'express';
import { db } from '../../../db';
import { users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export function createMobileAuthRoutes(): Router {
  const router = express.Router();

  /**
   * POST /api/mobile/login
   * Endpoint para autenticar usuarios en la app móvil
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password, companyId } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false,
          message: "Usuario y contraseña son requeridos" 
        });
      }
      
      console.log(`MobileAPI - Intento de login para usuario: ${username}`);
      
      // Si se proporciona companyId, usarlo para filtrar
      let userQuery = db.select().from(users);
      
      if (username) {
        userQuery = userQuery.where(eq(users.username, username));
      }
      
      if (companyId) {
        userQuery = userQuery.where(eq(users.companyId, companyId));
      }
      
      const [user] = await userQuery;
      
      if (!user) {
        console.log(`MobileAPI - Usuario no encontrado: ${username}`);
        return res.status(401).json({ 
          success: false,
          message: "Credenciales inválidas" 
        });
      }
      
      // Verificar contraseña con bcrypt
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log(`MobileAPI - Contraseña inválida para usuario: ${username}`);
        return res.status(401).json({ 
          success: false,
          message: "Credenciales inválidas" 
        });
      }
      
      if (!user.active) {
        console.log(`MobileAPI - Usuario inactivo: ${username}`);
        return res.status(403).json({ 
          success: false,
          message: "Usuario inactivo" 
        });
      }
      
      // Verificar roles permitidos para la app móvil
      const allowedRoles = ['driver', 'assistant', 'admin', 'supervisor'];
      if (!allowedRoles.includes(user.role)) {
        console.log(`MobileAPI - Rol no permitido: ${user.role} para usuario: ${username}`);
        return res.status(403).json({
          success: false,
          message: "Este usuario no tiene permiso para acceder a la app móvil"
        });
      }
      
      // Establecer la sesión
      req.session.user = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        companyId: user.companyId, // Asegurar que companyId está en la sesión
      };
      
      // También establecemos el companyId a nivel de sesión para el middleware
      req.session.companyId = user.companyId;
      
      // No devolver la contraseña en la respuesta
      const { password: pwd, ...userWithoutPassword } = user;
      
      console.log(`MobileAPI - Login exitoso para usuario ${username} (ID: ${user.id}, Empresa: ${user.companyId})`);
      
      res.json({
        success: true,
        message: "Login exitoso",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error en login móvil:", error);
      res.status(500).json({ 
        success: false,
        message: "Error de servidor al procesar el login",
        error: String(error)
      });
    }
  });

  /**
   * POST /api/mobile/logout
   * Endpoint para cerrar sesión en la app móvil
   */
  router.post('/logout', (req: Request, res: Response) => {
    if (req.session.user) {
      console.log(`MobileAPI - Cerrando sesión para usuario ID: ${req.session.user.id}`);
      
      // Destruir la sesión
      req.session.destroy((err) => {
        if (err) {
          console.error("Error al destruir sesión:", err);
          return res.status(500).json({
            success: false,
            message: "Error al cerrar sesión"
          });
        }
        
        res.json({
          success: true,
          message: "Sesión cerrada exitosamente"
        });
      });
    } else {
      console.log("MobileAPI - Intento de logout sin sesión activa");
      res.json({
        success: true,
        message: "No hay sesión activa"
      });
    }
  });

  /**
   * GET /api/mobile/me
   * Endpoint para obtener información del usuario actual en la app móvil
   */
  router.get('/me', (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado"
      });
    }
    
    console.log(`MobileAPI - Retornando información de usuario ID: ${req.session.user.id}`);
    
    res.json({
      success: true,
      user: req.session.user
    });
  });

  return router;
}