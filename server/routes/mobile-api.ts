import express, { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  orders, invoices, invoiceItems, payments, orderItems,
  routes, vehicleLoading, customers, settings, transactions, products,
  insertInvoiceSchema, insertInvoiceItemSchema, insertPaymentSchema
} from '@shared/schema';
import { eq, and, desc, isNotNull, sql } from 'drizzle-orm';
import { companyDb, setCurrentCompanyId } from '../company-db';
import { safeParseInt, isPositiveInteger } from '../utils/validation';
import { recalculateInvoiceStatus } from '../utils/invoice-status';
import { getNowRD } from '../date-utils';
import { storage } from '../storage';

/**
 * Crea y registra los endpoints específicos para la aplicación móvil
 */
export function createMobileApiEndpoints(): Router {
  const router = express.Router();

  function getSessionCompanyId(req: Request): number | undefined {
    return req.session?.companyId || req.session?.user?.companyId;
  }

  function getSessionUser(req: Request) {
    return req.session?.user;
  }
  
  /**
   * GET /api/mobile/routes
   * Obtiene todas las rutas para la empresa actual
   */
  router.get('/routes', async (req, res) => {
    try {
      const companyId = getSessionCompanyId(req);
      
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      console.log(`MobileAPI - Obteniendo rutas para compañía #${companyId}`);
      
      // Filtrar por estado si se proporciona
      const statusFilter = req.query.status ? 
        eq(routes.status, req.query.status as string) : undefined;
        
      const currentUser = req.session?.user;
      const isDriverRole = currentUser?.role === 'driver';
      const isAssistantRole = currentUser?.role === 'assistant';

      let driverFilter;
      if (isDriverRole && currentUser?.id) {
        driverFilter = eq(routes.driverId, currentUser.id);
      } else if (isAssistantRole && currentUser?.id) {
        driverFilter = eq(routes.assistantId, currentUser.id);
      } else {
        const driverId = req.query.driverId ? safeParseInt(req.query.driverId as string, -1) : -1;
        driverFilter = isPositiveInteger(driverId) ? eq(routes.driverId, driverId) : undefined;
      }
      
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
      const companyId = getSessionCompanyId(req);
      
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

      const currentUser = getSessionUser(req);
      const isDriver = currentUser?.role === 'driver';
      const isAssistant = currentUser?.role === 'assistant';

      let driverRouteFilter;
      if (isDriver && currentUser?.id) {
        driverRouteFilter = sql`${orders.routeId} IN (SELECT id FROM routes WHERE driver_id = ${currentUser.id} AND company_id = ${companyId})`;
      } else if (isAssistant && currentUser?.id) {
        driverRouteFilter = sql`${orders.routeId} IN (SELECT id FROM routes WHERE assistant_id = ${currentUser.id} AND company_id = ${companyId})`;
      }
      
      const conditions = [eq(orders.companyId, companyId)];
      if (statusFilter) conditions.push(statusFilter);
      if (routeFilter) conditions.push(routeFilter);
      if (driverRouteFilter) conditions.push(driverRouteFilter);
      const filter = and(...conditions);
      
      // Obtener órdenes con información del cliente (incluyendo isCharity)
      const result = await db.select({
        order: orders,
        customerIsCharity: customers.isCharity,
        customerName: customers.businessname
      })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(filter)
        .orderBy(desc(orders.id));
        
      // Enriquecer cada orden con los productos y información del cliente
      const enrichedOrders = [];
      for (const row of result) {
        const order = row.order;
        const isCharity = row.customerIsCharity || false;
        const customerName = row.customerName || 'Cliente';
        
        // Obtener items del pedido
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
        
        // Obtener los nombres de los productos
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
          
        // Combinar orden con información del cliente y productos
        enrichedOrders.push({
          ...order,
          customerIsCharity: isCharity,
          customerName: customerName,
          products: productsInfo
        });
      }
      
      console.log(`MobileAPI - Se encontraron ${enrichedOrders.length} órdenes`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error al obtener órdenes:", error);
      res.status(500).json({ error: "Error al obtener órdenes", details: String(error) });
    }
  });
  
  /**
   * GET /api/mobile/customers
   * Obtiene todos los clientes para la empresa actual con balance calculado desde transacciones
   */
  router.get('/customers', async (req, res) => {
    try {
      const companyId = getSessionCompanyId(req);
      
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      console.log(`[Mobile customers] Obteniendo clientes con balances calculados para compañía #${companyId}`);
      
      // Obtener todos los clientes
      const allCustomers = await db.select()
        .from(customers)
        .where(eq(customers.companyId, companyId))
        .orderBy(customers.businessname);
      
      console.log(`[Mobile customers] Se encontraron ${allCustomers.length} clientes`);
      
      // Calcular el balance real desde transacciones para cada cliente
      const customersWithBalance = await Promise.all(
        allCustomers.map(async (customer) => {
          // Calcular balance desde transacciones: débitos - créditos
          const balanceResult = await db
            .select({
              totalDebits: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'debit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
              totalCredits: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.customerId, customer.id),
                eq(transactions.companyId, companyId)
              )
            );
          
          const totalDebits = parseFloat(balanceResult[0]?.totalDebits || "0");
          const totalCredits = parseFloat(balanceResult[0]?.totalCredits || "0");
          const calculatedBalance = (totalDebits - totalCredits).toFixed(2);
          
          // Retornar el cliente con el balance calculado
          return {
            ...customer,
            balance: calculatedBalance // Sobreescribir el campo balance con el valor calculado
          };
        })
      );
      
      console.log(`[Mobile customers] Balances calculados exitosamente para ${customersWithBalance.length} clientes`);
      res.json(customersWithBalance);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({ error: "Error al obtener clientes", details: String(error) });
    }
  });

  /**
   * PATCH /api/mobile/customers/:id
   * Actualiza las coordenadas de un cliente
   */
  router.patch('/customers/:id', async (req, res) => {
    try {
      const customerId = safeParseInt(req.params.id, -1);
      
      if (!isPositiveInteger(customerId)) {
        return res.status(400).json({ error: "ID de cliente inválido" });
      }
      
      const companyId = getSessionCompanyId(req);
      
      if (!companyId) {
        console.warn(`MobileAPI - No se encontró companyId para la petición.`);
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      console.log(`MobileAPI - Actualizando cliente #${customerId} para compañía #${companyId}`);
      
      // Validar que el cliente pertenezca a la compañía
      const existingCustomer = await db.select()
        .from(customers)
        .where(and(
          eq(customers.id, customerId),
          eq(customers.companyId, companyId)
        ))
        .limit(1);
      
      if (existingCustomer.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      
      // Extraer solo las coordenadas del body
      const { coordinates } = req.body;
      
      if (!coordinates) {
        return res.status(400).json({ error: "Coordenadas son requeridas" });
      }
      
      // Validar formato de coordenadas (lat,lng)
      const coordsRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
      if (!coordsRegex.test(coordinates)) {
        return res.status(400).json({ error: "Formato de coordenadas inválido. Debe ser 'lat,lng'" });
      }
      
      // Actualizar solo las coordenadas
      const [updatedCustomer] = await db
        .update(customers)
        .set({ coordinates })
        .where(and(
          eq(customers.id, customerId),
          eq(customers.companyId, companyId)
        ))
        .returning();
      
      console.log(`MobileAPI - Cliente #${customerId} actualizado con coordenadas: ${coordinates}`);
      res.json(updatedCustomer);
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      res.status(500).json({ error: "Error al actualizar cliente", details: String(error) });
    }
  });

  /**
   * GET /api/mobile/products
   * Obtiene todos los productos para la empresa actual (accesible para drivers)
   */
  router.get('/products', async (req, res) => {
    try {
      const companyId = getSessionCompanyId(req);
      
      if (!companyId) {
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      const allProducts = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          stock: products.stock,
          icon: products.icon,
          isReturnable: products.isReturnable,
          depositAmount: products.depositAmount,
          hasCommission: products.hasCommission,
          companyId: products.companyId
        })
        .from(products)
        .where(eq(products.companyId, companyId))
        .orderBy(products.name);

      res.json(allProducts);
    } catch (error) {
      console.error("Error al obtener productos (mobile):", error);
      res.status(500).json({ error: "Error al obtener productos", details: String(error) });
    }
  });

  /**
   * Endpoint para completar una ruta cuando todas las paradas están completadas
   * POST /api/mobile/routes/:id/complete
   */
  router.post('/routes/:id/complete', async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      const companyId = getSessionCompanyId(req);
      
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
      const routeEndTime = getNowRD();
      await companyDb.update(routes)
        .set({
          status: "completed",
          endTime: routeEndTime,
          driverEndedAt: routeEndTime,
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
    // Variable para guardar el companyId y limpiar el contexto al final
    let companyId: number | undefined = getSessionCompanyId(req);
    
    try {
      console.log(`POST /api/mobile/orders/${req.params.id}/deliver-and-invoice - Body:`, req.body);
      
      const orderId = parseInt(req.params.id);
      
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
      
      // Establecer el contexto del tenant para las operaciones de storage
      // Esto es necesario para que storage.createTransaction() funcione correctamente
      setCurrentCompanyId(companyId);
      
      // Obtener datos necesarios del body
      let { paymentMethod, amountPaid, userId: userIdFromBody } = req.body;
      
      // Obtener userId: primero del body (app móvil lo envía), luego de la sesión como fallback
      const userId = userIdFromBody || req.session?.user?.id || null;
      
      console.log(`[deliver-and-invoice] UserId obtenido: ${userId} (de body: ${userIdFromBody}, de sesión: ${req.session?.user?.id})`);
      
      if (!paymentMethod || amountPaid === undefined) {
        return res.status(400).json({ 
          error: "Faltan datos requeridos", 
          requiredFields: ["paymentMethod", "amountPaid"] 
        });
      }
      
      // 1. Verificar que la orden existe y obtener datos del cliente
      const orderData = await db
        .select({
          order: orders,
          isCharity: customers.isCharity
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ))
        .limit(1);
      
      if (orderData.length === 0) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      
      const { order, isCharity } = orderData[0];
      const isCharityCustomer = isCharity || false;
      
      // GUARD RAIL: Si el pago es en efectivo pero INSUFICIENTE, forzar a crédito
      // Esto previene que pagos parciales se registren incorrectamente como pagos completos
      // Usamos tolerancia de 1 centavo para evitar problemas de precisión flotante
      const orderTotal = parseFloat(order.total);
      const amountReceived = parseFloat(amountPaid.toString());
      const TOLERANCE = 0.01; // 1 centavo de tolerancia para redondeos
      
      // Es pago parcial solo si: amountReceived < (orderTotal - TOLERANCE)
      // Esto permite sobrepagos pequeños (ej: $20 para $19.99) sin forzar a crédito
      const isInsufficientPayment = amountReceived < (orderTotal - TOLERANCE);
      
      if (paymentMethod === 'cash' && isInsufficientPayment) {
        console.log(`⚠️ GUARD RAIL: Pago insuficiente en efectivo ($${amountReceived.toFixed(2)}) para total de ($${orderTotal.toFixed(2)}). Forzando paymentMethod a 'credit' para manejar pago parcial.`);
        paymentMethod = 'credit';
      }
      
      // 2. Actualizar el estado de la orden a "entregado"
      const deliveryTime = getNowRD();
      const [updatedOrder] = await companyDb
        .update(orders)
        .set({ 
          status: "delivered",
          cashCollected: amountPaid.toString(),
          actualDeliveryTime: deliveryTime,
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
      
      // Verificar si es una donación - las donaciones NO generan factura
      // Una donación requiere AMBOS: cliente benéfico (isCharity=true) Y método de pago 'donation' en el PEDIDO ORIGINAL
      // IMPORTANTE: Usamos order.paymentMethod (del pedido original), NO el paymentMethod del request body
      const isADonation = isCharityCustomer && order.paymentMethod === 'donation';
      
      if (isADonation) {
        console.log(`🎁 Este pedido es una DONACIÓN - NO se creará factura`);
        console.log(`   Cliente benéfico: ${isCharityCustomer}, Método de pago del pedido: ${order.paymentMethod}`);
        console.log(`   (Se ignora el método de pago seleccionado en la UI: ${paymentMethod})`);
        return res.json({ 
          success: true, 
          message: "Entrega confirmada (donación - sin factura)",
          order: updatedOrder 
        });
      }
      
      // 3. Obtener la configuración de la empresa para el cálculo de impuestos
      const [companySettings] = await companyDb
        .select()
        .from(settings)
        .where(eq(settings.companyId, companyId))
        .limit(1);
      
      // Calcular la tasa de impuesto (convertir de porcentaje a decimal)
      const taxRate = companySettings?.tax ? parseFloat(companySettings.tax.toString()) / 100 : 0;
      
      // 4. Crear la factura para esta orden
      const today = getNowRD();
      
      // Preparar datos para la factura según el esquema de validación
      // Calcular subtotal, tax y total con exactamente 2 decimales
      const totalAmount = parseFloat(order.total);
      const subtotalAmount = totalAmount / (1 + taxRate); // Subtotal sin impuesto
      const taxAmount = totalAmount - subtotalAmount; // Monto del impuesto
      
      const formattedSubtotal = subtotalAmount.toFixed(2);
      const formattedTax = taxAmount.toFixed(2);
      const formattedTotal = totalAmount.toFixed(2);
      
      // IMPORTANTE: Crear la factura SIEMPRE como 'pending' primero
      // Luego, después de aplicar anticipos, determinaremos el status final
      // (Esto es necesario para que storage.applyAdvancePaymentsToInvoice funcione)
      const invoiceData = {
        customerId: order.customerId,
        companyId: companyId, // Agregar companyId para el multitenant
        subtotal: formattedSubtotal,
        tax: formattedTax,
        total: formattedTotal,
        status: 'pending', // SIEMPRE pending al inicio
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
      
      // 5. Obtener los items de la orden y crear los items de la factura
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
      
      // 5. Vincular la factura al pedido y guardar el método de pago
      await companyDb
        .update(orders)
        .set({ 
          invoiceId: invoice.id,
          paymentMethod: paymentMethod
        })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ));
      
      console.log(`Pedido ${orderId} vinculado a factura ${invoice.id} con método de pago: ${paymentMethod}`);
      
      // Actualizar el objeto updatedOrder con los valores recién guardados
      updatedOrder.invoiceId = invoice.id;
      updatedOrder.paymentMethod = paymentMethod;
      
      // Variable para guardar el pago creado (se usa más adelante para la transacción RI)
      let createdPayment: any = null;
      
      // 6. PASO 1: Aplicar anticipos disponibles del cliente (IGUAL QUE LA WEB)
      console.log(`💰 Verificando anticipos disponibles para factura #${invoice.id}`);
      let remainingBalance = parseFloat(invoice.total);
      
      try {
        const advanceResult = await storage.applyAdvancePaymentsToInvoice(invoice.id);
        
        if (advanceResult.appliedPayments.length > 0) {
          console.log(`✅ ${advanceResult.appliedPayments.length} anticipo(s) aplicados por un total de $${advanceResult.appliedAmount}`);
          console.log(`💵 Balance restante: $${advanceResult.remainingBalance}`);
          
          remainingBalance = parseFloat(advanceResult.remainingBalance);
        }
      } catch (advanceError) {
        console.error(`❌ Error al aplicar anticipos a factura #${invoice.id}:`, advanceError);
        // Continuar con el proceso aunque falle la aplicación de anticipos
      }
      
      // PASO 2: Manejar el balance restante según el método de pago (IGUAL QUE LA WEB)
      let finalStatus: string = 'pending'; // Por defecto pending
      
      if (remainingBalance <= 0.01) {
        // La factura está completamente cubierta con anticipos
        console.log(`✅ Factura #${invoice.id} completamente cubierta con anticipos`);
        finalStatus = 'paid';
      } else if (paymentMethod === 'cash') {
        // Pago en efectivo: crear pago por el balance restante
        console.log(`💵 Creando pago en efectivo por el balance restante: $${remainingBalance.toFixed(2)}`);
        
        try {
          const [payment] = await companyDb
            .insert(payments)
            .values({
              companyId: companyId,
              invoiceId: invoice.id,
              customerId: order.customerId,
              amount: remainingBalance.toFixed(2),
              paymentMethod: 'cash',
              date: today,
              notes: `Pago en efectivo (balance restante después de anticipos) - Factura #${invoice.invoiceNumber}`
            })
            .returning();
          
          // Guardar el pago creado para usar en la transacción RI más adelante
          createdPayment = payment;
          
          console.log(`✅ Pago #${payment.id} creado por $${remainingBalance.toFixed(2)}`);
          
          finalStatus = 'paid';
        } catch (paymentError) {
          console.error(`❌ ERROR al crear pago en efectivo para factura #${invoice.id}:`, paymentError);
          // No fallar la creación de la factura si falla el pago
        }
      } else {
        // Crédito, tarjeta o transferencia: dejar pendiente el balance restante
        console.log(`📋 Factura #${invoice.id} pendiente de pago: $${remainingBalance.toFixed(2)} (método: ${paymentMethod})`);
        finalStatus = 'pending';
      }
      
      // PASO 3: Actualizar el status de la factura en la base de datos (siempre actualizar)
      try {
        await companyDb
          .update(invoices)
          .set({ status: finalStatus })
          .where(and(
            eq(invoices.id, invoice.id),
            eq(invoices.companyId, companyId)
          ));
        
        invoice.status = finalStatus;
        console.log(`✅ Status de factura #${invoice.id} actualizado a: ${finalStatus}`);
      } catch (statusUpdateError) {
        console.error(`❌ ERROR al actualizar status de factura #${invoice.id}:`, statusUpdateError);
      }
      
      // 7. Ahora que todo se creó exitosamente, crear las transacciones FT y RI
      // Esto garantiza que las transacciones solo se crean si la factura y el pago se procesaron correctamente
      
      // 7.1. Crear transacción automática tipo FT (Factura)
      try {
        await storage.createTransaction({
          documentType: 'FT',
          customerId: order.customerId,
          invoiceId: invoice.id,
          amount: invoice.total.toString(),
          type: 'debit', // Las facturas aumentan la deuda del cliente
          description: `Factura #${invoice.invoiceNumber}`,
          notes: invoice.notes || null,
          date: today.toISOString()
        });
        console.log(`✅ Transacción FT creada automáticamente para factura #${invoice.invoiceNumber}`);
      } catch (transactionError) {
        console.error(`❌ Error al crear transacción FT para factura #${invoice.id}:`, transactionError);
        // No fallar la creación de la factura si falla la transacción
      }
      
      // 7.2. Crear transacción automática tipo RI (Recibo de Ingreso) si hubo pago
      if (createdPayment) {
        const formattedAmount = parseFloat(amountPaid.toString()).toFixed(2);
        const invoiceTotal = parseFloat(order.total).toFixed(2);
        const isPartialPayment = parseFloat(formattedAmount) < parseFloat(invoiceTotal);
        
        try {
          await storage.createTransaction({
            documentType: 'RI',
            customerId: order.customerId,
            invoiceId: invoice.id,
            paymentId: createdPayment.id,
            amount: formattedAmount,
            type: 'credit', // Los pagos disminuyen la deuda del cliente (son crédito)
            description: isPartialPayment
              ? `Pago parcial - Factura #${invoice.invoiceNumber}`
              : `Pago - Factura #${invoice.invoiceNumber}`,
            notes: createdPayment.notes || null,
            date: today.toISOString()
          });
          console.log(`✅ Transacción RI creada automáticamente para pago #${createdPayment.id}`);
        } catch (transactionError) {
          console.error(`❌ Error al crear transacción RI para pago #${createdPayment.id}:`, transactionError);
          // No fallar el registro del pago si falla la transacción
        }
      }
      
      // 8. Devolver respuesta exitosa
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
    } finally {
      // Limpiar el contexto del tenant para evitar fugas a otras peticiones
      if (companyId) {
        setCurrentCompanyId(undefined);
      }
    }
  });

  /**
   * GET /api/mobile/deliveries
   * Endpoint optimizado que devuelve órdenes con bottle-returns incluidos
   * Evita hacer múltiples peticiones para cada orden
   */
  router.get('/deliveries', async (req, res) => {
    try {
      const companyId = getSessionCompanyId(req);
      
      if (!companyId) {
        return res.status(401).json({ error: "No se pudo determinar la compañía" });
      }

      const currentUser = getSessionUser(req);
      const isDriver = currentUser?.role === 'driver';
      const isAssistant = currentUser?.role === 'assistant';
      
      const { pool } = await import('../db');

      let driverCondition = '';
      const queryParams: any[] = [companyId];

      if (isDriver && currentUser?.id) {
        driverCondition = ' AND r.driver_id = $2';
        queryParams.push(currentUser.id);
      } else if (isAssistant && currentUser?.id) {
        driverCondition = ' AND r.assistant_id = $2';
        queryParams.push(currentUser.id);
      }
      
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
          o.invoice_id as "invoiceId",
          COALESCE(op.products, '[]'::json) as products,
          COALESCE(obr.bottle_returns, '[]'::json) as "bottleReturns"
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_products op ON o.id = op.order_id
        LEFT JOIN order_bottle_returns obr ON o.id = obr.order_id
        LEFT JOIN routes r ON o.route_id = r.id
        WHERE o.company_id = $1${driverCondition}
        ORDER BY o.date DESC
      `;
      
      const result = await pool.query(deliveriesQuery, queryParams);
      
      console.log(`MobileAPI - Devolviendo ${result.rows.length} entregas para usuario ${currentUser?.id} (${currentUser?.role})`);
      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener deliveries:", error);
      res.status(500).json({ error: "Error al obtener entregas", details: String(error) });
    }
  });

  /**
   * GET /api/mobile/customers/:id/pending-invoices
   * Obtiene las facturas pendientes de un cliente específico
   */
  router.get('/customers/:id/pending-invoices', async (req, res) => {
    try {
      const companyId = getSessionCompanyId(req);
      
      if (!companyId) {
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      const customerId = parseInt(req.params.id);
      
      if (!customerId || isNaN(customerId)) {
        return res.status(400).json({ error: "ID de cliente inválido" });
      }
      
      // Verificar que el cliente existe
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)));
      
      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      
      // Calcular el balance desde transacciones usando SQL con tipos NUMERIC (precisión exacta)
      // Balance = Total Débitos - Total Créditos
      const balanceResult = await db
        .select({
          totalDebits: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'debit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
          totalCredits: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.customerId, customerId),
            eq(transactions.companyId, companyId)
          )
        );
      
      const totalDebits = parseFloat(balanceResult[0]?.totalDebits || "0");
      const totalCredits = parseFloat(balanceResult[0]?.totalCredits || "0");
      const customerBalance = (totalDebits - totalCredits).toFixed(2);
      
      console.log(`[pending-invoices] Cliente #${customerId}: Débitos=${totalDebits}, Créditos=${totalCredits}, Balance=${customerBalance}`);
      
      // Obtener SOLO las facturas con estado 'pending' del cliente
      const customerInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, customerId),
            eq(invoices.companyId, companyId),
            eq(invoices.status, "pending")
          )
        )
        .orderBy(invoices.date);
      
      console.log(`[pending-invoices] Cliente #${customerId}: Se encontraron ${customerInvoices.length} facturas con estado 'pending'`);
      
      // Para cada factura, calcular el monto pendiente
      const invoicesWithBalance = await Promise.all(
        customerInvoices.map(async (invoice) => {
          const paymentsForInvoice = await db
            .select()
            .from(payments)
            .where(eq(payments.invoiceId, invoice.id));
          
          const totalPaid = paymentsForInvoice.reduce(
            (sum, p) => sum + parseFloat(p.amount.toString()),
            0
          );
          
          const pending = (parseFloat(invoice.total) - totalPaid).toFixed(2);
          
          console.log(`[pending-invoices] Factura #${invoice.invoiceNumber}: Total=${invoice.total}, Pagado=${totalPaid}, Pendiente=${pending}`);
          
          return {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            total: invoice.total,
            pending,
          };
        })
      );
      
      // Filtrar solo las que tienen saldo pendiente
      const pendingInvoices = invoicesWithBalance.filter(
        inv => parseFloat(inv.pending) > 0
      );
      
      console.log(`[pending-invoices] Cliente #${customerId}: ${pendingInvoices.length} facturas con saldo pendiente. Balance total: ${customerBalance}`);
      
      res.json({
        customerBalance,
        pendingInvoices
      });
    } catch (error) {
      console.error("Error al obtener facturas pendientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  /**
   * POST /api/mobile/payments/account-payment
   * Aplica un pago a cuenta distribuido automáticamente entre las facturas pendientes
   */
  router.post('/payments/account-payment', async (req, res) => {
    let companyId: number | undefined = getSessionCompanyId(req);
    
    try {
      if (!companyId) {
        return res.status(401).json({ error: "No se pudo determinar la compañía. Intente iniciar sesión nuevamente." });
      }
      
      // Establecer el contexto para storage.createTransaction
      setCurrentCompanyId(companyId);
      
      const { customerId, amount, paymentMethod, reference, notes } = req.body;
      
      if (!customerId || !amount || !paymentMethod) {
        return res.status(400).json({ 
          error: "Faltan datos requeridos: customerId, amount, paymentMethod" 
        });
      }
      
      let remainingAmount = parseFloat(amount);
      
      if (remainingAmount <= 0) {
        return res.status(400).json({ error: "El monto debe ser mayor a 0" });
      }
      
      // Obtener el balance del cliente
      const [customer] = await db
        .select({ balance: customers.balance, businessname: customers.businessname })
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)));
      
      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      
      const customerBalance = parseFloat(customer.balance.toString());
      
      console.log(`[Mobile Account Payment] Cliente: ${customer.businessname}, Balance: ${customerBalance}, Monto a pagar: ${remainingAmount}`);
      
      // Obtener facturas pendientes del cliente ordenadas por fecha (más antigua primero)
      const customerInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, customerId),
            eq(invoices.companyId, companyId)
          )
        )
        .orderBy(invoices.date);
      
      const paymentsCreated = [];
      const invoicesUpdated = [];
      
      // Aplicar el pago a cada factura desde la más antigua
      for (const invoice of customerInvoices) {
        if (remainingAmount <= 0.01) break;
        
        // Calcular saldo pendiente de esta factura
        const paymentsForInvoice = await db
          .select()
          .from(payments)
          .where(eq(payments.invoiceId, invoice.id));
        
        const totalPaid = paymentsForInvoice.reduce(
          (sum, p) => sum + parseFloat(p.amount.toString()),
          0
        );
        
        const pendingAmount = parseFloat(invoice.total) - totalPaid;
        
        if (pendingAmount <= 0.01) continue;
        
        // Determinar cuánto aplicar a esta factura
        const amountToApply = Math.min(remainingAmount, pendingAmount);
        
        // Crear el pago
        const [payment] = await db
          .insert(payments)
          .values({
            companyId,
            customerId,
            invoiceId: invoice.id,
            amount: amountToApply.toFixed(2),
            paymentMethod: paymentMethod as any,
            reference: reference || null,
            notes: notes || `Abono a cuenta - Factura #${invoice.invoiceNumber}`,
            isAdvance: false,
            date: getNowRD(),
          })
          .returning();
        
        paymentsCreated.push(payment);
        
        // Crear transacción RI
        await storage.createTransaction({
          companyId,
          documentType: 'RI',
          customerId,
          invoiceId: invoice.id,
          paymentId: payment.id,
          amount: amountToApply.toFixed(2),
          type: 'credit',
          description: `Pago a cuenta - Factura #${invoice.invoiceNumber}`,
          notes: notes || null,
          date: getNowRD(),
        });
        
        remainingAmount -= amountToApply;
        
        // Recalcular el estado de la factura basándose en el saldo real de la BD
        const newStatus = await recalculateInvoiceStatus(invoice.id, companyId);
        
        invoicesUpdated.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: newStatus
        });
      }
      
      // Si no aplicó pago a facturas PERO el cliente tiene balance CXC
      if (paymentsCreated.length === 0 && customerBalance > 0) {
        console.log(`[Mobile Account Payment] Cliente sin facturas pero con CXC. Creando RI directo...`);
        
        const amountToApplyCXC = Math.min(remainingAmount, customerBalance);
        
        const [payment] = await db
          .insert(payments)
          .values({
            companyId,
            customerId,
            invoiceId: null,
            amount: amountToApplyCXC.toFixed(2),
            paymentMethod: paymentMethod as any,
            reference: reference || null,
            notes: notes || "Pago a cuenta - Abono a CXC",
            isAdvance: false,
            date: getNowRD(),
          })
          .returning();
        
        paymentsCreated.push(payment);
        
        await storage.createTransaction({
          companyId,
          documentType: 'RI',
          customerId,
          paymentId: payment.id,
          amount: amountToApplyCXC.toFixed(2),
          type: 'credit',
          description: `Pago a cuenta - Abono a CXC`,
          notes: notes || null,
          date: getNowRD(),
        });
        
        remainingAmount -= amountToApplyCXC;
      }
      
      // Si queda dinero sobrante, crear un anticipo
      let advancePayment = null;
      if (remainingAmount > 0.01) {
        console.log(`[Mobile Account Payment] Creando anticipo por sobrante: ${remainingAmount}`);
        
        const lastAdvance = await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.companyId, companyId),
              eq(payments.isAdvance, true)
            )
          )
          .orderBy(desc(payments.id))
          .limit(1);
        
        let documentNumber = "ANT-001";
        if (lastAdvance.length > 0 && lastAdvance[0].documentNumber) {
          const match = lastAdvance[0].documentNumber.match(/ANT-(\d+)/);
          if (match) {
            const nextNumber = parseInt(match[1]) + 1;
            documentNumber = `ANT-${nextNumber.toString().padStart(3, '0')}`;
          }
        }
        
        [advancePayment] = await db
          .insert(payments)
          .values({
            companyId,
            customerId,
            amount: remainingAmount.toFixed(2),
            paymentMethod: paymentMethod as any,
            reference: reference || null,
            notes: notes || "Anticipo - Sobrante de abono a cuenta",
            isAdvance: true,
            invoiceId: null,
            documentNumber,
            date: getNowRD(),
          })
          .returning();
        
        await storage.createTransaction({
          companyId,
          documentType: 'ANT',
          customerId,
          paymentId: advancePayment.id,
          amount: remainingAmount.toFixed(2),
          type: 'credit',
          description: `Anticipo - ${documentNumber}`,
          notes: notes || null,
          date: getNowRD(),
        });
      }
      
      res.json({
        success: true,
        paymentsCreated,
        invoicesUpdated,
        advancePayment,
        totalApplied: (parseFloat(amount) - remainingAmount).toFixed(2),
        remainingAsAdvance: remainingAmount > 0.01 ? remainingAmount.toFixed(2) : '0.00',
      });
      
    } catch (error) {
      console.error("Error al aplicar pago a cuenta:", error);
      res.status(500).json({ error: String(error) });
    } finally {
      if (companyId) {
        setCurrentCompanyId(undefined);
      }
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