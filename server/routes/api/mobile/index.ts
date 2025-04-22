import express, { Router } from 'express';
import { createMobileAuthRoutes } from './auth';
import { mobileApiTenantMiddleware, mobileAuthMiddleware } from '../../../middleware/mobile-tenant.middleware';

/**
 * Crea y configura las rutas de la API móvil
 */
export function createMobileApiEndpoints(): Router {
  const router = express.Router();
  
  // Rutas públicas (no requieren autenticación)
  // Aplicar middleware de tenant para asegurar que companyId esté disponible
  router.use(mobileApiTenantMiddleware);
  
  // Rutas de autenticación (login, logout, me)
  const authRoutes = createMobileAuthRoutes();
  router.use('/', authRoutes);
  
  // Middleware para rutas protegidas
  router.use('/protected/*', mobileAuthMiddleware);
  
  // Rutas protegidas (requieren autenticación)
  router.get('/protected/test', (req, res) => {
    res.json({
      success: true,
      message: 'API protegida funciona correctamente',
      user: req.session.user,
      companyId: req.session.companyId
    });
  });
  
  return router;
}

/**
 * Registra las rutas de la API móvil en la aplicación Express
 */
export function registerMobileApiEndpoints(app: express.Router) {
  const mobileApiRoutes = createMobileApiEndpoints();
  
  // Montamos las rutas de la API móvil en /api/mobile
  app.use('/mobile', mobileApiRoutes);
  
  console.log('✅ API Móvil registrada en /api/mobile');
}