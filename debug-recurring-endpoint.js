import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

// Crear un pool de conexiones a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    console.log('Consulta ejecutada:', { text, rowCount: result.rowCount });
    return result;
  } finally {
    client.release();
  }
}

// Verificar ids de pedidos recurrentes
async function checkRecurringOrders() {
  console.log('==========================================');
  console.log('VERIFICANDO PEDIDOS RECURRENTES EXISTENTES');
  console.log('==========================================');

  const result = await query(
    'SELECT id, name, customer_id, status, company_id FROM recurring_orders WHERE company_id = 15 ORDER BY id',
    []
  );
  
  console.log(`Se encontraron ${result.rows.length} pedidos recurrentes:`);
  result.rows.forEach(order => {
    console.log(`ID: ${order.id}, Nombre: ${order.name}, Cliente: ${order.customer_id}, Estado: ${order.status}`);
  });

  return result.rows;
}

// Verificar items de pedido recurrente
async function checkRecurringOrderItems(recurringOrderId) {
  console.log('==========================================');
  console.log(`VERIFICANDO ITEMS DEL PEDIDO RECURRENTE #${recurringOrderId}`);
  console.log('==========================================');

  const result = await query(
    'SELECT recurring_order_id, product_id, quantity, price FROM recurring_order_items WHERE recurring_order_id = $1',
    [recurringOrderId]
  );
  
  console.log(`Se encontraron ${result.rows.length} items para el pedido recurrente #${recurringOrderId}:`);
  result.rows.forEach(item => {
    console.log(`Producto: ${item.product_id}, Cantidad: ${item.quantity}, Precio: ${item.price}`);
  });

  return result.rows;
}

// Verificar la tabla orders para el campo recurringOrderId
async function checkOrdersTable() {
  console.log('==========================================');
  console.log('VERIFICANDO ESTRUCTURA DE LA TABLA ORDERS');
  console.log('==========================================');

  try {
    const result = await query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'orders' AND column_name = 'recurring_order_id'`,
      []
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Campo recurring_order_id encontrado en la tabla orders:');
      console.log(result.rows[0]);
    } else {
      console.log('❌ ERROR: Campo recurring_order_id NO encontrado en la tabla orders');
    }
  } catch (err) {
    console.error('Error al verificar estructura de la tabla:', err);
  }
}

// Probar generación de pedido vía API
async function testGenerateOrder(recurringOrderId) {
  console.log('==========================================');
  console.log(`PROBANDO GENERACIÓN DE PEDIDO DESDE API PARA RECURRENTE #${recurringOrderId}`);
  console.log('==========================================');

  try {
    const response = await fetch(`http://localhost:5000/api/recurring-orders/${recurringOrderId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ companyId: 15 })
    });
    
    if (response.ok) {
      console.log(`Respuesta HTTP: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Respuesta JSON:', data);
        return data;
      } else {
        const text = await response.text();
        console.log('Respuesta no es JSON. Primeros 100 caracteres:');
        console.log(text.substring(0, 100) + '...');
        console.log('Tipo de contenido:', contentType);
      }
    } else {
      console.error(`Error HTTP: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Mensaje de error:', text);
    }
  } catch (err) {
    console.error('Error al hacer la solicitud:', err);
  }
}

// Verificar pedidos generados
async function checkGeneratedOrders(recurringOrderId) {
  console.log('==========================================');
  console.log(`VERIFICANDO PEDIDOS GENERADOS DESDE RECURRENTE #${recurringOrderId}`);
  console.log('==========================================');

  const result = await query(
    'SELECT id, customer_id, total, status, recurring_order_id, date FROM orders WHERE recurring_order_id = $1 ORDER BY date DESC',
    [recurringOrderId]
  );
  
  console.log(`Se encontraron ${result.rows.length} pedidos generados desde el recurrente #${recurringOrderId}:`);
  result.rows.forEach(order => {
    console.log(`ID: ${order.id}, Total: ${order.total}, Estado: ${order.status}, Fecha: ${order.date}`);
  });

  return result.rows;
}

// Función principal
async function main() {
  try {
    // 1. Verificar pedidos recurrentes disponibles
    const recurringOrders = await checkRecurringOrders();
    
    if (recurringOrders.length === 0) {
      console.error('❌ No hay pedidos recurrentes para probar');
      return;
    }
    
    // Usamos el primer pedido recurrente para las pruebas
    const testOrderId = recurringOrders[0].id;
    console.log(`\nUsando pedido recurrente ID ${testOrderId} para pruebas\n`);
    
    // 2. Verificar items del pedido recurrente
    await checkRecurringOrderItems(testOrderId);
    
    // 3. Verificar la estructura de la tabla orders
    await checkOrdersTable();
    
    // 4. Verificar pedidos generados previamente
    await checkGeneratedOrders(testOrderId);
    
    // 5. Probar generar un nuevo pedido
    console.log('\n>> Intentando generar un nuevo pedido...');
    await testGenerateOrder(testOrderId);
    
    // 6. Verificar de nuevo los pedidos generados para ver si se creó uno nuevo
    console.log('\n>> Verificando si se creó un nuevo pedido:');
    await checkGeneratedOrders(testOrderId);
    
  } catch (err) {
    console.error('Error en la ejecución principal:', err);
  } finally {
    // Cerrar el pool de conexiones
    pool.end();
  }
}

// Ejecutar
main().catch(console.error);