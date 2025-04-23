import { Router, Request, Response } from 'express';
import { platformDb } from '../platform-db';
import { companies } from '@shared/platform-schema';
import { eq } from 'drizzle-orm';
import { getCurrentCompanyId } from '../company-db';

const router = Router();

/**
 * Endpoint para probar la detección de subdominio
 * GET /api/test-subdomain
 */
router.get('/', async (req: Request, res: Response) => {
  const hostname = req.hostname;
  const subdomain = hostname.split('.')[0];
  
  // Comprobar si hay subdominio en la sesión o en la consulta para desarrollo
  let detectedSubdomain = subdomain;
  if (process.env.NODE_ENV !== 'production' && req.query.subdomain) {
    detectedSubdomain = req.query.subdomain as string;
  }
  
  // Obtener la lista de todas las empresas para mostrar
  const allCompanies = await platformDb.select().from(companies);
  
  // Información actual de sesión
  const sessionInfo = {
    companyId: req.session.companyId || null,
    user: req.session.user ? {
      ...req.session.user,
      // No mostrar información sensible
      password: undefined
    } : null
  };
  
  // Detectar la empresa actual basada en el subdominio
  let detectedCompany = null;
  if (detectedSubdomain && detectedSubdomain !== 'localhost') {
    const [company] = await platformDb
      .select()
      .from(companies)
      .where(eq(companies.subdomain, detectedSubdomain));
    
    if (company) {
      detectedCompany = {
        id: company.id,
        name: company.name,
        subdomain: company.subdomain
      };
    }
  }
  
  // Responder con información de diagnóstico
  res.json({
    hostname,
    detectedSubdomain,
    session: sessionInfo,
    detectedCompany,
    currentCompanyId: getCurrentCompanyId() || null,
    allCompanies: allCompanies.map(company => ({
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      active: company.active
    }))
  });
});

export default router;