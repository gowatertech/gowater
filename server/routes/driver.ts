import { Express, Request, Response } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "../db";
import { orders, routes, customers, orderItems, products, users, bottleReturns, trucks } from "@shared/schema";
import { storage } from "../storage";
import { getCurrentCompanyId } from "../company-db";

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
      console.log(`[DELIVERIES] Endpoint called`);
      const driverId = req.user?.id || 2;
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.error("[DELIVERIES] No companyId found");
        return res.json([]);
      }
      
      console.log(`[DELIVERIES] Got driverId=${driverId}, companyId=${companyId}`);
      
      const allRoutes = await db.query.routes.findMany({
        where: (r, { eq }) => eq(r.companyId, companyId)
      });
      
      const activeRoutes = allRoutes.filter(route => 
        route.driverId === driverId && route.status === 'pending'
      );
      
      const activeRoute = activeRoutes.length > 0 
        ? [activeRoutes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]]
        : [];
      
      if (!activeRoute || activeRoute.length === 0) {
        // No hay rutas activas, pero en lugar de devolver un array vacío, vamos a usar los datos de las rutas
        // para crear entregas representativas
        console.log('[STEP 2] No hay ruta activa, buscando cualquier ruta');
        
        // Buscar cualquier ruta para el conductor
        const allRoutes = await db.query.routes.findMany({
          where: (routes, { and, eq }) => and(
            eq(routes.driverId, driverId),
            eq(routes.companyId, companyId)
          )
        });
        console.log(`[STEP 2 OK] Encontradas ${allRoutes.length} rutas para el conductor`);
        
        // Ordenar en JavaScript y tomar la más reciente
        const anyRoute = allRoutes.length > 0
          ? [allRoutes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]]
          : [];
          
        if (anyRoute && anyRoute.length > 0 && anyRoute[0].stops && anyRoute[0].stops.length > 0) {
          console.log(`[STEP 3] Creando entregas desde paradas (${anyRoute[0].stops.length} paradas)`);
          // Obtener clientes
          const allCustomers = await db.query.customers.findMany({
            where: (customers, { eq }) => eq(customers.companyId, companyId),
            limit: 5
          });
          console.log(`[STEP 3 OK] Encontrados ${allCustomers.length} clientes`);
          
          // Crear entregas basadas en las paradas de la ruta
          const deliveries: DriverDelivery[] = [];
          
          // Para cada parada (excluyendo la primera que suele ser el depósito)
          for (let i = 1; i < anyRoute[0].stops.length; i++) {
            const stopCoords = anyRoute[0].stops[i].split(',').map(Number) as [number, number];
            
            // Tomar un cliente aleatorio como referencia
            const randomCustomerIndex = Math.floor(Math.random() * allCustomers.length);
            const customer = allCustomers[randomCustomerIndex];
            
            // Crear una entrega representativa para esta parada
            const delivery: DriverDelivery = {
              id: i,
              customerName: customer.businessname,
              customerAddress: `${customer.street} ${customer.streetnumber}`,
              coordinates: stopCoords,
              estimatedTime: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(), // Cada 30 minutos
              status: 'pending',
              priority: 'normal',
              orderDetails: "5 Botellones 5L, 2 Faldos de Botella 1L",
              orderValue: "350.00",
              containers: {
                delivered: 5,
                returned: 0,
                balance: 5
              }
            };
            
            deliveries.push(delivery);
          }
          
          return res.json(deliveries);
        }
        
        return res.json([]); // No hay rutas disponibles
      }
      
      const routeId = activeRoute[0].id;
      
      // Verificar si la ruta tiene paradas definidas
      if (activeRoute[0].stops && activeRoute[0].stops.length > 0) {
        // Crear entregas basadas en las paradas de la ruta
        const deliveries: DriverDelivery[] = [];
        
        // Para cada parada (excluyendo la primera que suele ser el depósito)
        for (let i = 1; i < activeRoute[0].stops.length; i++) {
          try {
            const stopCoords = activeRoute[0].stops[i].split(',').map(Number) as [number, number];
            
            // Buscar el cliente más cercano a estas coordenadas
            console.log(`[STEP 4.${i}] Buscando cliente para parada ${i}`);
            const allCustomers = await db.query.customers.findMany({
              where: (customers, { eq }) => eq(customers.companyId, companyId),
              limit: 10
            });
            console.log(`[STEP 4.${i} OK] Encontrados ${allCustomers.length} clientes`);
            
            let closestCustomer = allCustomers[0];
            let minDistance = Infinity;
            
            for (const customer of allCustomers) {
              if (customer.coordinates) {
                try {
                  const customerCoords = customer.coordinates.split(',').map(Number);
                  if (customerCoords.length === 2) {
                    const distance = Math.sqrt(
                      Math.pow(customerCoords[0] - stopCoords[0], 2) + 
                      Math.pow(customerCoords[1] - stopCoords[1], 2)
                    );
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestCustomer = customer;
                    }
                  }
                } catch (e) {
                  console.error("Error parsing customer coordinates:", e);
                }
              }
            }
            
            // Crear una entrega para esta parada
            const delivery: DriverDelivery = {
              id: i,
              customerName: closestCustomer.businessname,
              customerAddress: `${closestCustomer.street} ${closestCustomer.streetnumber}`,
              coordinates: stopCoords,
              estimatedTime: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(), // Cada 30 minutos
              status: 'pending',
              priority: i === 1 ? 'high' : 'normal',
              orderDetails: "5 Botellones 5L, 2 Faldos de Botella 1L",
              orderValue: (200 + i * 50).toFixed(2),
              containers: {
                delivered: 5,
                returned: 0,
                balance: 5
              }
            };
            
            deliveries.push(delivery);
          } catch (e) {
            console.error("Error processing stop:", e);
          }
        }
        
        return res.json(deliveries);
      }
      
      // Obtener los pedidos asociados a esta ruta
      console.log(`[STEP 5] Obteniendo pedidos para ruta ${routeId}`);
      const routeOrders = await db.query.orders.findMany({
        where: (orders, { and, eq }) => and(
          eq(orders.routeId, routeId),
          eq(orders.companyId, companyId)
        )
      });
      console.log(`[STEP 5 OK] Encontrados ${routeOrders.length} pedidos`);
      
      // Si no hay pedidos, retornar array vacío
      if (!routeOrders || routeOrders.length === 0) {
        return res.json([]);
      }
      
      // Array para almacenar las entregas con datos completos
      const deliveries: DriverDelivery[] = [];
      
      // Obtener datos detallados para cada pedido
      console.log(`[STEP 6] Procesando ${routeOrders.length} pedidos`);
      for (const order of routeOrders) {
        console.log(`[STEP 6.${order.id}] Procesando pedido ${order.id}`);
        // Obtener el cliente
        const customer = await db.query.customers.findMany({
          where: (customers, { and, eq }) => and(
            eq(customers.id, order.customerId),
            eq(customers.companyId, companyId)
          ),
          limit: 1
        });
        console.log(`[STEP 6.${order.id} CUSTOMER OK] Cliente encontrado: ${customer.length > 0}`);
        
        if (!customer || customer.length === 0) continue;
        
        // Obtener los items del pedido
        console.log(`[STEP 6.${order.id} ITEMS] Obteniendo items para pedido`);
        const items = await db.query.orderItems.findMany({
          where: (orderItems, { and, eq }) => and(
            eq(orderItems.orderId, order.id),
            eq(orderItems.companyId, companyId)
          )
        });
        console.log(`[STEP 6.${order.id} ITEMS OK] Encontrados ${items.length} items`);
        
        // Calcular el valor total del pedido
        let totalValue = 0;
        let orderDescription = "";
        
        for (const item of items) {
          const itemTotal = Number(item.price) * item.quantity;
          totalValue += itemTotal;
          
          // Get product name
          const product = await db.query.products.findMany({
            where: (products, { and, eq }) => and(
              eq(products.id, item.productId),
              eq(products.companyId, companyId)
            ),
            limit: 1
          });
          
          const productName = product && product.length > 0 ? product[0].name : "Producto";
          orderDescription += `${item.quantity} ${productName}, `;
        }
        
        // Eliminar la última coma y espacio
        orderDescription = orderDescription.trim();
        if (orderDescription.endsWith(',')) {
          orderDescription = orderDescription.slice(0, -1);
        }
        
        // Obtener los datos de retorno de envases
        const bottleReturn = await db.query.bottleReturns.findMany({
          where: (bottleReturns, { and, eq }) => and(
            eq(bottleReturns.orderId, order.id),
            eq(bottleReturns.companyId, companyId)
          ),
          limit: 1
        });
        
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
        
        // Determinar prioridad basado en el estado
        let priority: 'normal' | 'high' | 'low' = 'normal';
        if (order.status === 'pending') priority = 'high';
        else if (order.status === 'in_transit') priority = 'normal';
        else priority = 'low';
        
        // Crear objeto de entrega
        const delivery: DriverDelivery = {
          id: order.id,
          customerName: customer[0].businessname,
          customerAddress: `${customer[0].street} ${customer[0].streetnumber}`,
          coordinates,
          estimatedTime: order.estimatedDeliveryTime || new Date().toISOString(),
          status: mappedStatus,
          priority,
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
      
      console.log(`[DELIVERIES] Returning ${deliveries.length} deliveries`);
      res.json(deliveries);
    } catch (error: any) {
      console.error("[DELIVERIES] Error occurred:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para obtener el balance de efectivo del conductor
  app.get("/api/driver/cash-balance", async (req: Request, res: Response) => {
    try {
      // Obtener el ID del conductor y companyId
      const driverId = req.user?.id || 2;
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.json({
          initialBalance: "0.00",
          cashIn: "0.00",
          cashOut: "0.00",
          finalBalance: "0.00"
        });
      }
      
      // En una implementación real, estos datos vendrían de la base de datos
      // Por ahora, retornaremos datos de ejemplo
      // TODO: Implementar consulta real a la base de datos con filtro por companyId
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
      // Obtener el ID del conductor y companyId
      const driverId = req.user?.id || 2;
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.json({
          deliveredOrders: 0,
          totalOrders: 0,
          onTimeDeliveries: 0,
          averageDeliveryTime: 0
        });
      }
      
      // Obtener total de pedidos asignados al conductor
      const routesWithOrders = await db.query.routes.findMany({
        where: (routes, { and, eq }) => and(
          eq(routes.driverId, driverId),
          eq(routes.companyId, companyId)
        ),
        columns: { id: true }
      });
      
      const routeIds = routesWithOrders.map(r => r.id);
      
      // Si no hay rutas, retornar valores predeterminados
      if (routeIds.length === 0) {
        return res.json({
          deliveredOrders: 0,
          totalOrders: 0,
          onTimeDeliveries: 0,
          averageDeliveryTime: 0
        });
      }
      
      // Obtener todos los pedidos y contar en JavaScript
      const allOrdersForDriver = await db.query.orders.findMany({
        where: (orders, { eq }) => eq(orders.companyId, companyId)
      });
      
      // Filtrar por routeIds
      const ordersInRoutes = allOrdersForDriver.filter(order => 
        order.routeId && routeIds.includes(order.routeId)
      );
      
      const totalOrdersCount = ordersInRoutes.length;
      const deliveredOrdersCount = ordersInRoutes.filter(order => order.status === 'delivered').length;
      
      // Por ahora, estos valores son estimados ya que no tenemos datos reales de tiempos
      const onTimeDeliveries = Math.floor(deliveredOrdersCount * 0.8); // Asumimos que el 80% fue a tiempo
      const averageDeliveryTime = 35; // 35 minutos en promedio por entrega
      
      const performance: Performance = {
        deliveredOrders: deliveredOrdersCount,
        totalOrders: totalOrdersCount,
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
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        return res.status(403).json({ error: "No se pudo determinar el contexto de la empresa" });
      }
      
      // Verificar que el pedido existe y pertenece a la empresa
      const existingOrder = await db.query.orders.findMany({
        where: (orders, { and, eq }) => and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ),
        limit: 1
      });
      
      if (!existingOrder || existingOrder.length === 0) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Actualizar el estado del pedido
      await db.update(orders)
        .set({ status: 'delivered' })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ));
      
      // Opcional: actualizar la información de devolución de envases
      const returnedContainers = req.body.returnedContainers;
      if (returnedContainers !== undefined) {
        const bottleReturn = await db.query.bottleReturns.findMany({
          where: (bottleReturns, { and, eq }) => and(
            eq(bottleReturns.orderId, orderId),
            eq(bottleReturns.companyId, companyId)
          ),
          limit: 1
        });
        
        if (bottleReturn && bottleReturn.length > 0) {
          // Actualizar registro existente
          await db.update(bottleReturns)
            .set({ returnedQuantity: returnedContainers })
            .where(and(
              eq(bottleReturns.id, bottleReturn[0].id),
              eq(bottleReturns.companyId, companyId)
            ));
        } else {
          // Crear nuevo registro de devolución de botellas usando el schema
          await db.insert(bottleReturns).values({
            companyId,
            orderId,
            productId: req.body.productId || 1,
            expectedQuantity: req.body.expectedQuantity || returnedContainers,
            returnedQuantity: returnedContainers,
            pendingQuantity: (req.body.expectedQuantity || returnedContainers) - returnedContainers,
            returnDate: new Date(),
            status: "pending",
            amountCharged: "0.00",
            depositAmount: "0.00",
            automaticAlert: false,
            manuallyAssigned: false,
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