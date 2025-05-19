// Script para probar ambas soluciones implementadas
import fetch from 'node-fetch';

// 1. Prueba del manejo de IDs en pedidos recurrentes
async function testRecurringOrderIdHandling() {
  console.log('\n======= TEST DE MANEJO DE ID EN PEDIDOS RECURRENTES =======');
  
  try {
    // Obtener una sesión activa (puede requerir ajustes según su implementación de autenticación)
    const cookies = await getSessionCookies();
    
    if (!cookies) {
      console.error('No se pudo obtener cookies de sesión. El test requiere una sesión activa.');
      return;
    }
    
    // Formatos de ID para probar
    const testIdFormats = [
      { desc: "ID numérico", value: 1 },
      { desc: "ID como string", value: "1" },
      { desc: "ID con prefijo", value: "orden-1" },
      { desc: "ID como objeto", value: { id: 1 } },
      { desc: "ID inválido (recuperación automática)", value: "invalid" }
    ];
    
    for (const format of testIdFormats) {
      try {
        console.log(`\nProbando con ${format.desc}: ${JSON.stringify(format.value)}`);
        
        // Construir URL según el formato
        let url;
        if (typeof format.value === 'object') {
          url = `http://localhost:5000/api/recurring-orders/${JSON.stringify(format.value)}/generate`;
        } else {
          url = `http://localhost:5000/api/recurring-orders/${format.value}/generate`;
        }
        
        // Realizar petición
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies
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
        console.error(`❌ Error procesando ${format.desc}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error general en prueba de pedidos recurrentes:', error);
  }
}

// Función auxiliar para extraer cookies de la sesión actual
async function getSessionCookies() {
  try {
    // Obtener la cookie de sesión de un archivo o API según su implementación
    // Este es solo un ejemplo, ajustar según su aplicación
    return 'connect.sid=s%3ARmvlZYjRMVVlzQW3QJa7Jd-HYdK7Jnd3.tmCdrTCjsG%2FXXh6aJI0JGcKYfm4EMrk9H%2BBgS%2FBa8EY';
  } catch (error) {
    console.error('Error obteniendo cookies:', error);
    return null;
  }
}

// Ejecutar las pruebas
async function runTests() {
  console.log('Iniciando pruebas de las soluciones implementadas...');
  await testRecurringOrderIdHandling();
  console.log('\nPruebas finalizadas.');
}

runTests().catch(console.error);