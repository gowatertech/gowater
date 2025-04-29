import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { setCurrentCompanyId } from '../company-db';
import { storage } from '../storage';

/**
 * Middleware que autentica las solicitudes para el panel de empresa.
 * Verifica que el usuario tenga sesión y los permisos adecuados.
 */
export function companyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log("🔒 Verificando autenticación...");

  if (!req.session || !req.session.user) {
    console.log("❌ No hay sesión de usuario");
    return res.status(401).json({
      success: false,
      message: "No autenticado"
    });
  }

  // Verificar y establecer el companyId
  const companyId = req.session.companyId || req.session.user.companyId;
  
  if (!companyId) {
    console.log("❌ No hay companyId en la sesión");
    return res.status(403).json({
      success: false,
      message: "No se encontró el ID de compañía"
    });
  }
  
  // Establecer el companyId en el contexto
  setCurrentCompanyId(companyId);
  console.log(`✅ CompanyId establecido: ${companyId}`);

  // Verificar si el usuario tiene un rol permitido para el panel de empresa
  const allowedRoles = ['admin', 'supervisor', 'cashier'];
  if (!allowedRoles.includes(req.session.user.role)) {
    console.log(`Auth middleware: Rol no permitido: ${req.session.user.role}`);
    return res.status(403).json({
      success: false,
      message: 'No tiene permisos para acceder al panel de empresa'
    });
  }

  // Continuar con la siguiente función de middleware o ruta
  next();
}

/**
 * Middleware que establece el contexto de multi-tenant basado en la sesión.
 * A diferencia del middleware de autenticación, este no exige autenticación.
 */
export function companyTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
    const companyId = req.session.companyId || (req.session.user ? req.session.user.companyId : null);
    if (companyId) {
      setCurrentCompanyId(companyId);
    }
  } else {
    // Si no hay sesión o no tiene companyId, limpiar el contexto
    console.log("No hay companyId en el contexto, limpiando contexto")
    setCurrentCompanyId(undefined);
  }
  next();
}

/**
 * Handler para el login con email y contraseña
 */
export async function loginWithEmail(req: Request, res: Response) {
  try {
    console.log("POST /api/login - Recibido:", JSON.stringify(req.body));
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email y contraseña son requeridos" 
      });
    }

    // Buscar usuario por email
    const user = await storage.getUserByEmail(email);

    if (!user) {
      console.log(`Login fallido: Usuario con email ${email} no encontrado`);
      return res.status(401).json({ 
        success: false, 
        message: "No encontramos una cuenta con ese correo electrónico. Por favor, verifica tus datos o contacta con soporte." 
      });
    }

    // Verificar que el usuario está activo
    if (!user.active) {
      console.log(`Login fallido: Usuario inactivo: ${email}`);
      return res.status(401).json({ 
        success: false, 
        message: "La cuenta está desactivada" 
      });
    }

    // Verificar la contraseña
    let validPassword = false;

    // La mayoría de las contraseñas aún están en texto plano, así que comprobamos primero eso
    validPassword = password === user.password;

    // Si la contraseña de texto plano coincide, debemos actualizar a bcrypt
    if (validPassword) {
      console.log(`ADVERTENCIA: Usuario ${email} tiene contraseña en texto plano. Actualizando a bcrypt.`);
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await storage.updateUserPassword(user.id, hashedPassword);
        console.log(`Contraseña de ${email} actualizada a formato bcrypt.`);
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
      console.log(`Login fallido: Contraseña incorrecta para usuario: ${email}`);
      return res.status(401).json({ 
        success: false, 
        message: "La contraseña ingresada es incorrecta. Por favor intenta nuevamente." 
      });
    }

    // Verificar roles permitidos para el panel de empresa
    const allowedRoles = ['admin', 'supervisor', 'cashier'];
    if (!allowedRoles.includes(user.role)) {
      console.log(`Login fallido: Rol no permitido: ${user.role} para usuario: ${email}`);
      return res.status(403).json({ 
        success: false, 
        message: "No tienes permiso para acceder al panel de administración" 
      });
    }

    // Crear objeto de usuario sin la contraseña para la sesión
    const { password: pwd, ...userWithoutPassword } = user;

    // Guardar información del usuario y companyId en la sesión
    req.session.user = userWithoutPassword;
    req.session.companyId = user.companyId;

    // IMPORTANTE: Sincronizar el companyId con asyncLocalStorage
    // Esto asegura que getCurrentCompanyId() devuelva el valor correcto
    setCurrentCompanyId(user.companyId);

    console.log(`Login exitoso - Usuario: ${email}, ID: ${user.id}, Empresa: ${user.companyId} (sincronizado en contexto)`);

    // Responder con éxito y los datos del usuario (sin contraseña)
    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error en el servidor al procesar el login"
    });
  }
}

/**
 * Handler para el logout
 */
export function logout(req: Request, res: Response) {
  // Limpiar el companyId del contexto antes de destruir la sesión
  setCurrentCompanyId(undefined);

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
}

/**
 * Handler para obtener la información del usuario actual
 */
export function getCurrentUser(req: Request, res: Response) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "No autenticado"
    });
  }

  return res.status(200).json({
    success: true,
    user: req.session.user
  });
}

/**
 * Verifica los permisos específicos de un usuario basado en su rol.
 * @param requiredRoles - Array de roles permitidos.
 */
export function checkRoleMiddleware(requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado"
      });
    }

    if (!requiredRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción"
      });
    }

    next();
  };
}