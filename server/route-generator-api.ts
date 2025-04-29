import express, { Request, Response } from 'express';
import { orders, customers, zones, users, routes, trucks } from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from './db';

const router = express.Router();

// Middleware para verificar autenticación
const authCheck = (req: Request, res: Response, next: any) => {
  if (!req.session?.user) {
    console.log("Error de autenticación en generador de rutas");
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

// Obtener todos los pedidos pendientes
router.get('/orders/pending', authCheck, async (req: Request, res: Response) => {
  try {
    const companyId = req.session?.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: "No se pudo determinar la compañía" });
    }
    
    console.log(`[Route Generator API] Obteniendo pedidos pendientes para compañía ${companyId}`);
    
    // Consultar pedidos pendientes
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
    
    // Para cada pedido, obtener datos del cliente
    const result = await Promise.all(
      pendingOrders.map(async (order) => {
        // Obtener cliente
        const customerData = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);
          
        const customer = customerData.length > 0 ? customerData[0] : null;
        
        // Obtener zona si el cliente tiene una
        let zone = null;
        if (customer?.zoneid) {
          const zoneData = await db
            .select()
            .from(zones)
            .where(eq(zones.id, customer.zoneid))
            .limit(1);
          
          zone = zoneData.length > 0 ? zoneData[0] : null;
        }
        
        return {
          ...order,
          customer,
          zone
        };
      })
    );
    
    console.log(`[Route Generator API] Se encontraron ${result.length} pedidos pendientes`);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("[Route Generator API] Error:", error);
    return res.status(500).json({ 
      error: "Error al obtener pedidos pendientes",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para optimizar ruta
router.post('/optimize', authCheck, async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "Se requieren IDs de pedidos válidos" });
    }
    
    const companyId = req.session?.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: "No se pudo determinar la compañía" });
    }
    
    console.log(`[Route Generator API] Optimizando ruta para ${orderIds.length} pedidos`);
    
    // Obtener información de los pedidos
    const ordersInfo = [];
    for (const orderId of orderIds) {
      const orderData = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          total: orders.total
        })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.companyId, companyId)
          )
        )
        .limit(1);
      
      if (orderData.length > 0) {
        const customerData = await db
          .select()
          .from(customers)
          .where(eq(customers.id, orderData[0].customerId))
          .limit(1);
        
        if (customerData.length > 0) {
          ordersInfo.push({
            order: orderData[0],
            customer: customerData[0]
          });
        }
      }
    }
    
    // Construir el resultado de la optimización
    // En una aplicación real, aquí se implementaría un algoritmo de optimización
    // Por ahora, simplemente ordenamos los pedidos por ID
    const stops = ordersInfo.map((info, index) => ({
      orderId: info.order.id,
      customerId: info.customer.id,
      customerName: info.customer.businessname || 'Cliente sin nombre',
      address: `${info.customer.street || ''} ${info.customer.streetnumber || ''}`,
      coordinates: info.customer.coordinates,
      sequenceNumber: index + 1,
      distance: 0,
      estimatedTime: 5 // 5 minutos por parada
    }));
    
    const result = {
      stops,
      statistics: {
        totalStops: stops.length,
        totalDistance: "0 km",
        estimatedTime: stops.length * 5
      }
    };
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("[Route Generator API] Error:", error);
    return res.status(500).json({ 
      error: "Error al optimizar ruta",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para crear ruta
router.post('/create', authCheck, async (req: Request, res: Response) => {
  try {
    const { name, driverId, truckId, stops } = req.body;
    
    if (!name || !driverId || !stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({ error: "Datos incompletos" });
    }
    
    const companyId = req.session?.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: "No se pudo determinar la compañía" });
    }
    
    console.log(`[Route Generator API] Creando ruta '${name}' para compañía ${companyId}`);
    
    // 1. Crear la ruta
    const [newRoute] = await db
      .insert(routes)
      .values({
        companyId,
        name,
        driverId,
        truckId: truckId || null,
        date: new Date().toISOString(),
        status: 'pending',
        estimatedStartTime: new Date().toISOString(),
        estimatedEndTime: new Date(Date.now() + stops.length * 5 * 60000).toISOString(),
      })
      .returning();
    
    if (!newRoute) {
      throw new Error("No se pudo crear la ruta");
    }
    
    // 2. Actualizar pedidos con el ID de la ruta y secuencia
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      await db
        .update(orders)
        .set({
          routeId: newRoute.id,
          status: 'in_transit',
          deliverySequence: i + 1
        })
        .where(eq(orders.id, stop.orderId));
    }
    
    return res.status(201).json({
      id: newRoute.id,
      name: newRoute.name,
      message: "Ruta creada exitosamente"
    });
  } catch (error) {
    console.error("[Route Generator API] Error:", error);
    return res.status(500).json({ 
      error: "Error al crear ruta",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export function registerRouteGeneratorApi(app: express.Express) {
  app.use('/api/route-generator', router);
  console.log("API del generador de rutas registrada en /api/route-generator");
}