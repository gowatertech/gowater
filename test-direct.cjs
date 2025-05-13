// Script para probar directamente la generación de pedidos desde un pedido recurrente
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

// Probar la generación directamente hacia el endpoint
async function testGenerateOrder() {
  try {
    console.log('==========================================');
    console.log('PRUEBA DIRECTA DEL ENDPOINT DE GENERACIÓN');
    console.log('==========================================');
    
    // Paso 1: Verificar que el pedido recurrente existe
    const recurringOrderId = 6;
    const recurringOrders = await query(
      'SELECT * FROM recurring_orders WHERE id = $1 AND company_id = 15',
      [recurringOrderId]
    );
    
    if (recurringOrders.length === 0) {
      throw new Error(`No se encontró el pedido recurrente con ID ${recurringOrderId}`);
    }
    
    const recurringOrder = recurringOrders[0];
    console.log('Pedido recurrente encontrado:', recurringOrder);
    
    // Paso 2: Verificar que el cliente asociado existe
    const customerId = recurringOrder.customer_id;
    const customers = await query(
      'SELECT * FROM customers WHERE id = $1 AND company_id = 15',
      [customerId]
    );
    
    if (customers.length === 0) {
      throw new Error(`No se encontró el cliente con ID ${customerId}`);
    }
    
    const customer = customers[0];
    console.log('Cliente asociado encontrado:', customer);
    
    // Paso 3: Verificar los items del pedido recurrente
    const items = await query(
      'SELECT * FROM recurring_order_items WHERE recurring_order_id = $1 AND company_id = 15',
      [recurringOrderId]
    );
    
    if (items.length === 0) {
      throw new Error(`El pedido recurrente no tiene items`);
    }
    
    console.log(`Encontrados ${items.length} items para el pedido recurrente`);
    
    // Paso 4: Generar el nuevo pedido
    console.log('Creando nuevo pedido...');
    
    const newOrderResult = await query(
      `INSERT INTO orders (
        customer_id, company_id, total, status, date, notes, cash_collected, 
        driver_commission, assistant_commission, recurring_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        customer.id,
        15, // company_id
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
    
    if (newOrderResult.length === 0) {
      throw new Error('No se pudo crear el pedido');
    }
    
    const newOrder = newOrderResult[0];
    console.log('Nuevo pedido creado exitosamente:', newOrder);
    
    // Paso 5: Crear los items del pedido
    console.log('Creando items para el nuevo pedido...');
    
    for (const item of items) {
      await query(
        `INSERT INTO order_items (
          order_id, product_id, quantity, price, company_id, total
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newOrder.id,
          item.product_id,
          item.quantity,
          item.price,
          15, // company_id
          (parseFloat(item.price) * item.quantity).toFixed(2) // total
        ]
      );
    }
    
    console.log(`Creados ${items.length} items para el pedido`);
    
    // Paso 6: Actualizar la fecha de última generación del pedido recurrente
    console.log('Actualizando fechas del pedido recurrente...');
    
    const lastGenDate = new Date();
    let nextGenDate = new Date(lastGenDate);
    
    // Calcular próxima fecha según la frecuencia
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
        // Para frecuencias ocasionales no se establece siguiente fecha
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
    console.log('PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('==========================================');
    console.log(`Pedido generado con ID: ${newOrder.id}`);
    
    return {
      success: true,
      newOrderId: newOrder.id,
      message: 'Pedido generado correctamente'
    };
  } catch (error) {
    console.error('ERROR EN LA PRUEBA:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await pool.end();
  }
}

// Ejecutar la prueba
testGenerateOrder()
  .then(result => {
    console.log('Resultado final:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });