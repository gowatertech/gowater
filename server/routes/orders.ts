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
    console.log(`GET /api/orders/${orderId} - Encontrados ${itemsResult.rows.length} items para compañía ${companyId}`);
    
    // Formatear la respuesta
    const order = orderResult.rows[0];
    
    // Formatear los items para que incluyan información detallada del producto
    const items = itemsResult.rows.map(item => {
      return {
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
          bottleDeposit: item.deposit_amount || '0.00',
          isReturnable: item.is_returnable === true || item.is_returnable === 't' || item.is_returnable === 'true'
        }
      };
    });
    
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
    const formattedItems = result.rows.map(item => {
      console.log(`🔍 DEBUG /items - Item ${item.id}: is_returnable=${item.is_returnable}, deposit_amount=${item.deposit_amount}`);
      return {
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
          bottleDeposit: item.deposit_amount || '0.00',
          isReturnable: item.is_returnable === true || item.is_returnable === 't' || item.is_returnable === 'true'
        }
      };
    });
    
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
    
    // Obtener coordenadas del cliente para copiarlas al pedido
    const customerQuery = `
      SELECT coordinates FROM customers 
      WHERE id = $1 AND company_id = $2
    `;
    const customerResult = await client.query(customerQuery, [customerId, companyId]);
    const customerCoordinates = customerResult.rows[0]?.coordinates || null;
    
    if (customerCoordinates) {
      console.log(`📍 Coordenadas del cliente obtenidas: ${customerCoordinates}`);
    } else {
      console.warn(`⚠️ Cliente ${customerId} no tiene coordenadas registradas`);
    }
    
    const orderData = {
      customerId,
      total: req.body.total,
      status: req.body.status || "pending",
      paymentMethod: req.body.paymentMethod || "cash",
      date: new Date(req.body.date || new Date()).toISOString(),
      routeId: req.body.routeId || null,
      notes: req.body.notes || "",
      deliveryCoordinates: customerCoordinates,
      companyId: companyId
    };
    
    console.log("🧾 Datos de orden a insertar:", orderData);
    
    // 1. Crear la orden (con coordenadas de entrega)
    const orderQuery = `
      INSERT INTO orders (
        company_id, customer_id, total, status, payment_method, date, 
        route_id, notes, delivery_coordinates, cash_collected, driver_commission, assistant_commission
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
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
      orderData.deliveryCoordinates,  // Coordenadas copiadas del cliente
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

// Endpoint para obtener retornos de botellas de una orden específica
ordersRouter.get("/api/orders/:orderId/bottle-returns", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error(`❌ ERROR: No se encontró companyId en el contexto para obtener retornos de orden #${orderId}`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para ver retornos"
      });
    }
    
    console.log(`📦 Obteniendo retornos de botellas para orden ${orderId} de compañía ${companyId}`);
    
    // Query para obtener retornos de botellas con información del producto
    const query = `
      SELECT br.*, p.name as product_name
      FROM bottle_returns br
      LEFT JOIN products p ON br.product_id = p.id
      WHERE br.order_id = $1 AND br.company_id = $2
      ORDER BY br.id
    `;
    
    const result = await pool.query(query, [orderId, companyId]);
    console.log(`✅ Encontrados ${result.rows.length} retornos de botellas`);
    
    // Formatear la respuesta
    const bottleReturns = result.rows.map(br => ({
      id: br.id,
      orderId: br.order_id,
      productId: br.product_id,
      productName: br.product_name,
      expectedQuantity: safeParseInt(br.expected_quantity, 0),
      returnedQuantity: safeParseInt(br.returned_quantity, 0),
      pendingQuantity: safeParseInt(br.pending_quantity, 0),
      returnDate: br.return_date,
      status: br.status,
      amountCharged: br.amount_charged || "0.00",
      depositAmount: br.deposit_amount || "0.00",
      responsibleType: br.responsible_type,
      chargeMethod: br.charge_method
    }));
    
    res.json(bottleReturns);
  } catch (error) {
    console.error(`❌ Error al obtener retornos de botellas para orden ${orderId}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para crear/actualizar retornos de botellas de una orden específica
ordersRouter.post("/api/orders/:orderId/bottle-returns", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error(`❌ ERROR: No se encontró companyId en el contexto para crear retorno de orden #${orderId}`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para registrar retornos"
      });
    }
    
    console.log(`📦 POST /api/orders/${orderId}/bottle-returns - Registrando retorno de botellas`);
    console.log(`📦 Datos recibidos:`, JSON.stringify(req.body, null, 2));
    
    const { 
      productId, 
      expectedQuantity, 
      returnedQuantity, 
      pendingQuantity,
      returnDate,
      status,
      amountCharged,
      depositAmount,
      responsibleType,
      chargeMethod,
      automaticAlert,
      manuallyAssigned
    } = req.body;
    
    // Validar campos requeridos
    if (!productId || expectedQuantity === undefined || returnedQuantity === undefined) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos",
        details: "Se requieren productId, expectedQuantity y returnedQuantity"
      });
    }
    
    // Verificar que la orden existe y pertenece a la compañía
    const orderCheckQuery = `
      SELECT id FROM orders 
      WHERE id = $1 AND company_id = $2
    `;
    
    const orderCheck = await pool.query(orderCheckQuery, [orderId, companyId]);
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Orden no encontrada o sin permisos" });
    }
    
    // Verificar si ya existe un retorno para este producto en esta orden
    const checkExistingQuery = `
      SELECT id, returned_quantity, pending_quantity 
      FROM bottle_returns 
      WHERE order_id = $1 AND product_id = $2 AND company_id = $3
    `;
    
    const existingReturn = await pool.query(checkExistingQuery, [orderId, productId, companyId]);
    
    if (existingReturn.rows.length > 0) {
      // Actualizar el retorno existente
      const existing = existingReturn.rows[0];
      const newReturnedQuantity = safeParseInt(existing.returned_quantity, 0) + safeParseInt(returnedQuantity, 0);
      const newPendingQuantity = safeParseInt(expectedQuantity, 0) - newReturnedQuantity;
      
      // Validación de seguridad: prevenir cantidades negativas
      if (newPendingQuantity < 0) {
        return res.status(400).json({ 
          error: "Cantidad inválida",
          details: `No puedes devolver más envases de los esperados. Ya se devolvieron ${existing.returned_quantity}, solo faltan ${existing.pending_quantity}.`
        });
      }
      
      const newStatus = newPendingQuantity === 0 ? "complete" : "incomplete";
      
      const updateQuery = `
        UPDATE bottle_returns 
        SET 
          returned_quantity = $1,
          pending_quantity = $2,
          status = $3,
          return_date = $4
        WHERE id = $5 AND company_id = $6
        RETURNING *
      `;
      
      const updateResult = await pool.query(updateQuery, [
        newReturnedQuantity,
        newPendingQuantity,
        newStatus,
        returnDate || new Date().toISOString(),
        existing.id,
        companyId
      ]);
      
      console.log(`✅ Retorno actualizado exitosamente`);
      
      const updated = updateResult.rows[0];
      res.json({
        id: updated.id,
        orderId: updated.order_id,
        productId: updated.product_id,
        expectedQuantity: safeParseInt(updated.expected_quantity, 0),
        returnedQuantity: safeParseInt(updated.returned_quantity, 0),
        pendingQuantity: safeParseInt(updated.pending_quantity, 0),
        returnDate: updated.return_date,
        status: updated.status,
        amountCharged: updated.amount_charged || "0.00",
        depositAmount: updated.deposit_amount || "0.00"
      });
    } else {
      // Crear nuevo retorno
      const insertQuery = `
        INSERT INTO bottle_returns (
          company_id,
          order_id,
          product_id,
          expected_quantity,
          returned_quantity,
          pending_quantity,
          return_date,
          status,
          amount_charged,
          deposit_amount,
          responsible_type,
          charge_method,
          automatic_alert,
          manually_assigned
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const insertResult = await pool.query(insertQuery, [
        companyId,
        orderId,
        productId,
        expectedQuantity || 0,
        returnedQuantity || 0,
        pendingQuantity !== undefined ? pendingQuantity : (expectedQuantity - returnedQuantity),
        returnDate || new Date().toISOString(),
        status || "pending",
        amountCharged || "0.00",
        depositAmount || "0.00",
        responsibleType || null,
        chargeMethod || null,
        automaticAlert || false,
        manuallyAssigned || false
      ]);
      
      console.log(`✅ Retorno creado exitosamente`);
      
      const created = insertResult.rows[0];
      res.json({
        id: created.id,
        orderId: created.order_id,
        productId: created.product_id,
        expectedQuantity: safeParseInt(created.expected_quantity, 0),
        returnedQuantity: safeParseInt(created.returned_quantity, 0),
        pendingQuantity: safeParseInt(created.pending_quantity, 0),
        returnDate: created.return_date,
        status: created.status,
        amountCharged: created.amount_charged || "0.00",
        depositAmount: created.deposit_amount || "0.00"
      });
    }
  } catch (error) {
    console.error(`❌ Error al registrar retorno de botellas para orden ${orderId}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para actualizar productos de una orden
ordersRouter.patch("/api/orders/:orderId/products", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  console.log(`PATCH /api/orders/${orderId}/products - Actualizando productos de la orden`);
  
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error(`❌ ERROR: No se encontró companyId en el contexto`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para actualizar productos"
      });
    }
    
    const { products } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de productos válido" });
    }
    
    // Verificar que la orden existe y pertenece a la compañía
    const orderCheckQuery = `
      SELECT id FROM orders 
      WHERE id = $1 AND company_id = $2
    `;
    
    const orderCheck = await pool.query(orderCheckQuery, [orderId, companyId]);
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Orden no encontrada o sin permisos" });
    }
    
    // Iniciar transacción
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Eliminar los order_items existentes
      const deleteQuery = `
        DELETE FROM order_items 
        WHERE order_id = $1 AND company_id = $2
      `;
      
      await client.query(deleteQuery, [orderId, companyId]);
      console.log(`🗑️ Eliminados order_items existentes para orden ${orderId}`);
      
      // Insertar los nuevos order_items y calcular el total
      let orderTotal = 0;
      
      for (const item of products) {
        const productId = safeParseInt(item.id, -1);
        const quantity = safeParseInt(item.quantity, 0);
        const price = safeParseFloat(item.price, 0);
        
        if (!isPositiveInteger(productId) || !isPositiveInteger(quantity) || price <= 0) {
          throw new Error(`Datos de producto inválidos: ${JSON.stringify(item)}`);
        }
        
        const itemTotal = (price * quantity).toFixed(2);
        orderTotal += parseFloat(itemTotal);
        
        const insertQuery = `
          INSERT INTO order_items (
            order_id, product_id, quantity, price, total, company_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          )
        `;
        
        await client.query(insertQuery, [
          orderId,
          productId,
          quantity,
          price.toFixed(2),
          itemTotal,
          companyId
        ]);
      }
      
      // Actualizar el total de la orden
      const updateOrderQuery = `
        UPDATE orders 
        SET total = $1 
        WHERE id = $2 AND company_id = $3
      `;
      
      await client.query(updateOrderQuery, [orderTotal.toFixed(2), orderId, companyId]);
      
      await client.query('COMMIT');
      console.log(`✅ Productos actualizados exitosamente para orden ${orderId}, nuevo total: ${orderTotal.toFixed(2)}`);
      
      res.json({ 
        success: true, 
        message: "Productos actualizados correctamente",
        total: orderTotal.toFixed(2)
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Error en transacción:`, error);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error(`❌ Error al actualizar productos de orden ${orderId}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para actualizar el estado de una orden
ordersRouter.patch("/api/orders/:orderId/status", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  const { status } = req.body;
  
  if (!status || !["pending", "in_transit", "delivered", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Estado inválido" });
  }
  
  console.log(`PATCH /api/orders/${orderId}/status - Actualizando estado a "${status}"`);
  
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error(`❌ ERROR: No se encontró companyId en el contexto`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para actualizar el estado"
      });
    }
    
    // Verificar que la orden existe y pertenece a la compañía
    const orderCheckQuery = `
      SELECT id, status FROM orders 
      WHERE id = $1 AND company_id = $2
    `;
    
    const orderCheck = await pool.query(orderCheckQuery, [orderId, companyId]);
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Orden no encontrada o sin permisos" });
    }
    
    const currentStatus = orderCheck.rows[0].status;
    console.log(`📝 Estado actual: ${currentStatus}, Nuevo estado: ${status}`);
    
    // Actualizar el estado
    const updateQuery = `
      UPDATE orders 
      SET status = $1 
      WHERE id = $2 AND company_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [status, orderId, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(500).json({ error: "Error al actualizar el estado" });
    }
    
    const updatedOrder = result.rows[0];
    console.log(`✅ Estado actualizado exitosamente para orden ${orderId}`);
    
    // Si el pedido cambió a "delivered" y antes no lo estaba, crear factura automáticamente
    if (status === "delivered" && currentStatus !== "delivered") {
      console.log(`📄 Creando factura automáticamente para pedido ${orderId}...`);
      
      try {
        // Obtener el siguiente número de factura para esta compañía
        const maxInvoiceQuery = `
          SELECT COALESCE(MAX(invoice_number), 0) as max_invoice_number 
          FROM invoices 
          WHERE company_id = $1
        `;
        const maxInvoiceResult = await pool.query(maxInvoiceQuery, [companyId]);
        const nextInvoiceNumber = maxInvoiceResult.rows[0].max_invoice_number + 1;
        
        // Crear la factura
        const createInvoiceQuery = `
          INSERT INTO invoices (
            company_id, customer_id, total, status, payment_method, 
            date, invoice_number, notes
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
          RETURNING *
        `;
        
        const invoiceResult = await pool.query(createInvoiceQuery, [
          companyId,
          updatedOrder.customer_id,
          updatedOrder.total,
          'pending', // La factura empieza como pendiente de pago
          updatedOrder.payment_method,
          nextInvoiceNumber,
          `Generada automáticamente desde pedido #${orderId}`
        ]);
        
        const invoice = invoiceResult.rows[0];
        console.log(`✅ Factura #${invoice.id} (número ${invoice.invoice_number}) creada`);
        
        // Copiar los items del pedido a la factura
        const orderItemsQuery = `
          SELECT * FROM order_items 
          WHERE order_id = $1 AND company_id = $2
        `;
        const orderItemsResult = await pool.query(orderItemsQuery, [orderId, companyId]);
        
        // Insertar cada item en la factura
        for (const item of orderItemsResult.rows) {
          const createInvoiceItemQuery = `
            INSERT INTO invoice_items (
              company_id, invoice_id, product_id, quantity, price, total
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          await pool.query(createInvoiceItemQuery, [
            companyId,
            invoice.id,
            item.product_id,
            item.quantity,
            item.price,
            item.total
          ]);
        }
        
        console.log(`✅ ${orderItemsResult.rows.length} items copiados a la factura #${invoice.id}`);
        
      } catch (invoiceError) {
        console.error(`❌ Error al crear factura automática:`, invoiceError);
        // No fallar la actualización del pedido por un error en la factura
        // Solo registrar el error
      }
    }
    
    // Convertir nombres de propiedades de snake_case a camelCase
    const formattedOrder = {
      id: updatedOrder.id,
      customerId: updatedOrder.customer_id,
      total: updatedOrder.total,
      status: updatedOrder.status,
      paymentMethod: updatedOrder.payment_method,
      date: updatedOrder.date,
      routeId: updatedOrder.route_id,
      notes: updatedOrder.notes,
      companyId: updatedOrder.company_id
    };
    
    res.json(formattedOrder);
    
  } catch (error) {
    console.error(`❌ Error al actualizar estado de orden ${orderId}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

export default ordersRouter;