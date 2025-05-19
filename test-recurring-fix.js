// Script para verificar la corrección de la generación de pedidos recurrentes
import { recurringOrdersService } from './server/recurring-orders.js';

async function testRecurringOrderFix() {
  try {
    console.log('======== TEST DE CORRECCIÓN DE PEDIDOS RECURRENTES ========');
    
    // Importar y configurar dependencias necesarias
    const { setCurrentCompanyId } = await import('./server/company-db.js');
    setCurrentCompanyId(15); // Establecer el companyId para este test
    
    // Obtener el pedido recurrente más reciente para pruebas
    const newestOrder = await recurringOrdersService.getNewestRecurringOrder();
    
    if (!newestOrder) {
      console.log('No se encontraron pedidos recurrentes para pruebas');
      return;
    }
    
    console.log(`Pedido recurrente más reciente encontrado: ID=${newestOrder.id}`);
    
    // Probar la generación con el ID en diferentes formatos
    const testCases = [
      { desc: 'ID como número', id: newestOrder.id },
      { desc: 'ID como string', id: String(newestOrder.id) },
      { desc: 'ID como objeto', id: { id: newestOrder.id } },
      { desc: 'ID con formato incorrecto', id: `orden-${newestOrder.id}` },
    ];
    
    let passCount = 0;
    let failCount = 0;
    
    for (const test of testCases) {
      try {
        console.log(`\n🔍 Probando ${test.desc} (${JSON.stringify(test.id)})`);
        const result = await recurringOrdersService.generateOrderFromRecurring(test.id);
        console.log(`✅ ÉXITO: Se generó el pedido #${result.id} a partir del pedido recurrente`);
        passCount++;
      } catch (error) {
        console.error(`❌ ERROR: ${error.message}`);
        failCount++;
      }
    }
    
    console.log(`\n======== RESULTADOS ========`);
    console.log(`Pruebas exitosas: ${passCount}/${testCases.length}`);
    console.log(`Pruebas fallidas: ${failCount}/${testCases.length}`);
    
  } catch (error) {
    console.error('Error en la prueba principal:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Ejecutar el test
testRecurringOrderFix()
  .catch(error => console.error('Error no capturado:', error))
  .finally(() => console.log('Test finalizado'));