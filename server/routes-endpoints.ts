import { Express } from "express";
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
  payments
} from "@shared/schema";
import { and, eq, inArray, sql, isNull, ne } from "drizzle-orm";
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
      
      // Buscar todas las órdenes para esta ruta
      let routeOrders = await db
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
      
      // Si no hay órdenes asignadas directamente a la ruta, buscar órdenes pendientes sin asignar
      if (routeOrders.length === 0) {
        console.log(`No hay órdenes asignadas a la ruta ${routeId}, buscando órdenes pendientes...`);
        
        // Obtener detalles de la ruta para usar sus coordenadas
        const routeDetails = route[0];
        console.log("Detalles de la ruta:", routeDetails);
        
        // Si la ruta tiene stops definidos, los usamos para buscar órdenes cercanas
        if (routeDetails.stops && routeDetails.stops.length > 0) {
          console.log("La ruta tiene coordenadas definidas:", routeDetails.stops);
          
          // Para simplicidad, asignamos todas las órdenes pendientes a esta ruta
          // En un sistema real, haríamos una búsqueda basada en cercanía
        }
        
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
          .where(and(
            isNull(orders.routeId),
            eq(orders.status, "pending")
          ));
        
        console.log(`Se encontraron ${routeOrders.length} órdenes pendientes sin asignar`);
        
        // Si encontramos órdenes pendientes, las asignamos temporalmente a esta ruta
        // (solo en memoria, no en la base de datos)
        if (routeOrders.length > 0) {
          console.log(`Asignando temporalmente ${routeOrders.length} órdenes pendientes a la ruta ${routeId}`);
          routeOrders = routeOrders.map(order => ({
            ...order,
            routeId: routeId // Asignar el ID de la ruta para la respuesta
          }));
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
        // Crear nuevo registro
        const pendingQuantity = expectedQuantity - returnedQuantity;
        const status = pendingQuantity <= 0 ? "complete" : "incomplete";
        
        [result] = await db
          .insert(bottleReturns)
          .values({
            orderId,
            productId,
            expectedQuantity,
            returnedQuantity,
            pendingQuantity,
            returnDate: new Date(),
            status,
            amountCharged: 0,
            depositAmount: 0,
            automaticAlert: false,
            manuallyAssigned: false
          })
          .returning();
          
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
          name: customers.name,
          address: customers.address
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
      res.status(500).json({ error: "Error al procesar la solicitud", details: error.message });
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
      
      // Actualizar el estado del pedido a "entregado"
      await db.update(orders)
        .set({ 
          status: "delivered",
          paymentMethod: paymentMethod // Usar el método proporcionado por el cliente (no usar valor por defecto)
        })
        .where(eq(orders.id, orderId));
      
      console.log(`Pedido ${orderId} actualizado como entregado`);
      
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
}