// Script para probar la generación de órdenes desde pedidos recurrentes
import fetch from 'node-fetch';

async function testGenerateFromRecurring() {
  try {
    // Petición para generar una orden desde el pedido recurrente con ID 1
    // usando la nueva implementación mejorada
    console.log('======= TEST DE GENERACIÓN DE PEDIDOS DESDE RECURRENTES =======');
    console.log('Intentando generar una orden desde el pedido recurrente ID 1...');
    
    const testFormats = [
      { desc: "ID como número", value: 1 },
      { desc: "ID como string", value: "1" },
      { desc: "ID como objeto", value: { id: 1 } },
      { desc: "ID con formato especial", value: "order-1" },
      { desc: "ID inválido (debe recuperarse)", value: "invalid" }
    ];
    
    for (const format of testFormats) {
      try {
        console.log(`\nProbando con ${format.desc}: ${JSON.stringify(format.value)}`);
        
        const response = await fetch(`http://localhost:5000/api/recurring-orders/${format.value}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 's%3AH-Fb6UERo076Hc_4vd8nmv7cIiQg8bdh.71bRY0%2F78HpKAe%2B9fPbUgSavbbOQPwS3ji2bCCPC51M'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Error (${response.status}): ${errorText}`);
          continue;
        }

        const result = await response.json();
        console.log('✅ Orden generada exitosamente:', result);
      } catch (error) {
        console.error(`❌ Error al realizar la petición con ${format.desc}:`, error.message);
      }
    }
    
    console.log('\n======= TEST FINALIZADO =======');
  } catch (error) {
    console.error('Error en la prueba general:', error.message);
  }
}

// Ejecutar la función
testGenerateFromRecurring();