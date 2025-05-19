// Script para depurar y probar la generación de pedidos desde pedidos recurrentes
import fetch from 'node-fetch';

const companyId = 15; // Empresa de prueba
const sessionCookie = 's%3AH-Fb6UERo076Hc_4vd8nmv7cIiQg8bdh.71bRY0%2F78HpKAe%2B9fPbUgSavbbOQPwS3ji2bCCPC51M'; // Cookie de sesión para autenticación

async function createRecurringOrder() {
  console.log('======= CREAR PEDIDO RECURRENTE DE PRUEBA =======');
  try {
    // 1. Obtener el primer cliente disponible
    const customersResponse = await fetch('http://localhost:3000/api/customers', {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    const customers = await customersResponse.json();
    if (!customers || customers.length === 0) {
      console.log('No hay clientes disponibles para la prueba. Creando uno...');
      // Aquí podríamos crear un cliente, pero eso está fuera del alcance de esta prueba
      return null;
    }
    
    const testCustomer = customers[0];
    console.log(`Cliente seleccionado: ${testCustomer.businessname} (ID: ${testCustomer.id})`);
    
    // 2. Crear un pedido recurrente
    const recurringOrderData = {
      customerId: testCustomer.id,
      name: `Pedido de prueba - ${new Date().toLocaleString()}`,
      frequency: "weekly",
      dayOfWeek: 1, // Lunes
      startDate: new Date().toISOString(),
      status: "active",
      totalAmount: "100.00",
      paymentMethod: "cash",
      notes: "Creado para pruebas de depuración",
      companyId: companyId
    };
    
    const createResponse = await fetch('http://localhost:3000/api/recurring-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(recurringOrderData)
    });
    
    const newRecurringOrder = await createResponse.json();
    console.log('Pedido recurrente creado:', newRecurringOrder);
    
    // Verificar si se creó con éxito
    if (!newRecurringOrder || !newRecurringOrder.id) {
      console.error('Error al crear el pedido recurrente:', newRecurringOrder);
      return null;
    }
    
    // 3. Agregar productos al pedido recurrente
    const orderItemData = {
      recurringOrderId: newRecurringOrder.id,
      productId: 1, // Usar un producto existente o crear uno si es necesario
      quantity: 2,
      price: "50.00",
      companyId: companyId
    };
    
    const itemResponse = await fetch(`http://localhost:3000/api/recurring-orders/${newRecurringOrder.id}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(orderItemData)
    });
    
    const newOrderItem = await itemResponse.json();
    console.log('Item agregado al pedido recurrente:', newOrderItem);
    
    return newRecurringOrder;
  } catch (error) {
    console.error('Error en la creación del pedido recurrente:', error);
    return null;
  }
}

async function generateOrderFromRecurring(recurringOrderId) {
  console.log(`======= GENERAR PEDIDO A PARTIR DE RECURRENTE ID ${recurringOrderId} =======`);
  try {
    // Intentar diferentes formatos del ID para probar nuestra validación mejorada
    const testFormats = [
      { desc: "ID como número", value: recurringOrderId },
      { desc: "ID como string", value: recurringOrderId.toString() },
      { desc: "ID como objeto", value: { id: recurringOrderId } },
      { desc: "ID como string con formato", value: `order-${recurringOrderId}` }
    ];
    
    for (const format of testFormats) {
      console.log(`\nProbando formato: ${format.desc}`);
      
      try {
        const generateResponse = await fetch(`http://localhost:3000/api/recurring-orders/${format.value}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
          }
        });
        
        const generatedOrder = await generateResponse.json();
        
        if (generateResponse.ok) {
          console.log(`✅ ÉXITO con formato "${format.desc}":`, generatedOrder);
        } else {
          console.log(`❌ ERROR con formato "${format.desc}":`, generatedOrder);
        }
      } catch (error) {
        console.error(`Error al generar pedido con formato "${format.desc}":`, error);
      }
    }
  } catch (error) {
    console.error('Error general en la generación de pedidos:', error);
  }
}

async function main() {
  // Primero crear un pedido recurrente
  const recurringOrder = await createRecurringOrder();
  
  if (recurringOrder) {
    console.log('\nPedido recurrente creado exitosamente, ahora generando pedido...');
    // Luego generar un pedido a partir del pedido recurrente
    await generateOrderFromRecurring(recurringOrder.id);
  } else {
    console.log('\nProbando con un ID existente...');
    // Si no se pudo crear, intentar con un ID de ejemplo
    await generateOrderFromRecurring(1);
  }
}

main().catch(console.error);