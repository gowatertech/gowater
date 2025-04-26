/**
 * Middleware consolidado para manejar el contexto de compañía en el sistema multi-tenant
 */

import { Request, Response, NextFunction } from "express";
import { getCurrentCompanyId, setCurrentCompanyId } from "../company-db";

/**
 * Función para registrar operaciones importantes relacionadas con el contexto multi-tenant
 * Útil para debugging y auditoría
 */
export function logTenantOperation(req: Request, operation: string, data: any) {
  const companyId = getCurrentCompanyId();
  console.log(`[Multi-Tenant Operation] ${operation} | CompanyId: ${companyId || 'none'} | ${JSON.stringify(data)}`);
}

/**
 * Middleware consolidado que establece el ID de compañía actual basado en diferentes fuentes
 * con un orden de prioridad definido:
 * 1. Session (req.session.companyId)
 * 2. JWT token (req.user.companyId)
 * 3. Query parameter (?companyId=X)
 * 4. Header (X-Company-Id)
 * 
 * Esto permite flexibilidad en cómo se proporciona el contexto de compañía.
 */
export function consolidatedCompanyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Reiniciar el contexto para cada solicitud
  setCurrentCompanyId(undefined);
  
  let companyId: number | undefined = undefined;
  let source = "none";
  
  // Prioridad 1: Session
  if (req.session && req.session.companyId) {
    companyId = req.session.companyId;
    source = "session";
  }
  // Prioridad 2: JWT token (user object)
  else if (req.user && 'companyId' in req.user && req.user.companyId) {
    companyId = Number(req.user.companyId);
    source = "jwt";
  }
  // Prioridad 3: Query parameter
  else if (req.query.companyId) {
    companyId = Number(req.query.companyId);
    source = "query";
  }
  // Prioridad 4: Header
  else if (req.headers['x-company-id']) {
    companyId = Number(req.headers['x-company-id']);
    source = "header";
  }
  
  // Establecer el ID de compañía en el contexto actual
  if (companyId && !isNaN(companyId)) {
    setCurrentCompanyId(companyId);
    // console.log(`[Company Context] CompanyId establecido: ${companyId} (fuente: ${source})`);
  } else {
    console.log(`[Company Context] No se encontró companyId en ninguna fuente`);
  }
  
  next();
}