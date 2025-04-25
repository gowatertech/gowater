import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que verifica si el usuario está autenticado para el panel de empresa
 * Este middleware es para proteger rutas que requieren autenticación
 */
export function companyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user || !req.session.companyId) {
    console.log('Acceso no autorizado a ruta protegida. Usuario no autenticado.');
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }

  // Si llegamos aquí, el usuario está autenticado
  next();
}

/**
 * Middleware para establecer el ID de la empresa en el contexto
 * Este middleware establece el companyId del usuario autenticado para ser usado por la DB multitenant
 */
export function companyTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Establecer el ID de la empresa desde la sesión, si está disponible
  const companyId = req.session?.companyId;
  
  if (companyId) {
    // Aquí se usaría un método para establecer el ID de la empresa en el contexto
    // El cual sería accesible por todas las operaciones de DB siguientes
    global.currentCompanyId = companyId;
    console.log(`Establecido ID de empresa en el contexto: ${companyId}`);
  } else {
    console.log('No hay ID de empresa en la sesión, usando contexto predeterminado');
  }
  
  next();
}