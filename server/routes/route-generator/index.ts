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
  
  // Registramos explícitamente la ruta de los pedidos pendientes para asegurar que funcione
  router.get('/api/route-generator/orders/pending', async (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: "No autenticado" });
    }
    
    try {
      const companyId = req.session.user.companyId;
      console.log(`[API Direct] Obteniendo pedidos pendientes para compañía ${companyId}`);
      
      const pendingOrders = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          status: orders.status,
          date: orders.date,
          total: orders.total,
          paymentMethod: orders.paymentMethod,
          deliveryCoordinates: orders.deliveryCoordinates,
          notes: orders.notes
        })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            eq(orders.status, 'pending'),
            isNull(orders.routeId)
          )
        );
        
      // Para cada pedido, obtener datos del cliente y zona
      const result = await Promise.all(
        pendingOrders.map(async (order) => {
          const customer = await db
            .select()
            .from(customers)
            .where(and(eq(customers.id, order.customerId), eq(customers.companyId, companyId)))
            .limit(1);
            
          let zone = null;
          if (customer[0]?.zoneid) {
            const zoneData = await db
              .select()
              .from(zones)
              .where(and(eq(zones.id, customer[0].zoneid), eq(zones.companyId, companyId)))
              .limit(1);
              
            if (zoneData.length > 0) {
              zone = zoneData[0];
            }
          }
          
          return {
            ...order,
            customer: customer.length > 0 ? customer[0] : null,
            zone
          };
        })
      );
      
      console.log(`[API Direct] Se encontraron ${result.length} pedidos pendientes`);
      return res.json(result);
    } catch (error) {
      console.error('[API Direct] Error al obtener pedidos pendientes:', error);
      return res.status(500).json({ 
        error: "Error al obtener pedidos pendientes",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  console.log('✅ Endpoints de generador de rutas registrados correctamente');
}

export default routeGeneratorRouter;