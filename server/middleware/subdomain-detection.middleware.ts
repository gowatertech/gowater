import { Request, Response, NextFunction } from 'express';
import { setCurrentCompanyId } from '../company-db';
import { platformDb } from '../platform-db';
import { companies } from '@shared/platform-schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware para detectar el subdominio y configurar la empresa correspondiente
 */
export function subdomainDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Obtener el hostname de la solicitud (ej: empresa1.gowater.com)
  const hostname = req.hostname;
  
  // Lista de dominios principales (no subdominios)
  const mainDomains = ['gowater.com', 'www.gowater.com', 'localhost'];
  
  // Extraer el subdominio
  let subdomain = null;
  
  if (hostname && !mainDomains.includes(hostname)) {
    // Dividir el hostname por puntos
    const parts = hostname.split('.');
    
    // Si hay al menos 3 partes (subdominio.dominio.extension) o
    // estamos en localhost con formato subdominio.localhost
    if (parts.length >= 3 || (parts.length === 2 && parts[1] === 'localhost')) {
      // El subdominio es la primera parte
      subdomain = parts[0];
    }
  }
  
  // Permitir simulación de subdominio a través de query param para desarrollo
  if (!subdomain && process.env.NODE_ENV !== 'production') {
    subdomain = req.query.subdomain as string || null;
    if (subdomain) {
      console.log(`Usando subdominio simulado desde parámetro de consulta: ${subdomain}`);
    }
  }
  
  // Si tenemos un subdominio, buscar la empresa correspondiente
  if (subdomain) {
    (async () => {
      try {
        // Buscar la empresa por subdominio
        const [company] = await platformDb
          .select()
          .from(companies)
          .where(eq(companies.subdomain, subdomain));
        
        if (company) {
          // Establecer el ID de la empresa en el contexto
          console.log(`Subdominio detectado: ${subdomain} - Empresa: ${company.name} (ID: ${company.id})`);
          setCurrentCompanyId(company.id);
          
          // Guardar en la sesión
          if (req.session) {
            req.session.companyId = company.id;
            
            // También establecer datos específicos si el usuario está autenticado
            if (req.session.user) {
              req.session.user.companyId = company.id;
            }
          }
        } else {
          console.log(`Subdominio no encontrado: ${subdomain}`);
        }
      } catch (error) {
        console.error(`Error al buscar empresa por subdominio ${subdomain}:`, error);
      }
      
      // Siempre continuar con la petición
      next();
    })();
  } else {
    // Si no hay subdominio, simplemente continuar
    next();
  }
}