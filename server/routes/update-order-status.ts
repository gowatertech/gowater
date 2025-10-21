import { Router } from "express";
import { orders } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from '../db';
import { pool } from '../db';
import { getCurrentCompanyId } from '../company-db';

// Endpoint especializado para actualización de estado de pedidos
export function createUpdateOrderStatusEndpoint(router: Router) {
  console.log("Registrando endpoint /api/update-order-status");
  
  router.post("/update-order-status", async (req, res) => {
    try {
      // Log detallado de la solicitud
      console.log("------ SOLICITUD DE ACTUALIZACIÓN DE ESTADO ------");
      console.log("Cuerpo de la solicitud:", req.body);
      console.log("Método:", req.method);
      console.log("URL:", req.url);
      
      const { orderId, status } = req.body;
      
      if (!orderId || isNaN(parseInt(orderId))) {
        console.log("Error: ID de pedido inválido o no proporcionado");
        return res.status(400).json({ 
          success: false, 
          message: "ID de pedido inválido o no proporcionado" 
        });
      }
      
      if (!status || !["pending", "in_transit", "delivered", "cancelled"].includes(status)) {
        console.log(`Error: Estado inválido: ${status}`);
        return res.status(400).json({ 
          success: false, 
          message: "Estado inválido" 
        });
      }
      
      // Convertir a número
      const orderIdNum = parseInt(orderId);
      
      // Determinar el companyId actual
      const companyId = getCurrentCompanyId();
      
      // Verificar si tenemos un companyId válido
      if (!companyId) {
        console.error("No se pudo determinar el companyId para la actualización de estado");
        return res.status(401).json({ 
          success: false, 
          message: "No se pudo determinar la empresa. Verifique su sesión o autenticación." 
        });
      }
      
      console.log(`Actualización para companyId: ${companyId}`);
      
      // Verificamos el estado actual
      const currentOrder = await db.select().from(orders).where(
        sql`${orders.id} = ${orderIdNum} AND ${orders.companyId} = ${companyId}`
      );
      
      console.log("Resultado de consulta inicial:", currentOrder);
      
      if (currentOrder.length === 0) {
        console.log(`Pedido ${orderIdNum} no encontrado para companyId ${companyId}`);
        return res.status(404).json({ 
          success: false, 
          message: "Pedido no encontrado o no pertenece a la empresa" 
        });
      }
      
      console.log(`Estado actual del pedido ${orderIdNum}: ${currentOrder[0].status}`);
      console.log(`Nuevo estado a aplicar: ${status}`);
      
      // INICIO DE TRANSACCIÓN PARA GARANTIZAR ATOMICIDAD
      const client = await pool.connect();
      let updatedOrder: any;
      let previousStatus: string;
      
      try {
        await client.query('BEGIN');
        console.log('🔄 Transacción iniciada');
        
        // PASO 1: Bloquear y leer el pedido PRIMERO para obtener el estado anterior de forma atómica
        const lockQuery = `
          SELECT * FROM orders 
          WHERE id = $1 AND company_id = $2
          FOR UPDATE
        `;
        
        console.log(`Bloqueando pedido ${orderIdNum} para lectura atómica...`);
        const lockResult = await client.query(lockQuery, [orderIdNum, companyId]);
        
        if (lockResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ 
            success: false, 
            message: "Pedido no encontrado o no pertenece a la empresa" 
          });
        }
        
        // Capturar el estado anterior de la fila bloqueada
        previousStatus = lockResult.rows[0].status;
        console.log(`📌 Estado anterior capturado del lock: ${previousStatus}`);
        
        // PASO 2: Actualizar el estado solo si no está ya en "delivered"
        if (status === "delivered" && previousStatus === "delivered") {
          console.log(`⚠️ El pedido ya está en estado "delivered", no se creará factura duplicada`);
          await client.query('COMMIT');
          return res.status(200).json({ 
            success: true, 
            message: "El pedido ya estaba entregado, no se realizaron cambios",
            order: lockResult.rows[0]
          });
        }
        
        const updateQuery = `
          UPDATE orders 
          SET status = $1 
          WHERE id = $2 AND company_id = $3
          RETURNING *
        `;
        
        console.log(`Ejecutando actualización a "${status}"...`);
        const result = await client.query(updateQuery, [status, orderIdNum, companyId]);
        updatedOrder = result.rows[0];
        
        console.log(`✅ Pedido actualizado - Status anterior: ${previousStatus}, Nuevo: ${updatedOrder.status}`);
        
        // Si el pedido cambió a "delivered" y antes no lo estaba, crear factura automáticamente
        if (status === "delivered" && previousStatus !== "delivered") {
          console.log(`📄 Creando factura automáticamente para pedido ${orderIdNum}...`);
          
          // Obtener la configuración de impuestos de la compañía
          const settingsQuery = `
            SELECT tax FROM company_settings 
            WHERE company_id = $1
          `;
          const settingsResult = await client.query(settingsQuery, [companyId]);
          const taxRate = settingsResult.rows[0]?.tax ? parseFloat(settingsResult.rows[0].tax) / 100 : 0;
          
          console.log(`📊 Tasa de impuesto de la compañía: ${taxRate * 100}%`);
          
          // Obtener los items del pedido para calcular el subtotal
          const orderItemsQuery = `
            SELECT * FROM order_items 
            WHERE order_id = $1 AND company_id = $2
          `;
          const orderItemsResult = await client.query(orderItemsQuery, [orderIdNum, companyId]);
          
          // Calcular subtotal (suma de todos los items)
          const subtotal = orderItemsResult.rows.reduce((sum, item) => {
            return sum + parseFloat(item.total);
          }, 0);
          
          // Calcular impuesto
          const tax = subtotal * taxRate;
          
          // Calcular total
          const total = subtotal + tax;
          
          console.log(`💰 Cálculos: Subtotal=${subtotal.toFixed(2)}, Impuesto=${tax.toFixed(2)}, Total=${total.toFixed(2)}`);
          
          // Verificar si ya existe una factura para este pedido (evitar duplicados)
          // Usar match exacto en las notas para evitar falsos positivos
          const exactNotePattern = `Factura generada automáticamente para pedido #${orderIdNum}`;
          const existingInvoiceQuery = `
            SELECT id, invoice_number FROM invoices 
            WHERE company_id = $1 AND notes = $2
          `;
          const existingInvoiceResult = await client.query(existingInvoiceQuery, [
            companyId, 
            exactNotePattern
          ]);
          
          if (existingInvoiceResult.rowCount && existingInvoiceResult.rowCount > 0) {
            console.log(`⚠️ Ya existe una factura para este pedido: #${existingInvoiceResult.rows[0].invoice_number}`);
            // No crear factura duplicada, pero continuar con el commit
            await client.query('COMMIT');
            return res.status(200).json({ 
              success: true, 
              message: "Estado actualizado. La factura ya existía.", 
              order: updatedOrder
            });
          }
          
          // Obtener el siguiente número de factura DENTRO DE LA TRANSACCIÓN
          // Usar LOCK TABLE para garantizar atomicidad en el contador de facturas
          await client.query('LOCK TABLE invoices IN EXCLUSIVE MODE');
          
          const maxInvoiceQuery = `
            SELECT COALESCE(MAX(invoice_number), 0) as max_invoice_number 
            FROM invoices 
            WHERE company_id = $1
          `;
          const maxInvoiceResult = await client.query(maxInvoiceQuery, [companyId]);
          const nextInvoiceNumber = maxInvoiceResult.rows[0].max_invoice_number + 1;
          
          console.log(`🔢 Siguiente número de factura: ${nextInvoiceNumber}`);
          
          // Determinar el status inicial basado en el método de pago
          // Si es efectivo, la factura se marca como pagada automáticamente
          const invoiceStatus = updatedOrder.payment_method === 'cash' ? 'paid' : 'pending';
          
          // Crear la factura con subtotal, tax y total
          const createInvoiceQuery = `
            INSERT INTO invoices (
              company_id, customer_id, subtotal, tax, total, status, payment_method, 
              date, invoice_number, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
            RETURNING *
          `;
          
          const invoiceResult = await client.query(createInvoiceQuery, [
            companyId,
            updatedOrder.customer_id,
            subtotal.toFixed(2),
            tax.toFixed(2),
            total.toFixed(2),
            invoiceStatus, // Usar el status determinado según el método de pago
            updatedOrder.payment_method,
            nextInvoiceNumber,
            `Factura generada automáticamente para pedido #${orderIdNum}`
          ]);
          
          const createdInvoice = invoiceResult.rows[0];
          console.log(`✅ Factura #${createdInvoice.invoice_number} creada exitosamente con ID ${createdInvoice.id}`);
          console.log(`   Status: ${createdInvoice.status}, Total: ${createdInvoice.total}`);
          
          // Copiar los items del pedido a la factura
          for (const item of orderItemsResult.rows) {
            const createInvoiceItemQuery = `
              INSERT INTO invoice_items (
                company_id, invoice_id, product_id, quantity, price, total
              )
              VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            await client.query(createInvoiceItemQuery, [
              companyId,
              createdInvoice.id,
              item.product_id,
              item.quantity,
              item.price,
              item.total
            ]);
          }
          
          console.log(`✅ ${orderItemsResult.rows.length} items copiados a la factura`);
          
          // Si el método de pago es efectivo, crear pago automáticamente
          if (updatedOrder.payment_method === 'cash') {
            console.log(`💵 Creando pago automático para factura en efectivo #${createdInvoice.invoice_number}...`);
            
            const createPaymentQuery = `
              INSERT INTO payments (
                company_id, invoice_id, customer_id, amount, payment_method, date, notes
              )
              VALUES ($1, $2, $3, $4, $5, NOW(), $6)
              RETURNING *
            `;
            
            const paymentResult = await client.query(createPaymentQuery, [
              companyId,
              createdInvoice.id,
              updatedOrder.customer_id,
              total.toFixed(2),
              updatedOrder.payment_method, // Incluir el método de pago
              `Pago automático en efectivo - Factura #${createdInvoice.invoice_number} - Pedido #${orderIdNum}`
            ]);
            
            console.log(`✅ Pago automático creado con ID ${paymentResult.rows[0].id} por monto ${paymentResult.rows[0].amount}`);
          }
          
          console.log(`🎉 Proceso de facturación automática completado exitosamente`);
        }
        
        // COMMIT de la transacción: todo salió bien
        await client.query('COMMIT');
        console.log('✅ Transacción completada exitosamente');
        
      } catch (error) {
        // ROLLBACK en caso de cualquier error
        await client.query('ROLLBACK');
        console.error('❌ Error en transacción, ejecutando ROLLBACK:', error);
        throw error; // Re-lanzar el error para que sea manejado por el catch externo
      } finally {
        // Liberar el cliente siempre
        client.release();
      }
      
      console.log("------ FIN DE ACTUALIZACIÓN DE ESTADO ------");
      
      // Respuesta exitosa con resultado de la actualización
      return res.status(200).json({ 
        success: true, 
        message: "Estado actualizado correctamente", 
        order: updatedOrder
      });
      
    } catch (error) {
      console.error("Error general en actualización de estado:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error en el servidor", 
        error: String(error) 
      });
    }
  });
}