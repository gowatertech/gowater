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

export function consolidatedCompanyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  if (req.path.startsWith('/api/platform') || 
      req.path === '/api/login' || 
      req.path === '/api/logout' ||
      req.path === '/api/authtest' ||
      req.path === '/api/user' ||
      req.path === '/api/mobile/login' ||
      req.path === '/api/mobile/logout' ||
      req.path.startsWith('/api/test-session') ||
      req.path.startsWith('/api/public/') ||
      req.path.startsWith('/api/leads/') ||
      req.path === '/api/contact') {
    return next();
  }

  let companyId: number | undefined;

  if (req.session?.companyId) {
    companyId = req.session.companyId;
  } else if (req.session?.user?.companyId) {
    companyId = req.session.user.companyId;
  } else if (req.body?.companyId) {
    companyId = parseInt(req.body.companyId);
    if (!isNaN(companyId) && req.session) {
      req.session.companyId = companyId;
    }
  } else if (req.query?.companyId) {
    companyId = parseInt(req.query.companyId as string);
    if (!isNaN(companyId) && req.session) {
      req.session.companyId = companyId;
    }
  }

  if (companyId) {
    setCurrentCompanyId(companyId);
    
    isCompanySuspended(companyId).then(({ suspended, status }) => {
      if (suspended) {
        const allowedPaths = ['/api/logout', '/api/user', '/api/company-status'];
        if (!allowedPaths.some(p => req.path.startsWith(p))) {
          res.status(403).json({
            error: "Cuenta suspendida",
            message: "Su cuenta ha sido suspendida. Por favor, contacte al administrador de la plataforma para más información.",
            status: "suspended"
          });
          return;
        }
      }
      next();
    }).catch(() => {
      next();
    });
    return;
  }

  const isDebugMode = req.path.includes('/zones/') && 
                      req.path.includes('/pending-orders') && 
                      req.query.debug === 'true' && 
                      process.env.NODE_ENV === 'development';
                     
  if (!isDebugMode) {
    return res.status(401).json({ 
      error: "Autenticación requerida",
      message: "Debe iniciar sesión con una cuenta de empresa válida"
    });
  }

  setCurrentCompanyId(undefined);
  next();
}
