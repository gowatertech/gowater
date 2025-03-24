import { Express, Request, Response } from "express";
import { eq, sql, and, desc, like } from "drizzle-orm";
import { db } from "../db";
import { orders, routes, customers, orderItems, products, users, bottleReturns, trucks } from "@shared/schema";
import { storage } from "../storage";

// Para añadir tipos de req.user (simulando autenticación)
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        name: string;
      };
    }
  }
}

// Tipos
interface DriverDelivery {
  id: number;
  customerName: string;
  customerAddress: string;
  coordinates: [number, number];
  estimatedTime: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
  priority: 'normal' | 'high' | 'low';
  orderDetails: string;
  orderValue: string;
  containers: {
    delivered: number;
    returned: number;
    balance: number;
  };
}

interface CashBalance {
  initialBalance: string;
  cashIn: string;
  cashOut: string;
  finalBalance: string;
}

interface Performance {
  deliveredOrders: number;
  totalOrders: number;
  onTimeDeliveries: number;
  averageDeliveryTime: number;
}

export async function registerDriverRoutes(app: Express) {
  
  // Endpoint para obtener las entregas del día para un conductor
  app.get("/api/driver/deliveries/today", async (req: Request, res: Response) => {
    try {
      // Obtener el ID del conductor (usar ID 2 como default si no hay usuario autenticado)
      const driverId = req.user?.id || 2;
      
      // Buscar la ruta activa para el conductor
      const activeRoute = await db.select()
        .from(routes)
        .where(and(
          eq(routes.driverId, driverId),
          eq(routes.status, 'pending')
        ))
        .orderBy(desc(routes.date))
        .limit(1);
      
      if (!activeRoute || activeRoute.length === 0) {
        return res.json([]); // No hay rutas activas
      }
      
      const routeId = activeRoute[0].id;
      
      // Obtener los pedidos asociados a esta ruta
      const routeOrders = await db.select({
        orderId: orders.id,
        customerId: orders.customerId,
        status: orders.status,
        estimatedTime: orders.estimatedDeliveryTime,
        priority: sql<string>`CASE 
          WHEN orders.status = 'pending' THEN 'high' 
          WHEN orders.status = 'in_transit' THEN 'normal'
          ELSE 'low' 
        END`
      })
      .from(orders)
      .where(eq(orders.routeId, routeId));
      
      // Si no hay pedidos, retornar array vacío
      if (!routeOrders || routeOrders.length === 0) {
        return res.json([]);
      }
      
      // Array para almacenar las entregas con datos completos
      const deliveries: DriverDelivery[] = [];
      
      // Obtener datos detallados para cada pedido
      for (const order of routeOrders) {
        // Obtener el cliente
        const customer = await db.select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);
        
        if (!customer || customer.length === 0) continue;
        
        // Obtener los items del pedido
        const items = await db.select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          productName: products.name
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.orderId));
        
        // Calcular el valor total del pedido
        let totalValue = 0;
        let orderDescription = "";
        
        for (const item of items) {
          const itemTotal = Number(item.price) * item.quantity;
          totalValue += itemTotal;
          orderDescription += `${item.quantity} ${item.productName}, `;
        }
        
        // Eliminar la última coma y espacio
        orderDescription = orderDescription.trim();
        if (orderDescription.endsWith(',')) {
          orderDescription = orderDescription.slice(0, -1);
        }
        
        // Obtener los datos de retorno de envases
        const bottleReturn = await db.select()
          .from(bottleReturns)
          .where(eq(bottleReturns.orderId, order.orderId))
          .limit(1);
        
        // Extraer coordenadas (si existen) o usar una ubicación por defecto
        let coordinates: [number, number] = [18.47, -69.95]; // Coordenadas por defecto (Santo Domingo)
        
        if (customer[0].coordinates) {
          try {
            // Formato esperado: "lat,lng"
            const coords = customer[0].coordinates.split(',').map(Number);
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              coordinates = [coords[0], coords[1]];
            }
          } catch (error) {
            console.error("Error parsing coordinates:", error);
          }
        }
        
        // Mapear el estado a los valores esperados en la interfaz
        let mappedStatus: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
        switch (order.status) {
          case 'pending':
            mappedStatus = 'pending';
            break;
          case 'in_transit':
            mappedStatus = 'in_progress';
            break;
          case 'delivered':
            mappedStatus = 'delivered';
            break;
          case 'cancelled':
            mappedStatus = 'cancelled';
            break;
          default:
            mappedStatus = 'pending';
        }
        
        // Crear objeto de entrega
        const delivery: DriverDelivery = {
          id: order.orderId,
          customerName: customer[0].businessname,
          customerAddress: `${customer[0].street} ${customer[0].streetnumber}`,
          coordinates,
          estimatedTime: typeof order.estimatedTime === 'string' 
                        ? order.estimatedTime 
                        : new Date().toISOString(),
          status: mappedStatus,
          priority: order.priority as 'normal' | 'high' | 'low',
          orderDetails: orderDescription,
          orderValue: totalValue.toFixed(2),
          containers: {
            delivered: items.reduce((sum, item) => sum + item.quantity, 0),
            returned: bottleReturn && bottleReturn.length > 0 ? bottleReturn[0].returnedQuantity : 0,
            balance: items.reduce((sum, item) => sum + item.quantity, 0) - 
                    (bottleReturn && bottleReturn.length > 0 ? bottleReturn[0].returnedQuantity : 0)
          }
        };
        
        deliveries.push(delivery);
      }
      
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error al obtener entregas:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para obtener el balance de efectivo del conductor
  app.get("/api/driver/cash-balance", async (req: Request, res: Response) => {
    try {
      // Obtener el ID del conductor (usar ID 2 como default si no hay usuario autenticado)
      const driverId = req.user?.id || 2;
      
      // En una implementación real, estos datos vendrían de la base de datos
      // Por ahora, retornaremos datos de ejemplo
      const cashBalance: CashBalance = {
        initialBalance: "1000.00",
        cashIn: "2500.00",
        cashOut: "500.00",
        finalBalance: "3000.00"
      };
      
      res.json(cashBalance);
    } catch (error: any) {
      console.error("Error al obtener balance de efectivo:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para obtener estadísticas de rendimiento del conductor
  app.get("/api/driver/performance", async (req: Request, res: Response) => {
    try {
      // Obtener el ID del conductor (usar ID 2 como default si no hay usuario autenticado)
      const driverId = req.user?.id || 2;
      
      // Obtener total de pedidos asignados al conductor
      const routesWithOrders = await db.select({
        routeId: routes.id
      })
      .from(routes)
      .where(eq(routes.driverId, driverId));
      
      const routeIds = routesWithOrders.map(r => r.routeId);
      
      // Si no hay rutas, retornar valores predeterminados
      if (routeIds.length === 0) {
        return res.json({
          deliveredOrders: 0,
          totalOrders: 0,
          onTimeDeliveries: 0,
          averageDeliveryTime: 0
        });
      }
      
      // Obtener recuento de pedidos por estado
      const totalOrders = await db.select({
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(sql`${orders.routeId} IN (${routeIds.join(',')})`);
      
      const deliveredOrders = await db.select({
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(and(
        sql`${orders.routeId} IN (${routeIds.join(',')})`,
        eq(orders.status, 'delivered')
      ));
      
      // Por ahora, estos valores son estimados ya que no tenemos datos reales de tiempos
      const onTimeDeliveries = Math.floor(deliveredOrders[0].count * 0.8); // Asumimos que el 80% fue a tiempo
      const averageDeliveryTime = 35; // 35 minutos en promedio por entrega
      
      const performance: Performance = {
        deliveredOrders: deliveredOrders[0].count || 0,
        totalOrders: totalOrders[0].count || 0,
        onTimeDeliveries,
        averageDeliveryTime
      };
      
      res.json(performance);
    } catch (error: any) {
      console.error("Error al obtener estadísticas de rendimiento:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para actualizar el estado de un pedido
  app.post("/api/driver/deliveries/:id/complete", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      
      // Verificar que el pedido existe
      const existingOrder = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      
      if (!existingOrder || existingOrder.length === 0) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Actualizar el estado del pedido
      await db.update(orders)
        .set({ status: 'delivered' })
        .where(eq(orders.id, orderId));
      
      // Opcional: actualizar la información de devolución de envases
      const returnedContainers = req.body.returnedContainers;
      if (returnedContainers !== undefined) {
        const bottleReturn = await db.select()
          .from(bottleReturns)
          .where(eq(bottleReturns.orderId, orderId))
          .limit(1);
        
        if (bottleReturn && bottleReturn.length > 0) {
          // Actualizar registro existente
          await db.update(bottleReturns)
            .set({ returnedQuantity: returnedContainers })
            .where(eq(bottleReturns.id, bottleReturn[0].id));
        } else {
          // Crear nuevo registro
          await db.insert(bottleReturns).values({
            orderId,
            productId: req.body.productId || 1, // Utilizamos el ID del producto o un valor predeterminado
            expectedQuantity: req.body.expectedQuantity || returnedContainers, // Cantidad esperada igual a retornada si no se especifica
            returnedQuantity: returnedContainers,
            pendingQuantity: (req.body.expectedQuantity || returnedContainers) - returnedContainers,
            returnDate: new Date().toISOString(),
            status: 'pending',
            amountCharged: "0.00",
            depositAmount: "0.00",
            automaticAlert: false,
            manuallyAssigned: false
          });
        }
      }
      
      res.json({ success: true, message: "Entrega completada exitosamente" });
    } catch (error: any) {
      console.error("Error al completar entrega:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para actualizar la ubicación del conductor
  app.post("/api/driver/location", async (req: Request, res: Response) => {
    try {
      const driverId = req.user?.id || 2;
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitud y longitud son requeridas" });
      }
      
      // Actualizar la ubicación del conductor
      await storage.updateDriverLocation(driverId, {
        latitude,
        longitude,
        timestamp: new Date()
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error al actualizar ubicación:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
}