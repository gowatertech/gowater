import { Router } from 'express';
import { routes, orders } from '../../../shared/schema';
import { db } from '../../db';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentCompanyId } from '../../company-db';

// Router para las operaciones relacionadas con la creación de rutas
export const createRouter = Router();

// Interface para la parada en una ruta
interface RouteStop {
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  coordinates?: string;
  sequenceNumber: number;
}

// Interface para la creación de una nueva ruta
interface NewRoute {
  name: string;
  driverId: number;
  assistantId: number | null;
  truckId: number | null;
  zoneId: number;
  date: string;
  stops: RouteStop[];
}

// Endpoint para crear una ruta
createRouter.post('/create', async (req, res) => {
  try {
    const routeData: NewRoute = req.body;
    
    // Validar datos mínimos requeridos
    if (!routeData.name || !routeData.driverId || !routeData.zoneId || !routeData.date) {
      return res.status(400).json({
        error: "Datos incompletos",
        details: "Se requiere nombre, conductor, zona y fecha para la ruta"
      });
    }
    
    if (!routeData.stops || routeData.stops.length === 0) {
      return res.status(400).json({
        error: "No hay paradas",
        details: "La ruta debe contener al menos una parada"
      });
    }
    
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ 
        error: "No se encontró ID de compañía en el contexto" 
      });
    }
    
    console.log(`[Generador de Rutas] Creando ruta con ${routeData.stops.length} paradas para la compañía ${companyId}`);
    
    // Guardar secuencia de entrega y paradas
    const deliverySequence = routeData.stops.map(stop => stop.orderId.toString());
    const stopsData = routeData.stops.map(stop => JSON.stringify({
      orderId: stop.orderId,
      customerId: stop.customerId,
      customerName: stop.customerName,
      address: stop.address,
      coordinates: stop.coordinates || null,
      sequenceNumber: stop.sequenceNumber
    }));
    
    // Crear la ruta
    const newRoutesData = {
      companyId: companyId,
      name: routeData.name,
      driverId: routeData.driverId,
      assistantId: routeData.assistantId,
      truckId: routeData.truckId,
      zoneId: routeData.zoneId,
      status: "pending",
      date: new Date(routeData.date),
      deliverySequence: deliverySequence,
      stops: stopsData,
      isCompleted: false
    };
    
    // Insertar la ruta en la base de datos
    const [newRoute] = await db
      .insert(routes)
      .values(newRoutesData)
      .returning();
    
    console.log(`[Generador de Rutas] Ruta creada con ID ${newRoute.id}`);
    
    // Extraer IDs de pedidos para actualizar
    const orderIds = routeData.stops.map(stop => stop.orderId);
    
    // Actualizar los pedidos con el ID de la ruta
    const result = await db
      .update(orders)
      .set({
        routeId: newRoute.id
      })
      .where(
        and(
          eq(orders.companyId, companyId),
          inArray(orders.id, orderIds)
        )
      );
    
    console.log(`[Generador de Rutas] Se actualizaron ${orderIds.length} pedidos con el ID de ruta ${newRoute.id}`);
    
    return res.json({
      success: true,
      route: newRoute,
      updatedOrders: orderIds.length
    });
  } catch (error) {
    console.error("[Generador de Rutas] Error al crear ruta:", error);
    return res.status(500).json({ 
      error: "Error al crear la ruta",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default createRouter;