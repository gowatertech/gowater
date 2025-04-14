import express, { Router } from 'express';
import { db } from '../db';
import { 
  orders, invoices, invoiceItems, payments, orderItems,
  routes, vehicleLoading,
  insertInvoiceSchema, insertInvoiceItemSchema, insertPaymentSchema
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Crea y registra los endpoints específicos para la aplicación móvil
 */
export function createMobileApiEndpoints(): Router {
  const router = express.Router();

  /**
   * Endpoint para completar una ruta cuando todas las paradas están completadas
   * POST /api/mobile/routes/:id/complete
   */
  router.post('/routes/:id/complete', async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (!routeId || isNaN(routeId)) {
        return res.status(400).json({ 
          success: false, 
          message: "ID de ruta inválido" 
        });
      }

      // 1. Verificar si la ruta existe
      const route = await db.query.routes.findFirst({
        where: eq(routes.id, routeId)
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
      const routeOrders = await db.select()
        .from(orders)
        .where(eq(orders.routeId, routeId));
      
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
      await db.update(routes)
        .set({
          status: "completed",
          endTime: new Date(),
          driverEndedAt: new Date(),
          isCompleted: true
        })
        .where(eq(routes.id, routeId));
      
      // 4. También completar la carga de vehículo relacionada con esta ruta
      const relatedLoading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.routeId, routeId),
      });
      
      if (relatedLoading) {
        console.log(`Completando carga de vehículo #${relatedLoading.id} relacionada con la ruta`);
        
        await db.update(vehicleLoading)
          .set({
            status: "completed",
            completedAt: new Date()
          })
          .where(eq(vehicleLoading.id, relatedLoading.id));
      }
      
      // 5. Obtener la ruta actualizada para devolver en la respuesta
      const updatedRoute = await db.query.routes.findFirst({
        where: eq(routes.id, routeId)
      });
      
      return res.status(200).json({
        success: true,
        message: "¡Ruta completada exitosamente! Ahora puede ver el cuadre de vehículo en el sistema.",
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
      const orderData = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      
      if (orderData.length === 0) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }
      
      const order = orderData[0];
      
      // 2. Actualizar el estado de la orden a "entregado"
      const [updatedOrder] = await db
        .update(orders)
        .set({ 
          status: "delivered",
          cashCollected: amountPaid.toString(),
          actualDeliveryTime: new Date()
        })
        .where(eq(orders.id, orderId))
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
        total: formattedTotal,
        status: paymentMethod === 'credit' ? 'pending' : 'paid',
        paymentMethod: paymentMethod,
        notes: `Factura generada desde entrega en ruta ${order.routeId || 'N/A'}`
      };
      
      // Validar datos con el esquema
      const validInvoiceData = insertInvoiceSchema.parse(invoiceData);
      
      // Crear la factura - el número de factura se generará automáticamente
      // Usamos una transacción para evitar conflictos de números de factura
      const [invoice] = await db.transaction(async (tx) => {
        // Obtener el último número de factura
        const lastInvoice = await tx
          .select({ maxNumber: invoices.invoiceNumber })
          .from(invoices)
          .orderBy(desc(invoices.invoiceNumber))
          .limit(1);
        
        // Insertar nueva factura con número incremental
        const nextInvoiceNumber = lastInvoice.length > 0 ? lastInvoice[0].maxNumber + 1 : 1;

        console.log(`Generando nueva factura con número: ${nextInvoiceNumber}`);
        
        return tx
          .insert(invoices)
          .values({
            ...validInvoiceData,
            date: today, // La fecha se agrega manualmente porque no está en el esquema
            invoiceNumber: nextInvoiceNumber, // Asignar número manualmente
          })
          .returning();
      });
      
      if (!invoice) {
        return res.status(500).json({ error: "Error al crear la factura" });
      }
      
      console.log(`Factura ${invoice.invoiceNumber} creada para la orden ${orderId}`);
      
      // 4. Obtener los items de la orden y crear los items de la factura
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      
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
        };
        
        // Validar datos con el esquema
        const validInvoiceItemData = insertInvoiceItemSchema.parse(invoiceItemData);
        
        await db
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
          notes: `Pago recibido durante entrega en ruta ${order.routeId || 'N/A'}`
        };
        
        // Validar datos con el esquema
        const validPaymentData = insertPaymentSchema.parse(paymentData);
        
        const [payment] = await db
          .insert(payments)
          .values({
            ...validPaymentData,
            date: today, // La fecha se agrega manualmente porque no está en el esquema
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
export function registerMobileApiEndpoints(app: express.Express) {
  const mobileApiRoutes = createMobileApiEndpoints();
  app.use('/api/mobile', mobileApiRoutes);
  console.log("Endpoints de API móvil registrados");
}