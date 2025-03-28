import { Express } from "express";
import { db } from "./db";
import { 
  customers,
  orders,
  products,
  routes,
  zones
} from "@shared/schema";
import { and, eq, inArray, sql, isNull, ne } from "drizzle-orm";

// Importación con alias para evitar la colisión de nombres
import { orderItems as orderItemsTable } from "@shared/schema";

/**
 * Endpoints para rutas y pedidos
 */
export function registerRoutesEndpoints(app: Express) {

  // Endpoint para obtener todos los pedidos de todas las rutas pendientes en una sola llamada
  app.get("/api/routes/all/orders", async (req, res) => {
    try {
      // Obtener primero todas las rutas en estado pendiente
      const pendingRoutes = await db
        .select()
        .from(routes)
        .where(eq(routes.status, "pending"));
        
      // Para cada ruta, obtener los pedidos asociados
      const routesWithOrders = await Promise.all(
        pendingRoutes.map(async (route) => {
          // Buscar todas las órdenes para esta ruta
          const routeOrders = await db
            .select({
              id: orders.id,
              routeId: orders.routeId,
              customerId: orders.customerId,
              status: orders.status,
              total: orders.total,
              customerName: customers.businessname,
              customerAddress: customers.street,
            })
            .from(orders)
            .leftJoin(customers, eq(orders.customerId, customers.id))
            .where(eq(orders.routeId, route.id));
            
          // Para cada orden, buscar los productos
          const ordersWithProducts = await Promise.all(
            routeOrders.map(async (order) => {
              const items = await db
                .select({
                  productId: orderItemsTable.productId,
                  name: products.name,
                  quantity: orderItemsTable.quantity,
                  price: orderItemsTable.price,
                })
                .from(orderItemsTable)
                .innerJoin(products, eq(orderItemsTable.productId, products.id))
                .where(eq(orderItemsTable.orderId, order.id));
                
              return {
                ...order,
                products: items,
              };
            })
          );
            
          // Calcular el valor total de la ruta
          const totalRevenue = ordersWithProducts.reduce((sum, order) => 
            sum + Number(order.total || 0), 0
          );
            
          return {
            routeId: route.id,
            routeData: {
              ...route,
              totalRevenue
            },
            orders: ordersWithProducts
          };
        })
      );
        
      res.json(routesWithOrders);
    } catch (error) {
      console.error("Error al obtener todos los pedidos de rutas pendientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener los pedidos de una ruta específica
  app.get("/api/routes/:id/orders", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      // Buscar todas las órdenes para esta ruta
      const routeOrders = await db
        .select({
          id: orders.id,
          routeId: orders.routeId,
          customerId: orders.customerId,
          status: orders.status,
          total: orders.total,
          customerName: customers.businessname,
          customerAddress: customers.street,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.routeId, routeId));
        
      // Para cada orden, buscar los productos
      const ordersWithProducts = await Promise.all(
        routeOrders.map(async (order) => {
          const items = await db
            .select({
              productId: orderItemsTable.productId,
              name: products.name,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
            })
            .from(orderItemsTable)
            .innerJoin(products, eq(orderItemsTable.productId, products.id))
            .where(eq(orderItemsTable.orderId, order.id));
            
          return {
            ...order,
            products: items,
          };
        })
      );
        
      res.json(ordersWithProducts);
    } catch (error) {
      console.error("Error al obtener órdenes de la ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para iniciar una ruta
  app.post("/api/routes/:id/start", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      // Actualizar el estado de la ruta a "in_progress"
      const [updatedRoute] = await db
        .update(routes)
        .set({
          status: "in_progress",
          driverStartedAt: new Date()
        })
        .where(eq(routes.id, routeId))
        .returning();
      
      res.json(updatedRoute);
    } catch (error) {
      console.error("Error al iniciar ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para borrar una ruta
  app.delete("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (isNaN(routeId)) {
        return res.status(400).json({ error: "ID de ruta inválido" });
      }
      
      // Primero, liberamos las órdenes asociadas a esta ruta
      await db.update(orders)
        .set({ routeId: null })
        .where(eq(orders.routeId, routeId));
      
      // Luego, eliminamos la ruta
      await db.delete(routes)
        .where(eq(routes.id, routeId));
        
      res.json({ 
        success: true,
        message: "Ruta eliminada correctamente"
      });
    } catch (error) {
      console.error("Error borrando ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener pedidos pendientes para una zona específica
  app.get("/api/zones/:zoneId/pending-orders", async (req, res) => {
    try {
      const zoneId = parseInt(req.params.zoneId);
      
      console.log(`[DEBUG] Buscando pedidos pendientes para zona ID: ${zoneId}`);
      
      if (isNaN(zoneId)) {
        console.log("[DEBUG] ID de zona inválido");
        return res.status(400).json({ error: "ID de zona inválido" });
      }

      // Buscar clientes de la zona especificada
      const customersInZone = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.zoneid, zoneId));
      
      console.log(`[DEBUG] Encontrados ${customersInZone.length} clientes en zona ${zoneId}`);
      
      if (!customersInZone.length) {
        console.log("[DEBUG] No hay clientes en esta zona");
        return res.json([]);
      }

      // Obtener IDs de clientes en la zona
      const customerIds = customersInZone.map(c => c.id);
      console.log(`[DEBUG] IDs de clientes en zona: ${customerIds.join(", ")}`);
      
      // Contar todos los pedidos pendientes de estos clientes (incluso los asignados a rutas)
      try {
        // Simplificando la consulta para evitar errores
        const allPendingOrdersCount = await db
          .execute(sql`
            SELECT COUNT(*) 
            FROM orders 
            WHERE customer_id IN (${customerIds.join(',')}) 
            AND status = 'pending'
          `);
        
        console.log(`[DEBUG] Total de pedidos pendientes (incluso asignados): ${allPendingOrdersCount.rows[0]?.count || 0}`);
      } catch (error) {
        console.error("Error contando pedidos pendientes:", error);
      }
      
      // Buscar pedidos pendientes de clientes en esa zona que no estén asignados a ninguna ruta
      // Usar SQL directo para evitar problemas de tipo
      const pendingOrdersResult = await db.execute(sql`
        SELECT 
          o.id, 
          o.customer_id AS "customerId", 
          o.status, 
          o.total, 
          c.businessname AS "customerName", 
          c.street AS "customerAddress", 
          c.phone AS "customerPhone", 
          c.coordinates, 
          o.date, 
          o.route_id AS "routeId"
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.customer_id IN (${customerIds.join(',')}) 
        AND o.status = 'pending' 
        AND o.route_id IS NULL
      `);
      
      // Convertir el resultado a un formato que podamos usar
      const pendingOrders = pendingOrdersResult.rows;
      
      console.log(`[DEBUG] Pedidos pendientes sin asignar encontrados: ${pendingOrders.length}`);
      console.log("[DEBUG] IDs de pedidos pendientes:", pendingOrders.map(o => o.id).join(", "));
      
      // Para cada pedido, obtener los items usando SQL directo
      const ordersWithItems = await Promise.all(
        pendingOrders.map(async (order) => {
          // Usar SQL directo para evitar problemas con los tipos
          const itemsResult = await db.execute(sql`
            SELECT 
              oi.product_id AS "productId", 
              p.name, 
              oi.quantity, 
              oi.price
            FROM order_items oi
            INNER JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ${parseInt(order.id, 10)}
          `);
            
          return {
            ...order,
            products: itemsResult.rows,
          };
        })
      );
      
      console.log(`[DEBUG] Respuesta final: ${ordersWithItems.length} pedidos con items`);
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error al obtener pedidos pendientes por zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });
}