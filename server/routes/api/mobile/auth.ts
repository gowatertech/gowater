import express, { Router, Request, Response } from 'express';
import { db } from '../../../db';
import { usersSimple } from '../../../db';
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
      // Buscar el usuario por nombre de usuario usando el esquema simplificado sin email
      const [user] = await db.select()
        .from(usersSimple)
        .where(eq(usersSimple.username, username));
      
      // Imprimir la estructura completa del usuario para depuración
      console.log("Usuario encontrado:", JSON.stringify(user));
      
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
      
      // Verificar la contraseña
      let validPassword = false;
      
      // Primero verificamos si coincide con texto plano (para usuarios antiguos)
      validPassword = password === user.password;
      
      // Si la contraseña de texto plano coincide, debemos actualizar a bcrypt
      if (validPassword) {
        console.log(`ADVERTENCIA: Usuario ${username} tiene contraseña en texto plano. Actualizando a bcrypt.`);
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          
          // Actualizar la contraseña en la base de datos
          await db
            .update(usersSimple)
            .set({ password: hashedPassword })
            .where(eq(usersSimple.id, user.id));
            
          console.log(`Contraseña de ${username} actualizada a formato bcrypt.`);
        } catch (hashError) {
          console.error(`Error al actualizar contraseña a bcrypt: ${hashError}`);
        }
      }
      
      // Si no coincide como texto plano, intentamos con bcrypt
      if (!validPassword) {
        try {
          validPassword = await bcrypt.compare(password, user.password);
        } catch (e) {
          console.log(`Error en la verificación de bcrypt: ${e}`);
          // Esto es normal si la contraseña no está hasheada con bcrypt
        }
      }
      
      if (!validPassword) {
        console.log(`Login fallido: Contraseña incorrecta para usuario: ${username}`);
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
      const { password: pwd, email, ...userWithoutPassword } = user;
      
      // Guardar información del usuario y companyId en la sesión
      req.session.user = {
        ...userWithoutPassword,
        email: email || undefined
      };
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
   * Devuelve la información del usuario autenticado
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
      // Buscar el usuario en la base de datos para asegurarnos de tener los datos actualizados
      const [user] = await db.select()
        .from(usersSimple)
        .where(eq(usersSimple.id, req.session.user.id));
      
      if (!user) {
        // Si el usuario ya no existe en la base de datos, cerrar sesión
        req.session.destroy((err) => {
          console.error("Error al cerrar sesión:", err);
        });
        
        return res.status(401).json({
          success: false,
          message: "Usuario no encontrado"
        });
      }
      
      // Devolver la información del usuario
      return res.status(200).json({
        success: true,
        user: user
      });
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener datos del usuario"
      });
    }
  });

  return router;
}