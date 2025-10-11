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
  
  // Prioridad 1: Obtener companyId del usuario autenticado (Passport)
  if (req.user) {
    if ('companyId' in req.user && req.user.companyId) {
      companyId = Number(req.user.companyId);
      console.log("MobileAPI - Usando companyId del usuario (Passport):", companyId);
    } else if ('company_id' in req.user && (req.user as any).company_id) {
      // Soporte para company_id (DB) vs companyId (schema)
      companyId = Number((req.user as any).company_id);
      console.log("MobileAPI - Usando company_id del usuario (Passport):", companyId);
    }
  } 
  
  // Prioridad 2: Obtener companyId de la sesión directamente
  if (!companyId && req.session) {
    if (req.session.companyId) {
      companyId = req.session.companyId;
      console.log("MobileAPI - Usando companyId de req.session.companyId:", companyId);
    } 
    // También verificar req.session.user.companyId para autenticación móvil
    else if (req.session.user && req.session.user.companyId) {
      companyId = Number(req.session.user.companyId);
      console.log("MobileAPI - Usando companyId de req.session.user.companyId:", companyId);
    }
  }
  
  // Prioridad 3: Obtener companyId de los parámetros de consulta o cuerpo
  if (!companyId && req.query.companyId) {
    companyId = Number(req.query.companyId);
    console.log("MobileAPI - Usando companyId de los parámetros de consulta:", companyId);
  } 
  
  if (!companyId && req.body && req.body.companyId) {
    companyId = Number(req.body.companyId);
    console.log("MobileAPI - Usando companyId del cuerpo de la solicitud:", companyId);
  }

  // Si no tenemos companyId, manejamos según la ruta
  if (!companyId) {
    console.log("MobileAPI - No se encontró companyId en la solicitud");
    
    // Para rutas públicas como login, no necesitamos un companyId
    if (req.path === '/login' || req.path === '/register' || req.path.startsWith('/public/')) {
      console.log("MobileAPI - Omitiendo asignación de companyId para ruta pública:", req.path);
    } else {
      // Para rutas que requieren autenticación, registramos la falta de companyId
      // pero permitimos que la solicitud continúe para que las APIs puedan manejar
      // la falta de contexto y devolver errores apropiados
      console.log("MobileAPI - ADVERTENCIA: Solicitud sin companyId para ruta protegida:", req.path);
      
      // No asignamos un ID por defecto, dejamos que cada endpoint maneje el error
      // ya que hemos actualizado todos para verificar correctamente el companyId
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