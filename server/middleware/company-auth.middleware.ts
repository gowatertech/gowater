import { Request, Response, NextFunction } from 'express';
import { setCurrentCompanyId } from '../company-db';

/**
 * Middleware para detectar y establecer el ID de compañía actual
 * Este middleware debe ser aplicado a nivel de aplicación o router
 * para centralizar la obtención del companyId de múltiples fuentes
 */
export function companyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  
  // No intentar establecer companyId para rutas públicas, recursos estáticos o endpoints de plataforma
  if (
    path.startsWith('/api/platform') || 
    path.startsWith('/platform') ||
    path.startsWith('/images') || 
    path.startsWith('/favicon') || 
    path.startsWith('/manifest') ||
    path.startsWith('/sw.js') ||
    path.startsWith('/src/') || // Archivos de desarrollo Vite
    path === '/'
  ) {
    // Limpiar el contexto para evitar filtraciones de sesión
    setCurrentCompanyId(undefined);
    return next();
  }
  
  try {
    // Buscar companyId de varias fuentes en orden de prioridad
    
    // 1. Primero buscar en el usuario autenticado (más fiable)
    if (req.isAuthenticated() && req.user && (req.user as any).companyId) {
      const companyId = (req.user as any).companyId;
      
      // También guardar en la sesión para mantener consistencia
      if (req.session) {
        req.session.companyId = companyId;
      }
      
      // Establecer en el contexto
      setCurrentCompanyId(companyId);
      return next();
    }
    
    // 2. Buscar en la sesión
    if (req.session && req.session.companyId) {
      setCurrentCompanyId(req.session.companyId);
      return next();
    }
    
    // 3. Buscar en headers personalizados (para APIs)
    if (req.headers['x-company-id']) {
      const headerCompanyId = parseInt(req.headers['x-company-id'] as string, 10);
      
      if (!isNaN(headerCompanyId)) {
        // Validar que el usuario tiene acceso a esta compañía
        // TODO: Implementar validación más rigurosa aquí
        
        // También guardar en la sesión para futuras peticiones
        if (req.session) {
          req.session.companyId = headerCompanyId;
        }
        
        setCurrentCompanyId(headerCompanyId);
        return next();
      }
    }
    
    // 4. Buscar en query params (menos seguro, sólo para debugging o APIs específicas)
    if (req.query.companyId) {
      const queryCompanyId = parseInt(req.query.companyId as string, 10);
      
      if (!isNaN(queryCompanyId)) {
        // Validar que el usuario tiene acceso a esta compañía
        // TODO: Implementar validación más rigurosa aquí
        
        // También guardar en la sesión para futuras peticiones
        if (req.session) {
          req.session.companyId = queryCompanyId;
        }
        
        setCurrentCompanyId(queryCompanyId);
        return next();
      }
    }
    
    // 5. Buscar en el cuerpo de la petición (para endpoints específicos)
    if (req.body && req.body.companyId !== undefined && !isNaN(req.body.companyId)) {
      const bodyCompanyId = parseInt(req.body.companyId);
      
      // Validar que el usuario tiene acceso a esta compañía
      // TODO: Implementar validación más rigurosa aquí
      
      // También guardar en la sesión para futuras peticiones
      if (req.session) {
        req.session.companyId = bodyCompanyId;
      }
      
      setCurrentCompanyId(bodyCompanyId);
      return next();
    }
    
    // Si llegamos aquí, no se encontró companyId
    console.log(`[Company Middleware] No hay companyId para ruta: ${req.path}`);
    
    // Limpiar el contexto para evitar usar un companyId incorrecto
    setCurrentCompanyId(undefined);
    
    next();
  } catch (error) {
    console.error('Error en companyAuthMiddleware:', error);
    
    // Limpiar el contexto en caso de error
    setCurrentCompanyId(undefined);
    
    // Continuar, pero sin companyId
    next();
  }
}

/**
 * Middleware para requerir explícitamente un companyId
 * Usar en rutas que no deben funcionar sin un companyId válido
 */
export function requireCompanyId(req: Request, res: Response, next: NextFunction) {
  // Si ya intentamos usar el middleware anterior, el companyId debería estar en el contexto
  const companyId = req.session?.companyId;
  
  if (!companyId) {
    return res.status(403).json({
      success: false,
      message: 'No se pudo determinar el ID de la empresa. Por favor inicie sesión nuevamente.'
    });
  }
  
  // Si existe, continuar
  next();
}