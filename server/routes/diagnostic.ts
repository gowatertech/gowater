import { Router, Request } from "express";
import { getCurrentCompanyId } from "../company-db";

/**
 * Registra un endpoint para diagnóstico del contexto multi-tenant
 * Útil para depurar problemas con el contexto de empresa
 */
export function registerDiagnosticEndpoint(router: Router) {
  router.get("/tenant-context", (req, res) => {
    const companyId = getCurrentCompanyId();
    const sessionCompanyId = req.session?.companyId;
    const userCompanyId = req.user && 'companyId' in req.user ? req.user.companyId : undefined;
    
    // Asegurar que devuelva JSON en lugar de HTML
    res.setHeader('Content-Type', 'application/json');
    
    res.json({
      contextCompanyId: companyId,
      sessionCompanyId: sessionCompanyId,
      userCompanyId: userCompanyId,
      session: {
        id: req.session?.id,
        hasUser: !!req.session?.user,
        cookie: req.session?.cookie ? {
          expires: req.session.cookie.expires,
          maxAge: req.session.cookie.maxAge
        } : null
      },
      authenticated: !!req.user,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });
}