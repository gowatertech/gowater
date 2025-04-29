import { Request, Response, NextFunction } from "express";
import { getCurrentCompanyId, setCurrentCompanyId } from "../company-db";

/**
 * Middleware consolidado para la gestión multi-tenant
 * Este middleware unifica la obtención del companyId de diferentes fuentes
 * y lo establece en el contexto para su uso en toda la aplicación.
 */
export function consolidatedCompanyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Para rutas de plataforma o login/logout, no alteramos nada
  if (req.path.startsWith('/api/platform') || 
      req.path === '/api/login' || 
      req.path === '/api/logout') {
    return next();
  }
  
  // Verificar autenticación para rutas del generador de rutas
  if (req.path.startsWith('/api/route-generator')) {
    // Verificar si el usuario está autenticado
    if (!req.session?.user) {
      console.log(`🔒 Verificando autenticación para generador de rutas: ${req.path}`);
      console.log(`❌ No hay sesión de usuario`);
      return res.status(401).json({
        success: false,
        message: "No autenticado"
      });
    }
  }

  // Obtener el companyId de diversas fuentes, con prioridades
  let companyId: number | undefined;

  // 1. Prioridad: Sesión de usuario
  if (req.session?.companyId) {
    companyId = req.session.companyId;
    console.log(`[Company Middleware] Usando companyId=${companyId} de la sesión`);
  }
  // 2. Prioridad: Usuario en la sesión
  else if (req.session?.user?.companyId) {
    companyId = req.session.user.companyId;
    console.log(`[Company Middleware] Usando companyId=${companyId} del usuario en sesión`);
  }
  // 3. Prioridad: Body de la petición (generalmente para API endpoints)
  else if (req.body?.companyId) {
    companyId = parseInt(req.body.companyId);
    if (!isNaN(companyId)) {
      console.log(`[Company Middleware] Usando companyId=${companyId} del body`);
      // Actualizar sesión para consistencia
      if (req.session) {
        req.session.companyId = companyId;
      }
    }
  }
  // 4. Prioridad: Query string
  else if (req.query?.companyId) {
    companyId = parseInt(req.query.companyId as string);
    if (!isNaN(companyId)) {
      console.log(`[Company Middleware] Usando companyId=${companyId} del query string`);
      // Actualizar sesión para consistencia
      if (req.session) {
        req.session.companyId = companyId;
      }
    }
  }

  // Establecer el companyId en el contexto
  if (companyId) {
    setCurrentCompanyId(companyId);
  } else {
    // Si no hay companyId y no es una ruta pública
    if (req.path.startsWith('/api/') && 
        !req.path.startsWith('/api/public/') && 
        !req.path.startsWith('/api/leads/')) {
      
      // Verificar si la ruta es para pedidos pendientes y tiene el parámetro debug=true
      const isDebugMode = req.path.includes('/zones/') && 
                          req.path.includes('/pending-orders') && 
                          req.query.debug === 'true' && 
                          process.env.NODE_ENV === 'development';
                         
      if (isDebugMode) {
        console.log(`[Company Middleware] Modo debug activado para ruta: ${req.path}`);
        // Continuar sin companyId para permitir que la lógica del endpoint determine qué hacer
      } else {
        console.log(`[Company Middleware] No se encontró companyId para ruta protegida: ${req.path}`);
        return res.status(401).json({ 
          error: "Autenticación requerida",
          message: "Debe iniciar sesión con una cuenta de empresa válida"
        });
      }
    }
    console.log(`[Company Middleware] No hay companyId para ruta: ${req.path}`);
    setCurrentCompanyId(undefined);
  }

  next();
}