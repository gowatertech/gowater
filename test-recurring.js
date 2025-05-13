// Script para probar la creación y edición de pedidos recurrentes
import fetch from 'node-fetch';

async function testRecurringOrders() {
  try {
    console.log("Iniciando prueba de pedidos recurrentes...");

    // 1. Obtener todos los pedidos recurrentes para verificar el sistema
    console.log("\n1. Consultando pedidos recurrentes existentes:");
    const ordersResponse = await fetch('http://localhost:5000/api/recurring-orders', {
      credentials: 'include'
    });
    
    if (!ordersResponse.ok) {
      console.error(`Error al obtener pedidos recurrentes: ${ordersResponse.status} ${ordersResponse.statusText}`);
      const errorText = await ordersResponse.text();
      console.error(errorText);
      return;
    }
    
    const orders = await ordersResponse.json();
    console.log(`Se encontraron ${orders.length} pedidos recurrentes`);
    
    // 2. Obtener clientes y productos para crear un nuevo pedido
    console.log("\n2. Obteniendo clientes y productos:");
    const customersResponse = await fetch('http://localhost:5000/api/customers', {
      credentials: 'include'
    });
    
    if (!customersResponse.ok) {
      console.error(`Error al obtener clientes: ${customersResponse.status}`);
      return;
    }
    
    const customers = await customersResponse.json();
    console.log(`Se encontraron ${customers.length} clientes`);
    
    const productsResponse = await fetch('http://localhost:5000/api/products', {
      credentials: 'include'
    });
    
    if (!productsResponse.ok) {
      console.error(`Error al obtener productos: ${productsResponse.status}`);
      return;
    }
    
    const products = await productsResponse.json();
    console.log(`Se encontraron ${products.length} productos`);
    
    // 3. Crear un nuevo pedido recurrente
    console.log("\n3. Creando nuevo pedido recurrente:");
    
    if (customers.length === 0 || products.length === 0) {
      console.error("No hay clientes o productos para crear un pedido recurrente");
      return;
    }
    
    const customer = customers[0];
    const product = products[0];
    
    const newOrderData = {
      customerId: customer.id,
      name: `Pedido recurrente de prueba ${Date.now()}`,
      frequency: "weekly",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: "cash",
      status: "active",
      totalAmount: "100.00",
      items: [
        {
          productId: product.id,
          quantity: 2,
          price: product.price
        }
      ]
    };
    
    console.log("Datos del nuevo pedido:", JSON.stringify(newOrderData, null, 2));
    
    const createResponse = await fetch('http://localhost:5000/api/recurring-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(newOrderData)
    });
    
    if (!createResponse.ok) {
      console.error(`Error al crear pedido: ${createResponse.status}`);
      const errorText = await createResponse.text();
      console.error("Detalle del error:", errorText);
      return;
    }
    
    const createdOrder = await createResponse.json();
    console.log("Pedido creado exitosamente:", createdOrder);
    console.log("ID del pedido creado:", createdOrder.id);
    
    // 4. Obtener el pedido recién creado
    console.log(`\n4. Obteniendo el pedido recién creado (ID: ${createdOrder.id}):`);
    const getOrderResponse = await fetch(`http://localhost:5000/api/recurring-orders/${createdOrder.id}`, {
      credentials: 'include'
    });
    
    if (!getOrderResponse.ok) {
      console.error(`Error al obtener el pedido: ${getOrderResponse.status}`);
      return;
    }
    
    const fetchedOrder = await getOrderResponse.json();
    console.log("Pedido obtenido:", fetchedOrder);
    
    // 5. Obtener los items del pedido
    console.log(`\n5. Obteniendo items del pedido (ID: ${createdOrder.id}):`);
    const itemsResponse = await fetch(`http://localhost:5000/api/recurring-orders/${createdOrder.id}/items`, {
      credentials: 'include'
    });
    
    if (!itemsResponse.ok) {
      console.error(`Error al obtener items: ${itemsResponse.status}`);
      return;
    }
    
    const items = await itemsResponse.json();
    console.log(`Se encontraron ${items.length} items:`, items);
    
    // 6. Actualizar el pedido
    console.log(`\n6. Actualizando el pedido (ID: ${createdOrder.id}):`);
    
    const updateData = {
      name: `Pedido recurrente actualizado ${Date.now()}`,
      status: "paused"
    };
    
    const updateResponse = await fetch(`http://localhost:5000/api/recurring-orders/${createdOrder.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      console.error(`Error al actualizar pedido: ${updateResponse.status}`);
      const errorText = await updateResponse.text();
      console.error("Detalle del error:", errorText);
      return;
    }
    
    const updatedOrder = await updateResponse.json();
    console.log("Pedido actualizado exitosamente:", updatedOrder);
    
    console.log("\nPrueba de pedidos recurrentes completada exitosamente");

  } catch (error) {
    console.error("Error en la prueba de pedidos recurrentes:", error);
  }
}

// Ejecutar la prueba
testRecurringOrders()
  .catch(error => console.error("Error en la ejecución principal:", error));