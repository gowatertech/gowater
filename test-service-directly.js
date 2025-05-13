// Script para probar directamente el servicio de pedidos recurrentes
import { recurringOrdersService } from './server/recurring-orders.js';

async function testRecurringOrderService() {
  try {
    console.log('Intentando generar una orden desde pedido recurrente ID 6...');
    
    // Importar y configurar dependencias necesarias
    const { setCurrentCompanyId } = await import('./server/company-db.js');
    setCurrentCompanyId(15); // Establecer el companyId en 15 para este test
    
    // Generar orden desde pedido recurrente
    const result = await recurringOrdersService.generateOrderFromRecurring(6);
    
    console.log('✅ Orden generada exitosamente:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error al generar la orden:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Ejecutar el test
testRecurringOrderService();