import express, { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  orders, invoices, invoiceItems, payments, orderItems,
  routes, vehicleLoading, customers,
  insertInvoiceSchema, insertInvoiceItemSchema, insertPaymentSchema
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { companyDb, getCurrentCompanyId } from '../company-db';
import { safeParseInt, isPositiveInteger } from '../utils/validation';

/**
 * Crea y registra los endpoints específicos para la aplicación móvil
 */
export function createMobileApiEndpoints(): Router {
  const router = express.Router();
  
  /**
   * GET /api/mobile/routes
   * Obtiene todas las rutas para la empresa actual
   */
  router.get('/routes', async (req, res) => {
    try {
      // Obtener el companyId adecuado de diferentes fuentes
      let companyId = getCurrentCompanyId();
      
      // Si no hay companyId en el contexto, intentar obtenerlo de la sesión
      if (!companyId && req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
        companyId = req.session.companyId || req.session.user?.companyId;
      }
      
      // Si todavía no tenemos companyId, devolvemos error
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      console.log(`MobileAPI - Obteniendo rutas para compañía #${companyId}`);
      
      // Filtrar por estado si se proporciona
      const statusFilter = req.query.status ? 
        eq(routes.status, req.query.status as string) : undefined;
        
      // Filtrar por chofer si se proporciona
      const driverId = req.query.driverId ? safeParseInt(req.query.driverId as string, -1) : -1;
      const driverFilter = isPositiveInteger(driverId) ? 
        eq(routes.driverId, driverId) : undefined;
      
      // Construir el filtro completo
      let filter;
      if (statusFilter && driverFilter) {
        filter = and(
          eq(routes.companyId, companyId),
          statusFilter,
          driverFilter
        );
      } else if (statusFilter) {
        filter = and(
          eq(routes.companyId, companyId),
          statusFilter
        );
      } else if (driverFilter) {
        filter = and(
          eq(routes.companyId, companyId),
          driverFilter
        );
      } else {
        filter = eq(routes.companyId, companyId);
      }
      
      // Usar db en lugar de companyDb para diagnóstico
      const result = await db.select()
        .from(routes)
        .where(filter)
        .orderBy(desc(routes.date));
      
      console.log(`MobileAPI - Se encontraron ${result.length} rutas`);
      res.json(result);
    } catch (error) {
      console.error("Error al obtener rutas:", error);
      res.status(500).json({ error: "Error al obtener rutas", details: String(error) });
    }
  });
  
  /**
   * GET /api/mobile/orders
   * Obtiene todas las órdenes para la empresa actual
   */
  router.get('/orders', async (req, res) => {
    try {
      // Obtener el companyId adecuado de diferentes fuentes
      let companyId = getCurrentCompanyId();
      
      // Si no hay companyId en el contexto, intentar obtenerlo de la sesión
      if (!companyId && req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
        companyId = req.session.companyId || req.session.user?.companyId;
      }
      
      // Si todavía no tenemos companyId, devolvemos error
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      console.log(`MobileAPI - Obteniendo órdenes para compañía #${companyId}`);
      
      // Filtrar por estado si se proporciona
      const statusFilter = req.query.status ? 
        eq(orders.status, req.query.status as string) : undefined;
        
      // Filtrar por ruta si se proporciona
      const routeId = req.query.routeId ? safeParseInt(req.query.routeId as string, -1) : -1;
      const routeFilter = isPositiveInteger(routeId) ? 
        eq(orders.routeId, routeId) : undefined;
      
      // Construir el filtro completo
      let filter;
      if (statusFilter && routeFilter) {
        filter = and(
          eq(orders.companyId, companyId),
          statusFilter,
          routeFilter
        );
      } else if (statusFilter) {
        filter = and(
          eq(orders.companyId, companyId),
          statusFilter
        );
      } else if (routeFilter) {
        filter = and(
          eq(orders.companyId, companyId),
          routeFilter
        );
      } else {
        filter = eq(orders.companyId, companyId);
      }
      
      // Usar db en lugar de companyDb para diagnóstico
      const result = await db.select()
        .from(orders)
        .where(filter)
        .orderBy(desc(orders.id));
        
      // Enriquecer cada orden con los productos
      for (const order of result) {
        // Usar db en lugar de companyDb para diagnóstico
        const items = await db.select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price
        })
        .from(orderItems)
        .where(and(
          eq(orderItems.orderId, order.id),
          eq(orderItems.companyId, companyId)
        ));
        
        // Obtener los nombres de los productos de una manera más simple
        const productsInfo = await Promise.all(
          items.map(async (item) => {
            try {
              // Buscar el producto por ID
              const productResult = await db.execute(`
                SELECT name, is_returnable, deposit_amount FROM products 
                WHERE id = ${item.productId} AND company_id = ${companyId}
              `);
              
              const productName = productResult.rows && productResult.rows.length > 0 
                ? productResult.rows[0].name 
                : "Producto";
              const isReturnable = productResult.rows && productResult.rows.length > 0 
                ? productResult.rows[0].is_returnable 
                : false;
              const bottleDeposit = productResult.rows && productResult.rows.length > 0 
                ? productResult.rows[0].deposit_amount 
                : '0.00';
                
              return {
                productId: item.productId,
                name: productName,
                quantity: item.quantity,
                price: item.price,
                isReturnable: isReturnable,
                bottleDeposit: bottleDeposit
              };
            } catch (err) {
              console.error(`Error al obtener producto #${item.productId}:`, err);
              return {
                productId: item.productId,
                name: "Producto",
                quantity: item.quantity,
                price: item.price,
                isReturnable: false,
                bottleDeposit: '0.00'
              };
            }
          })
        );
          
        // Añadir productos a la orden
        (order as any).products = productsInfo;
      }
      
      console.log(`MobileAPI - Se encontraron ${result.length} órdenes`);
      res.json(result);
    } catch (error) {
      console.error("Error al obtener órdenes:", error);
      res.status(500).json({ error: "Error al obtener órdenes", details: String(error) });
    }
  });
  
  /**
   * GET /api/mobile/customers
   * Obtiene todos los clientes para la empresa actual
   */
  router.get('/customers', async (req, res) => {
    try {
      // Obtener el companyId adecuado de diferentes fuentes
      let companyId = getCurrentCompanyId();
      
      // Si no hay companyId en el contexto, intentar obtenerlo de la sesión
      if (!companyId && req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
        companyId = req.session.companyId || req.session.user?.companyId;
      }
      
      // Si todavía no tenemos companyId, devolvemos error
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      console.log(`MobileAPI - Obteniendo clientes para compañía #${companyId}`);
      
      // Usar db en lugar de companyDb para diagnóstico
      const result = await db.select()
        .from(customers)
        .where(eq(customers.companyId, companyId))
        .orderBy(customers.businessname);
      
      console.log(`MobileAPI - Se encontraron ${result.length} clientes`);
      res.json(result);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({ error: "Error al obtener clientes", details: String(error) });
    }
  });

  /**
   * Endpoint para completar una ruta cuando todas las paradas están completadas
   * POST /api/mobile/routes/:id/complete
   */
  router.post('/routes/:id/complete', async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      // Obtener el companyId adecuado de diferentes fuentes
      let companyId = getCurrentCompanyId();
      
      // Si no hay companyId en el contexto, intentar obtenerlo de la sesión
      if (!companyId && req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
        companyId = req.session.companyId || req.session.user?.companyId;
      }
      
      // Si todavía no tenemos companyId, devolvemos error
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ 
          success: false,
          message: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." 
        });
      }
      
      console.log(`MobileAPI - Procesando completado de ruta #${routeId} para compañía #${companyId}`);
      
      if (!routeId || isNaN(routeId)) {
        return res.status(400).json({ 
          success: false, 
          message: "ID de ruta inválido" 
        });
      }

      // 1. Verificar si la ruta existe
      const route = await companyDb.query.routes.findFirst({
        where: and(
          eq(routes.id, routeId),
          eq(routes.companyId, companyId)
        )
      });
      
      if (!route) {
        return res.status(404).json({ 
          success: false, 
          message: "Ruta no encontrada" 
        });
      }

      // Validar que la ruta no esté ya completada
      if (route.status === "completed" || route.isCompleted) {
        return res.status(400).json({
          success: false,
          message: "Esta ruta ya ha sido completada anteriormente"
        });
      }
      
      // 2. Verificar si todas las órdenes de la ruta están entregadas
      const routeOrders = await companyDb.select()
        .from(orders)
        .where(and(
          eq(orders.routeId, routeId),
          eq(orders.companyId, companyId)
        ));
      
      console.log(`Verificando si todas las órdenes de la ruta #${routeId} están entregadas...`);
      console.log(`Total de órdenes: ${routeOrders.length}`);
      
      // Verificar si hay alguna orden sin entregar
      const pendingOrders = routeOrders.filter(order => {
        const status = (order.status || "").toLowerCase();
        return status !== "delivered" && 
               status !== "completed" && 
               !status.includes("deliver");
      });
      
      if (pendingOrders.length > 0) {
        console.log(`Se encontraron ${pendingOrders.length} órdenes pendientes`);
        return res.status(400).json({
          success: false,
          message: `No se puede completar la ruta. Hay ${pendingOrders.length} órdenes pendientes por entregar.`,
          pendingOrders: pendingOrders.map(order => order.id)
        });
      }
      
      // 3. Actualizar el estado de la ruta a "completed"
      await companyDb.update(routes)
        .set({
          status: "completed",
          endTime: new Date(),
          driverEndedAt: new Date(),
          isCompleted: true
        })
        .where(and(
          eq(routes.id, routeId),
          eq(routes.companyId, companyId)
        ));
      
      // 4. NO completamos la carga de vehículo relacionada con esta ruta
      // Solo verificamos si existe para informar en los logs
      const relatedLoading = await companyDb.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.routeId, routeId),
          eq(vehicleLoading.companyId, companyId)
        ),
      });
      
      if (relatedLoading) {
        console.log(`Se encontró carga de vehículo #${relatedLoading.id} relacionada con la ruta, pero NO se marcará como completada.`);
        console.log(`La carga de vehículo se completará solo cuando se realice el cuadre correspondiente.`);
      }
      
      // 5. Obtener la ruta actualizada para devolver en la respuesta
      const updatedRoute = await companyDb.query.routes.findFirst({
        where: and(
          eq(routes.id, routeId),
          eq(routes.companyId, companyId)
        )
      });
      
      return res.status(200).json({
        success: true,
        message: "¡Ruta completada exitosamente! Recuerde que debe realizar el cuadre de vehículo para finalizar el proceso.",
        route: updatedRoute
      });
      
    } catch (error) {
      console.error("Error al completar la ruta:", error);
      return res.status(500).json({
        success: false,
        message: "Error al completar la ruta",
        error: String(error)
      });
    }
  });

  /**
   * Endpoint combinado para marcar un pedido como entregado y generar la factura
   * POST /api/mobile/orders/:id/deliver-and-invoice
   */
  router.post('/orders/:id/deliver-and-invoice', async (req, res) => {
    try {
      console.log(`POST /api/mobile/orders/${req.params.id}/deliver-and-invoice - Body:`, req.body);
      
      const orderId = parseInt(req.params.id);
      
      // Obtener el companyId adecuado de diferentes fuentes
      let companyId = getCurrentCompanyId();
      
      // Si no hay companyId en el contexto, intentar obtenerlo de la sesión
      if (!companyId && req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
        companyId = req.session.companyId || req.session.user?.companyId;
      }
      
      // Si todavía no tenemos companyId, devolvemos error
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ 
          error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." 
        });
      }
      
      console.log(`MobileAPI - Procesando entrega y facturación de orden #${orderId} para compañía #${companyId}`);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de orden inválido" });
      }
      
      // Obtener datos necesarios del body
      const { paymentMethod, amountPaid, userId } = req.body;
      
      if (!paymentMethod || amountPaid === undefined) {
        return res.status(400).json({ 
          error: "Faltan datos requeridos", 
          requiredFields: ["paymentMethod", "amountPaid"] 
        });
      }
      
      // 1. Verificar que la orden existe y obtener sus datos
      const orderData = await companyDb
        .select()
        .from(orders)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ))
        .limit(1);
      
      if (orderData.length === 0) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      
      const order = orderData[0];
      
      // 2. Actualizar el estado de la orden a "entregado"
      const [updatedOrder] = await companyDb
        .update(orders)
        .set({ 
          status: "delivered",
          cashCollected: amountPaid.toString(),
          actualDeliveryTime: new Date(),
          deliveredBy: userId || null // Guardar quién procesó la entrega
        })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ))
        .returning();
      
      if (!updatedOrder) {
        return res.status(500).json({ error: "Error al actualizar el estado de la orden" });
      }
      
      console.log(`Orden ${orderId} actualizada a estado 'delivered'`);
      
      // 3. Crear la factura para esta orden
      const today = new Date();
      
      // Preparar datos para la factura según el esquema de validación
      // Asegurarnos de que el total tenga exactamente 2 decimales
      const formattedTotal = parseFloat(order.total).toFixed(2);
      
      const invoiceData = {
        customerId: order.customerId,
        companyId: companyId, // Agregar companyId para el multitenant
        total: formattedTotal,
        status: paymentMethod === 'credit' ? 'pending' : 'paid',
        paymentMethod: paymentMethod,
        notes: `Factura generada desde entrega en ruta ${order.routeId || 'N/A'}`
      };
      
      // Validar datos con el esquema
      const validInvoiceData = insertInvoiceSchema.parse(invoiceData);
      
      // Obtener el último número de factura para esta empresa
      const lastInvoice = await companyDb
        .select({ maxNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.companyId, companyId))
        .orderBy(desc(invoices.invoiceNumber))
        .limit(1);
      
      // Calcular el siguiente número de factura
      const nextInvoiceNumber = lastInvoice.length > 0 ? lastInvoice[0].maxNumber + 1 : 1;
      
      console.log(`Generando nueva factura con número: ${nextInvoiceNumber} para empresa #${companyId}`);
      
      // Crear la factura con el nuevo número
      const [invoice] = await companyDb
        .insert(invoices)
        .values({
          ...validInvoiceData,
          invoiceNumber: nextInvoiceNumber, // Asignar número manualmente
          date: today // La fecha se agrega manualmente porque no está en el esquema
        })
        .returning();
      
      if (!invoice) {
        return res.status(500).json({ error: "Error al crear la factura" });
      }
      
      console.log(`Factura ${invoice.invoiceNumber} creada para la orden ${orderId}`);
      
      // 4. Obtener los items de la orden y crear los items de la factura
      const items = await companyDb
        .select()
        .from(orderItems)
        .where(and(
          eq(orderItems.orderId, orderId),
          eq(orderItems.companyId, companyId)
        ));
      
      // Crear los items de la factura basados en los items de la orden
      for (const item of items) {
        // Calcular el total y asegurarnos de que tiene 2 decimales exactos
        const totalAmount = parseFloat(item.price) * item.quantity;
        const itemTotal = totalAmount.toFixed(2);
        
        const invoiceItemData = {
          invoiceId: invoice.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: itemTotal,
          companyId: companyId // Agregar companyId para el multitenant
        };
        
        // Validar datos con el esquema
        const validInvoiceItemData = insertInvoiceItemSchema.parse(invoiceItemData);
        
        await companyDb
          .insert(invoiceItems)
          .values(validInvoiceItemData);
      }
      
      console.log(`Items de factura creados para la factura ${invoice.invoiceNumber}`);
      
      // 5. Registrar el pago (tanto para efectivo, tarjeta, transferencia, como para crédito)
      // Para crédito: registramos el monto total de la factura para que aparezca en reportes
      // Para otros métodos: registramos el monto recibido
      const formattedAmount = parseFloat(amountPaid.toString()).toFixed(2);
      const invoiceTotal = parseFloat(order.total).toFixed(2);
      
      // Para crédito usamos el total de la factura, para los demás el monto recibido
      const paymentAmount = paymentMethod === 'credit' ? invoiceTotal : formattedAmount;
      
      const paymentData = {
        invoiceId: invoice.id,
        customerId: order.customerId,
        amount: paymentAmount,
        paymentMethod: paymentMethod,
        notes: paymentMethod === 'credit' 
          ? `Crédito pendiente de pago - Entrega en ruta ${order.routeId || 'N/A'} - Total adeudado: ${invoiceTotal}`
          : `Pago recibido durante entrega en ruta ${order.routeId || 'N/A'}`,
        companyId: companyId // Agregar companyId para el multitenant
      };
      
      // Validar datos con el esquema
      const validPaymentData = insertPaymentSchema.parse(paymentData);
      
      const [payment] = await companyDb
        .insert(payments)
        .values({
          ...validPaymentData,
          date: today // La fecha se agrega manualmente porque no está en el esquema
        })
        .returning();
      
      console.log(`Pago registrado para la factura ${invoice.invoiceNumber} (${paymentMethod})`);
      
      
      // 6. Devolver respuesta exitosa
      res.json({
        success: true,
        order: updatedOrder,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          status: invoice.status,
        },
        message: `Orden ${orderId} entregada y facturada exitosamente (${invoice.invoiceNumber})`
      });
      
    } catch (error) {
      console.error(`Error al procesar entrega y facturación de orden ${req.params.id}:`, error);
      
      // Verificar si el error está relacionado con números de factura duplicados
      const errorStr = String(error);
      if (errorStr.includes("duplicate key value") && errorStr.includes("invoices_invoice_number_key")) {
        return res.status(500).json({ 
          error: "Error en la generación de número de factura. Intente nuevamente.", 
          details: "Se detectó un conflicto con un número de factura existente." 
        });
      }
      
      res.status(500).json({ 
        error: "Error al procesar la entrega y facturación", 
        details: String(error) 
      });
    }
  });

  /**
   * GET /api/mobile/deliveries
   * Endpoint optimizado que devuelve órdenes con bottle-returns incluidos
   * Evita hacer múltiples peticiones para cada orden
   */
  router.get('/deliveries', async (req, res) => {
    try {
      let companyId = getCurrentCompanyId();
      
      if (!companyId && req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
        companyId = req.session.companyId || req.session.user?.companyId;
      }
      
      if (!companyId) {
        return res.status(401).json({ error: "No se pudo determinar la compañía" });
      }
      
      // Usar raw query para obtener todas las órdenes con sus items, productos y bottle-returns
      const { pool } = await import('../db');
      
      const deliveriesQuery = `
        WITH order_bottle_returns AS (
          SELECT 
            br.order_id,
            json_agg(
              json_build_object(
                'id', br.id,
                'orderId', br.order_id,
                'productId', br.product_id,
                'productName', p.name,
                'expectedQuantity', br.expected_quantity,
                'returnedQuantity', br.returned_quantity,
                'pendingQuantity', br.pending_quantity,
                'returnDate', br.return_date,
                'status', br.status,
                'amountCharged', br.amount_charged,
                'depositAmount', br.deposit_amount,
                'responsibleType', br.responsible_type,
                'chargeMethod', br.charge_method
              )
            ) as bottle_returns
          FROM bottle_returns br
          JOIN products p ON br.product_id = p.id
          WHERE br.company_id = $1
          GROUP BY br.order_id
        ),
        order_products AS (
          SELECT 
            oi.order_id,
            json_agg(
              json_build_object(
                'id', oi.product_id,
                'name', p.name,
                'quantity', oi.quantity,
                'price', p.price::text,
                'isReturnable', p.is_returnable,
                'bottleDeposit', COALESCE(p.deposit_amount, '0.00')::text
              ) ORDER BY oi.id
            ) as products
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.company_id = $1
          GROUP BY oi.order_id
        )
        SELECT 
          o.id,
          o.customer_id as "customerId",
          c.businessname as "customerName",
          c.street as address,
          o.status,
          o.date,
          o.total,
          o.payment_method as "paymentMethod",
          COALESCE(op.products, '[]'::json) as products,
          COALESCE(obr.bottle_returns, '[]'::json) as "bottleReturns"
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_products op ON o.id = op.order_id
        LEFT JOIN order_bottle_returns obr ON o.id = obr.order_id
        WHERE o.company_id = $1
        ORDER BY o.date DESC
      `;
      
      const result = await pool.query(deliveriesQuery, [companyId]);
      
      console.log(`MobileAPI - Devolviendo ${result.rows.length} entregas con bottle-returns incluidos`);
      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener deliveries:", error);
      res.status(500).json({ error: "Error al obtener entregas", details: String(error) });
    }
  });

  return router;
}

// Importar las dependencias usando ESM
import { createMobileAuthRoutes } from '../routes/api/mobile/auth';
import { mobileApiTenantMiddleware } from '../middleware/mobile-tenant.middleware';

/**
 * Registra las rutas de la API móvil en la aplicación Express
 */
export function registerMobileApiEndpoints(app: Router) {
  // Crear las rutas de la API móvil existente
  const mobileApiRoutes = createMobileApiEndpoints();
  
  // Creamos un middleware para asegurar que los endpoints móviles
  // tengan acceso al ID de la empresa actual
  
  // Registramos el middleware antes de nuestras rutas
  app.use('/mobile', mobileApiTenantMiddleware);
  
  // Registrar rutas de autenticación
  const authRoutes = createMobileAuthRoutes();
  app.use('/mobile', authRoutes);
  
  // Montamos las rutas de la API móvil existente
  app.use('/mobile', mobileApiRoutes);
  console.log("Endpoints de API móvil registrados con soporte multitenant");
}