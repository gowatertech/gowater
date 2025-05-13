// Script para probar la generación de órdenes desde pedidos recurrentes
import fetch from 'node-fetch';

async function testGenerateFromRecurring() {
  try {
    // Petición para generar una orden desde el pedido recurrente con ID 6
    console.log('Intentando generar una orden desde el pedido recurrente ID 6...');
    const response = await fetch('http://localhost:4500/api/recurring-orders/6/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error (${response.status}): ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('Orden generada exitosamente:', result);
  } catch (error) {
    console.error('Error al realizar la petición:', error.message);
  }
}

// Ejecutar la función
testGenerateFromRecurring();