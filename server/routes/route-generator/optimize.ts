import { Router, Request, Response } from 'express';
import { orders, customers } from '../../../shared/schema';
import { db } from '../../db';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentCompanyId } from '../../company-db';

// Router para las operaciones relacionadas con la optimización de rutas
export const optimizeRouter = Router();

// Interface para los puntos de entrega
interface DeliveryPoint {
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  coordinates?: string;
  sequenceNumber: number;
}

// Interface para un punto optimizado en la ruta
interface OptimizedPoint extends DeliveryPoint {
  distance?: number;
  estimatedTime?: number;
}

// Función para calcular la distancia entre dos puntos (simplificada)
function calculateDistance(coord1: string, coord2: string): number {
  try {
    const [lat1, lng1] = coord1.split(',').map(parseFloat);
    const [lat2, lng2] = coord2.split(',').map(parseFloat);
    
    // Cálculo simplificado (distancia euclidiana)
    const latDiff = lat2 - lat1;
    const lngDiff = lng2 - lng1;
    
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  } catch (error) {
    console.error("Error al calcular distancia:", error);
    return 0;
  }
}

// Algoritmo para optimizar la ruta (versión simplificada del problema del viajante)
function optimizeRoute(deliveryPoints: DeliveryPoint[]): OptimizedPoint[] {
  // Si no hay puntos o hay solo uno, devolver como está
  if (deliveryPoints.length <= 1) {
    return deliveryPoints as OptimizedPoint[];
  }
  
  // Crear copia de los puntos
  const points = [...deliveryPoints] as OptimizedPoint[];
  
  // Iniciar con un punto arbitrario (el primero)
  const optimizedRoute: OptimizedPoint[] = [points[0]];
  const remaining = points.slice(1);
  
  // Algoritmo voraz (elegir siempre el punto más cercano)
  while (remaining.length > 0) {
    const lastPoint = optimizedRoute[optimizedRoute.length - 1];
    
    // Si no hay coordenadas, solo usar orden secuencial
    if (!lastPoint.coordinates) {
      optimizedRoute.push(remaining.shift() as OptimizedPoint);
      continue;
    }
    
    // Encontrar el punto más cercano al último punto
    let nearestIndex = 0;
    let minDistance = Number.MAX_VALUE;
    
    for (let i = 0; i < remaining.length; i++) {
      if (!remaining[i].coordinates) continue;
      
      const distance = calculateDistance(
        lastPoint.coordinates,
        remaining[i].coordinates
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    // Añadir el punto más cercano
    const nearest = remaining.splice(nearestIndex, 1)[0];
    nearest.distance = minDistance;
    optimizedRoute.push(nearest);
  }
  
  // Actualizar los números de secuencia
  optimizedRoute.forEach((point, index) => {
    point.sequenceNumber = index + 1;
  });
  
  return optimizedRoute;
}

// Endpoint para optimizar una ruta
optimizeRouter.post('/optimize', async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: "Se requiere un array de IDs de pedidos" 
      });
    }
    
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ 
        error: "No se encontró ID de compañía en el contexto" 
      });
    }
    
    console.log(`[Generador de Rutas] Optimizando ruta para ${orderIds.length} pedidos de la compañía ${companyId}`);
    
    // Obtener información de los pedidos
    const selectedOrders = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        deliveryCoordinates: orders.deliveryCoordinates
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          inArray(orders.id, orderIds)
        )
      );
    
    // Crear puntos de entrega para cada pedido
    const deliveryPoints: DeliveryPoint[] = await Promise.all(
      selectedOrders.map(async (order) => {
        // Obtener información del cliente
        const customer = await db
          .select({
            id: customers.id,
            businessname: customers.businessname,
            street: customers.street,
            streetnumber: customers.streetnumber
          })
          .from(customers)
          .where(
            and(
              eq(customers.id, order.customerId),
              eq(customers.companyId, companyId)
            )
          )
          .limit(1);
          
        const customerData = customer[0];
        const address = customerData 
          ? `${customerData.street} ${customerData.streetnumber || ''}` 
          : 'Dirección desconocida';
          
        return {
          orderId: order.id,
          customerId: order.customerId,
          customerName: customerData ? customerData.businessname : `Cliente #${order.customerId}`,
          address,
          coordinates: order.deliveryCoordinates,
          sequenceNumber: 0 // Será asignado durante la optimización
        };
      })
    );
    
    // Optimizar el orden de los puntos
    const optimizedStops = optimizeRoute(deliveryPoints);
    
    console.log(`[Generador de Rutas] Ruta optimizada exitosamente con ${optimizedStops.length} paradas`);
    
    // Calcular estadísticas de la ruta
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < optimizedStops.length; i++) {
      if (optimizedStops[i].distance) {
        totalDistance += optimizedStops[i].distance;
        // Estimación simple del tiempo: 3 minutos por km
        totalTime += optimizedStops[i].distance * 3;
      }
    }
    
    return res.json({
      success: true,
      stops: optimizedStops,
      statistics: {
        totalStops: optimizedStops.length,
        totalDistance: totalDistance.toFixed(2),
        estimatedTime: Math.ceil(totalTime)
      }
    });
  } catch (error) {
    console.error("[Generador de Rutas] Error al optimizar ruta:", error);
    return res.status(500).json({ 
      error: "Error al optimizar la ruta",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default optimizeRouter;