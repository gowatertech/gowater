import { Router } from 'express';
import ordersRouter from './orders';
import optimizeRouter from './optimize';
import createRouter from './create';

// Router principal para el generador de rutas
export const routeGeneratorRouter = Router();

// Registrar las sub-rutas
routeGeneratorRouter.use('/orders', ordersRouter);
routeGeneratorRouter.use('/', optimizeRouter);
routeGeneratorRouter.use('/', createRouter);

// Función para registrar el router en la aplicación
export function registerRouteGeneratorRoutes(router: Router) {
  console.log('🔔 Registrando endpoints para el generador de rutas...');
  router.use('/api/route-generator', routeGeneratorRouter);
  console.log('✅ Endpoints de generador de rutas registrados correctamente');
}

export default routeGeneratorRouter;