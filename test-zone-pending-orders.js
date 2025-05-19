// Script para verificar la obtención de pedidos pendientes por zona
import fetch from 'node-fetch';

async function testZonePendingOrders() {
  try {
    console.log('======== TEST DE OBTENCIÓN DE PEDIDOS PENDIENTES POR ZONA ========');
    
    // Primero, obtener todas las zonas disponibles para la compañía
    const companyId = 15; // ID de la compañía de prueba
    
    // Usar el endpoint de obtención de zonas para obtener las zonas disponibles
    const zonesResponse = await fetch(`http://localhost:3000/api/zones?companyId=${companyId}`, {
      headers: {
        'Content-Type': 'application/json',
        // Incluir la cookie de sesión si es necesario para autenticación
        'Cookie': 's%3AH-Fb6UERo076Hc_4vd8nmv7cIiQg8bdh.71bRY0%2F78HpKAe%2B9fPbUgSavbbOQPwS3ji2bCCPC51M'
      }
    });
    
    const zones = await zonesResponse.json();
    console.log(`📊 Encontradas ${zones.length} zonas para la compañía ${companyId}`);
    
    if (zones.length === 0) {
      console.log('⚠️ No se encontraron zonas para pruebas. Finalizando prueba.');
      return;
    }
    
    // Imprimir información de las zonas encontradas
    zones.forEach((zone, index) => {
      console.log(`Zona ${index + 1}: ID=${zone.id}, Nombre=${zone.name}`);
    });
    
    // Seleccionar la primera zona para probar
    const testZoneId = zones[0].id;
    console.log(`\n🔍 Probando obtención de pedidos pendientes para zona ID=${testZoneId}`);
    
    // Probar el endpoint de pedidos pendientes por zona
    const pendingOrdersResponse = await fetch(`http://localhost:3000/api/zones/${testZoneId}/pending-orders?companyId=${companyId}`, {
      headers: {
        'Content-Type': 'application/json',
        // Incluir la cookie de sesión si es necesario para autenticación
        'Cookie': 's%3AH-Fb6UERo076Hc_4vd8nmv7cIiQg8bdh.71bRY0%2F78HpKAe%2B9fPbUgSavbbOQPwS3ji2bCCPC51M'
      }
    });
    
    const pendingOrders = await pendingOrdersResponse.json();
    console.log(`📊 Encontrados ${pendingOrders.length} pedidos pendientes para la zona ${testZoneId}`);
    
    // Mostrar detalles de los pedidos encontrados
    if (pendingOrders.length > 0) {
      pendingOrders.forEach((order, index) => {
        console.log(`Pedido ${index + 1}: ID=${order.id}, Cliente=${order.customerName}, Total=${order.total}`);
      });
    } else {
      console.log('⚠️ No se encontraron pedidos pendientes para esta zona.');
      
      // Verificar si hay pedidos pendientes en general
      const allPendingOrdersResponse = await fetch(`http://localhost:3000/api/orders?status=pending&companyId=${companyId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 's%3AH-Fb6UERo076Hc_4vd8nmv7cIiQg8bdh.71bRY0%2F78HpKAe%2B9fPbUgSavbbOQPwS3ji2bCCPC51M'
        }
      });
      
      const allPendingOrders = await allPendingOrdersResponse.json();
      console.log(`⚠️ Hay ${allPendingOrders.length} pedidos pendientes en total para la compañía ${companyId}`);
    }
    
    console.log('\n======== TEST FINALIZADO ========');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Ejecutar el test
testZonePendingOrders()
  .catch(error => console.error('Error no capturado:', error))
  .finally(() => console.log('Test finalizado'));