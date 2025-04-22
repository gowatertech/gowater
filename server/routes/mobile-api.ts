import express, { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  orders, invoices, invoiceItems, payments, orderItems,
  routes, vehicleLoading, customers,
  insertInvoiceSchema, insertInvoiceItemSchema, insertPaymentSchema
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { companyDb, getCurrentCompanyId } from '../company-db';

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
      const companyId = req.session.companyId || 1;
      console.log(`MobileAPI - Obteniendo rutas para compañía #${companyId}`);
      
      // Filtrar por estado si se proporciona
      const statusFilter = req.query.status ? 
        eq(routes.status, req.query.status as string) : undefined;
        
      // Filtrar por chofer si se proporciona
      const driverFilter = req.query.driverId ? 
        eq(routes.driverId, parseInt(req.query.driverId as string)) : undefined;
      
      // Construir el filtro completo
      let filter = and(
        eq(routes.companyId, companyId),
        ...(statusFilter ? [statusFilter] : []),
        ...(driverFilter ? [driverFilter] : [])
      );
      
      const result = await companyDb.select()
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
      const companyId = req.session.companyId || 1;
      console.log(`MobileAPI - Obteniendo órdenes para compañía #${companyId}`);
      
      // Filtrar por estado si se proporciona
      const statusFilter = req.query.status ? 
        eq(orders.status, req.query.status as string) : undefined;
        
      // Filtrar por ruta si se proporciona
      const routeFilter = req.query.routeId ? 
        eq(orders.routeId, parseInt(req.query.routeId as string)) : undefined;
      
      // Construir el filtro completo
      let filter = and(
        eq(orders.companyId, companyId),
        ...(statusFilter ? [statusFilter] : []),
        ...(routeFilter ? [routeFilter] : [])
      );
      
      const result = await companyDb.select()
        .from(orders)
        .where(filter)
        .orderBy(desc(orders.id));
        
      // Enriquecer cada orden con los productos
      for (const order of result) {
        const items = await companyDb.select()
          .from(orderItems)
          .where(and(
            eq(orderItems.orderId, order.id),
            eq(orderItems.companyId, companyId)
          ));
          
        // Añadir productos a la orden
        order.products = items.map(item => ({
          productId: item.productId,
          name: item.productName || "Producto",
          quantity: item.quantity,
          price: item.price
        }));
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
      const companyId = req.session.companyId || 1;
      console.log(`MobileAPI - Obteniendo clientes para compañía #${companyId}`);
      
      const result = await companyDb.select()
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
      const companyId = req.session.companyId || 1; // Usar companyId de la sesión o el valor predeterminado
      
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
      const companyId = req.session.companyId || 1; // Usar companyId de la sesión o el valor predeterminado
      
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
          actualDeliveryTime: new Date()
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
        const formattedTotal = totalAmount.toFixed(2);
        
        const invoiceItemData = {
          invoiceId: invoice.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: formattedTotal,
          companyId: companyId // Agregar companyId para el multitenant
        };
        
        // Validar datos con el esquema
        const validInvoiceItemData = insertInvoiceItemSchema.parse(invoiceItemData);
        
        await companyDb
          .insert(invoiceItems)
          .values(validInvoiceItemData);
      }
      
      console.log(`Items de factura creados para la factura ${invoice.invoiceNumber}`);
      
      // 5. Si es pago en efectivo, registrar el pago
      if (paymentMethod === 'cash') {
        // Formatear el monto para asegurar que tiene 2 decimales exactos
        const formattedAmount = parseFloat(amountPaid.toString()).toFixed(2);
        
        const paymentData = {
          invoiceId: invoice.id,
          customerId: order.customerId,
          amount: formattedAmount,
          paymentMethod: 'cash',
          notes: `Pago recibido durante entrega en ruta ${order.routeId || 'N/A'}`,
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
        
        console.log(`Pago registrado para la factura ${invoice.invoiceNumber}`);
      }
      
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

  return router;
}

/**
 * Registra las rutas de la API móvil en la aplicación Express
 */
export function registerMobileApiEndpoints(app: Router) {
  const mobileApiRoutes = createMobileApiEndpoints();
  
  // Creamos un middleware para asegurar que los endpoints móviles
  // tengan acceso al ID de la empresa actual
  const mobileApiTenantMiddleware = (req: Request, res: Response, next: any) => {
    // Asegurar que hay un companyId en la sesión o en la solicitud
    if (!req.session.companyId && !req.query.companyId && !req.body.companyId) {
      console.log("MobileAPI - No se encontró companyId en la sesión o solicitud");
      
      // En modo desarrollo/demostración, asignar un companyId por defecto
      req.session.companyId = 1;
      console.log("MobileAPI - Asignando companyId de demostración:", req.session.companyId);
    } else {
      console.log("MobileAPI - CompanyId encontrado:", req.session.companyId || req.query.companyId || req.body.companyId);
    }
    
    // Podemos continuar al siguiente middleware
    next();
  };
  
  // Registramos el middleware antes de nuestras rutas
  app.use('/mobile', mobileApiTenantMiddleware);
  
  // Montamos las rutas de la API móvil
  app.use('/mobile', mobileApiRoutes);
  console.log("Endpoints de API móvil registrados con soporte multitenant");
}