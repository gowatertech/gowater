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

async function generateOrderFromRecurring(recurringOrderId) {
  console.log('==========================================');
  console.log(`GENERANDO PEDIDO DESDE RECURRENTE #${recurringOrderId}`);
  console.log('==========================================');

  // 1. Obtener el pedido recurrente
  const recurringOrderRes = await query(
    'SELECT * FROM recurring_orders WHERE id = $1 AND company_id = 15',
    [recurringOrderId]
  );
  
  if (recurringOrderRes.rows.length === 0) {
    console.error(`Pedido recurrente #${recurringOrderId} no encontrado`);
    return { success: false, message: 'Pedido recurrente no encontrado' };
  }

  const recurringOrder = recurringOrderRes.rows[0];
  console.log('Pedido recurrente encontrado:', recurringOrder);

  // 2. Obtener el cliente
  const customerRes = await query(
    'SELECT * FROM customers WHERE id = $1 AND company_id = 15',
    [recurringOrder.customer_id]
  );
  
  if (customerRes.rows.length === 0) {
    console.error(`Cliente #${recurringOrder.customer_id} no encontrado`);
    return { success: false, message: 'Cliente no encontrado' };
  }
  
  console.log('Cliente asociado encontrado:', customerRes.rows[0]);

  // 3. Obtener los items del pedido recurrente
  const itemsRes = await query(
    'SELECT * FROM recurring_order_items WHERE recurring_order_id = $1 AND company_id = 15',
    [recurringOrderId]
  );
  
  if (itemsRes.rows.length === 0) {
    console.error(`El pedido recurrente #${recurringOrderId} no tiene productos`);
    return { success: false, message: 'El pedido recurrente no tiene productos' };
  }
  
  console.log(`Encontrados ${itemsRes.rows.length} items para el pedido recurrente`);

  // 4. Crear el nuevo pedido
  console.log('Creando nuevo pedido...');
  const newOrderRes = await query(
    `INSERT INTO orders (
        customer_id, company_id, total, status, date, notes, cash_collected, 
        driver_commission, assistant_commission, recurring_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      recurringOrder.customer_id,
      recurringOrder.company_id,
      recurringOrder.total_amount,
      'pending',
      new Date(),
      `Pedido generado desde recurrente #${recurringOrderId}`,
      '0.00',
      '0.00',
      '0.00',
      recurringOrderId
    ]
  );
  
  const newOrder = newOrderRes.rows[0];
  console.log('Nuevo pedido creado exitosamente:', newOrder);

  // 5. Crear los items del nuevo pedido
  console.log('Creando items para el nuevo pedido...');
  for (const item of itemsRes.rows) {
    await query(
      `INSERT INTO order_items (
          order_id, product_id, quantity, price, company_id, total
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newOrder.id,
        item.product_id,
        item.quantity,
        item.price,
        recurringOrder.company_id,
        (parseFloat(item.price) * item.quantity).toFixed(2)
      ]
    );
  }
  
  console.log(`Creados ${itemsRes.rows.length} items para el pedido`);

  // 6. Actualizar las fechas del pedido recurrente
  console.log('Actualizando fechas del pedido recurrente...');
  
  // Calcular la próxima fecha de generación basada en la frecuencia
  const lastGeneratedDate = new Date();
  let nextGenerationDate;
  
  if (recurringOrder.frequency === 'daily') {
    nextGenerationDate = new Date(lastGeneratedDate);
    nextGenerationDate.setDate(nextGenerationDate.getDate() + 1);
  } else if (recurringOrder.frequency === 'weekly') {
    nextGenerationDate = new Date(lastGeneratedDate);
    nextGenerationDate.setDate(nextGenerationDate.getDate() + 7);
  } else if (recurringOrder.frequency === 'monthly') {
    nextGenerationDate = new Date(lastGeneratedDate);
    nextGenerationDate.setMonth(nextGenerationDate.getMonth() + 1);
  } else {
    // Para frecuencias "occasional", no establecer siguiente fecha
    nextGenerationDate = null;
  }
  
  await query(
    `UPDATE recurring_orders 
       SET last_generated_date = $1, next_generation_date = $2, updated_at = $3
       WHERE id = $4 AND company_id = 15`,
    [lastGeneratedDate, nextGenerationDate, new Date(), recurringOrderId]
  );

  console.log('==========================================');
  console.log('PRUEBA COMPLETADA EXITOSAMENTE');
  console.log('==========================================');
  console.log(`Pedido generado con ID: ${newOrder.id}`);

  return {
    success: true,
    newOrderId: newOrder.id,
    message: 'Pedido generado correctamente'
  };
}

// Ejecutar la función para el pedido recurrente con ID 9 (recién creado)
generateOrderFromRecurring(9)
  .then(result => {
    console.log('Resultado final:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en la ejecución:', error);
    process.exit(1);
  });