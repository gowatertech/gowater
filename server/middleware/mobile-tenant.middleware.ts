import { Request, Response, NextFunction } from 'express';
import { setCurrentCompanyId } from '../company-db';

/**
 * Middleware para verificar la autenticación del usuario móvil
 */
export function mobileAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    console.log("Autenticación móvil fallida: No hay usuario en la sesión");
    return res.status(401).json({
      success: false,
      message: "No autenticado"
    });
  }
  
  console.log("Usuario móvil autenticado:", req.session.user.username);
  next();
}

/**
 * Middleware para gestionar el tenant (empresa) en la app móvil
 * Prioriza el companyId del usuario autenticado
 */
export function mobileApiTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  let companyId: number | undefined;
  
  // Prioridad 1: Obtener companyId del usuario autenticado
  if (req.user) {
    if ('companyId' in req.user && req.user.companyId) {
      companyId = req.user.companyId;
      console.log("MobileAPI - Usando companyId del usuario:", companyId);
    } else if ('company_id' in req.user && req.user.company_id) {
      // Soporte para company_id (DB) vs companyId (schema)
      companyId = req.user.company_id;
      console.log("MobileAPI - Usando company_id del usuario:", companyId);
    }
  } 
  // Prioridad 2: Obtener companyId de la sesión
  else if (req.session && req.session.companyId) {
    companyId = req.session.companyId;
    console.log("MobileAPI - Usando companyId de la sesión:", companyId);
  } 
  // Prioridad 3: Obtener companyId de los parámetros de consulta o cuerpo
  else if (req.query.companyId) {
    companyId = Number(req.query.companyId);
    console.log("MobileAPI - Usando companyId de los parámetros de consulta:", companyId);
  } 
  else if (req.body && req.body.companyId) {
    companyId = Number(req.body.companyId);
    console.log("MobileAPI - Usando companyId del cuerpo de la solicitud:", companyId);
  }

  // Si no tenemos companyId, intenta usar el valor por defecto de la sesión
  if (!companyId && process.env.NODE_ENV !== 'production') {
    console.log("MobileAPI - No se encontró companyId en la solicitud");
    
    // Solo en modo de desarrollo, podemos usar un companyId por defecto
    if (req.path === '/login') {
      // Para login, no asignamos ningún companyId por defecto
      console.log("MobileAPI - Omitiendo asignación de companyId por defecto para login");
    } else {
      companyId = 1; // Compañía por defecto para pruebas/desarrollo
      req.session.companyId = companyId;
      console.log("MobileAPI - Asignando companyId por defecto (solo en desarrollo):", companyId);
    }
  }
  
  // Si tenemos un companyId, establecerlo en el contexto
  if (companyId) {
    console.log("Configurando companyId=" + companyId + " en el contexto");
    setCurrentCompanyId(companyId);
  }
  
  // Continuar con la siguiente solicitud
  next();
}