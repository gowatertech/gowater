import { Router } from "express";
import { getCurrentCompanyId } from "../company-db";

/**
 * Registra un endpoint para diagnóstico del contexto multi-tenant
 * Útil para depurar problemas con el contexto de empresa
 */
export function registerDiagnosticEndpoint(router: Router) {
  router.get("/diagnostic/tenant-context", (req, res) => {
    const companyId = getCurrentCompanyId();
    const sessionCompanyId = req.session?.companyId;
    const userCompanyId = req.user && 'companyId' in req.user ? req.user.companyId : undefined;
    
    res.json({
      contextCompanyId: companyId,
      sessionCompanyId: sessionCompanyId,
      userCompanyId: userCompanyId,
      sessionData: req.session,
      authenticated: !!req.user,
      timestamp: new Date().toISOString()
    });
  });
}