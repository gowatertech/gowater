const { Pool } = require('pg');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Información de conexión
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gowater';
const API_URL = 'http://0.0.0.0:5000';
const pool = new Pool({ connectionString });

// Función para realizar peticiones HTTP
async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    
    const req = lib.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        let parsedBody;
        
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = body;
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsedBody
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Simular el flujo completo de la interfaz de usuario
async function simulateUIFlow() {
  console.log("======================================================");
  console.log("SIMULACIÓN DEL FLUJO DE CREACIÓN DE PEDIDO RECURRENTE");
  console.log("======================================================");
  
  try {
    // 1. Iniciar sesión para obtener cookies
    console.log("\n1. Iniciando sesión como administrador...");
    const loginResult = await makeRequest({
      hostname: '0.0.0.0',
      port: 5000,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResult.statusCode !== 200) {
      throw new Error(`Error al iniciar sesión: ${JSON.stringify(loginResult.body)}`);
    }
    
    const cookies = loginResult.headers['set-cookie'];
    console.log(`Sesión iniciada correctamente. Cookies obtenidas: ${cookies ? 'Sí' : 'No'}`);
    
    // 2. Acceder a /api/recurring-orders/new para verificar que se maneja correctamente
    console.log("\n2. Accediendo a /api/recurring-orders/new...");
    const newFormResult = await makeRequest({
      hostname: '0.0.0.0',
      port: 5000,
      path: '/api/recurring-orders/new',
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log(`Respuesta del servidor: ${newFormResult.statusCode}`);
    console.log(`Cuerpo de la respuesta:`, newFormResult.body);
    
    // Verificar que la respuesta sea la esperada (un objeto vacío para inicializar el formulario)
    const responseLooksValid = 
      newFormResult.statusCode === 200 && 
      typeof newFormResult.body === 'object' &&
      newFormResult.body.id === null;
    
    if (!responseLooksValid) {
      console.log("⚠️ Advertencia: La respuesta para /new no es la esperada.");
    } else {
      console.log("✅ La respuesta para /new es correcta y contiene los datos de inicialización del formulario.");
    }
    
    // 3. Acceder a /api/recurring-orders/new/items debe devolver un array vacío
    console.log("\n3. Accediendo a /api/recurring-orders/new/items...");
    const newItemsResult = await makeRequest({
      hostname: '0.0.0.0',
      port: 5000,
      path: '/api/recurring-orders/new/items',
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log(`Respuesta del servidor: ${newItemsResult.statusCode}`);
    console.log(`Cuerpo de la respuesta:`, newItemsResult.body);
    
    // Verificar que devuelva un array vacío
    const itemsResponseValid = 
      newItemsResult.statusCode === 200 && 
      Array.isArray(newItemsResult.body) &&
      newItemsResult.body.length === 0;
    
    if (!itemsResponseValid) {
      console.log("⚠️ Advertencia: La respuesta para /new/items no es un array vacío.");
    } else {
      console.log("✅ La respuesta para /new/items es correcta (array vacío).");
    }
    
    // 4. Crear un nuevo pedido recurrente
    console.log("\n4. Creando nuevo pedido recurrente...");
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const createOrderResult = await makeRequest({
      hostname: '0.0.0.0',
      port: 5000,
      path: '/api/recurring-orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    }, {
      customerId: 9,
      name: 'Pedido recurrente de prueba UI',
      frequency: 'weekly',
      startDate: today.toISOString(),
      endDate: null,
      paymentMethod: 'cash',
      status: 'active',
      totalAmount: '150.00'
    });
    
    console.log(`Respuesta del servidor: ${createOrderResult.statusCode}`);
    console.log(`Cuerpo de la respuesta:`, createOrderResult.body);
    
    if (createOrderResult.statusCode !== 201) {
      throw new Error(`Error al crear pedido recurrente: ${JSON.stringify(createOrderResult.body)}`);
    }
    
    const newOrderId = createOrderResult.body.id;
    console.log(`✅ Pedido recurrente creado con ID: ${newOrderId}`);
    
    // 5. Añadir items al pedido recurrente
    console.log("\n5. Añadiendo item al pedido recurrente...");
    const addItemResult = await makeRequest({
      hostname: '0.0.0.0',
      port: 5000,
      path: `/api/recurring-orders/${newOrderId}/items`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    }, {
      recurringOrderId: newOrderId,
      productId: 1,
      quantity: 3,
      price: '50.00'
    });
    
    console.log(`Respuesta del servidor: ${addItemResult.statusCode}`);
    console.log(`Cuerpo de la respuesta:`, addItemResult.body);
    
    if (addItemResult.statusCode !== 201 && addItemResult.statusCode !== 200) {
      console.log(`⚠️ Advertencia: Error al añadir item al pedido recurrente: ${JSON.stringify(addItemResult.body)}`);
    } else {
      console.log("✅ Item añadido correctamente al pedido recurrente.");
    }
    
    // 6. Generar un pedido a partir del pedido recurrente
    console.log("\n6. Generando un pedido a partir del pedido recurrente...");
    const generateOrderResult = await makeRequest({
      hostname: '0.0.0.0',
      port: 5000,
      path: `/api/recurring-orders/${newOrderId}/generate`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });
    
    console.log(`Respuesta del servidor: ${generateOrderResult.statusCode}`);
    console.log(`Cuerpo de la respuesta:`, generateOrderResult.body);
    
    if (generateOrderResult.statusCode !== 201) {
      console.log(`⚠️ Advertencia: Error al generar pedido: ${JSON.stringify(generateOrderResult.body)}`);
    } else {
      console.log(`✅ Pedido generado correctamente con ID: ${generateOrderResult.body.id}`);
    }
    
    console.log("\n======================================================");
    console.log("SIMULACIÓN COMPLETADA");
    console.log("======================================================");
    
    return {
      success: true,
      message: "Simulación de creación de pedido recurrente completada",
      details: {
        loginSuccessful: loginResult.statusCode === 200,
        newFormValid: responseLooksValid,
        newItemsValid: itemsResponseValid,
        createOrderSuccessful: createOrderResult.statusCode === 201,
        newOrderId: newOrderId,
        addItemSuccessful: addItemResult.statusCode === 201 || addItemResult.statusCode === 200,
        generateOrderSuccessful: generateOrderResult.statusCode === 201
      }
    };
  } catch (error) {
    console.error("❌ Error en la simulación:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar la simulación
simulateUIFlow()
  .then(result => {
    console.log("\nResultado final:", result);
    
    // Cerrar la conexión del pool
    pool.end();
  })
  .catch(error => {
    console.error("Error general:", error);
    pool.end();
  });