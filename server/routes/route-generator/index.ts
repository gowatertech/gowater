import { Router } from 'express';
import ordersRouter from './orders';
import optimizeRouter from './optimize';
import createRouter from './create';
import driversRouter from './drivers';
import trucksRouter from './trucks';
import zonesRouter from './zones';

// Router principal para el generador de rutas
export const routeGeneratorRouter = Router();

// Registrar las sub-rutas
routeGeneratorRouter.use('/orders', ordersRouter);
routeGeneratorRouter.use('/drivers', driversRouter);
routeGeneratorRouter.use('/trucks', trucksRouter);
routeGeneratorRouter.use('/zones', zonesRouter);
routeGeneratorRouter.use('/', optimizeRouter);
routeGeneratorRouter.use('/', createRouter);

// Función para registrar el router en la aplicación
export function registerRouteGeneratorEndpoints(router: Router) {
  console.log('🔔 Registrando endpoints para el generador de rutas...');
  router.use('/api/route-generator', routeGeneratorRouter);
  console.log('✅ Endpoints de generador de rutas registrados correctamente');
}

export default routeGeneratorRouter;