// Script para probar directamente la generación de pedidos desde un pedido recurrente
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

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

// Función para obtener un pedido recurrente por ID
async function getRecurringOrder(id) {
  console.log(`Buscando pedido recurrente con ID: ${id}`);
  const result = await query('SELECT * FROM recurring_orders WHERE id = $1 AND company_id = 15', [id]);
  if (result.length === 0) {
    throw new Error(`Pedido recurrente con ID ${id} no encontrado`);
  }
  return result[0];
}

// Función para obtener items de un pedido recurrente
async function getRecurringOrderItems(recurringOrderId) {
  console.log(`Buscando items para pedido recurrente ID: ${recurringOrderId}`);
  return await query(
    'SELECT * FROM recurring_order_items WHERE recurring_order_id = $1 AND company_id = 15',
    [recurringOrderId]
  );
}

// Función para obtener cliente
async function getCustomer(customerId) {
  console.log(`Buscando cliente con ID: ${customerId}`);
  const result = await query('SELECT * FROM customers WHERE id = $1 AND company_id = 15', [customerId]);
  if (result.length === 0) {
    throw new Error(`Cliente con ID ${customerId} no encontrado`);
  }
  return result[0];
}

// Función para obtener el próximo ID de pedido
async function getNextOrderId() {
  const result = await query('SELECT MAX(id) as max_id FROM orders WHERE company_id = 15');
  const maxId = result[0]?.max_id || 0;
  return maxId + 1;
}

// Función para crear un nuevo pedido (corregida según la estructura real de la tabla)
async function createOrder(orderData) {
  const {
    customer_id,
    status,
    total_amount,  // Usaremos esto como "total"
    company_id,
    recurring_order_id,
    delivery_coordinates
  } = orderData;

  const date = new Date();
  
  console.log('Creando nuevo pedido con datos:', orderData);
  
  const insertResult = await query(
    `INSERT INTO orders (
      customer_id, date, status, total, 
      company_id, recurring_order_id, delivery_coordinates
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      customer_id, date, status, total_amount, 
      company_id, recurring_order_id, delivery_coordinates
    ]
  );
  
  return insertResult[0];
}

// Función para crear items de pedido
async function createOrderItems(orderId, items, companyId) {
  console.log(`Creando ${items.length} items para pedido ID: ${orderId}`);
  
  for (const item of items) {
    await query(
      `INSERT INTO order_items (
        order_id, product_id, quantity, price, company_id
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId, 
        item.product_id, 
        item.quantity, 
        item.price,
        companyId
      ]
    );
  }
}

// Función principal para generar un pedido desde un pedido recurrente
async function generateOrderFromRecurring(recurringOrderId) {
  try {
    console.log('--------------------------------');
    console.log(`INICIANDO GENERACIÓN DE PEDIDO DESDE RECURRENTE ID: ${recurringOrderId}`);
    console.log('--------------------------------');
    
    // Paso 1: Obtener el pedido recurrente
    const recurringOrder = await getRecurringOrder(recurringOrderId);
    console.log('Pedido recurrente encontrado:', recurringOrder);
    
    // Paso 2: Obtener los items del pedido recurrente
    const recurringItems = await getRecurringOrderItems(recurringOrderId);
    console.log(`Encontrados ${recurringItems.length} items para el pedido recurrente`);
    
    // Paso 3: Obtener información del cliente
    const customer = await getCustomer(recurringOrder.customer_id);
    console.log('Cliente asociado:', customer);
    
    // Paso 4: Crear nuevo pedido (adaptado a la estructura real de la tabla)
    const newOrderData = {
      customer_id: recurringOrder.customer_id,
      status: 'pending',
      total_amount: recurringOrder.total_amount,
      company_id: 15, // Forzar companyId
      recurring_order_id: recurringOrderId,
      delivery_coordinates: customer.coordinates || ''
    };
    
    const newOrder = await createOrder(newOrderData);
    console.log('Nuevo pedido creado:', newOrder);
    
    // Paso 5: Crear items del pedido
    await createOrderItems(
      newOrder.id, 
      recurringItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      })),
      15 // company_id
    );
    
    console.log('--------------------------------');
    console.log(`PEDIDO GENERADO EXITOSAMENTE CON ID: ${newOrder.id}`);
    console.log('--------------------------------');
    
    return newOrder;
  } catch (error) {
    console.error('ERROR AL GENERAR PEDIDO:', error);
    throw error;
  } finally {
    // Cerrar pool de conexiones
    pool.end();
  }
}

// Ejecutar el proceso con el ID 6
generateOrderFromRecurring(6)
  .then(result => {
    console.log('Resultado final:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en ejecución:', error);
    process.exit(1);
  });