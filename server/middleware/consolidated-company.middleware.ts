import { Request, Response, NextFunction } from "express";
import { getCurrentCompanyId, setCurrentCompanyId } from "../company-db";
import { platformDb } from "../platform-db";
import { companies } from "../../shared/platform-schema";
import { eq } from "drizzle-orm";

let companySuspensionCache: Map<number, { status: string; cachedAt: number }> = new Map();
const CACHE_TTL = 60000; // 1 minuto

async function isCompanySuspended(companyId: number): Promise<{ suspended: boolean; status: string | null }> {
  const now = Date.now();
  const cached = companySuspensionCache.get(companyId);
  
  if (cached && (now - cached.cachedAt) < CACHE_TTL) {
    return { suspended: cached.status === 'suspended', status: cached.status };
  }
  
  try {
    const [company] = await platformDb.select({ status: companies.status }).from(companies).where(eq(companies.id, companyId));
    const status = company?.status || 'active';
    companySuspensionCache.set(companyId, { status, cachedAt: now });
    return { suspended: status === 'suspended', status };
  } catch (error) {
    console.error('[Company Middleware] Error verificando estado de empresa:', error);
    return { suspended: false, status: null };
  }
}

export function clearCompanySuspensionCache(companyId?: number): void {
  if (companyId) {
    companySuspensionCache.delete(companyId);
  } else {
    companySuspensionCache.clear();
  }
}

/**
 * Middleware consolidado para la gestión multi-tenant
 * Este middleware unifica la obtención del companyId de diferentes fuentes
 * y lo establece en el contexto para su uso en toda la aplicación.
 */
export function consolidatedCompanyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Para rutas de plataforma y test-session, no alteramos nada
  if (req.path.startsWith('/api/platform') || 
      req.path === '/api/login' || 
      req.path === '/api/logout' ||
      req.path.startsWith('/api/test-session')) {
    return next();
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
    
    // Verificar si la empresa está suspendida (solo para rutas de API de empresa)
    if (req.path.startsWith('/api/') && !req.path.startsWith('/api/platform')) {
      isCompanySuspended(companyId).then(({ suspended, status }) => {
        if (suspended) {
          console.log(`[Company Middleware] Empresa ${companyId} está suspendida, bloqueando acceso`);
          
          // Permitir solo rutas de consulta de estado y logout
          const allowedPaths = ['/api/logout', '/api/user', '/api/company-status'];
          if (!allowedPaths.some(p => req.path.startsWith(p))) {
            res.status(403).json({
              error: "Cuenta suspendida",
              message: "Su cuenta ha sido suspendida. Por favor, contacte al administrador de la plataforma para más información.",
              status: "suspended"
            });
            return; // No llamar next() - bloquear la solicitud
          }
        }
        next();
      }).catch((error) => {
        console.error('[Company Middleware] Error verificando suspensión:', error);
        next();
      });
      return;
    }
  } else {
    // Si no hay companyId y no es una ruta pública
    if (req.path.startsWith('/api/') && 
        !req.path.startsWith('/api/public/') && 
        !req.path.startsWith('/api/leads/') &&
        req.path !== '/api/contact') {
      
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