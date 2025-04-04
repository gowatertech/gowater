import { Express, Request, Response } from "express";
import { db } from "./db";
import { 
  customers,
  orders,
  products,
  routes,
  zones,
  bottleReturns,
  invoices,
  invoiceItems,
  payments,
  provinces,
  municipalities,
  users
} from "@shared/schema";
import { and, eq, inArray, sql, isNull, ne, desc } from "drizzle-orm";
import { storage } from "./storage";

// Importación con alias para evitar la colisión de nombres
import { orderItems as orderItemsTable } from "@shared/schema";

/**
 * Endpoints para rutas y pedidos
 */
export function registerRoutesEndpoints(app: Express) {
  
  // Endpoint para crear una ruta con pedidos pendientes
  app.post("/api/routes-with-orders", async (req, res) => {
    try {
      // Extraer datos del cuerpo de la solicitud
      const routeData = req.body;
      const orderIds = routeData.orderIds || [];
      
      console.log("Creando ruta con pedidos:", routeData);
      console.log("IDs de pedidos a asignar:", orderIds);
      
      if (!routeData.name || !routeData.driverId || !routeData.zoneId || !orderIds.length) {
        return res.status(400).json({ 
          error: "Faltan datos requeridos para crear la ruta" 
        });
      }
      
      // Insertar la nueva ruta
      const [newRoute] = await db
        .insert(routes)
        .values({
          name: routeData.name,
          driverId: routeData.driverId,
          assistantId: routeData.assistantId || null,
          truckId: routeData.truckId || null,
          zoneId: routeData.zoneId,
          date: new Date(routeData.date),
          status: "pending",
          isCompleted: false,
          deliverySequence: routeData.deliverySequence || [],
          estimatedDuration: routeData.estimatedDuration || null,
          totalDistance: routeData.totalDistance || null,
          stops: routeData.stops || []
        })
        .returning();
        
      console.log("Ruta creada:", newRoute);
      
      // Asignar los pedidos a esta ruta
      // Actualizar cada pedido con el ID de la ruta
      for (const orderId of orderIds) {
        await db
          .update(orders)
          .set({ 
            routeId: newRoute.id,
            // No cambiar el estado del pedido todavía, sigue siendo "pending"
          })
          .where(eq(orders.id, orderId));
          
        console.log(`Pedido ${orderId} asignado a la ruta ${newRoute.id}`);
      }
      
      res.status(201).json({ 
        success: true, 
        route: newRoute,
        message: `Ruta creada con ${orderIds.length} pedidos asignados`
      });
    } catch (error) {
      console.error("Error al crear ruta con pedidos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

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
                  isReturnable: products.isReturnable,
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
      
      // Primero, obtener la ruta para conocer sus detalles
      const route = await db
        .select()
        .from(routes)
        .where(eq(routes.id, routeId))
        .limit(1);
      
      if (!route || route.length === 0) {
        return res.status(404).json({ error: "Ruta no encontrada" });
      }
      
      const routeDetails = route[0];
      console.log("Obteniendo pedidos para la ruta:", routeDetails);
      
      // Buscar todas las órdenes para esta ruta, independientemente de su estado
      // IMPORTANTE: Devolver todos los pedidos de la ruta como "pending" para simplificar la UI
      // hasta que sean realmente entregados (delivered)
      let routeOrders = await db
        .select({
          id: orders.id,
          routeId: orders.routeId,
          customerId: orders.customerId,
          // Si el estado es "in_transit", lo cambiamos a "pending" para la UI
          status: sql`CASE WHEN ${orders.status} = 'in_transit' THEN 'pending' ELSE ${orders.status} END`,
          total: orders.total,
          customerName: customers.businessname,
          customerAddress: customers.street,
          date: orders.date,
          paymentMethod: orders.paymentMethod,
          coordinates: customers.coordinates,
          streetnumber: customers.streetnumber
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.routeId, routeId));
        
      console.log(`Se encontraron ${routeOrders.length} órdenes directamente asignadas a la ruta ${routeId}`);
      
      // Si no hay órdenes asignadas directamente a la ruta, buscar órdenes en la misma zona
      if (routeOrders.length === 0 && routeDetails.zoneId) {
        console.log(`No hay órdenes asignadas a la ruta ${routeId}, buscando órdenes de la zona ${routeDetails.zoneId}...`);
        
        // Obtener todos los clientes de la zona
        const zoneCustomers = await db
          .select({
            id: customers.id,
            coordinates: customers.coordinates
          })
          .from(customers)
          .where(eq(customers.zoneid, routeDetails.zoneId));
          
        if (zoneCustomers.length > 0) {
          const customerIds = zoneCustomers.map(c => c.id);
          console.log(`Se encontraron ${customerIds.length} clientes en la zona ${routeDetails.zoneId}`);
          
          // Buscar pedidos pendientes de estos clientes
          const zoneOrders = await db
            .select({
              id: orders.id,
              routeId: orders.routeId,
              customerId: orders.customerId,
              status: orders.status,
              total: orders.total,
              customerName: customers.businessname,
              customerAddress: customers.street,
              date: orders.date,
              paymentMethod: orders.paymentMethod,
              coordinates: customers.coordinates,
              streetnumber: customers.streetnumber
            })
            .from(orders)
            .leftJoin(customers, eq(orders.customerId, customers.id))
            .where(and(
              inArray(orders.customerId, customerIds),
              isNull(orders.routeId),
              eq(orders.status, "pending")
            ));
            
          console.log(`Se encontraron ${zoneOrders.length} pedidos pendientes en la zona ${routeDetails.zoneId}`);
          
          // Asignar estos pedidos a la ruta (persistentemente en la base de datos)
          if (zoneOrders.length > 0) {
            for (const order of zoneOrders) {
              await db
                .update(orders)
                .set({ routeId: routeId })
                .where(eq(orders.id, order.id));
              
              console.log(`Pedido ${order.id} asignado permanentemente a la ruta ${routeId}`);
            }
            
            // Recargar los pedidos ahora que están asignados a la ruta
            routeOrders = await db
              .select({
                id: orders.id,
                routeId: orders.routeId,
                customerId: orders.customerId,
                status: orders.status,
                total: orders.total,
                customerName: customers.businessname,
                customerAddress: customers.street,
                date: orders.date,
                paymentMethod: orders.paymentMethod,
                coordinates: customers.coordinates,
                streetnumber: customers.streetnumber
              })
              .from(orders)
              .leftJoin(customers, eq(orders.customerId, customers.id))
              .where(eq(orders.routeId, routeId));
          }
        }
      }
        
      // Para cada orden, buscar los productos
      const ordersWithProducts = await Promise.all(
        routeOrders.map(async (order) => {
          const items = await db
            .select({
              productId: orderItemsTable.productId,
              name: products.name,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
              isReturnable: products.isReturnable,
            })
            .from(orderItemsTable)
            .innerJoin(products, eq(orderItemsTable.productId, products.id))
            .where(eq(orderItemsTable.orderId, order.id));
            
          // Extraer las coordenadas para facilitar su uso en el front-end
          let latitude = null;
          let longitude = null;
          
          if (order.coordinates) {
            const coordParts = order.coordinates.split(',');
            if (coordParts.length === 2) {
              latitude = parseFloat(coordParts[0].trim());
              longitude = parseFloat(coordParts[1].trim());
            }
          }
            
          return {
            ...order,
            products: items,
            address: `${order.customerAddress} ${order.streetnumber}`,
            latitude,
            longitude
          };
        })
      );
        
      res.json(ordersWithProducts);
    } catch (error) {
      console.error("Error al obtener órdenes de la ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener todos los pedidos con información enriquecida
  app.get("/api/orders", async (req, res) => {
    try {
      // Buscar todos los pedidos con información de clientes
      const allOrders = await db
        .select({
          id: orders.id,
          routeId: orders.routeId,
          customerId: orders.customerId,
          status: orders.status,
          total: orders.total,
          date: orders.date,
          paymentMethod: orders.paymentMethod,
          customerName: customers.businessname,
          customerAddress: customers.street,
          streetnumber: customers.streetnumber,
          coordinates: customers.coordinates,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id));
        
      // Para cada orden, buscar los productos
      const ordersWithProducts = await Promise.all(
        allOrders.map(async (order) => {
          const items = await db
            .select({
              productId: orderItemsTable.productId,
              name: products.name,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
              isReturnable: products.isReturnable,
            })
            .from(orderItemsTable)
            .innerJoin(products, eq(orderItemsTable.productId, products.id))
            .where(eq(orderItemsTable.orderId, order.id));
            
          return {
            ...order,
            products: items,
            customerAddress: `${order.customerAddress} ${order.streetnumber}`,
          };
        })
      );
        
      res.json(ordersWithProducts);
    } catch (error) {
      console.error("Error al obtener todos los pedidos:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener un pedido específico por ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Buscar el pedido específico con información de cliente incluyendo municipio y provincia
      const [order] = await db
        .select({
          id: orders.id,
          routeId: orders.routeId,
          customerId: orders.customerId,
          status: orders.status,
          total: orders.total,
          date: orders.date,
          paymentMethod: orders.paymentMethod,
          notes: orders.notes,
          customerName: customers.businessname,
          customerAddress: customers.street,
          streetnumber: customers.streetnumber,
          coordinates: customers.coordinates,
          phone: customers.phone,
          municipalityId: customers.municipalityid,
          provinceId: customers.provinceid,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.id, orderId))
        .limit(1);
      
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Obtener los productos del pedido
      const items = await db
        .select({
          productId: orderItemsTable.productId,
          name: products.name,
          quantity: orderItemsTable.quantity,
          price: orderItemsTable.price,
          isReturnable: products.isReturnable,
        })
        .from(orderItemsTable)
        .innerJoin(products, eq(orderItemsTable.productId, products.id))
        .where(eq(orderItemsTable.orderId, orderId));
      
      // Obtener nombres de provincia y municipio
      let municipalityName = "";
      let provinceName = "";
      
      if (order.municipalityId) {
        try {
          const municipalityResult = await db.execute(
            sql`SELECT name FROM municipalities WHERE id = ${order.municipalityId}`
          );
          
          if (municipalityResult.rows.length > 0) {
            municipalityName = String(municipalityResult.rows[0].name || "");
          }
        } catch (err) {
          console.error("Error al obtener municipio:", err);
        }
      }
      
      if (order.provinceId) {
        try {
          const provinceResult = await db.execute(
            sql`SELECT name FROM provinces WHERE id = ${order.provinceId}`
          );
          
          if (provinceResult.rows.length > 0) {
            provinceName = String(provinceResult.rows[0].name || "");
          }
        } catch (err) {
          console.error("Error al obtener provincia:", err);
        }
      }
      
      // Construir el pedido completo con sus productos
      const orderWithProducts = {
        ...order,
        products: items,
        customerAddress: `${order.customerAddress} ${order.streetnumber}`,
        customerPhone: order.phone,
        municipalityName,
        provinceName
      };
      
      res.json(orderWithProducts);
    } catch (error) {
      console.error("Error al obtener el pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para iniciar una ruta
  app.post("/api/routes/:id/start", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      // Actualizar el estado de la ruta a "en_curso" (internamente "in_progress")
      const [updatedRoute] = await db
        .update(routes)
        .set({
          status: "in_progress", // Valor en base de datos se mantiene "in_progress"
          driverStartedAt: new Date()
        })
        .where(eq(routes.id, routeId))
        .returning();
      
      // NOTA: Ya no actualizamos los pedidos a "in_transit"
      // Los mantenemos como "pending" para que el conductor vea claramente cuáles debe entregar
      // Esto simplifica la lógica y la interfaz de usuario
      // Comentado el código anterior que cambiaba el estado:
      /*
      await db
        .update(orders)
        .set({
          status: "in_transit"  // Cambiamos de "pending" a "in_transit"
        })
        .where(
          and(
            eq(orders.routeId, routeId),
            eq(orders.status, "pending")  // Solo actualizamos los pedidos en estado pendiente
          )
        );
      */
      
      console.log(`Ruta ${routeId} y sus pedidos asociados actualizados a estado "in_transit"`);
      
      res.json(updatedRoute);
    } catch (error) {
      console.error("Error al iniciar ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para actualizar el progreso de una ruta
  app.post("/api/routes/:id/progress", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const { currentLocation, lastUpdate } = req.body;
      
      if (!currentLocation) {
        return res.status(400).json({ error: "Se requiere la ubicación actual" });
      }
      
      const updateDate = lastUpdate ? new Date(lastUpdate) : new Date();
      
      // Actualizar el progreso de la ruta usando el método del storage
      const updatedRoute = await storage.updateRouteProgress(
        routeId,
        currentLocation,
        updateDate
      );
      
      // Ya no completamos automáticamente la ruta, esto ahora se hace manualmente
      // a través del endpoint /api/routes/:id/complete
      res.json(updatedRoute);
    } catch (error) {
      console.error("Error al actualizar progreso de ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para completar manualmente una ruta
  app.post("/api/routes/:id/complete", async (req, res) => {
    try {
      console.log("Solicitud recibida para completar ruta:", req.params.id);
      console.log("Datos del body:", req.body);
      
      const routeId = parseInt(req.params.id);
      const { completedAt, comments } = req.body;
      
      if (isNaN(routeId)) {
        console.error("ID de ruta inválido:", req.params.id);
        return res.status(400).json({ error: "ID de ruta inválido" });
      }
      
      // Verificar el estado actual de la ruta
      const [currentRoute] = await db
        .select()
        .from(routes)
        .where(eq(routes.id, routeId))
        .limit(1);
      
      console.log("Estado actual de la ruta:", currentRoute);
      
      if (!currentRoute) {
        console.error("Ruta no encontrada con ID:", routeId);
        return res.status(404).json({ error: "Ruta no encontrada" });
      }
      
      // Verificar si la ruta ya está completada
      if (currentRoute.status === "completed") {
        console.log("Intento de completar una ruta ya completada:", routeId);
        return res.status(400).json({ 
          error: "La ruta ya está completada",
          route: currentRoute
        });
      }
      
      // Verificar si hay pedidos pendientes
      const routeOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.routeId, routeId));
      
      console.log(`Encontrados ${routeOrders.length} pedidos para la ruta ${routeId}`);
      
      // Contar órdenes no entregadas (pending o in_transit)
      const pendingOrders = routeOrders.filter(
        order => order.status === 'pending' || order.status === 'in_transit'
      );
      
      console.log(`Hay ${pendingOrders.length} pedidos pendientes en la ruta ${routeId}`);
      
      // Si hay órdenes pendientes, requerimos comentarios explicativos
      if (pendingOrders.length > 0 && (!comments || comments.trim() === "")) {
        console.log("Intento de completar ruta con pedidos pendientes sin comentarios");
        return res.status(400).json({
          error: "Se requieren comentarios para completar una ruta con pedidos pendientes",
          pendingOrdersCount: pendingOrders.length
        });
      }
      
      const now = new Date();
      const endDate = completedAt ? new Date(completedAt) : now;
      
      console.log(`Completando ruta ${routeId} con fecha de finalización ${endDate.toISOString()}`);
      console.log(`Comentarios: ${comments || "Ninguno"}`);
      
      // Actualizar el estado de la ruta a "completed" usando SQL directo para evitar problemas con nombres de columnas
      let updateResult;
      try {
        updateResult = await db.execute(sql`
          UPDATE routes 
          SET 
            status = 'completed', 
            is_completed = true, 
            driver_ended_at = ${endDate},
            comments = ${comments || null}
          WHERE id = ${routeId}
          RETURNING *
        `);
        
        console.log("Actualización ejecutada correctamente, filas afectadas:", updateResult.rowCount);
      } catch (sqlError) {
        console.error("Error en la consulta SQL:", sqlError);
        return res.status(500).json({ 
          error: "Error al actualizar la ruta en la base de datos",
          details: String(sqlError)
        });
      }
      
      const completedRoute = updateResult.rows[0];
      
      console.log(`Ruta ${routeId} completada manualmente por el conductor`);
      
      // Si hay pedidos pendientes, considerar añadir alguna lógica adicional aquí
      // Por ejemplo, cancelar automáticamente los pedidos pendientes o moverlos a otra ruta
      
      res.json({
        success: true,
        route: completedRoute,
        pendingOrdersCount: pendingOrders.length,
        message: pendingOrders.length > 0 
          ? `Ruta completada con ${pendingOrders.length} pedidos pendientes` 
          : "Ruta completada exitosamente"
      });
    } catch (error) {
      console.error("Error al completar ruta:", error);
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
        // Utilizar IN en lugar de ANY para la lista de IDs
        const idsString = customerIds.join(',');
        const allPendingOrdersCount = await db
          .execute(sql`
            SELECT COUNT(*) 
            FROM orders 
            WHERE customer_id IN (${sql.raw(idsString)})
            AND status = 'pending'
          `);
        
        console.log(`[DEBUG] Total de pedidos pendientes (incluso asignados): ${allPendingOrdersCount.rows[0]?.count || 0}`);
      } catch (error) {
        console.error("Error contando pedidos pendientes:", error);
      }
      
      // Buscar pedidos pendientes de clientes en esa zona que no estén asignados a ninguna ruta
      // Usar IN en lugar de ANY para la lista de IDs
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
        WHERE o.customer_id IN (${sql.raw(customerIds.join(','))})
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
          const orderId = typeof order.id === 'string' ? parseInt(order.id, 10) : order.id;
          const itemsResult = await db.execute(sql`
            SELECT 
              oi.product_id AS "productId", 
              p.name, 
              oi.quantity, 
              oi.price
            FROM order_items oi
            INNER JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ${orderId}
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

  // Endpoint para obtener los envases retornables de una orden específica
  app.get("/api/orders/:id/bottle-returns", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de orden inválido" });
      }
      
      // Obtener los envases retornables para esta orden
      const bottleReturnsData = await db
        .select({
          id: bottleReturns.id,
          orderId: bottleReturns.orderId,
          productId: bottleReturns.productId,
          productName: products.name,
          expectedQuantity: bottleReturns.expectedQuantity,
          returnedQuantity: bottleReturns.returnedQuantity,
          pendingQuantity: bottleReturns.pendingQuantity,
          returnDate: bottleReturns.returnDate,
          status: bottleReturns.status,
          amountCharged: bottleReturns.amountCharged,
          depositAmount: bottleReturns.depositAmount,
          responsibleType: bottleReturns.responsibleType,
          chargeMethod: bottleReturns.chargeMethod,
        })
        .from(bottleReturns)
        .innerJoin(products, eq(bottleReturns.productId, products.id))
        .where(eq(bottleReturns.orderId, orderId));
      
      res.json(bottleReturnsData);
    } catch (error) {
      console.error("Error al obtener los envases retornables de la orden:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para registrar retornos de envases
  app.post("/api/orders/:id/bottle-returns", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { productId, returnedQuantity, expectedQuantity } = req.body;
      
      if (isNaN(orderId) || isNaN(productId) || isNaN(returnedQuantity)) {
        return res.status(400).json({ 
          error: "Datos de retorno de envases inválidos",
          details: "Se requieren orderId, productId y returnedQuantity como números válidos"
        });
      }
      
      // Verificar si ya existe un registro de retorno para esta orden y producto
      const existingReturn = await db
        .select()
        .from(bottleReturns)
        .where(and(
          eq(bottleReturns.orderId, orderId),
          eq(bottleReturns.productId, productId)
        ))
        .limit(1);
      
      let result;
      
      if (existingReturn.length > 0) {
        // Actualizar registro existente
        const pendingQuantity = existingReturn[0].expectedQuantity - returnedQuantity;
        const status = pendingQuantity <= 0 ? "complete" : "incomplete";
        
        [result] = await db
          .update(bottleReturns)
          .set({
            returnedQuantity: returnedQuantity,
            pendingQuantity: pendingQuantity,
            status: status,
            returnDate: new Date()
          })
          .where(eq(bottleReturns.id, existingReturn[0].id))
          .returning();
          
        console.log(`Registro de retorno actualizado para orden ${orderId}, producto ${productId}`);
      } else {
        // Crear nuevo registro usando SQL directo para evitar problemas con los nombres de columnas
        const pendingQuantity = expectedQuantity - returnedQuantity;
        const status = pendingQuantity <= 0 ? "complete" : "incomplete";
        
        const insertResult = await db.execute(sql`
          INSERT INTO bottle_returns 
          (order_id, product_id, expected_quantity, returned_quantity, pending_quantity, 
           return_date, status, amount_charged, deposit_amount, automatic_alert, manually_assigned)
          VALUES 
          (${orderId}, ${productId}, ${expectedQuantity}, ${returnedQuantity}, ${pendingQuantity}, 
           NOW(), ${status}, '0.00', '0.00', false, false)
          RETURNING *
        `);
        
        result = insertResult.rows[0];
        console.log(`Nuevo registro de retorno creado para orden ${orderId}, producto ${productId}`);
      }
      
      // Obtener datos completos del producto
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));
      
      // Devolver resultado enriquecido
      const enrichedResult = {
        ...result,
        productName: product ? product.name : "Producto desconocido"
      };
      
      res.status(201).json({
        success: true,
        message: "Retorno de envases registrado correctamente",
        bottleReturn: enrichedResult
      });
    } catch (error) {
      console.error("Error al registrar retorno de envases:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener los detalles de entrega de una orden
  app.get("/api/orders/:id/delivery", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de orden inválido" });
      }
      
      // Obtener la orden con sus detalles
      const order = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          status: orders.status,
          total: orders.total,
          date: orders.date,
          routeId: orders.routeId
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
        
      if (!order || order.length === 0) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      
      // Obtener el cliente
      const customer = await db
        .select({
          id: customers.id,
          name: customers.businessname,
          address: customers.street
        })
        .from(customers)
        .where(eq(customers.id, order[0].customerId))
        .limit(1);
        
      if (!customer || customer.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      
      // Obtener items del pedido con detalles del producto
      const orderItemsResult = await db
        .select({
          productId: orderItemsTable.productId,
          name: products.name,
          quantity: orderItemsTable.quantity,
          price: orderItemsTable.price
        })
        .from(orderItemsTable)
        .leftJoin(products, eq(orderItemsTable.productId, products.id))
        .where(eq(orderItemsTable.orderId, orderId));
      
      // Obtener retornos de envases
      const bottleReturnsData = await db
        .select({
          id: bottleReturns.id,
          orderId: bottleReturns.orderId,
          productId: bottleReturns.productId,
          productName: products.name,
          expectedQuantity: bottleReturns.expectedQuantity,
          returnedQuantity: bottleReturns.returnedQuantity,
          pendingQuantity: bottleReturns.pendingQuantity,
          returnDate: bottleReturns.returnDate,
          status: bottleReturns.status,
          amountCharged: bottleReturns.amountCharged,
          depositAmount: bottleReturns.depositAmount,
          responsibleType: bottleReturns.responsibleType,
          chargeMethod: bottleReturns.chargeMethod,
        })
        .from(bottleReturns)
        .leftJoin(products, eq(bottleReturns.productId, products.id))
        .where(eq(bottleReturns.orderId, orderId));
      
      // Formatear la respuesta
      const delivery = {
        id: order[0].id,
        orderId: order[0].id,
        customerId: order[0].customerId,
        customerName: customer[0].name,
        address: customer[0].address,
        status: order[0].status,
        routeId: order[0].routeId,
        scheduledTime: new Date(order[0].date).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        products: orderItemsResult.map(item => ({
          id: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price)
        })),
        total: Number(order[0].total),
        bottleReturns: bottleReturnsData
      };
      
      res.json(delivery);
    } catch (error) {
      console.error("Error al obtener detalles de entrega:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Error al procesar la solicitud", details: errorMessage });
    }
  });

  // Endpoint para obtener todos los envases retornables
  app.get("/api/bottle-returns", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      
      // Base de la consulta
      const baseQuery = {
        id: bottleReturns.id,
        orderId: bottleReturns.orderId,
        productId: bottleReturns.productId,
        productName: products.name,
        expectedQuantity: bottleReturns.expectedQuantity,
        returnedQuantity: bottleReturns.returnedQuantity,
        pendingQuantity: bottleReturns.pendingQuantity,
        returnDate: bottleReturns.returnDate,
        status: bottleReturns.status,
        amountCharged: bottleReturns.amountCharged,
        depositAmount: bottleReturns.depositAmount,
        responsibleType: bottleReturns.responsibleType,
        chargeMethod: bottleReturns.chargeMethod,
        customerName: customers.businessname,
        customerAddress: customers.street,
      };
      
      // Ejecutar la consulta con o sin filtro de estado
      let bottleReturnsData;
      if (status) {
        bottleReturnsData = await db
          .select(baseQuery)
          .from(bottleReturns)
          .innerJoin(products, eq(bottleReturns.productId, products.id))
          .innerJoin(orders, eq(bottleReturns.orderId, orders.id))
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .where(eq(bottleReturns.status, status as "pending" | "complete" | "incomplete"));
      } else {
        bottleReturnsData = await db
          .select(baseQuery)
          .from(bottleReturns)
          .innerJoin(products, eq(bottleReturns.productId, products.id))
          .innerJoin(orders, eq(bottleReturns.orderId, orders.id))
          .innerJoin(customers, eq(orders.customerId, customers.id));
      }
      
      res.json(bottleReturnsData);
    } catch (error) {
      console.error("Error al obtener los envases retornables:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener los envases retornables de una ruta específica
  app.get("/api/routes/:id/bottle-returns", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (isNaN(routeId)) {
        return res.status(400).json({ error: "ID de ruta inválido" });
      }
      
      // Primero, obtenemos todas las órdenes de esta ruta
      const routeOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.routeId, routeId));
      
      if (!routeOrders.length) {
        return res.json([]);
      }
      
      // Extraemos los IDs de las órdenes
      const orderIds = routeOrders.map(order => order.id);
      
      // Obtenemos los envases retornables para todas estas órdenes
      const bottleReturnsData = await db
        .select({
          id: bottleReturns.id,
          orderId: bottleReturns.orderId,
          productId: bottleReturns.productId,
          productName: products.name,
          expectedQuantity: bottleReturns.expectedQuantity,
          returnedQuantity: bottleReturns.returnedQuantity,
          pendingQuantity: bottleReturns.pendingQuantity,
          returnDate: bottleReturns.returnDate,
          status: bottleReturns.status,
          amountCharged: bottleReturns.amountCharged,
          depositAmount: bottleReturns.depositAmount,
          responsibleType: bottleReturns.responsibleType,
          chargeMethod: bottleReturns.chargeMethod,
          customerName: customers.businessname,
          customerAddress: customers.street,
        })
        .from(bottleReturns)
        .innerJoin(products, eq(bottleReturns.productId, products.id))
        .innerJoin(orders, eq(bottleReturns.orderId, orders.id))
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(inArray(bottleReturns.orderId, orderIds));
      
      // Agrupamos por orden para una mejor organización
      const bottleReturnsByOrder = orderIds.map(orderId => {
        const returns = bottleReturnsData.filter(item => item.orderId === orderId);
        return {
          orderId,
          returns
        };
      }).filter(group => group.returns.length > 0);
      
      res.json(bottleReturnsByOrder);
    } catch (error) {
      console.error("Error al obtener los envases retornables de la ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener los productos de un pedido específico
  app.get("/api/orders/:id/products", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Obtener los elementos del pedido
      const orderProductItems = await db.select({
        id: orderItemsTable.productId,
        quantity: orderItemsTable.quantity,
        price: products.price,
        name: products.name,
        isReturnable: products.isReturnable,
        depositAmount: products.depositAmount
      })
      .from(orderItemsTable)
      .innerJoin(products, eq(orderItemsTable.productId, products.id))
      .where(eq(orderItemsTable.orderId, orderId));
      
      if (!orderProductItems || orderProductItems.length === 0) {
        // Devolver una lista vacía en lugar de un error 404
        return res.json([]);
      }
      
      // Formatear los productos para la respuesta
      const formattedProducts = orderProductItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        isReturnable: item.isReturnable,
        depositAmount: item.depositAmount ? Number(item.depositAmount) : 0
      }));
      
      res.json(formattedProducts);
    } catch (error) {
      console.error("Error al obtener productos del pedido:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Endpoint para obtener los items de un pedido
  app.get("/api/orders/:id/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Obtener los elementos del pedido con información de productos
      const orderItems = await db.select({
        productId: orderItemsTable.productId,
        quantity: orderItemsTable.quantity,
        price: orderItemsTable.price
      })
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderId));
      
      if (!orderItems || orderItems.length === 0) {
        // Devolver una lista vacía en lugar de un error 404
        return res.json([]);
      }
      
      res.json(orderItems);
    } catch (error) {
      console.error("Error al obtener items del pedido:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  // Endpoint para marcar un pedido como entregado con pago
  // Endpoint para actualizar los productos de un pedido
  app.patch("/api/orders/:id/products", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { products } = req.body;
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Validar que se proporcionaron productos
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "Se requiere una lista válida de productos" });
      }
      
      console.log(`Actualizando productos para el pedido ${orderId}`, products);
      
      // Verificar que el pedido existe
      const order = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
        
      if (!order || order.length === 0) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Verificar que el pedido no está entregado o cancelado
      if (order[0].status === "delivered" || order[0].status === "cancelled") {
        return res.status(400).json({ 
          error: `No se puede modificar un pedido con estado ${order[0].status}` 
        });
      }
      
      // Eliminar los items actuales del pedido
      await db.delete(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));
        
      // Insertar los nuevos productos
      const newItems = [];
      let total = 0;
      
      for (const product of products) {
        // Validar que el producto tenga los campos requeridos
        if (!product.id || !product.quantity || !product.price) {
          continue; // Saltamos productos inválidos
        }
        
        const productTotal = product.quantity * parseFloat(product.price);
        total += productTotal;
        
        const [item] = await db.insert(orderItemsTable)
          .values({
            orderId,
            productId: product.id,
            quantity: product.quantity,
            price: product.price
          })
          .returning();
          
        newItems.push({
          ...item,
          name: product.name
        });
      }
      
      // Actualizar el total del pedido
      await db.update(orders)
        .set({ 
          total: total.toFixed(2)
        })
        .where(eq(orders.id, orderId));
        
      // Obtener el pedido actualizado
      const [updatedOrder] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
        
      res.json({
        success: true,
        order: updatedOrder,
        items: newItems,
        total: total.toFixed(2)
      });
      
    } catch (error) {
      console.error("Error al actualizar productos del pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/orders/:id/deliver", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { paymentMethod, paymentAmount, updateCustomerBalance } = req.body;
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Validar que el método de pago sea válido
      if (!paymentMethod || !["cash", "credit"].includes(paymentMethod)) {
        return res.status(400).json({ 
          error: "Método de pago inválido. Debe ser 'cash' o 'credit'.",
          receivedMethod: paymentMethod 
        });
      }
      
      console.log(`Marcando pedido ${orderId} como entregado con método de pago: ${paymentMethod}`);
      
      // Verificar que el pedido existe
      const order = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      
      if (!order || order.length === 0) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Obtener información del cliente
      const customer = await db.select()
        .from(customers)
        .where(eq(customers.id, order[0].customerId))
        .limit(1);
      
      if (!customer || customer.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      
      // Obtener los productos del pedido
      const orderItems = await db.select({
        productId: orderItemsTable.productId,
        productName: products.name,
        quantity: orderItemsTable.quantity,
        price: orderItemsTable.price,
      })
      .from(orderItemsTable)
      .innerJoin(products, eq(orderItemsTable.productId, products.id))
      .where(eq(orderItemsTable.orderId, orderId));
      
      // Actualizar el estado del pedido a "entregado", manteniendo la asociación con la ruta
      await db.update(orders)
        .set({ 
          status: "delivered",
          paymentMethod: paymentMethod, // Usar el método proporcionado por el cliente (no usar valor por defecto)
          // NO modificamos el campo routeId, para mantener la asociación con la ruta
        })
        .where(eq(orders.id, orderId));
        
      console.log(`Pedido ${orderId} actualizado como entregado, manteniendo su asociación con la ruta ${order[0].routeId || 'ninguna'}`);
      
      // Actualizar el balance del cliente si se requiere
      if (updateCustomerBalance) {
        // Si el método de pago es crédito, añadir al balance, si es efectivo, no afecta
        const currentBalance = parseFloat(customer[0].balance || "0");
        const orderTotal = parseFloat(order[0].total || "0");
        let newBalance = currentBalance;
        
        if (paymentMethod === "credit") {
          // Si es crédito, aumentamos el balance
          newBalance = currentBalance + orderTotal;
        } else if (paymentMethod === "cash") {
          // En caso de efectivo, el balance no cambia
          newBalance = currentBalance;
        }
        
        await db.update(customers)
          .set({ balance: newBalance.toFixed(2) })
          .where(eq(customers.id, customer[0].id));
        
        console.log(`Balance del cliente actualizado de ${currentBalance} a ${newBalance}`);
      }
      
      // Crear una factura para la orden
      const [invoice] = await db.insert(invoices)
        .values({
          customerId: order[0].customerId,
          total: order[0].total,
          status: paymentMethod === "cash" ? "paid" : "pending",
          paymentMethod: paymentMethod, // Usar el método proporcionado por el cliente (no usar valor por defecto)
          notes: `Pedido #${orderId} entregado`
        })
        .returning();
      
      console.log(`Factura generada con ID: ${invoice.id}`);
      
      // Insertar los detalles de la factura (items)
      for (const item of orderItems) {
        const itemTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
        await db.insert(invoiceItems)
          .values({
            invoiceId: invoice.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: itemTotal
          });
      }
      
      console.log("Detalles de factura agregados");
      
      // Registrar el pago si es en efectivo
      if (paymentMethod === "cash" && paymentAmount > 0) {
        try {
          const payment = await storage.registerPayment({
            invoiceId: invoice.id,
            customerId: order[0].customerId,
            amount: (Math.min(paymentAmount, parseFloat(order[0].total))).toFixed(2),
            paymentMethod: "cash",
            reference: `Pago de pedido #${orderId}`,
            notes: "Pago recibido al momento de la entrega"
          });
          
          console.log(`Pago registrado con ID: ${payment.id}`);
        } catch (paymentError) {
          console.error("Error al registrar el pago:", paymentError);
          // Continuamos a pesar del error en el pago
        }
      }
      
      res.json({
        success: true,
        orderId,
        invoiceCreated: true,
        invoiceId: invoice.id,
        paymentRegistered: paymentMethod === "cash" && paymentAmount > 0
      });
      
    } catch (error) {
      console.error("Error al marcar pedido como entregado:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener datos de pagos
  app.get("/api/payments", async (req, res) => {
    try {
      // Consultar todos los pagos con información del cliente y factura
      const paymentsData = await db
        .select({
          id: payments.id,
          invoiceId: payments.invoiceId,
          customerId: payments.customerId,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          date: payments.date,
          reference: payments.reference,
          notes: payments.notes,
          // Campos adicionales de la factura
          invoiceNumber: invoices.invoiceNumber,
          // Campos del cliente
          customerName: customers.businessname
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .leftJoin(customers, eq(payments.customerId, customers.id))
        .orderBy(desc(payments.date));
      
      res.json(paymentsData);
    } catch (error) {
      console.error("Error al obtener datos de pagos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para crear un nuevo pago
  app.post("/api/payments", async (req, res) => {
    try {
      const { invoiceId, customerId, amount, paymentMethod, reference, notes } = req.body;
      
      // Validar datos requeridos
      if (!invoiceId || !customerId || !amount || !paymentMethod) {
        return res.status(400).json({ 
          error: "Faltan datos requeridos para registrar el pago",
          requiredFields: ["invoiceId", "customerId", "amount", "paymentMethod"]
        });
      }
      
      // Registrar el pago usando el storage
      const newPayment = await storage.registerPayment({
        invoiceId,
        customerId,
        amount,
        paymentMethod,
        reference,
        notes
      });
      
      // Obtener datos adicionales del pago recién creado (cliente y factura)
      const [paymentWithDetails] = await db
        .select({
          id: payments.id,
          invoiceId: payments.invoiceId,
          customerId: payments.customerId,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          date: payments.date,
          reference: payments.reference,
          notes: payments.notes,
          invoiceNumber: invoices.invoiceNumber,
          customerName: customers.businessname
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .leftJoin(customers, eq(payments.customerId, customers.id))
        .where(eq(payments.id, newPayment.id));
      
      res.status(201).json(paymentWithDetails);
    } catch (error) {
      console.error("Error al registrar el pago:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener la ruta activa de un conductor
  app.get("/api/routes/active", async (req: Request, res: Response) => {
    try {
      // Mantener compatibilidad con clientes que no envían el ID del conductor
      // Si no viene el ID, devolver todas las rutas activas
      const driverId = req.query.driverId ? parseInt(req.query.driverId as string) : null;
      
      console.log(`Buscando rutas activas${driverId ? ` para el conductor ID: ${driverId}` : ' (todas)'}`);
      
      // Construir la consulta base
      let query = db
        .select()
        .from(routes)
        .where(
          inArray(routes.status, ["pending", "in_progress"])
        );
        
      // Si se proporciona un ID de conductor, filtrar por él
      if (driverId) {
        query = query.where(eq(routes.driverId, driverId));
      }
      
      // Ordenar por fecha descendente
      query = query.orderBy(desc(routes.date));
        
      // Ejecutar la consulta
      const activeRoutes = await query;
      
      console.log(`Rutas activas encontradas: ${activeRoutes.length}`);
      
      if (!activeRoutes || activeRoutes.length === 0) {
        return res.status(200).json([]); // Devolver arreglo vacío en lugar de error
      }
      
      // Obtener los pedidos asociados a cada ruta
      const routesWithOrders = await Promise.all(
        activeRoutes.map(async (route) => {
          // Contar los pedidos asociados a esta ruta
          const orderCountResult = await db
            .select({
              count: sql`COUNT(*)`.mapWith(Number),
            })
            .from(orders)
            .where(eq(orders.routeId, route.id));
          
          const orderCount = orderCountResult[0]?.count || 0;
          
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
            .where(eq(orders.routeId, route.id))
            .limit(10); // Limitar para prevenir queries muy largas
            
          return {
            ...route,
            orderCount,
            orders: routeOrders
          };
        })
      );
      
      // Devolver todas las rutas activas con información de pedidos
      res.json(routesWithOrders);
    } catch (error) {
      console.error("Error al obtener la ruta activa:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Completar una orden (entregar y cobrar)
  app.post("/api/orders/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de orden inválido" });
      }
      
      const { status, paymentMethod, amountPaid, userId } = req.body;
      
      // Validar los datos de entrada
      if (!status || !paymentMethod) {
        return res.status(400).json({ error: "Datos incompletos para completar la orden" });
      }
      
      // Obtener la orden
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      
      // Si la orden ya está entregada, retornar éxito
      if (order.status === "delivered") {
        return res.json({ success: true, message: "La orden ya estaba marcada como entregada" });
      }
      
      // Actualizar el estado de la orden
      const updatedOrder = await storage.updateOrderStatus(id, "delivered");
      
      // Registrar el pago
      if (amountPaid && paymentMethod) {
        try {
          // Obtener el cliente de la orden para el registro del pago
          const order = await db.query.orders.findFirst({
            where: eq(orders.id, id)
          });
          
          if (order) {
            const payment = {
              invoiceId: id, // Usando el ID de la orden como invoiceId
              amount: amountPaid.toString(),
              paymentMethod: paymentMethod,
              customerId: order.customerId,
              reference: `Pago orden #${id}`,
              notes: `Pago procesado por conductor`
            };
            
            await storage.registerPayment(payment);
            
            console.log(`Pago registrado para la orden ${id}: ${amountPaid} via ${paymentMethod}`);
          }
        } catch (paymentError) {
          console.error("Error al registrar el pago:", paymentError);
          // No fallamos la operación completa si el pago no se registra
        }
      }
      
      // Si la orden está asociada a una ruta, verificar si todas las órdenes están completadas
      if (order.routeId) {
        try {
          // Obtener todas las órdenes de la ruta
          const routeOrders = await db.query.orders.findMany({
            where: eq(orders.routeId, order.routeId)
          });
          
          // Verificar si todas están entregadas
          const allDelivered = routeOrders.every(o => o.id === id || o.status === "delivered");
          
          if (allDelivered) {
            console.log(`Todas las órdenes de la ruta ${order.routeId} han sido entregadas`);
            
            // Actualizar la ruta como completada
            await storage.updateRouteStatus(order.routeId, "completed");
            
            // Actualizar la fecha de finalización y marcar como completada
            await db.update(routes)
              .set({ 
                driverEndedAt: new Date(),
                isCompleted: true
              })
              .where(eq(routes.id, order.routeId));
          }
        } catch (routeError) {
          console.error("Error al verificar/actualizar el estado de la ruta:", routeError);
        }
      }
      
      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Error al completar la orden:", error);
      res.status(500).json({ error: "Error al completar la orden" });
    }
  });
  
  // Generar factura para una orden
  app.post("/api/invoices/generate", async (req, res) => {
    try {
      const { orderId, total, paymentMethod, userId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ error: "ID de orden requerido" });
      }
      
      // En un sistema real, aquí se generaría la factura en la base de datos
      // Para esta implementación, solo retornamos un ID de factura simulado
      
      const invoiceId = `INV-${orderId}-${Date.now().toString().slice(-6)}`;
      
      console.log(`Factura ${invoiceId} generada para la orden ${orderId}`);
      
      res.json({ 
        success: true, 
        invoiceId,
        message: "Factura generada correctamente"
      });
    } catch (error) {
      console.error("Error al generar la factura:", error);
      res.status(500).json({ error: "Error al generar la factura" });
    }
  });
  
  // Nueva ruta para completar entrega, cobrar y generar factura en un solo paso
  app.post("/api/mobile/orders/:id/deliver-and-invoice", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de orden inválido" });
      }
      
      const { paymentMethod, amountPaid, userId } = req.body;
      
      // Validar los datos de entrada
      if (!paymentMethod || !amountPaid) {
        return res.status(400).json({ error: "Método de pago y monto pagado son obligatorios" });
      }
      
      console.log(`Procesando entrega, pago y factura para orden #${id}`, req.body);
      
      // Paso 1: Obtener la orden
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      
      // Paso 2: Marcar como entregada si aún no lo está
      let updatedOrder = order;
      if (order.status !== "delivered") {
        updatedOrder = await storage.updateOrderStatus(id, "delivered");
        console.log(`Orden #${id} marcada como entregada`);
      } else {
        console.log(`Orden #${id} ya estaba marcada como entregada`);
      }
      
      // Paso 3: Registrar el pago
      let paymentRegistered = false;
      try {
        const payment = {
          invoiceId: id, // Usando el ID de la orden como invoiceId temporal
          amount: amountPaid.toString(),
          paymentMethod: paymentMethod,
          customerId: order.customerId,
          reference: `Pago de pedido #${id}`,
          notes: "Pago recibido al momento de la entrega"
        };
        
        await storage.registerPayment(payment);
        paymentRegistered = true;
        console.log(`Pago registrado para orden #${id}: ${amountPaid} vía ${paymentMethod}`);
      } catch (paymentError) {
        console.error("Error al registrar el pago:", paymentError);
      }
      
      // Paso 4: Generar factura con número secuencial
      let invoiceGenerated = false;
      let invoiceId = null;
      try {
        // Obtener el siguiente número de factura
        const lastInvoice = await db.query.invoices.findFirst({
          orderBy: [desc(invoices.invoiceNumber)]
        });
        
        const nextInvoiceNumber = lastInvoice ? lastInvoice.invoiceNumber + 1 : 1;
        
        // Definir status basado en el método de pago
        const invoiceStatus = paymentMethod === "cash" ? "paid" : "pending";
        
        // Método de pago validado según el esquema de la tabla
        let validPaymentMethod: "cash" | "credit" | "card";
        if (paymentMethod === "cash" || paymentMethod === "credit" || paymentMethod === "card") {
          validPaymentMethod = paymentMethod;
        } else {
          validPaymentMethod = "cash"; // Default
        }
        
        // Insertar la factura en la base de datos con los tipos correctos
        const result = await db.insert(invoices).values([{
          invoiceNumber: nextInvoiceNumber,
          customerId: order.customerId,
          total: amountPaid.toString(),
          status: invoiceStatus,
          paymentMethod: validPaymentMethod,
          date: new Date(),
          notes: `Pedido #${id} entregado`
        }]).returning();
        if (result && result.length > 0) {
          invoiceId = result[0].id;
          invoiceGenerated = true;
          console.log(`Factura #${nextInvoiceNumber} generada para orden #${id}`);
        }
      } catch (invoiceError) {
        console.error("Error al generar la factura:", invoiceError);
      }
      
      // Paso 5: Actualizar ruta si es necesario
      if (order.routeId) {
        try {
          // Obtener todas las órdenes de la ruta
          const routeOrders = await db.query.orders.findMany({
            where: eq(orders.routeId, order.routeId)
          });
          
          // Verificar si todas están entregadas
          const allDelivered = routeOrders.every(o => o.id === id || o.status === "delivered");
          
          if (allDelivered) {
            console.log(`Todas las órdenes de la ruta ${order.routeId} han sido entregadas`);
            
            // Actualizar la ruta como completada
            await storage.updateRouteStatus(order.routeId, "completed");
            
            // Actualizar la fecha de finalización y marcar como completada
            await db.update(routes)
              .set({ 
                driverEndedAt: new Date(),
                isCompleted: true
              })
              .where(eq(routes.id, order.routeId));
            
            console.log(`Ruta ${order.routeId} marcada como completada`);
          }
        } catch (routeError) {
          console.error("Error al verificar/actualizar el estado de la ruta:", routeError);
        }
      }
      
      // Responder con todos los resultados
      res.json({
        success: true,
        order: updatedOrder,
        payment: {
          registered: paymentRegistered,
          amount: amountPaid,
          method: paymentMethod
        },
        invoice: {
          generated: invoiceGenerated,
          invoiceId: invoiceId
        }
      });
      
    } catch (error: any) {
      console.error("Error en el proceso de entrega y facturación:", error);
      res.status(500).json({
        error: "Error al procesar la entrega, pago y facturación",
        details: error.message || String(error)
      });
    }
  });
}