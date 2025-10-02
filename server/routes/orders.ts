import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { getCurrentCompanyId } from '../company-db';
import { safeParseInt, safeParseFloat, isPositiveInteger } from '../utils/validation';

// Router para manejar órdenes
const ordersRouter = express.Router();

// Middleware para verificar autenticación y establecer companyId
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Verificar si hay una cookie de sesión
  if (!req.sessionID) {
    console.log("❌ Acceso denegado: No hay sessionID");
    return res.status(401).json({ success: false, message: "No autenticado - Sesión no encontrada" });
  }
  
  // Verificar autenticación con Passport
  if (!req.isAuthenticated()) {
    // Intentar recuperar información aunque no esté autenticado con Passport
    if (req.session && req.session.companyId) {
      console.log(`⚠️ No autenticado con Passport pero hay companyId en sesión: ${req.session.companyId}`);
      next();
      return;
    }
    
    console.log(`❌ Acceso denegado: Usuario no autenticado. SessionID: ${req.sessionID}`);
    return res.status(401).json({ success: false, message: "No autenticado" });
  }
  
  // Si llegamos aquí, el usuario está autenticado
  console.log(`✅ Usuario autenticado: ${(req.user as any)?.id}`);
  next();
};

// Endpoint para listar todas las órdenes
ordersRouter.get("/api/orders", authMiddleware, async (req: Request, res: Response) => {
  try {
    // Obtener el companyId del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error("❌ ERROR: No se encontró companyId en el contexto para listar órdenes");
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para ver órdenes"
      });
    }
    
    console.log(`📋 Listando órdenes para compañía ${companyId}`);
    
    // Query para obtener todas las órdenes con información del cliente
    const query = `
      SELECT o.*, c.businessname as customer_name, c.phone as customer_phone,
             COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.company_id = $1
      GROUP BY o.id, c.businessname, c.phone
      ORDER BY o.id DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    console.log(`✅ Encontradas ${result.rows.length} órdenes`);
    
    // Formatear la respuesta
    const orders = result.rows.map(order => ({
      id: order.id,
      companyId: order.company_id,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      routeId: order.route_id,
      total: order.total,
      status: order.status,
      paymentMethod: order.payment_method,
      date: order.date,
      notes: order.notes,
      itemsCount: safeParseInt(order.items_count, 0)
    }));
    
    res.json(orders);
  } catch (error) {
    console.error("❌ Error al listar órdenes:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para obtener una orden específica con sus detalles
ordersRouter.get("/api/orders/:orderId", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  console.log(`GET /api/orders/${orderId} - Buscando pedido para compañía ${getCurrentCompanyId() || 1}`);
  
  try {
    // Obtener el companyId del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error(`❌ ERROR: No se encontró companyId en el contexto para obtener orden #${orderId}`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para ver detalles de órdenes"
      });
    }
    
    // Query para obtener la orden
    const orderQuery = `
      SELECT o.*, c.businessname as customer_name, c.phone as customer_phone 
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1 AND o.company_id = $2
    `;
    
    const orderResult = await pool.query(orderQuery, [orderId, companyId]);
    
    if (orderResult.rows.length === 0) {
      console.log(`❌ Orden #${orderId} no encontrada`);
      return res.status(404).json({ error: "Orden no encontrada" });
    }
    
    // Obtener los items de la orden con información detallada de productos
    const itemsQuery = `
      SELECT oi.*, 
             p.id as product_id,
             p.name as product_name, 
             p.price as product_price,
             p.is_returnable,
             p.deposit_amount,
             p.icon as product_icon
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1 AND oi.company_id = $2
    `;
    
    const itemsResult = await pool.query(itemsQuery, [orderId, companyId]);
    console.log(`GET /api/orders/${orderId} - Encontrados ${itemsResult.rows.length} items`);
    
    // Formatear la respuesta
    const order = orderResult.rows[0];
    
    // Formatear los items para que incluyan información detallada del producto
    const items = itemsResult.rows.map(item => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: item.price, // Cambiado de 'price' a 'unitPrice' para que coincida con el frontend
      total: item.total,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.product_price,
        imageUrl: item.product_icon,
        bottleDeposit: item.deposit_amount
      }
    }));
    
    const formattedOrder = {
      id: order.id,
      companyId: order.company_id,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      routeId: order.route_id,
      total: order.total,
      status: order.status,
      paymentMethod: order.payment_method,
      date: order.date,
      estimatedDeliveryTime: order.estimated_delivery_time,
      actualDeliveryTime: order.actual_delivery_time,
      deliverySequence: order.delivery_sequence,
      deliveryCoordinates: order.delivery_coordinates,
      notes: order.notes,
      cashCollected: order.cash_collected || '0.00',
      driverCommission: order.driver_commission || '0.00',
      assistantCommission: order.assistant_commission || '0.00',
      items: items
    };
    
    console.log(`GET /api/orders/${orderId} - Retornando datos completos del pedido`);
    res.json(formattedOrder);
  } catch (error) {
    console.error(`❌ Error al obtener la orden #${orderId}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para obtener items de una orden específica
ordersRouter.get("/api/orders/:orderId/items", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  console.log(`🔍 Buscando items para la orden #${orderId}`);
  
  try {
    // Obtener el companyId del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error(`❌ ERROR: No se encontró companyId en el contexto para obtener items de orden #${orderId}`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para ver detalles de items"
      });
    }
    
    // Query para obtener items con información de productos
    const itemsQuery = `
      SELECT oi.*, 
             p.id as product_id,
             p.name as product_name, 
             p.price as product_price,
             p.is_returnable,
             p.deposit_amount,
             p.icon as product_icon
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1 AND oi.company_id = $2
    `;
    
    const result = await pool.query(itemsQuery, [orderId, companyId]);
    console.log(`✅ Encontrados ${result.rows.length} items para la orden #${orderId}`);
    
    // Formatear respuesta para incluir información detallada del producto
    const formattedItems = result.rows.map(item => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: item.price, // Cambiado de 'price' a 'unitPrice' para que coincida con el frontend
      total: item.total,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.product_price,
        imageUrl: item.product_icon,
        bottleDeposit: item.deposit_amount
      }
    }));
    
    res.json(formattedItems);
  } catch (error) {
    console.error(`❌ Error al obtener items de la orden #${orderId}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para crear órdenes
ordersRouter.post("/api/orders", authMiddleware, async (req: Request, res: Response) => {
  console.log("🔴 INICIO /api/orders - Intento de crear pedido");
  console.log("📣 POST /api/orders - Datos recibidos:", JSON.stringify(req.body, null, 2));
  
  // Extraer items para procesarlos después
  const orderItemsData = req.body.items || [];
  console.log(`📦 Items recibidos para procesar: ${orderItemsData.length}`);
  
  // Verificar cliente
  if (!req.body.customerId) {
    console.error("❌ ERROR: ID de cliente obligatorio");
    return res.status(400).json({ error: "El ID de cliente es obligatorio" });
  }
  
  // Iniciar transacción
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log("🔄 Transacción iniciada");
    
    // Obtener el ID de la empresa del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error("❌ ERROR: No se encontró companyId en el contexto para crear pedido");
      throw new Error("Autenticación requerida: Debe iniciar sesión para crear pedidos");
    }
    
    const customerId = safeParseInt(req.body.customerId, -1);
    if (!isPositiveInteger(customerId)) {
      throw new Error("ID de cliente inválido");
    }
    
    const orderData = {
      customerId,
      total: req.body.total,
      status: req.body.status || "pending",
      paymentMethod: req.body.paymentMethod || "cash",
      date: new Date(req.body.date || new Date()).toISOString(),
      routeId: req.body.routeId || null,
      notes: req.body.notes || "",
      companyId: companyId
    };
    
    console.log("🧾 Datos de orden a insertar:", orderData);
    
    // 1. Crear la orden
    const orderQuery = `
      INSERT INTO orders (
        company_id, customer_id, total, status, payment_method, date, 
        route_id, notes, cash_collected, driver_commission, assistant_commission
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;
    
    const orderParams = [
      companyId,
      orderData.customerId,
      orderData.total,
      orderData.status,
      orderData.paymentMethod,
      orderData.date,
      orderData.routeId,
      orderData.notes,
      '0.00',  // cash_collected
      '0.00',  // driver_commission
      '0.00'   // assistant_commission
    ];
    
    console.log("🔄 Ejecutando query de orden");
    const orderResult = await client.query(orderQuery, orderParams);
    
    if (orderResult.rows.length === 0) {
      throw new Error("No se pudo crear la orden. La inserción no devolvió datos.");
    }
    
    const order = orderResult.rows[0];
    console.log("✅ Orden creada con ID:", order.id);
    
    // 2. Crear los items de la orden
    const createdItems: any[] = [];
    const invalidItems: any[] = [];
    
    if (orderItemsData && orderItemsData.length > 0) {
      console.log(`🔄 Procesando ${orderItemsData.length} items para la orden #${order.id}`);
      
      for (const item of orderItemsData) {
        // Validar item (soportamos tanto productId como code para compatibilidad)
        const productId = safeParseInt(item.productId || item.code, -1);
        
        if (!isPositiveInteger(productId)) {
          console.warn("⚠️ Item sin ID de producto válido:", item);
          invalidItems.push({ item, reason: 'ID de producto inválido' });
          continue;
        }
        
        const quantity = safeParseInt(item.quantity, -1);
        if (!isPositiveInteger(quantity)) {
          console.warn("⚠️ Item con cantidad inválida:", item);
          invalidItems.push({ item, reason: 'Cantidad inválida' });
          continue;
        }
        
        // Asegurar que price y total son strings formateados correctamente
        const price = typeof item.price === 'string' ? item.price : 
                     (typeof item.price === 'number' ? item.price.toFixed(2) : '0.00');
        
        const total = typeof item.total === 'string' ? item.total : 
                     (typeof item.total === 'number' ? item.total.toFixed(2) : 
                     (safeParseFloat(price, 0) * quantity).toFixed(2));
        
        const itemQuery = `
          INSERT INTO order_items (
            order_id, product_id, quantity, price, total, company_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          ) RETURNING *
        `;
        
        const itemParams = [
          order.id,
          productId,
          quantity,
          price,
          total,
          companyId
        ];
        
        console.log(`🔄 Insertando item para orden #${order.id} con params:`, 
                   {orderId: order.id, productId, quantity, price, total, companyId});
        
        try {
          const itemResult = await client.query(itemQuery, itemParams);
          
          if (itemResult.rows.length > 0) {
            console.log(`✅ Item creado con ID: ${itemResult.rows[0].id}`);
            createdItems.push(itemResult.rows[0]);
          } else {
            console.error(`❌ No se pudo crear el item para orden #${order.id}`);
          }
        } catch (itemError) {
          console.error(`❌ Error al crear item para orden #${order.id}:`, itemError);
          throw itemError; // Re-lanzar para que se maneje en el catch principal
        }
      }
    } else {
      console.warn(`⚠️ No hay items para procesar en la orden #${order.id}`);
    }
    
    // Validar que se hayan creado items válidos y que no haya items inválidos
    if (createdItems.length === 0) {
      await client.query('ROLLBACK');
      console.error("❌ No se pudieron crear items válidos para la orden, abortando transacción");
      return res.status(400).json({ 
        error: "No se pudieron procesar items válidos para la orden",
        details: "Todos los items proporcionados tienen datos inválidos (productId o quantity inválidos)",
        invalidItems: invalidItems
      });
    }
    
    // Rechazar el pedido si hay items inválidos (incluso si hay algunos válidos)
    if (invalidItems.length > 0) {
      await client.query('ROLLBACK');
      console.error(`❌ Se encontraron ${invalidItems.length} items inválidos, abortando transacción`);
      return res.status(400).json({ 
        error: "El pedido contiene items con datos inválidos",
        details: `Se encontraron ${invalidItems.length} items inválidos de ${orderItemsData.length} items totales`,
        invalidItems: invalidItems.map(inv => ({
          item: inv.item,
          reason: inv.reason
        }))
      });
    }
    
    // Confirmar la transacción
    await client.query('COMMIT');
    console.log("✅ Transacción confirmada (COMMIT)");
    
    // Convertir nombre de propiedades snake_case a camelCase para la respuesta
    const formattedOrder = {
      id: order.id,
      companyId: order.company_id,
      customerId: order.customer_id,
      routeId: order.route_id,
      total: order.total,
      status: order.status,
      paymentMethod: order.payment_method,
      date: order.date,
      notes: order.notes,
      items: createdItems.length
    };
    
    console.log("🔄 Respuesta final del servidor:", formattedOrder);
    res.json(formattedOrder);
  } catch (error) {
    // En caso de error, revertir la transacción
    console.error("❌ ERROR al crear pedido:", error);
    try {
      await client.query('ROLLBACK');
      console.log("🔄 Transacción revertida (ROLLBACK)");
    } catch (rollbackError) {
      console.error("❌ Error adicional durante ROLLBACK:", rollbackError);
    }
    res.status(500).json({ error: String(error) });
  } finally {
    // Siempre liberar el cliente
    try {
      client.release();
      console.log("🔄 Cliente de conexión liberado");
    } catch (releaseError) {
      console.error("❌ Error al liberar el cliente:", releaseError);
    }
  }
});

export default ordersRouter;