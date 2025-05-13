// Script para probar todas las operaciones de pedidos recurrentes
require('dotenv').config();
const { Pool } = require('pg');

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Función para ejecutar consulta y obtener resultados
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Consulta ejecutada', { text, duration, rows: res.rowCount });
    return res.rows;
  } catch (error) {
    console.error('Error en consulta', { text, error });
    throw error;
  }
}

// Listar todos los pedidos recurrentes
async function listRecurringOrders() {
  console.log("\n==========================================");
  console.log("1. LISTANDO TODOS LOS PEDIDOS RECURRENTES");
  console.log("==========================================");
  
  try {
    // Consultar todos los pedidos recurrentes para la compañía 15
    const orders = await query(`
      SELECT ro.*, c.businessname AS customer_name
      FROM recurring_orders ro
      LEFT JOIN customers c ON ro.customer_id = c.id 
      WHERE ro.company_id = 15
      ORDER BY ro.id DESC
    `);
    
    console.log(`Se encontraron ${orders.length} pedidos recurrentes:`);
    orders.forEach(order => {
      console.log(`- Pedido #${order.id}: ${order.name} (${order.status})`);
      console.log(`  Cliente: ${order.customer_name} (ID: ${order.customer_id})`);
      console.log(`  Frecuencia: ${order.frequency}`);
      console.log(`  Próxima generación: ${order.next_generation_date || 'No programada'}`);
      console.log('------------------------------------------');
    });
    
    return orders;
  } catch (error) {
    console.error("Error al listar pedidos recurrentes:", error);
    throw error;
  }
}

// Obtener un pedido recurrente específico
async function getRecurringOrder(id) {
  console.log(`\n==========================================`);
  console.log(`2. OBTENIENDO PEDIDO RECURRENTE #${id}`);
  console.log(`==========================================`);
  
  try {
    const [order] = await query(
      'SELECT * FROM recurring_orders WHERE id = $1 AND company_id = 15',
      [id]
    );
    
    if (!order) {
      console.log(`No se encontró el pedido recurrente con ID ${id}`);
      return null;
    }
    
    // Obtener el cliente asociado
    const [customer] = await query(
      'SELECT * FROM customers WHERE id = $1 AND company_id = 15',
      [order.customer_id]
    );
    
    // Obtener productos asociados
    const items = await query(
      'SELECT * FROM recurring_order_items WHERE recurring_order_id = $1 AND company_id = 15',
      [id]
    );
    
    console.log(`Pedido recurrente #${id} encontrado:`);
    console.log(`- Nombre: ${order.name}`);
    console.log(`- Estado: ${order.status}`);
    console.log(`- Frecuencia: ${order.frequency}`);
    console.log(`- Cliente: ${customer ? customer.businessname : 'No encontrado'}`);
    console.log(`- Productos: ${items.length} items`);
    
    return { order, customer, items };
  } catch (error) {
    console.error(`Error al obtener pedido recurrente #${id}:`, error);
    throw error;
  }
}

// Crear un nuevo pedido recurrente
async function createRecurringOrder() {
  console.log("\n==========================================");
  console.log("3. CREANDO NUEVO PEDIDO RECURRENTE");
  console.log("==========================================");
  
  try {
    // Obtener un cliente para asociar al pedido
    const [customer] = await query(
      'SELECT * FROM customers WHERE company_id = 15 LIMIT 1'
    );
    
    if (!customer) {
      console.error("No se encontraron clientes para asociar al pedido recurrente");
      return null;
    }
    
    console.log(`Usando cliente: ${customer.businessname} (ID: ${customer.id})`);
    
    // Conseguir un ID para el nuevo pedido recurrente
    const [latestOrder] = await query(
      'SELECT MAX(id) as max_id FROM recurring_orders'
    );
    
    const newOrderId = (latestOrder.max_id || 0) + 1;
    console.log(`Usando ID ${newOrderId} para el nuevo pedido recurrente`);
    
    // Valores para el nuevo pedido
    const startDate = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Crear el pedido recurrente
    const [newOrder] = await query(`
      INSERT INTO recurring_orders (
        id, customer_id, name, frequency, start_date, payment_method, 
        status, total_amount, created_at, next_generation_date, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      newOrderId,
      customer.id,
      `Nuevo pedido recurrente test ${new Date().toISOString().substring(0, 10)}`,
      'weekly',
      startDate,
      'cash',
      'active',
      '100.00',
      startDate,
      nextWeek,
      15
    ]);
    
    console.log("Pedido recurrente creado exitosamente:", newOrder);
    
    // Crear un item para el pedido recurrente
    // Primero necesitamos un producto
    const [product] = await query(
      'SELECT * FROM products WHERE company_id = 15 LIMIT 1'
    );
    
    if (!product) {
      console.error("No se encontraron productos para asociar al pedido recurrente");
      return newOrder;
    }
    
    console.log(`Usando producto: ${product.name} (ID: ${product.id})`);
    
    // Crear el item
    const [newOrderItem] = await query(`
      INSERT INTO recurring_order_items (
        recurring_order_id, product_id, quantity, price, company_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      newOrderId,
      product.id,
      2,
      parseFloat(product.price || '50.00'),
      15
    ]);
    
    console.log("Item de pedido recurrente creado:", newOrderItem);
    
    return { order: newOrder, item: newOrderItem };
  } catch (error) {
    console.error("Error al crear pedido recurrente:", error);
    throw error;
  }
}

