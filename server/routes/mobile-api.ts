import express, { Router } from 'express';
import { db } from '../db';
import { orders, invoices, invoiceItems, payments, orderItems } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Crea y registra los endpoints específicos para la aplicación móvil
 */
export function createMobileApiEndpoints(): Router {
  const router = express.Router();

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
      
      // Crear la factura - el número de factura se generará automáticamente
      const [invoice] = await db
        .insert(invoices)
        .values({
          customerId: order.customerId,
          // No se especifica invoiceNumber porque es un serial en la base de datos
          date: today,
          total: order.total,
          status: paymentMethod === 'credit' ? 'pending' : 'paid',
          paymentMethod: paymentMethod,
          notes: `Factura generada desde entrega en ruta ${order.routeId || 'N/A'}`,
        })
        .returning();
      
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
        await db
          .insert(invoiceItems)
          .values({
            invoiceId: invoice.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: (parseFloat(item.price) * item.quantity).toString(),
          });
      }
      
      console.log(`Items de factura creados para la factura ${invoice.invoiceNumber}`);
      
      // 5. Si es pago en efectivo, registrar el pago
      if (paymentMethod === 'cash') {
        const [payment] = await db
          .insert(payments)
          .values({
            invoiceId: invoice.id,
            customerId: order.customerId,
            amount: amountPaid.toString(),
            paymentMethod: 'cash',
            date: today,
            notes: `Pago recibido durante entrega en ruta ${order.routeId || 'N/A'}`,
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
      res.status(500).json({ error: String(error) });
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