import { Express, Request, Response } from "express";
import { eq, sql, and, desc, like } from "drizzle-orm";
import { db, pool } from "../db";
import { orders, routes, customers, orderItems, products, users, bottleReturns, trucks } from "@shared/schema";
import { storage } from "../storage";
import { getNowRD, getTimestampRD } from "../date-utils";

// Para añadir tipos de req.user (simulando autenticación)
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        name: string;
      };
    }
  }
}

// Tipos
interface DriverDelivery {
  id: number;
  customerName: string;
  customerAddress: string;
  coordinates: [number, number];
  estimatedTime: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
  priority: 'normal' | 'high' | 'low';
  orderDetails: string;
  orderValue: string;
  containers: {
    delivered: number;
    returned: number;
    balance: number;
  };
}

interface CashBalance {
  initialBalance: string;
  cashIn: string;
  cashOut: string;
  finalBalance: string;
}

interface Performance {
  deliveredOrders: number;
  totalOrders: number;
  onTimeDeliveries: number;
  averageDeliveryTime: number;
}

export async function registerDriverRoutes(app: Express) {
  
  // Endpoint para obtener las entregas del día para un conductor
  app.get("/api/driver/deliveries/today", async (req: Request, res: Response) => {
    try {
      const driverId = req.session?.user?.id || req.user?.id;
      const companyId = req.session?.companyId || req.session?.user?.companyId;
      if (!driverId || !companyId) {
        return res.status(401).json({ error: "Autenticación requerida" });
      }
      
      const activeRoute = await db.select()
        .from(routes)
        .where(and(
          eq(routes.driverId, driverId),
          eq(routes.companyId, companyId),
          eq(routes.status, 'pending')
        ))
        .orderBy(desc(routes.date))
        .limit(1);
      
      if (!activeRoute || activeRoute.length === 0) {
        const anyRoute = await db.select()
          .from(routes)
          .where(and(
            eq(routes.driverId, driverId),
            eq(routes.companyId, companyId)
          ))
          .orderBy(desc(routes.date))
          .limit(1);
          
        if (anyRoute && anyRoute.length > 0 && anyRoute[0].stops && anyRoute[0].stops.length > 0) {
          const allCustomers = await db.select()
            .from(customers)
            .where(eq(customers.companyId, companyId))
            .limit(5);
          
          // Crear entregas basadas en las paradas de la ruta
          const deliveries: DriverDelivery[] = [];
          
          // Para cada parada (excluyendo la primera que suele ser el depósito)
          for (let i = 1; i < anyRoute[0].stops.length; i++) {
            const stopCoords = anyRoute[0].stops[i].split(',').map(Number) as [number, number];
            
            // Tomar un cliente aleatorio como referencia
            const randomCustomerIndex = Math.floor(Math.random() * allCustomers.length);
            const customer = allCustomers[randomCustomerIndex];
            
            // Crear una entrega representativa para esta parada
            const delivery: DriverDelivery = {
              id: i,
              customerName: customer.businessname,
              customerAddress: `${customer.street} ${customer.streetnumber}`,
              coordinates: stopCoords,
              estimatedTime: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(), // Cada 30 minutos
              status: 'pending',
              priority: 'normal',
              orderDetails: "5 Botellones 5L, 2 Faldos de Botella 1L",
              orderValue: "350.00",
              containers: {
                delivered: 5,
                returned: 0,
                balance: 5
              }
            };
            
            deliveries.push(delivery);
          }
          
          return res.json(deliveries);
        }
        
        return res.json([]); // No hay rutas disponibles
      }
      
      const routeId = activeRoute[0].id;
      
      // Verificar si la ruta tiene paradas definidas
      if (activeRoute[0].stops && activeRoute[0].stops.length > 0) {
        // Crear entregas basadas en las paradas de la ruta
        const deliveries: DriverDelivery[] = [];
        
        // Para cada parada (excluyendo la primera que suele ser el depósito)
        for (let i = 1; i < activeRoute[0].stops.length; i++) {
          try {
            const stopCoords = activeRoute[0].stops[i].split(',').map(Number) as [number, number];
            
            const allCustomers = await db.select()
              .from(customers)
              .where(eq(customers.companyId, companyId))
              .limit(10);
            
            let closestCustomer = allCustomers[0];
            let minDistance = Infinity;
            
            for (const customer of allCustomers) {
              if (customer.coordinates) {
                try {
                  const customerCoords = customer.coordinates.split(',').map(Number);
                  if (customerCoords.length === 2) {
                    const distance = Math.sqrt(
                      Math.pow(customerCoords[0] - stopCoords[0], 2) + 
                      Math.pow(customerCoords[1] - stopCoords[1], 2)
                    );
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestCustomer = customer;
                    }
                  }
                } catch (e) {
                  console.error("Error parsing customer coordinates:", e);
                }
              }
            }
            
            // Crear una entrega para esta parada
            const delivery: DriverDelivery = {
              id: i,
              customerName: closestCustomer.businessname,
              customerAddress: `${closestCustomer.street} ${closestCustomer.streetnumber}`,
              coordinates: stopCoords,
              estimatedTime: new Date(Date.now() + i * 30 * 60 * 1000).toISOString(), // Cada 30 minutos
              status: 'pending',
              priority: i === 1 ? 'high' : 'normal',
              orderDetails: "5 Botellones 5L, 2 Faldos de Botella 1L",
              orderValue: (200 + i * 50).toFixed(2),
              containers: {
                delivered: 5,
                returned: 0,
                balance: 5
              }
            };
            
            deliveries.push(delivery);
          } catch (e) {
            console.error("Error processing stop:", e);
          }
        }
        
        return res.json(deliveries);
      }
      
      // Obtener los pedidos asociados a esta ruta
      const routeOrders = await db.select({
        orderId: orders.id,
        customerId: orders.customerId,
        status: orders.status,
        estimatedTime: orders.estimatedDeliveryTime,
        priority: sql<string>`CASE 
          WHEN orders.status = 'pending' THEN 'high' 
          WHEN orders.status = 'in_transit' THEN 'normal'
          ELSE 'low' 
        END`
      })
      .from(orders)
      .where(eq(orders.routeId, routeId));
      
      // Si no hay pedidos, retornar array vacío
      if (!routeOrders || routeOrders.length === 0) {
        return res.json([]);
      }
      
      // Array para almacenar las entregas con datos completos
      const deliveries: DriverDelivery[] = [];
      
      // Obtener datos detallados para cada pedido
      for (const order of routeOrders) {
        const customer = await db.select()
          .from(customers)
          .where(and(eq(customers.id, order.customerId), eq(customers.companyId, companyId)))
          .limit(1);
        
        if (!customer || customer.length === 0) continue;
        
        // Obtener los items del pedido
        const items = await db.select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          productName: products.name
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.orderId));
        
        // Calcular el valor total del pedido
        let totalValue = 0;
        let orderDescription = "";
        
        for (const item of items) {
          const itemTotal = Number(item.price) * item.quantity;
          totalValue += itemTotal;
          orderDescription += `${item.quantity} ${item.productName}, `;
        }
        
        // Eliminar la última coma y espacio
        orderDescription = orderDescription.trim();
        if (orderDescription.endsWith(',')) {
          orderDescription = orderDescription.slice(0, -1);
        }
        
        const bottleReturn = await db.select()
          .from(bottleReturns)
          .where(and(eq(bottleReturns.orderId, order.orderId), eq(bottleReturns.companyId, companyId)))
          .limit(1);
        
        // Extraer coordenadas (si existen) o usar una ubicación por defecto
        let coordinates: [number, number] = [18.47, -69.95]; // Coordenadas por defecto (Santo Domingo)
        
        if (customer[0].coordinates) {
          try {
            // Formato esperado: "lat,lng"
            const coords = customer[0].coordinates.split(',').map(Number);
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              coordinates = [coords[0], coords[1]];
            }
          } catch (error) {
            console.error("Error parsing coordinates:", error);
          }
        }
        
        // Mapear el estado a los valores esperados en la interfaz
        let mappedStatus: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
        switch (order.status) {
          case 'pending':
            mappedStatus = 'pending';
            break;
          case 'in_transit':
            mappedStatus = 'in_progress';
            break;
          case 'delivered':
            mappedStatus = 'delivered';
            break;
          case 'cancelled':
            mappedStatus = 'cancelled';
            break;
          default:
            mappedStatus = 'pending';
        }
        
        // Crear objeto de entrega
        const delivery: DriverDelivery = {
          id: order.orderId,
          customerName: customer[0].businessname,
          customerAddress: `${customer[0].street} ${customer[0].streetnumber}`,
          coordinates,
          estimatedTime: typeof order.estimatedTime === 'string' 
                        ? order.estimatedTime 
                        : getTimestampRD(),
          status: mappedStatus,
          priority: order.priority as 'normal' | 'high' | 'low',
          orderDetails: orderDescription,
          orderValue: totalValue.toFixed(2),
          containers: {
            delivered: items.reduce((sum, item) => sum + item.quantity, 0),
            returned: bottleReturn && bottleReturn.length > 0 ? bottleReturn[0].returnedQuantity : 0,
            balance: items.reduce((sum, item) => sum + item.quantity, 0) - 
                    (bottleReturn && bottleReturn.length > 0 ? bottleReturn[0].returnedQuantity : 0)
          }
        };
        
        deliveries.push(delivery);
      }
      
      res.json(deliveries);
    } catch (error: any) {
      console.error("Error al obtener entregas:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para obtener el balance de efectivo del conductor
  app.get("/api/driver/cash-balance", async (req: Request, res: Response) => {
    try {
      const driverId = req.session?.user?.id || req.user?.id;
      if (!driverId) {
        return res.status(401).json({ error: "Autenticación requerida" });
      }
      
      // En una implementación real, estos datos vendrían de la base de datos
      // Por ahora, retornaremos datos de ejemplo
      const cashBalance: CashBalance = {
        initialBalance: "1000.00",
        cashIn: "2500.00",
        cashOut: "500.00",
        finalBalance: "3000.00"
      };
      
      res.json(cashBalance);
    } catch (error: any) {
      console.error("Error al obtener balance de efectivo:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para obtener estadísticas de rendimiento del conductor
  app.get("/api/driver/performance", async (req: Request, res: Response) => {
    try {
      const driverId = req.session?.user?.id || req.user?.id;
      const companyId = req.session?.companyId || req.session?.user?.companyId;
      if (!driverId || !companyId) {
        return res.status(401).json({ error: "Autenticación requerida" });
      }
      
      const routesWithOrders = await db.select({
        routeId: routes.id
      })
      .from(routes)
      .where(and(
        eq(routes.driverId, driverId),
        eq(routes.companyId, companyId)
      ));
      
      const routeIds = routesWithOrders.map(r => r.routeId);
      
      // Si no hay rutas, retornar valores predeterminados
      if (routeIds.length === 0) {
        return res.json({
          deliveredOrders: 0,
          totalOrders: 0,
          onTimeDeliveries: 0,
          averageDeliveryTime: 0
        });
      }
      
      // Obtener recuento de pedidos por estado
      const totalOrders = await db.select({
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(
        routeIds.length === 1 
          ? eq(orders.routeId, routeIds[0]) 
          : sql`${orders.routeId} IN (${sql.join(routeIds.map(id => sql`${id}`), sql`, `)})`
      );
      
      const deliveredOrders = await db.select({
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(and(
        routeIds.length === 1 
          ? eq(orders.routeId, routeIds[0]) 
          : sql`${orders.routeId} IN (${sql.join(routeIds.map(id => sql`${id}`), sql`, `)})`,
        eq(orders.status, 'delivered')
      ));
      
      // Por ahora, estos valores son estimados ya que no tenemos datos reales de tiempos
      const onTimeDeliveries = Math.floor(deliveredOrders[0].count * 0.8); // Asumimos que el 80% fue a tiempo
      const averageDeliveryTime = 35; // 35 minutos en promedio por entrega
      
      const performance: Performance = {
        deliveredOrders: deliveredOrders[0].count || 0,
        totalOrders: totalOrders[0].count || 0,
        onTimeDeliveries,
        averageDeliveryTime
      };
      
      res.json(performance);
    } catch (error: any) {
      console.error("Error al obtener estadísticas de rendimiento:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para actualizar el estado de un pedido
  app.post("/api/driver/deliveries/:id/complete", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      console.log(`📱 [Mobile App] Completando entrega de pedido #${orderId}`);
      
      const companyId = req.session?.companyId || req.session?.user?.companyId;
      
      if (!companyId) {
        console.error("❌ No se encontró companyId para completar entrega");
        return res.status(401).json({ error: "Autenticación requerida" });
      }
      
      // INICIO DE TRANSACCIÓN
      const client = await pool.connect();
      let updatedOrder: any;
      let previousStatus: string;
      
      try {
        await client.query('BEGIN');
        console.log('🔄 Transacción iniciada para entrega móvil');
        
        // Bloquear y leer el pedido
        const lockQuery = `
          SELECT * FROM orders 
          WHERE id = $1 AND company_id = $2
          FOR UPDATE
        `;
        
        const lockResult = await client.query(lockQuery, [orderId, companyId]);
        
        if (lockResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: "Pedido no encontrado" });
        }
        
        previousStatus = lockResult.rows[0].status;
        console.log(`📌 Estado anterior: ${previousStatus}`);
        
        // No crear factura duplicada si ya está delivered
        if (previousStatus === "delivered") {
          console.log(`⚠️ El pedido ya está entregado`);
          await client.query('COMMIT');
          return res.status(200).json({ 
            success: true, 
            message: "El pedido ya estaba entregado",
            order: lockResult.rows[0]
          });
        }
        
        // Actualizar estado a delivered
        const updateQuery = `
          UPDATE orders 
          SET status = 'delivered'
          WHERE id = $1 AND company_id = $2
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [orderId, companyId]);
        updatedOrder = result.rows[0];
        
        console.log(`✅ Pedido actualizado a delivered`);
        
        // ====== DESCONTAR STOCK ======
        const stockItemsQuery = `
          SELECT oi.product_id, oi.quantity 
          FROM order_items oi 
          WHERE oi.order_id = $1 AND oi.company_id = $2
        `;
        const stockItems = await client.query(stockItemsQuery, [orderId, companyId]);
        
        for (const item of stockItems.rows) {
          await client.query(
            `UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2 AND company_id = $3`,
            [item.quantity, item.product_id, companyId]
          );
        }
        console.log(`📦 Stock descontado para ${stockItems.rows.length} productos del pedido #${orderId}`);
        
        // Actualizar devolución de envases si se proporciona
        const returnedContainers = req.body.returnedContainers;
        if (returnedContainers !== undefined) {
          const bottleReturnQuery = `
            SELECT * FROM bottle_returns 
            WHERE order_id = $1 AND company_id = $2
            LIMIT 1
          `;
          const bottleReturnResult = await client.query(bottleReturnQuery, [orderId, companyId]);
          
          if (bottleReturnResult.rows.length > 0) {
            await client.query(
              `UPDATE bottle_returns SET returned_quantity = $1 WHERE id = $2`,
              [returnedContainers, bottleReturnResult.rows[0].id]
            );
          } else {
            await client.query(
              `INSERT INTO bottle_returns (
                company_id, order_id, product_id, expected_quantity, returned_quantity, 
                pending_quantity, return_date, status, amount_charged, 
                deposit_amount, automatic_alert, manually_assigned
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                companyId,
                orderId,
                req.body.productId || 1,
                req.body.expectedQuantity || returnedContainers,
                returnedContainers,
                (req.body.expectedQuantity || returnedContainers) - returnedContainers,
                getTimestampRD(),
                'pending',
                '0.00',
                '0.00',
                false,
                false
              ]
            );
          }
        }
        
        // CREAR FACTURA AUTOMÁTICA (igual que update-order-status)
        // Solo si NO es donación y NO tiene factura prepagada
        if (updatedOrder.payment_method === 'donation') {
          console.log(`🎁 Pedido es donación - NO se crea factura`);
        } else if (updatedOrder.invoice_id) {
          console.log(`💳 Pedido tiene factura prepagada (${updatedOrder.invoice_id}) - NO se crea factura`);
        } else {
          console.log(`📄 Creando factura automática para pedido ${orderId}...`);
          
          // Obtener tasa de impuestos
          const settingsQuery = `SELECT tax FROM company_settings WHERE company_id = $1`;
          const settingsResult = await client.query(settingsQuery, [companyId]);
          const taxRate = settingsResult.rows[0]?.tax ? parseFloat(settingsResult.rows[0].tax) / 100 : 0;
          
          // Obtener items del pedido
          const orderItemsQuery = `SELECT * FROM order_items WHERE order_id = $1 AND company_id = $2`;
          const orderItemsResult = await client.query(orderItemsQuery, [orderId, companyId]);
          
          // Calcular totales
          const subtotal = orderItemsResult.rows.reduce((sum, item) => sum + parseFloat(item.total), 0);
          const tax = subtotal * taxRate;
          const total = subtotal + tax;
          
          console.log(`💰 Subtotal=${subtotal.toFixed(2)}, Impuesto=${tax.toFixed(2)}, Total=${total.toFixed(2)}`);
          
          // Verificar factura existente
          const exactNotePattern = `Factura generada automáticamente para pedido #${orderId}`;
          const existingInvoiceQuery = `SELECT id, invoice_number FROM invoices WHERE company_id = $1 AND notes = $2`;
          const existingInvoiceResult = await client.query(existingInvoiceQuery, [companyId, exactNotePattern]);
          
          if (existingInvoiceResult.rowCount && existingInvoiceResult.rowCount > 0) {
            console.log(`⚠️ Ya existe factura para este pedido: #${existingInvoiceResult.rows[0].invoice_number}`);
          } else {
            // Bloquear tabla de facturas
            await client.query('LOCK TABLE invoices IN EXCLUSIVE MODE');
            
            // Obtener siguiente número de factura
            const maxInvoiceQuery = `
              SELECT COALESCE(MAX(invoice_number), 0) as max_invoice_number 
              FROM invoices WHERE company_id = $1
            `;
            const maxInvoiceResult = await client.query(maxInvoiceQuery, [companyId]);
            const nextInvoiceNumber = maxInvoiceResult.rows[0].max_invoice_number + 1;
            
            console.log(`🔢 Siguiente factura: ${nextInvoiceNumber}`);
            
            const invoiceStatus = updatedOrder.payment_method === 'cash' ? 'paid' : 'pending';
            const invoiceDate = getNowRD();
            
            // Crear factura
            const createInvoiceQuery = `
              INSERT INTO invoices (
                company_id, customer_id, subtotal, tax, total, status, payment_method, 
                date, invoice_number, notes
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING *
            `;
            
            const invoiceResult = await client.query(createInvoiceQuery, [
              companyId,
              updatedOrder.customer_id,
              subtotal.toFixed(2),
              tax.toFixed(2),
              total.toFixed(2),
              invoiceStatus,
              updatedOrder.payment_method,
              invoiceDate,
              nextInvoiceNumber,
              exactNotePattern
            ]);
            
            const createdInvoice = invoiceResult.rows[0];
            console.log(`✅ Factura #${createdInvoice.invoice_number} creada`);
            
            // Copiar items a la factura
            for (const item of orderItemsResult.rows) {
              await client.query(
                `INSERT INTO invoice_items (company_id, invoice_id, product_id, quantity, price, total)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [companyId, createdInvoice.id, item.product_id, item.quantity, item.price, item.total]
              );
            }
            
            console.log(`✅ ${orderItemsResult.rows.length} items copiados`);
            
            // CREAR TRANSACCIÓN FT
            console.log(`📝 Creando transacción FT...`);
            
            const ftQuery = `
              SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 4) AS INTEGER)), 0) + 1 as next_num
              FROM transactions WHERE company_id = $1 AND document_type = 'FT'
            `;
            const ftResult = await client.query(ftQuery, [companyId]);
            const nextFtNumber = ftResult.rows[0].next_num;
            const ftDocNumber = `FT-${String(nextFtNumber).padStart(4, '0')}`;
            
            const transactionDate = getNowRD();
            
            await client.query(
              `INSERT INTO transactions (
                company_id, document_type, document_number, customer_id, invoice_id,
                amount, type, description, date
              ) VALUES ($1, 'FT', $2, $3, $4, $5, 'debit', $6, $7)`,
              [
                companyId,
                ftDocNumber,
                updatedOrder.customer_id,
                createdInvoice.id,
                total.toFixed(2),
                `Factura #${createdInvoice.invoice_number} - Pedido #${orderId}`,
                transactionDate
              ]
            );
            
            console.log(`✅ Transacción FT creada: ${ftDocNumber}`);
            
            // Si es efectivo, crear pago y RI
            if (updatedOrder.payment_method === 'cash') {
              console.log(`💵 Creando pago automático...`);
              
              const paymentDate = getTimestampRD();
              
              const createPaymentQuery = `
                INSERT INTO payments (
                  company_id, invoice_id, customer_id, amount, payment_method, date, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
              `;
              
              const paymentResult = await client.query(createPaymentQuery, [
                companyId,
                createdInvoice.id,
                updatedOrder.customer_id,
                total.toFixed(2),
                'cash',
                paymentDate,
                `Pago automático en efectivo - Factura #${createdInvoice.invoice_number} - Pedido #${orderId}`
              ]);
              
              console.log(`✅ Pago creado con ID ${paymentResult.rows[0].id}`);
              
              // CREAR TRANSACCIÓN RI
              console.log(`📝 Creando transacción RI...`);
              
              const riQuery = `
                SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 4) AS INTEGER)), 0) + 1 as next_num
                FROM transactions WHERE company_id = $1 AND document_type = 'RI'
              `;
              const riResult = await client.query(riQuery, [companyId]);
              const nextRiNumber = riResult.rows[0].next_num;
              const riDocNumber = `RI-${String(nextRiNumber).padStart(4, '0')}`;
              
              await client.query(
                `INSERT INTO transactions (
                  company_id, document_type, document_number, customer_id, invoice_id, payment_id,
                  amount, type, description, date
                ) VALUES ($1, 'RI', $2, $3, $4, $5, $6, 'credit', $7, $8)`,
                [
                  companyId,
                  riDocNumber,
                  updatedOrder.customer_id,
                  createdInvoice.id,
                  paymentResult.rows[0].id,
                  total.toFixed(2),
                  `Pago en efectivo - Factura #${createdInvoice.invoice_number}`,
                  transactionDate
                ]
              );
              
              console.log(`✅ Transacción RI creada: ${riDocNumber}`);
            }
          }
        }
        
        // COMMIT
        await client.query('COMMIT');
        console.log('✅ Transacción completada exitosamente');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en transacción, ROLLBACK:', error);
        throw error;
      } finally {
        client.release();
      }
      
      res.json({ success: true, message: "Entrega completada exitosamente" });
    } catch (error: any) {
      console.error("Error al completar entrega:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
  
  // Endpoint para actualizar la ubicación del conductor
  app.post("/api/driver/location", async (req: Request, res: Response) => {
    try {
      const driverId = req.session?.user?.id || req.user?.id;
      if (!driverId) {
        return res.status(401).json({ error: "Autenticación requerida" });
      }
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitud y longitud son requeridas" });
      }
      
      // Actualizar la ubicación del conductor
      await storage.updateDriverLocation(driverId, {
        latitude,
        longitude,
        timestamp: getNowRD()
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error al actualizar ubicación:", error);
      res.status(500).json({ error: error?.message || "Error desconocido" });
    }
  });
}