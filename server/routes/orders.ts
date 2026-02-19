import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { getCurrentCompanyId } from '../company-db';
import { getTimestampRD, getNowRD } from '../date-utils';
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
      GROUP BY o.id, c.businessname, c.phone, o.invoice_id
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
      itemsCount: safeParseInt(order.items_count, 0),
      invoiceId: order.invoice_id
    }));
    
    res.json(orders);
  } catch (error) {
    console.error("❌ Error al listar órdenes:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para obtener todos los pedidos pendientes con filtro opcional por zona
// IMPORTANTE: Esta ruta debe estar ANTES de /api/orders/:orderId para evitar que "pending" sea interpretado como un ID
ordersRouter.get("/api/orders/pending", authMiddleware, async (req: Request, res: Response) => {
  try {
    // Obtener el parámetro de zona si existe
    const zoneId = req.query.zoneId ? Number(req.query.zoneId) : null;
    console.log(`🔍 Iniciando búsqueda de pedidos pendientes...${zoneId ? ` Filtrados por zona ${zoneId}` : ''}`);
    
    // Obtener companyId desde varias fuentes
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error("❌ Error: No se encontró companyId para obtener pedidos pendientes");
      return res.status(403).json({ 
        error: "Acceso denegado", 
        message: "No se ha encontrado un contexto de compañía válido."
      });
    }
    
    console.log(`🔍 GET /api/orders/pending - Buscando pedidos pendientes para compañía ${companyId}${zoneId ? ` en zona ${zoneId}` : ''}`);
    
    // 1. Obtener IDs de pedidos pendientes con filtro opcional por zona
    let pendingOrdersIdsQuery = `
      SELECT o.id 
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.status = 'pending' 
      AND o.route_id IS NULL 
      AND o.company_id = $1
    `;
    
    const queryParams = [companyId];
    
    // Agregar filtro por zona si se especificó
    if (zoneId) {
      pendingOrdersIdsQuery += ` AND c.zoneid = $2`;
      queryParams.push(zoneId);
    }
    
    const pendingOrdersIdsResult = await pool.query(pendingOrdersIdsQuery, queryParams);
    console.log(`Encontrados ${pendingOrdersIdsResult.rows.length} IDs de pedidos pendientes para la compañía ${companyId}`);
    
    // Si no hay pedidos pendientes, devolver un array vacío
    if (pendingOrdersIdsResult.rows.length === 0) {
      return res.json([]);
    }
    
    // Lista final de pedidos válidos
    const validOrders = [];
    
    // 2. Para cada ID, obtener detalles completos
    for (const orderRow of pendingOrdersIdsResult.rows) {
      try {
        const orderId = orderRow.id;
        
        // Obtener datos básicos del pedido
        const orderQuery = `
          SELECT 
            id, customer_id as "customerId", date, 
            total, status, 
            delivery_coordinates as "deliveryCoordinates",
            notes
          FROM orders
          WHERE id = $1 AND company_id = $2
        `;
        
        const orderResult = await pool.query(orderQuery, [orderId, companyId]);
        
        if (!orderResult.rows || orderResult.rows.length === 0) {
          console.warn(`Pedido ${orderId} no encontrado`);
          continue;
        }
        
        const orderData = orderResult.rows[0];
        
        // Obtener datos del cliente
        const customerQuery = `
          SELECT 
            businessname, street, streetnumber, phone, 
            zoneid, coordinates
          FROM customers
          WHERE id = $1 AND company_id = $2
        `;
        
        const customerResult = await pool.query(customerQuery, [orderData.customerId, companyId]);
        const customerData = customerResult.rows[0] || null;
        
        // Obtener datos de zona si existe
        let zoneName = "Sin asignar";
        let zoneId = null;
        
        if (customerData && customerData.zoneid) {
          const zoneQuery = `
            SELECT name
            FROM zones
            WHERE id = $1 AND company_id = $2
          `;
          
          const zoneResult = await pool.query(zoneQuery, [customerData.zoneid, companyId]);
          
          if (zoneResult.rows && zoneResult.rows.length > 0) {
            zoneName = zoneResult.rows[0].name;
            zoneId = customerData.zoneid;
          }
        }
        
        // Obtener productos del pedido
        const productsQuery = `
          SELECT 
            jsonb_agg(
              jsonb_build_object(
                'id', oi.product_id,
                'name', p.name,
                'quantity', oi.quantity,
                'price', oi.price,
                'subtotal', oi.total
              )
            ) as products
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = $1 AND p.company_id = $2
        `;
        
        const productsResult = await pool.query(productsQuery, [orderId, companyId]);
        const products = productsResult.rows[0]?.products || [];
        
        // Combinar todos los datos
        validOrders.push({
          ...orderData,
          customerName: customerData?.businessname || "Cliente desconocido",
          customerAddress: customerData?.street || "Dirección desconocida",
          customerAddressNumber: customerData?.streetnumber || "",
          customerPhone: customerData?.phone || "",
          coordinates: customerData?.coordinates || null,
          zoneName: zoneName,
          zoneId: zoneId,
          products: products,
        });
        
      } catch (error) {
        console.error(`Error al obtener detalles del pedido ${orderRow.id}:`, error);
        // Continuar con el siguiente pedido
        continue;
      }
    }
    
    // Ordenar por fecha
    validOrders.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Procesados ${validOrders.length} pedidos pendientes válidos para la compañía ${companyId}`);
    res.json(validOrders);
  } catch (error) {
    console.error("Error al obtener todos los pedidos pendientes:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para obtener una orden específica con sus detalles
ordersRouter.get("/api/orders/:orderId", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  console.log(`GET /api/orders/${orderId} - Buscando pedido para compañía ${getCurrentCompanyId() || 'no definida'}`);
  
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
      SELECT o.*, o.invoice_id as "invoiceId", c.businessname as customer_name, c.phone as customer_phone, c.is_charity,
             u.name as salesperson_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.salesperson_id = u.id
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
      customerIsCharity: order.is_charity || false,
      routeId: order.route_id,
      salespersonId: order.salesperson_id,
      salespersonName: order.salesperson_name,
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
      invoiceId: order.invoiceId ?? order.invoice_id,
      bottlesNotReturned: order.bottles_not_returned || false,
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
      date: req.body.date ? new Date(req.body.date).toISOString() : getTimestampRD(),
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
        returnDate || getTimestampRD(),
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
        returnDate || getTimestampRD(),
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
    
    // Usar transacción para garantizar atomicidad de status + stock + factura
    const client = await pool.connect();
    let updatedOrder: any;
    let currentStatus: string;
    
    try {
      await client.query('BEGIN');
      
      // Bloquear y leer el pedido para obtener estado actual
      const orderCheckQuery = `
        SELECT * FROM orders 
        WHERE id = $1 AND company_id = $2
        FOR UPDATE
      `;
      const orderCheck = await client.query(orderCheckQuery, [orderId, companyId]);
      
      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: "Orden no encontrada o sin permisos" });
      }
      
      currentStatus = orderCheck.rows[0].status;
      console.log(`📝 Estado actual: ${currentStatus}, Nuevo estado: ${status}`);
      
      // Si ya está en el mismo estado, no hacer nada
      if (currentStatus === status) {
        await client.query('COMMIT');
        client.release();
        const order = orderCheck.rows[0];
        return res.json({
          id: order.id,
          customerId: order.customer_id,
          total: order.total,
          status: order.status,
          paymentMethod: order.payment_method,
          date: order.date,
          routeId: order.route_id,
          notes: order.notes,
          companyId: order.company_id
        });
      }
      
      // Actualizar el estado
      const updateQuery = `
        UPDATE orders 
        SET status = $1 
        WHERE id = $2 AND company_id = $3
        RETURNING *
      `;
      const result = await client.query(updateQuery, [status, orderId, companyId]);
      updatedOrder = result.rows[0];
      console.log(`✅ Estado actualizado exitosamente para orden ${orderId}`);
      
      // ====== GESTIÓN DE STOCK ======
      if (status === "delivered" && currentStatus !== "delivered") {
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
      } else if (currentStatus === "delivered" && status !== "delivered") {
        const stockItemsQuery = `
          SELECT oi.product_id, oi.quantity 
          FROM order_items oi 
          WHERE oi.order_id = $1 AND oi.company_id = $2
        `;
        const stockItems = await client.query(stockItemsQuery, [orderId, companyId]);
        
        for (const item of stockItems.rows) {
          await client.query(
            `UPDATE products SET stock = stock + $1 WHERE id = $2 AND company_id = $3`,
            [item.quantity, item.product_id, companyId]
          );
        }
        console.log(`📦 Stock restaurado para ${stockItems.rows.length} productos del pedido #${orderId} (revertido de delivered a ${status})`);
      }
    
    // Si el pedido cambió a "delivered" y antes no lo estaba, crear factura automáticamente
    // EXCEPTO si es una donación O si ya tiene factura prepagada
    if (status === "delivered" && currentStatus !== "delivered") {
      // Verificar si ya tiene factura prepagada o si es donación
      if (updatedOrder.payment_method === 'donation') {
        console.log(`🎁 Este pedido es una DONACIÓN - NO se creará factura`);
      } else if (updatedOrder.invoice_id) {
        console.log(`💳 Este pedido ya tiene factura prepagada (invoice_id: ${updatedOrder.invoice_id}) - NO se creará factura duplicada`);
      } else {
        console.log(`📄 Creando factura automáticamente para pedido ${orderId}...`);
      
      try {
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
        const orderItemsResult = await client.query(orderItemsQuery, [orderId, companyId]);
        
        // Calcular subtotal (suma de todos los items)
        const subtotal = orderItemsResult.rows.reduce((sum, item) => {
          return sum + parseFloat(item.total);
        }, 0);
        
        // Calcular impuesto
        const tax = subtotal * taxRate;
        
        // Calcular total
        const total = subtotal + tax;
        
        console.log(`💰 Cálculos: Subtotal=${subtotal.toFixed(2)}, Impuesto=${tax.toFixed(2)}, Total=${total.toFixed(2)}`);
        
        // Obtener el siguiente número de factura para esta compañía
        const maxInvoiceQuery = `
          SELECT COALESCE(MAX(invoice_number), 0) as max_invoice_number 
          FROM invoices 
          WHERE company_id = $1
        `;
        const maxInvoiceResult = await client.query(maxInvoiceQuery, [companyId]);
        const nextInvoiceNumber = maxInvoiceResult.rows[0].max_invoice_number + 1;
        
        // Determinar el status inicial basado en el método de pago
        // Si es efectivo, la factura se marca como pagada automáticamente
        const invoiceStatus = updatedOrder.payment_method === 'cash' ? 'paid' : 'pending';
        
        // Crear la factura con subtotal, tax y total
        const invoiceDate = getTimestampRD();
        
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
          invoiceStatus, // Usar el status determinado según el método de pago
          updatedOrder.payment_method,
          invoiceDate,
          nextInvoiceNumber,
          `Generada automáticamente desde pedido #${orderId}`
        ]);
        
        const invoice = invoiceResult.rows[0];
        console.log(`✅ Factura #${invoice.id} (número ${invoice.invoice_number}) creada con status: ${invoiceStatus}`);
        
        // Copiar los items del pedido a la factura (ya los tenemos de la consulta anterior)
        for (const item of orderItemsResult.rows) {
          const createInvoiceItemQuery = `
            INSERT INTO invoice_items (
              company_id, invoice_id, product_id, quantity, price, total
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          await client.query(createInvoiceItemQuery, [
            companyId,
            invoice.id,
            item.product_id,
            item.quantity,
            item.price,
            item.total
          ]);
        }
        
        console.log(`✅ ${orderItemsResult.rows.length} items copiados a la factura #${invoice.id}`);
        
        // Si el método de pago es efectivo, crear automáticamente el registro de pago
        if (updatedOrder.payment_method === 'cash') {
          console.log(`💵 Creando pago automático en efectivo para factura #${invoice.id}`);
          console.log(`📋 Datos de factura para pago:`, { 
            invoice_id: invoice.id, 
            invoice_number: invoice.invoice_number,
            customer_id: updatedOrder.customer_id,
            amount: total.toFixed(2)
          });
          
          try {
            // Verificar que invoice.invoice_number existe
            if (!invoice.invoice_number) {
              console.error(`⚠️ ADVERTENCIA: invoice.invoice_number está undefined o null`, invoice);
            }
            
            const paymentNotes = `Pago automático en efectivo - Factura #${invoice.invoice_number || 'N/A'}`;
            console.log(`📝 Notes para pago: "${paymentNotes}" (longitud: ${paymentNotes.length})`);
            
            const paymentDate = getTimestampRD(); // Misma función que pedidos
            
            const createPaymentQuery = `
              INSERT INTO payments (
                company_id, invoice_id, customer_id, amount, payment_method, date, notes
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7::text)
              RETURNING *
            `;
            
            console.log(`🔧 Parámetros del pago:`, [
              companyId,
              invoice.id,
              updatedOrder.customer_id,
              total.toFixed(2),
              'cash',
              paymentDate,
              paymentNotes
            ]);
            
            const paymentResult = await client.query(createPaymentQuery, [
              companyId,
              invoice.id,
              updatedOrder.customer_id,
              total.toFixed(2),
              'cash',
              paymentDate,
              paymentNotes
            ]);
            
            const payment = paymentResult.rows[0];
            console.log(`✅ Pago automático #${payment.id} creado para factura #${invoice.id}`);
            console.log(`✅ Notes del pago: "${payment.notes}" (longitud: ${payment.notes ? payment.notes.length : 0})`);
          } catch (paymentError: any) {
            console.error(`❌ Error al crear pago automático para factura #${invoice.id}:`, paymentError);
            console.error(`Error stack:`, paymentError?.stack);
            // No fallar la creación de la factura si falla el pago
          }
        }
        
      } catch (invoiceError) {
        console.error(`❌ Error al crear factura automática:`, invoiceError);
        // No fallar la actualización del pedido por un error en la factura
        // Solo registrar el error
      }
      }
    }
    
      await client.query('COMMIT');
      console.log('✅ Transacción completada exitosamente');
      
    } catch (txError) {
      await client.query('ROLLBACK');
      console.error('❌ Error en transacción, ejecutando ROLLBACK:', txError);
      throw txError;
    } finally {
      client.release();
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

// Endpoint para marcar envases como no devueltos
ordersRouter.patch("/api/orders/:orderId/mark-bottles-not-returned", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  console.log(`🔵 [PATCH BOTTLES] Iniciando PATCH mark-bottles-not-returned para order ${orderId}`);
  
  try {
    const companyId = getCurrentCompanyId();
    console.log(`🔵 [PATCH BOTTLES] Company ID from context: ${companyId}`);
    
    if (!companyId) {
      console.log(`❌ [PATCH BOTTLES] No autorizado - sin companyId`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para marcar envases"
      });
    }

    // 1. Obtener los productos retornables del pedido
    const orderItemsQuery = `
      SELECT oi.product_id, oi.quantity, p.name, p.deposit_amount
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1 AND oi.company_id = $2 AND p.is_returnable = true
    `;
    
    const itemsResult = await pool.query(orderItemsQuery, [orderId, companyId]);
    
    if (itemsResult.rows.length === 0) {
      console.log(`❌ [PATCH BOTTLES] No hay productos retornables en este pedido`);
      return res.status(400).json({ error: "Este pedido no tiene productos retornables" });
    }

    console.log(`📦 [PATCH BOTTLES] Encontrados ${itemsResult.rows.length} productos retornables`);

    // 2. Actualizar el campo bottles_not_returned a true
    const updateQuery = `
      UPDATE orders 
      SET bottles_not_returned = true 
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [orderId, companyId]);

    if (result.rows.length === 0) {
      console.log(`❌ [PATCH BOTTLES] Pedido no encontrado`);
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // 3. Crear registros de bottle_returns para cada producto retornable
    for (const item of itemsResult.rows) {
      // Verificar si ya existe un registro de retorno para este producto
      const existingReturnQuery = `
        SELECT id FROM bottle_returns 
        WHERE order_id = $1 AND product_id = $2 AND company_id = $3
      `;
      
      const existingReturn = await pool.query(existingReturnQuery, [orderId, item.product_id, companyId]);
      
      if (existingReturn.rows.length === 0) {
        // No existe, crear el registro
        const createReturnQuery = `
          INSERT INTO bottle_returns (
            company_id, order_id, product_id, expected_quantity, 
            returned_quantity, pending_quantity, return_date, status, 
            deposit_amount, justification, manually_assigned
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10)
          RETURNING *
        `;
        
        await pool.query(createReturnQuery, [
          companyId,
          orderId,
          item.product_id,
          item.quantity, // expected_quantity
          0, // returned_quantity (no devueltos)
          item.quantity, // pending_quantity (todos pendientes)
          'incomplete', // status
          item.deposit_amount || '0.00',
          'Marcado manualmente como No Devuelto',
          true // manually_assigned
        ]);
        
        console.log(`✅ [PATCH BOTTLES] Registro de retorno creado para producto ${item.name}`);
      } else {
        console.log(`ℹ️ [PATCH BOTTLES] Ya existe registro de retorno para producto ${item.name}`);
      }
    }

    const updatedOrder = result.rows[0];
    console.log(`✅ [PATCH BOTTLES] Pedido ${orderId} marcado como no devuelto con registros creados`);
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("❌ [PATCH BOTTLES] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para crear factura prepagada (antes de entregar)
ordersRouter.post("/api/orders/:orderId/create-prepaid-invoice", authMiddleware, async (req: Request, res: Response) => {
  const orderId = safeParseInt(req.params.orderId, -1);
  
  if (!isPositiveInteger(orderId)) {
    return res.status(400).json({ error: "ID de orden inválido" });
  }
  
  const { paymentMethod } = req.body;
  
  if (!paymentMethod || !["cash", "credit", "card"].includes(paymentMethod)) {
    return res.status(400).json({ error: "Método de pago inválido" });
  }
  
  console.log(`POST /api/orders/${orderId}/create-prepaid-invoice - Creando factura prepagada con método: ${paymentMethod}`);
  
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.error(`❌ ERROR: No se encontró companyId en el contexto`);
      return res.status(401).json({ 
        error: "Autenticación requerida", 
        details: "Debe iniciar sesión para crear facturas"
      });
    }
    
    // Verificar que la orden existe y pertenece a la compañía
    const orderCheckQuery = `
      SELECT id, invoice_id, customer_id, status, payment_method 
      FROM orders 
      WHERE id = $1 AND company_id = $2
    `;
    
    const orderCheck = await pool.query(orderCheckQuery, [orderId, companyId]);
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Orden no encontrada o sin permisos" });
    }
    
    const order = orderCheck.rows[0];
    
    // Verificar que la orden no tiene ya una factura
    if (order.invoice_id) {
      return res.status(400).json({ 
        error: "Esta orden ya tiene una factura asociada",
        invoiceId: order.invoice_id 
      });
    }
    
    // Verificar que la orden no esté ya entregada
    if (order.status === "delivered") {
      return res.status(400).json({ error: "No se puede crear factura prepagada para una orden ya entregada" });
    }
    
    // Obtener los items del pedido para calcular subtotal
    const orderItemsQuery = `
      SELECT product_id, quantity, price 
      FROM order_items 
      WHERE order_id = $1 AND company_id = $2
    `;
    const orderItemsResult = await pool.query(orderItemsQuery, [orderId, companyId]);
    
    if (orderItemsResult.rows.length === 0) {
      return res.status(400).json({ error: "La orden no tiene items" });
    }
    
    // Calcular subtotal
    let subtotal = 0;
    for (const item of orderItemsResult.rows) {
      subtotal += parseFloat(item.price) * item.quantity;
    }
    
    // Obtener tasa de impuesto de la configuración de la compañía
    const companySettingsQuery = `
      SELECT tax FROM company_settings WHERE company_id = $1
    `;
    const companySettingsResult = await pool.query(companySettingsQuery, [companyId]);
    
    let taxRate = 0;
    if (companySettingsResult.rows.length > 0 && companySettingsResult.rows[0].tax) {
      taxRate = parseFloat(companySettingsResult.rows[0].tax);
    }
    
    // Calcular impuesto y total
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    console.log(`💰 Cálculos: Subtotal=${subtotal.toFixed(2)}, Impuesto=${tax.toFixed(2)} (${(taxRate * 100)}%), Total=${total.toFixed(2)}`);
    
    // ===== INICIAR TRANSACCIÓN =====
    await pool.query('BEGIN');
    
    try {
      // Obtener el siguiente número de factura para esta compañía
      const maxInvoiceQuery = `
        SELECT COALESCE(MAX(invoice_number), 0) as max_invoice_number 
        FROM invoices 
        WHERE company_id = $1
      `;
      const maxInvoiceResult = await pool.query(maxInvoiceQuery, [companyId]);
      const nextInvoiceNumber = maxInvoiceResult.rows[0].max_invoice_number + 1;
      
      // Determinar el status basado en el método de pago:
      // - cash/card: se paga ahora en oficina → 'paid'
      // - credit: es a cuenta → 'pending'
      const invoiceStatus = paymentMethod === 'credit' ? 'pending' : 'paid';
      
      // Crear la factura con subtotal, tax y total
      const invoiceDate = getTimestampRD();
      
      const createInvoiceQuery = `
        INSERT INTO invoices (
          company_id, customer_id, subtotal, tax, total, status, payment_method, 
          date, invoice_number, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const invoiceResult = await pool.query(createInvoiceQuery, [
        companyId,
        order.customer_id,
        subtotal.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        invoiceStatus,
        paymentMethod,
        invoiceDate,
        nextInvoiceNumber,
        `Factura prepagada - Pedido #${orderId}`
      ]);
      
      const invoice = invoiceResult.rows[0];
      console.log(`✅ Factura prepagada #${invoice.id} (número ${invoice.invoice_number}) creada con status: ${invoiceStatus}`);
      
      // Copiar los items del pedido a la factura
      for (const item of orderItemsResult.rows) {
        const createInvoiceItemQuery = `
          INSERT INTO invoice_items (
            company_id, invoice_id, product_id, quantity, price, total
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        const itemTotal = parseFloat(item.price) * item.quantity;
        
        await pool.query(createInvoiceItemQuery, [
          companyId,
          invoice.id,
          item.product_id,
          item.quantity,
          item.price,
          itemTotal.toFixed(2)
        ]);
      }
      
      console.log(`✅ Items de factura copiados (${orderItemsResult.rows.length} items)`);
      
      // Crear el registro de pago solo si NO es crédito
      // - cash/card: se recibe pago ahora → crear registro de pago
      // - credit: no se recibe pago ahora → NO crear registro de pago
      let payment = null;
      if (paymentMethod !== 'credit') {
        console.log(`💵 Creando pago prepagado para factura #${invoice.id}`);
        
        const paymentDate = getTimestampRD(); // Misma función que pedidos
        
        const createPaymentQuery = `
          INSERT INTO payments (
            company_id, invoice_id, customer_id, amount, payment_method, date, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const paymentNotes = `Pago prepagado - Factura #${invoice.invoice_number} - Pedido #${orderId}`;
        
        const paymentResult = await pool.query(createPaymentQuery, [
          companyId,
          invoice.id,
          order.customer_id,
          total.toFixed(2),
          paymentMethod,
          paymentDate,
          paymentNotes
        ]);
        
        payment = paymentResult.rows[0];
        console.log(`✅ Pago prepagado #${payment.id} creado para factura #${invoice.id}`);
      } else {
        console.log(`📝 Factura a crédito - NO se crea registro de pago (pendiente de cobro)`);
      }
      
      // Actualizar la orden con el invoice_id y payment_method
      const updateOrderQuery = `
        UPDATE orders 
        SET invoice_id = $1, payment_method = $2
        WHERE id = $3 AND company_id = $4
        RETURNING *
      `;
      
      const updateOrderResult = await pool.query(updateOrderQuery, [
        invoice.id,
        paymentMethod,
        orderId,
        companyId
      ]);
      
      console.log(`✅ Orden #${orderId} actualizada con invoice_id: ${invoice.id}`);
      
      // ===== CREAR TRANSACCIONES =====
      // Obtener nombre del cliente
      const customerQuery = `SELECT businessname FROM customers WHERE id = $1 AND company_id = $2`;
      const customerResult = await pool.query(customerQuery, [order.customer_id, companyId]);
      const customerName = customerResult.rows[0]?.businessname || 'Cliente';
      
      // 1. Crear transacción FT (Factura)
      await pool.query('LOCK TABLE transactions IN SHARE ROW EXCLUSIVE MODE');
      
      const ftQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 4) AS INTEGER)), 0) as max_num
        FROM transactions
        WHERE company_id = $1 AND document_type = 'FT'
      `;
      const ftResult = await pool.query(ftQuery, [companyId]);
      const nextFtNumber = ftResult.rows[0].max_num + 1;
      const ftDocNumber = `FT-${String(nextFtNumber).padStart(4, '0')}`;
      
      const transactionDate = getTimestampRD();
      
      const createFtTransactionQuery = `
        INSERT INTO transactions (
          company_id, document_type, document_number, customer_id, invoice_id,
          amount, type, description, date
        )
        VALUES ($1, 'FT', $2, $3, $4, $5, 'debit', $6, $7)
        RETURNING *
      `;
      
      await pool.query(createFtTransactionQuery, [
        companyId,
        ftDocNumber,
        order.customer_id,
        invoice.id,
        total.toFixed(2),
        `Factura #${invoice.invoice_number} - ${customerName}`,
        transactionDate
      ]);
      
      console.log(`✅ Transacción ${ftDocNumber} creada para factura #${invoice.id}`);
      
      // 2. Crear transacción RI (Recibo) solo si hay pago
      if (payment) {
        const riQuery = `
          SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 4) AS INTEGER)), 0) as max_num
          FROM transactions
          WHERE company_id = $1 AND document_type = 'RI'
        `;
        const riResult = await pool.query(riQuery, [companyId]);
        const nextRiNumber = riResult.rows[0].max_num + 1;
        const riDocNumber = `RI-${String(nextRiNumber).padStart(4, '0')}`;
        
        const createRiTransactionQuery = `
          INSERT INTO transactions (
            company_id, document_type, document_number, customer_id, invoice_id, payment_id,
            amount, type, description, date
          )
          VALUES ($1, 'RI', $2, $3, $4, $5, $6, 'credit', $7, $8)
          RETURNING *
        `;
        
        await pool.query(createRiTransactionQuery, [
          companyId,
          riDocNumber,
          order.customer_id,
          invoice.id,
          payment.id,
          total.toFixed(2),
          `Pago Factura - ${customerName}`,
          transactionDate
        ]);
        
        console.log(`✅ Transacción ${riDocNumber} creada para pago #${payment.id}`);
      }
      
      // ===== COMMIT TRANSACCIÓN =====
      await pool.query('COMMIT');
      console.log(`✅ Transacción completada exitosamente`);
      
      res.json({
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          status: invoice.status,
          paymentMethod: invoice.payment_method,
          date: invoice.date
        },
        payment: payment ? {
          id: payment.id,
          amount: payment.amount,
          paymentMethod: payment.payment_method,
          date: payment.date
        } : null,
        order: {
          id: updateOrderResult.rows[0].id,
          invoiceId: updateOrderResult.rows[0].invoice_id
        },
        message: `Factura prepagada #${invoice.invoice_number} creada exitosamente`
      });
      
    } catch (innerError) {
      // Hacer ROLLBACK si falla algo dentro de la transacción
      await pool.query('ROLLBACK');
      console.error(`❌ Error en transacción, ROLLBACK ejecutado:`, innerError);
      throw innerError;
    }
    
  } catch (error) {
    console.error(`❌ Error al crear factura prepagada para orden ${orderId}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para actualizar un pedido existente
ordersRouter.put("/api/orders/:id", authMiddleware, async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const orderId = safeParseInt(req.params.id, -1);
    console.log(`🔄 PUT /api/orders/${orderId} - Intento de actualizar pedido`);
    console.log("📣 Datos recibidos:", JSON.stringify(req.body, null, 2));
    
    if (!isPositiveInteger(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    // Obtener companyId del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      console.warn(`ADVERTENCIA: No se encontró companyId para actualizar pedido`);
      return res.status(401).json({ error: "No se pudo determinar la compañía del usuario. Intente iniciar sesión nuevamente." });
    }
    
    console.log("🏢 Usando companyId:", companyId);
    
    // Verificar que el pedido existe y es editable
    const checkQuery = `
      SELECT id, status, invoice_id 
      FROM orders 
      WHERE id = $1 AND company_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [orderId, companyId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    
    const existingOrder = checkResult.rows[0];
    
    // Verificar que el pedido es editable (pending o in_transit y sin factura)
    if (!['pending', 'in_transit'].includes(existingOrder.status)) {
      return res.status(400).json({ error: "Solo se pueden editar pedidos pendientes o en tránsito" });
    }
    
    if (existingOrder.invoice_id) {
      return res.status(400).json({ error: "No se puede editar un pedido que ya tiene una factura asociada" });
    }
    
    // Extraer datos de los items
    const orderItemsData = req.body.items || [];
    console.log("📦 Items para actualizar:", orderItemsData.length);
    
    if (orderItemsData.length === 0) {
      return res.status(400).json({ error: "Debe incluir al menos un producto en el pedido" });
    }
    
    if (!req.body.customerId) {
      return res.status(400).json({ error: "El ID de cliente es obligatorio" });
    }
    
    const customerId = safeParseInt(req.body.customerId, -1);
    if (!isPositiveInteger(customerId)) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }
    
    // Obtener coordenadas del cliente
    const customerQuery = `
      SELECT coordinates FROM customers 
      WHERE id = $1 AND company_id = $2
    `;
    const customerResult = await pool.query(customerQuery, [customerId, companyId]);
    const customerCoordinates = customerResult.rows[0]?.coordinates || null;
    
    // Iniciar transacción
    await client.query('BEGIN');
    console.log("🔄 Transacción iniciada para actualización");
    
    // 1. Actualizar el pedido
    const updateQuery = `
      UPDATE orders 
      SET 
        customer_id = $1,
        total = $2,
        status = $3,
        payment_method = $4,
        notes = $5,
        delivery_coordinates = $6,
        salesperson_id = $7
      WHERE id = $8 AND company_id = $9
      RETURNING *
    `;
    
    const updateParams = [
      customerId,
      req.body.total,
      req.body.status || existingOrder.status,
      req.body.paymentMethod || 'cash',
      req.body.notes || '',
      customerCoordinates,
      req.body.salespersonId || null,
      orderId,
      companyId
    ];
    
    console.log("🔄 Actualizando pedido con parámetros:", updateParams);
    const updateResult = await client.query(updateQuery, updateParams);
    
    if (updateResult.rows.length === 0) {
      throw new Error("No se pudo actualizar el pedido");
    }
    
    const updatedOrder = updateResult.rows[0];
    console.log("✅ Pedido actualizado:", updatedOrder.id);
    
    // 2. Eliminar items antiguos
    const deleteItemsQuery = `
      DELETE FROM order_items 
      WHERE order_id = $1 AND company_id = $2
    `;
    await client.query(deleteItemsQuery, [orderId, companyId]);
    console.log("🗑️ Items antiguos eliminados");
    
    // 3. Insertar nuevos items
    for (const item of orderItemsData) {
      const productId = safeParseInt(item.productId || item.code, -1);
      
      if (!isPositiveInteger(productId)) {
        console.warn("⚠️ Item sin ID de producto válido, saltando:", item);
        continue;
      }
      
      const itemQuery = `
        INSERT INTO order_items (
          order_id, product_id, quantity, price, total, company_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) RETURNING *
      `;
      
      const quantity = safeParseInt(item.quantity, 1);
      const price = typeof item.price === 'string' ? item.price : 
                   (typeof item.price === 'number' ? item.price.toFixed(2) : '0.00');
      
      const total = typeof item.total === 'string' ? item.total : 
                   (typeof item.total === 'number' ? item.total.toFixed(2) : 
                   (safeParseFloat(price, 0) * quantity).toFixed(2));
      
      const itemParams = [
        orderId,
        productId,
        quantity,
        price,
        total,
        companyId
      ];
      
      console.log(`🔄 Insertando nuevo item:`, itemParams);
      
      const itemResult = await client.query(itemQuery, itemParams);
      if (itemResult.rows.length > 0) {
        console.log(`✅ Item creado con ID: ${itemResult.rows[0].id}`);
      }
    }
    
    // Confirmar transacción
    await client.query('COMMIT');
    console.log("✅ Transacción confirmada (COMMIT)");
    
    // Respuesta formateada
    const formattedOrder = {
      id: updatedOrder.id,
      companyId: updatedOrder.company_id,
      customerId: updatedOrder.customer_id,
      routeId: updatedOrder.route_id,
      total: updatedOrder.total,
      status: updatedOrder.status,
      paymentMethod: updatedOrder.payment_method,
      date: updatedOrder.date,
      notes: updatedOrder.notes,
      items: orderItemsData.length
    };
    
    console.log("✅ Pedido actualizado exitosamente:", formattedOrder);
    res.json(formattedOrder);
    
  } catch (error) {
    console.error("❌ ERROR al actualizar pedido:", error);
    try {
      await client.query('ROLLBACK');
      console.log("🔄 Transacción revertida (ROLLBACK)");
    } catch (rollbackError) {
      console.error("❌ Error durante ROLLBACK:", rollbackError);
    }
    res.status(500).json({ error: String(error) });
  } finally {
    try {
      client.release();
      console.log("🔄 Cliente de conexión liberado");
    } catch (releaseError) {
      console.error("❌ Error al liberar el cliente:", releaseError);
    }
  }
});

export default ordersRouter;