// Script para probar la generación de pedidos recurrentes con diferentes tipos de IDs
import fetch from 'node-fetch';
import fs from 'fs';

// Cookie de autenticación manual para pruebas
// Normalmente esta cookie debería obtenerse del navegador al iniciar sesión
const sessionCookie = 's%3AH-Fb6UERo076Hc_4vd8nmv7cIiQg8bdh.71bRY0%2F78HpKAe%2B9fPbUgSavbbOQPwS3ji2bCCPC51M';
console.log('Usando cookie de sesión:', sessionCookie);

async function testRecurringOrderIdHandling() {
  try {
    console.log("=== PRUEBA DE MANEJO DE IDS DE PEDIDOS RECURRENTES ===");

    // Caso 1: ID numérico normal
    await testGenerateWithId(1);

    // Caso 2: ID como string
    await testGenerateWithId("2");

    // Caso 3: ID con formato incorrecto
    await testGenerateWithId("id-3");

    // Caso 4: ID como objeto
    await testGenerateWithId({ id: 4 });

    // Caso 5: Objeto con formato incorrecto
    await testGenerateWithId({ recurringOrderId: 5 });

    // Caso 6: ID inválido pero recuperable
    await testGenerateWithId(NaN);

    console.log("=== PRUEBA COMPLETADA ===");
  } catch (error) {
    console.error("Error en prueba principal:", error);
  }
}

async function testGenerateWithId(id) {
  console.log(`\n>> PROBANDO CON ID: ${JSON.stringify(id)} (tipo: ${typeof id})`);
  
  try {
    const url = `http://localhost:5000/api/recurring-orders/${id}/generate`;
    console.log(`Llamando a endpoint: ${url}`);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Agregar cookie de sesión si está disponible
    if (sessionCookie) {
      headers['Cookie'] = `connect.sid=${sessionCookie}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
    });
    
    console.log(`Código de respuesta: ${response.status}`);
    
    const responseData = await response.text();
    try {
      const jsonData = JSON.parse(responseData);
      console.log("Respuesta:", JSON.stringify(jsonData, null, 2));
    } catch {
      console.log("Respuesta (texto):", responseData);
    }
  } catch (error) {
    console.error(`Error al probar ID ${id}:`, error.message);
  }
}

// Ejecutar las pruebas
testRecurringOrderIdHandling();