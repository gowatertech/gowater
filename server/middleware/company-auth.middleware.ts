import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { setCurrentCompanyId } from '../company-db';
import bcrypt from 'bcrypt';

/**
 * Middleware que verifica si el usuario está autenticado para el panel de empresa
 * Este middleware es para proteger rutas que requieren autenticación
 */
export function companyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Si el usuario ya está autenticado en la sesión, permitir acceso
  if (req.session.user) {
    console.log(`Usuario ya autenticado: ${req.session.user.name} (${req.session.user.email})`);
    return next();
  }
  
  // Si no está autenticado y no es una ruta de autenticación, denegar acceso
  if (req.path !== '/api/login' && req.path !== '/api/register' && req.path !== '/api/forgot-password') {
    console.log(`Acceso denegado a ${req.path}: Usuario no autenticado`);
    return res.status(401).json({
      success: false,
      message: 'Por favor inicie sesión para acceder'
    });
  }
  
  // Dejar pasar las rutas de autenticación (login, register, etc.)
  next();
}

/**
 * Middleware para establecer el ID de la empresa en el contexto
 * Este middleware establece el companyId del usuario autenticado para ser usado por la DB multitenant
 */
export function companyTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Si el usuario está autenticado, establecer el companyId del contexto
  if (req.session.user && req.session.user.companyId) {
    console.log(`Estableciendo companyId=${req.session.user.companyId} para usuario ${req.session.user.id}`);
    setCurrentCompanyId(req.session.user.companyId);
    req.session.companyId = req.session.user.companyId;
  }
  
  next();
}

/**
 * Función para iniciar sesión con email y contraseña
 */
export async function loginWithEmail(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione email y contraseña'
      });
    }
    
    // Buscar usuario por email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log(`Intento de login fallido: Email ${email} no encontrado`);
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }
    
    // Verificar si el usuario está activo
    if (!user.active) {
      console.log(`Intento de login fallido: Usuario ${email} está inactivo`);
      return res.status(401).json({
        success: false,
        message: 'Su cuenta ha sido desactivada. Contacte al administrador.'
      });
    }
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log(`Intento de login fallido: Contraseña incorrecta para ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }
    
    // Si todo es correcto, crear sesión
    const userSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    };
    
    // Guardar el usuario en la sesión
    req.session.user = userSession;
    
    // También establecer el companyId en el contexto del request
    req.session.companyId = user.companyId;
    
    console.log(`Login exitoso: ${user.name} (${user.email}) de empresa ${user.companyId}`);
    
    // Devolver información del usuario (sin contraseña)
    return res.status(200).json({
      success: true,
      message: `Bienvenido, ${user.name}`,
      user: userSession
    });
    
  } catch (error) {
    console.error('Error en loginWithEmail:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el inicio de sesión'
    });
  }
}

/**
 * Función para cerrar sesión
 */
export function logout(req: Request, res: Response) {
  // Si hay una sesión activa, destruirla
  if (req.session.user) {
    const userName = req.session.user.name;
    
    // Destruir la sesión
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return res.status(500).json({
          success: false,
          message: 'Error al cerrar sesión'
        });
      }
      
      console.log(`Sesión cerrada para ${userName}`);
      return res.status(200).json({
        success: true,
        message: 'Sesión cerrada correctamente'
      });
    });
  } else {
    // Si no hay sesión activa, simplemente devolver éxito
    return res.status(200).json({
      success: true,
      message: 'No había sesión activa'
    });
  }
}

/**
 * Función para obtener el usuario actual
 */
export function getCurrentUser(req: Request, res: Response) {
  if (req.session.user) {
    return res.status(200).json({
      success: true,
      user: req.session.user
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'No hay sesión activa'
    });
  }
}