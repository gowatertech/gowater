// Script de depuración para pedidos recurrentes
const { Pool } = require('pg');

async function testRecurringOrders() {
  console.log("=== PRUEBA DE PEDIDOS RECURRENTES ===");
  
  // Crear conexión a la base de datos
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log("Verificando pedidos recurrentes directamente desde la base de datos:");
    
    // Consulta SQL directa
    const dbResult = await pool.query(`
      SELECT ro.*, c.businessname as customer_name 
      FROM recurring_orders ro
      JOIN customers c ON ro.customer_id = c.id 
      WHERE ro.company_id = 15
    `);
    
    console.log(`Encontrados directamente en DB: ${dbResult.rows.length} pedidos`);
    
    dbResult.rows.forEach(order => {
      console.log(`- DB: Pedido #${order.id} '${order.name}' (${order.status}) - Cliente: ${order.customer_name}`);
    });
    
    // Simular la función del servidor
    const dbOrders = await pool.query(`SELECT * FROM recurring_orders WHERE company_id = 15`);
    console.log(`\nResultado inicial desde "storage": ${dbOrders.rows.length} pedidos`);
    
    // Esto es lo que haría el servidor - obtener datos del cliente
    const ordersWithCustomerInfo = await Promise.all(
      dbOrders.rows.map(async (order) => {
        // Buscar el cliente asociado
        const customerResults = await pool.query(
          `SELECT * FROM customers WHERE id = $1 AND company_id = 15`,
          [order.customer_id]
        );
        
        const customer = customerResults.rows.length > 0 ? customerResults.rows[0] : null;
        
        // Devolver con formato para el frontend
        return {
          ...order,
          customer: customer ? { 
            id: customer.id, 
            name: customer.businessname 
          } : undefined
        };
      })
    );
    
    console.log("\nPreparados para frontend:");
    ordersWithCustomerInfo.forEach(order => {
      console.log(`- Frontend: Pedido #${order.id} '${order.name}' (${order.status}) - Cliente: ${order.customer?.name || 'Sin cliente'}`);
    });
    
    // Verificar formato que espera el frontend
    console.log("\nVerificación de formato para interfaz:");
    ordersWithCustomerInfo.forEach(order => {
      // Checkear ids
      console.log(`ID: ${order.id} (${typeof order.id})`);
      console.log(`Cliente ID: ${order.customer_id} (${typeof order.customer_id})`);
      console.log(`Cliente: ${JSON.stringify(order.customer)}`);
      
      // Verificar campos esenciales
      const essentialFields = [
        'id', 'name', 'status', 'frequency', 'customer', 
        'next_generation_date', 'day_of_week', 'day_of_month'
      ];
      
      const missingFields = essentialFields.filter(field => 
        order[field] === undefined || order[field] === null
      );
      
      if (missingFields.length > 0) {
        console.log(`ALERTA: Faltan campos en pedido #${order.id}: ${missingFields.join(', ')}`);
      } else {
        console.log(`Pedido #${order.id} tiene todos los campos esenciales`);
      }
    });
    
  } catch (error) {
    console.error("Error en la prueba:", error);
  } finally {
    await pool.end();
  }
}

testRecurringOrders().catch(console.error);