const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gowater';
const pool = new Pool({ connectionString });

/**
 * Función simple para ejecutar consultas SQL
 */
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    console.log("Consulta ejecutada", {
      text,
      duration: Date.now() - start,
      rows: result.rowCount,
    });
    return result;
  } finally {
    client.release();
  }
}

/**
 * Prueba directa para verificar el manejo de rutas para nuevos pedidos recurrentes
 */
async function testNewRecurringOrder() {
  console.log("==========================================");
  console.log("PRUEBA DIRECTA DE NUEVO PEDIDO RECURRENTE");
  console.log("==========================================");

  try {
    // 1. Obtener datos para el siguiente ID de pedido recurrente
    const nextIdQuery = await pool.query(`
      SELECT MAX(id) + 1 AS next_id
      FROM recurring_orders
      WHERE company_id = 15
    `);
    
    const nextId = nextIdQuery.rows[0].next_id || 1;
    console.log(`Próximo ID de pedido recurrente: ${nextId}`);

    // 2. Crear un nuevo pedido recurrente
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const newOrderQuery = await pool.query(`
      INSERT INTO recurring_orders (
        id, customer_id, name, frequency, start_date, 
        payment_method, status, total_amount, created_at, 
        updated_at, company_id, next_generation_date
      ) VALUES (
        $1, 9, 'Pedido recurrente de prueba script', 'weekly', $2,
        'cash', 'active', '100.00', $3,
        $4, 15, $5
      ) RETURNING *
    `, [nextId, now, now, now, nextWeek]);

    const newOrder = newOrderQuery.rows[0];
    console.log("Nuevo pedido recurrente creado:", newOrder);

    // 3. Crear un item para el pedido recurrente
    const newItemQuery = await pool.query(`
      INSERT INTO recurring_order_items (
        recurring_order_id, product_id, quantity, price, company_id
      ) VALUES (
        $1, 1, 1, '100.00', 15
      ) RETURNING *
    `, [nextId]);

    const newItem = newItemQuery.rows[0];
    console.log("Nuevo item creado:", newItem);

    console.log("==========================================");
    console.log("PRUEBA COMPLETADA EXITOSAMENTE");
    console.log("==========================================");
    console.log(`Pedido recurrente creado con ID: ${nextId}`);
    
    return {
      success: true,
      newRecurringOrderId: nextId,
      message: "Pedido recurrente creado correctamente"
    };
  } catch (error) {
    console.error("Error en la prueba:", error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Cerrar la conexión
    await pool.end();
  }
}

// Ejecutar la prueba
const start = Date.now();
testNewRecurringOrder()
  .then(result => console.log("Resultado final:", result))
  .catch(error => console.error("Error:", error));