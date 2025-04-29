import express, { Request, Response } from 'express';
import { db } from './db';
import { orders, customers, zones } from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

// Router simplificado para el generador de rutas
const simplifiedRouter = express.Router();

// Endpoint para obtener órdenes pendientes
simplifiedRouter.get('/pending-orders', async (req: Request, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.session?.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    // Obtener company ID de la sesión
    const companyId = req.session?.companyId || req.session?.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: "No se encontró ID de compañía" });
    }
    
    console.log(`[Simple API] Obteniendo pedidos pendientes para compañía ${companyId}`);
    
    // Query simplificada para obtener órdenes, clientes y zonas en una sola consulta
    const pendingOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.companyId, companyId),
        eq(orders.status, 'pending'),
        isNull(orders.routeId)
      ),
      with: {
        customer: {
          with: {
            zone: true
          }
        }
      }
    });
    
    // Formatear la respuesta para que coincida con el formato esperado por el frontend
    const formattedOrders = pendingOrders.map(order => ({
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      date: order.date,
      total: order.total,
      paymentMethod: order.paymentMethod,
      deliveryCoordinates: order.deliveryCoordinates,
      notes: order.notes,
      customer: order.customer,
      zone: order.customer?.zone || null
    }));
    
    console.log(`[Simple API] Se encontraron ${formattedOrders.length} pedidos pendientes`);
    
    return res.json(formattedOrders);
  } catch (error) {
    console.error("[Simple API] Error:", error);
    return res.status(500).json({ 
      error: "Error al obtener pedidos pendientes",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para optimizar ruta
simplifiedRouter.post('/optimize-route', async (req: Request, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.session?.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de IDs de pedidos" });
    }
    
    const companyId = req.session?.companyId || req.session?.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: "No se encontró ID de compañía" });
    }
    
    console.log(`[Simple API] Optimizando ruta para ${orderIds.length} pedidos`);
    
    // Obtener información de los pedidos y clientes
    const ordersData = await Promise.all(orderIds.map(async (orderId) => {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: true
        }
      });
      
      return order;
    }));
    
    // Filtrar los pedidos que no se encontraron
    const validOrders = ordersData.filter(order => order !== undefined);
    
    // Crear paradas para cada pedido
    const stops = validOrders.map((order, index) => ({
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customer?.businessname || 'Cliente sin nombre',
      address: order.customer ? `${order.customer.street || ''} ${order.customer.streetnumber || ''}` : 'Sin dirección',
      coordinates: order.customer?.coordinates || undefined,
      sequenceNumber: index + 1,
      distance: 0, // En km
      estimatedTime: 5 // En minutos
    }));
    
    // Calcular estadísticas
    const result = {
      stops,
      statistics: {
        totalStops: stops.length,
        totalDistance: "0 km",
        estimatedTime: stops.length * 5 // 5 minutos por parada
      }
    };
    
    return res.json(result);
  } catch (error) {
    console.error("[Simple API] Error:", error);
    return res.status(500).json({ 
      error: "Error al optimizar ruta",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para crear ruta
simplifiedRouter.post('/create-route', async (req: Request, res: Response) => {
  try {
    // Verificar autenticación
    if (!req.session?.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    const routeData = req.body;
    
    // Validar datos mínimos requeridos
    if (!routeData.name || !routeData.driverId || !routeData.zoneId || !routeData.date || !routeData.stops || routeData.stops.length === 0) {
      return res.status(400).json({ error: "Faltan datos requeridos para crear la ruta" });
    }
    
    const companyId = req.session?.companyId || req.session?.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: "No se encontró ID de compañía" });
    }
    
    console.log(`[Simple API] Creando ruta para compañía ${companyId}`);
    
    // En una implementación real, aquí se insertaría la ruta en la base de datos
    // y se actualizarían los estados de los pedidos
    
    return res.json({ 
      id: Math.floor(Math.random() * 10000), // ID aleatorio como ejemplo
      message: 'Ruta creada exitosamente' 
    });
  } catch (error) {
    console.error("[Simple API] Error:", error);
    return res.status(500).json({ 
      error: "Error al crear ruta",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export function registerSimplifiedRoutes(app: express.Express) {
  app.use('/simple-api', simplifiedRouter);
  console.log('✅ Rutas simplificadas registradas correctamente');
}