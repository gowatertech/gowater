const { Pool } = require('pg');

// Inicialización de pool de conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    console.log('Consulta ejecutada', {
      text,
      duration: result.duration,
      rows: result.rowCount
    });
    return result;
  } finally {
    client.release();
  }
}

async function createRecurringOrder() {
  console.log('==========================================');
  console.log('PRUEBA DE CREACIÓN DE PEDIDO RECURRENTE');
  console.log('==========================================');

  // 1. Primero asegurarnos que el cliente existe
  const customerRes = await query(
    'SELECT * FROM customers WHERE id = $1 AND company_id = 15',
    [9]
  );
  
  if (customerRes.rows.length === 0) {
    console.error('Cliente no encontrado');
    return { success: false, message: 'Cliente no encontrado' };
  }

  console.log('Cliente encontrado:', customerRes.rows[0]);

  // 2. Crear el pedido recurrente
  const recurringOrderData = {
    customer_id: 9,
    name: 'Pedido recurrente de prueba desde script',
    frequency: 'weekly',
    start_date: new Date(),
    payment_method: 'cash',
    status: 'active',
    total_amount: '200.00',
    company_id: 15
  };

  const insertRes = await query(
    `INSERT INTO recurring_orders (
        customer_id, name, frequency, start_date, payment_method, 
        status, total_amount, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      recurringOrderData.customer_id,
      recurringOrderData.name,
      recurringOrderData.frequency,
      recurringOrderData.start_date,
      recurringOrderData.payment_method,
      recurringOrderData.status,
      recurringOrderData.total_amount,
      recurringOrderData.company_id
    ]
  );

  if (insertRes.rows.length === 0) {
    console.error('Error al crear pedido recurrente');
    return { success: false, message: 'Error al crear pedido recurrente' };
  }

  const newRecurringOrder = insertRes.rows[0];
  console.log('Pedido recurrente creado:', newRecurringOrder);

  // 3. Crear un item para el pedido recurrente
  const itemData = {
    recurring_order_id: newRecurringOrder.id,
    product_id: 1, // Asegúrate que este producto existe
    quantity: 5,
    price: '40.00',
    company_id: 15
  };

  const itemRes = await query(
    `INSERT INTO recurring_order_items (
        recurring_order_id, product_id, quantity, price, company_id
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      itemData.recurring_order_id,
      itemData.product_id,
      itemData.quantity,
      itemData.price,
      itemData.company_id
    ]
  );

  if (itemRes.rows.length === 0) {
    console.error('Error al crear item de pedido recurrente');
    return { 
      success: false, 
      recurringOrderId: newRecurringOrder.id,
      message: 'Pedido creado pero error al crear item' 
    };
  }

  console.log('Item creado para el pedido recurrente:', itemRes.rows[0]);
  console.log('==========================================');
  console.log('PRUEBA COMPLETADA EXITOSAMENTE');
  console.log('==========================================');
  console.log('Pedido recurrente creado con ID:', newRecurringOrder.id);

  return {
    success: true,
    recurringOrderId: newRecurringOrder.id,
    message: 'Pedido recurrente creado correctamente'
  };
}

// Ejecutar la función y manejar el resultado
createRecurringOrder()
  .then(result => {
    console.log('Resultado final:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  });