// Generar un pedido desde un pedido recurrente
async function generateOrder(recurringOrderId) {
  console.log(`\n==========================================`);
  console.log(`4. GENERANDO PEDIDO DESDE RECURRENTE #${recurringOrderId}`);
  console.log(`==========================================`);
  
  try {
    // Verificar que el pedido recurrente existe
    const [recurringOrder] = await query(
      'SELECT * FROM recurring_orders WHERE id = $1 AND company_id = 15',
      [recurringOrderId]
    );
    
    if (!recurringOrder) {
      console.error(`No se encontró el pedido recurrente con ID ${recurringOrderId}`);
      return null;
    }
    
    console.log(`Pedido recurrente encontrado: ${recurringOrder.name}`);
    
    // Verificar que el cliente asociado existe
    const [customer] = await query(
      'SELECT * FROM customers WHERE id = $1 AND company_id = 15',
      [recurringOrder.customer_id]
    );
    
    if (!customer) {
      console.error(`No se encontró el cliente con ID ${recurringOrder.customer_id}`);
      return null;
    }
    
    console.log(`Cliente asociado encontrado: ${customer.businessname}`);
    
    // Obtener los items del pedido recurrente
    const items = await query(
      'SELECT * FROM recurring_order_items WHERE recurring_order_id = $1 AND company_id = 15',
      [recurringOrderId]
    );
    
    console.log(`Encontrados ${items.length} items para el pedido recurrente`);
    
    // Crear el nuevo pedido
    console.log("Creando nuevo pedido...");
    const [newOrder] = await query(`
      INSERT INTO orders (
        customer_id, company_id, total, status, date, notes, cash_collected, 
        driver_commission, assistant_commission, recurring_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `, [
      customer.id,
      15,
      recurringOrder.total_amount,
      'pending',
      new Date(),
      `Pedido generado desde recurrente #${recurringOrderId}`,
      '0.00',
      '0.00',
      '0.00',
      recurringOrderId
    ]);
    
    console.log(`Nuevo pedido creado exitosamente: ${JSON.stringify(newOrder)}`);
    
    // Crear los items para el nuevo pedido
    console.log("Creando items para el nuevo pedido...");
    for (const item of items) {
      await query(`
        INSERT INTO order_items (
          order_id, product_id, quantity, price, company_id, total
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        newOrder.id,
        item.product_id,
        item.quantity,
        item.price,
        15,
        parseFloat(item.price) * item.quantity
      ]);
    }
    
    console.log(`Creados ${items.length} items para el pedido`);
    
    // Actualizar las fechas del pedido recurrente
    console.log("Actualizando fechas del pedido recurrente...");
    const lastGenDate = new Date();
    let nextGenDate = new Date(lastGenDate);
    
    // Calcular siguiente fecha según frecuencia
    switch (recurringOrder.frequency) {
      case 'daily':
        nextGenDate.setDate(nextGenDate.getDate() + 1);
        break;
      case 'weekly':
        nextGenDate.setDate(nextGenDate.getDate() + 7);
        break;
      case 'monthly':
        nextGenDate.setMonth(nextGenDate.getMonth() + 1);
        break;
      default:
        nextGenDate = null;
        break;
    }
    
    await query(
      `UPDATE recurring_orders 
       SET last_generated_date = $1, next_generation_date = $2, updated_at = $3
       WHERE id = $4 AND company_id = 15`,
      [lastGenDate, nextGenDate, new Date(), recurringOrderId]
    );
    
    console.log('==========================================');
    console.log('GENERACIÓN DE PEDIDO EXITOSA');
    console.log('==========================================');
    
    return {
      success: true,
      newOrderId: newOrder.id,
      message: 'Pedido generado correctamente'
    };
  } catch (error) {
    console.error('Error al generar pedido:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Función principal que ejecuta todas las pruebas
async function runAllTests() {
  try {
    console.log("\n*** INICIANDO BATERÍA DE PRUEBAS DE PEDIDOS RECURRENTES ***\n");
    
    // Paso 1: Listar todos los pedidos recurrentes
    const existingOrders = await listRecurringOrders();
    
    // Paso 2: Obtener un pedido recurrente específico (si existe)
    if (existingOrders.length > 0) {
      const firstOrderId = existingOrders[0].id;
      await getRecurringOrder(firstOrderId);
    } else {
      console.log("No hay pedidos recurrentes para consultar");
    }
    
    // Paso 3: Crear un nuevo pedido recurrente
    const newRecurringOrder = await createRecurringOrder();
    
    // Paso 4: Generar un pedido desde un pedido recurrente
    // Podemos usar el nuevo pedido recurrente o uno existente
    const orderIdToGenerate = newRecurringOrder?.order?.id || (existingOrders.length > 0 ? existingOrders[0].id : null);
    
    if (orderIdToGenerate) {
      await generateOrder(orderIdToGenerate);
    } else {
      console.log("No hay pedidos recurrentes para generar pedidos");
    }
    
    // Listar nuevamente para verificar los cambios
    console.log("\n*** VERIFICANDO ESTADO FINAL DE PEDIDOS RECURRENTES ***");
    await listRecurringOrders();
    
    console.log("\n*** PRUEBAS COMPLETADAS EXITOSAMENTE ***");
  } catch (error) {
    console.error("Error al ejecutar todas las pruebas:", error);
  } finally {
    await pool.end();
  }
}

// Ejecutar todas las pruebas
runAllTests();