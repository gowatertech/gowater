import { Express } from "express";
import { db } from "./db";
import { 
  customers,
  orders,
  products,
  routes
} from "@shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

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
}