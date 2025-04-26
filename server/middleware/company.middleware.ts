/**
 * Middleware consolidado para manejar el contexto de empresa
 * 
 * Este middleware unifica y centraliza las diferentes fuentes de obtención del companyId
 * para proporcionar un contexto consistente en toda la aplicación.
 */

import { Request, Response, NextFunction } from 'express';
import { getCurrentCompanyId, setCurrentCompanyId } from '../company-db';

/**
 * Middleware que consolida todos los mecanismos para establecer el ID de empresa actual
 * Prioridad:
 * 1. Session (req.session.companyId)
 * 2. JWT o token de autenticación (req.user.companyId)
 * 3. Parámetro de consulta (req.query.companyId)
 * 4. Cabecera personalizada (X-Company-ID)
 * 5. Subdominios (company-name.domain.com)
 */
export function consolidatedCompanyMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let companyId: number | undefined = undefined;
    let source = '';

    // 1. Intentar obtener desde la sesión
    if (req.session && req.session.companyId) {
      companyId = parseInt(req.session.companyId.toString());
      source = 'session';
    }
    
    // 2. Si no se encontró en la sesión, intentar desde el usuario autenticado
    if (!companyId && req.user && 'companyId' in req.user) {
      companyId = parseInt(req.user.companyId.toString());
      source = 'user';
    }
    
    // 3. Si todavía no hay companyId, intentar desde query params
    if (!companyId && req.query.companyId) {
      companyId = parseInt(req.query.companyId.toString());
      source = 'query';
    }
    
    // 4. Intentar desde header personalizado
    if (!companyId && req.headers['x-company-id']) {
      companyId = parseInt(req.headers['x-company-id'].toString());
      source = 'header';
    }
    
    // 5. Intentar desde subdominio (solo en producción o si está configurado)
    if (!companyId && req.hostname && req.hostname.includes('.') && process.env.USE_SUBDOMAIN_TENANTS === 'true') {
      const subdomain = req.hostname.split('.')[0];
      // Aquí necesitarías un servicio para mapear subdominios a companyIds
      // Este es solo un ejemplo simplificado
      // companyId = await companyService.getCompanyIdBySubdomain(subdomain);
      source = 'subdomain';
    }
    
    // Si se encontró un companyId, establecerlo en el contexto y en la sesión para futuros requests
    if (companyId && !isNaN(companyId)) {
      console.log(`[Company Context] Estableciendo companyId=${companyId} desde ${source}`);
      
      // Establecer en el contexto actual
      setCurrentCompanyId(companyId);
      
      // Si la fuente no era la sesión, guardar en la sesión para futuras solicitudes
      if (source !== 'session' && req.session) {
        req.session.companyId = companyId;
      }
    } else {
      console.log(`[Company Context] No se encontró companyId en ninguna fuente`);
    }
    
    next();
  } catch (error) {
    console.error('[Company Middleware] Error:', error);
    next();
  }
}

/**
 * Función de utilidad para registrar operaciones relacionadas con el contexto de tenant
 */
export function logTenantOperation(req: Request, operation: string, data: Record<string, any> = {}) {
  const companyId = getCurrentCompanyId();
  const userId = req.user && 'id' in req.user ? req.user.id : undefined;
  const sessionId = req.session?.id;
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation,
    companyId,
    userId,
    sessionId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    data
  }));
}