import fetch from 'node-fetch';
const cookieJar = {};

// URL base
const BASE_URL = 'http://0.0.0.0:5000';

// Función para parsear las cookies de la respuesta
function parseCookies(response) {
  const cookies = response.headers.raw()['set-cookie'];
  if (!cookies) return;
  
  cookies.forEach(cookie => {
    const parts = cookie.split(';')[0].split('=');
    const name = parts[0];
    const value = parts[1] || '';
    cookieJar[name] = value;
  });
}

// Función para formatear las cookies para la solicitud
function getCookieHeader() {
  return Object.entries(cookieJar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

// Función para iniciar sesión
async function login() {
  try {
    console.log('Iniciando sesión...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });
    
    parseCookies(loginResponse);
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Error en login: ${JSON.stringify(errorData)}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('Login exitoso:', loginData);
    return true;
  } catch (error) {
    console.error('Error en login:', error.message);
    return false;
  }
}

// Función para obtener pedidos pendientes
async function getPendingOrders() {
  try {
    console.log('Obteniendo pedidos pendientes...');
    
    const ordersResponse = await fetch(`${BASE_URL}/api/route-generator/orders/pending`, {
      headers: {
        'Cookie': getCookieHeader(),
      },
    });
    
    if (!ordersResponse.ok) {
      const errorData = await ordersResponse.json();
      throw new Error(`Error al obtener pedidos: ${JSON.stringify(errorData)}`);
    }
    
    const orders = await ordersResponse.json();
    console.log(`Se encontraron ${orders.length} pedidos pendientes`);
    console.log('Primeros 2 pedidos:', JSON.stringify(orders.slice(0, 2), null, 2));
    return orders;
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error.message);
    return null;
  }
}

// Probar si se puede acceder a la página del generador de rutas
async function testRouteGeneratorPage() {
  try {
    console.log('Probando acceso a la página del generador de rutas...');
    
    const pageResponse = await fetch(`${BASE_URL}/route-generator`, {
      headers: {
        'Cookie': getCookieHeader(),
      },
    });
    
    if (!pageResponse.ok) {
      throw new Error(`Error al acceder a la página: ${pageResponse.status} ${pageResponse.statusText}`);
    }
    
    const html = await pageResponse.text();
    const isHtmlPage = html.includes('<!DOCTYPE html>');
    console.log(`Acceso a la página exitoso, recibido HTML: ${isHtmlPage ? 'Sí' : 'No'}`);
    return true;
  } catch (error) {
    console.error('Error al acceder a la página del generador de rutas:', error.message);
    return false;
  }
}

async function testRouteGeneratorEndpoint() {
  try {
    const credentials = { username: 'aguamoya@gmail.com', password: 'admin123' };
    console.log(`Intentando iniciar sesión con ${credentials.username}...`);
    
    // Login
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    parseCookies(loginResponse);
    
    if (!loginResponse.ok) {
      throw new Error(`Error en login: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const userData = await loginResponse.json();
    console.log('Login exitoso:', userData);
    
    // Probar endpoint de pedidos pendientes
    console.log('Probando endpoint de pedidos pendientes...');
    const ordersResponse = await fetch(`${BASE_URL}/api/route-generator/orders/pending`, {
      headers: { 'Cookie': getCookieHeader() },
    });
    
    console.log('Estado de respuesta:', ordersResponse.status);
    
    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      throw new Error(`Error al obtener pedidos pendientes: ${ordersResponse.status} - ${errorText}`);
    }
    
    const orders = await ordersResponse.json();
    console.log(`Éxito! Se encontraron ${orders.length} pedidos pendientes`);
    if (orders.length > 0) {
      console.log('Primer pedido:', JSON.stringify(orders[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('Error en la prueba:', error.message);
    return false;
  }
}

// Ejecutar todo el proceso
async function main() {
  console.log('=== INICIANDO PRUEBA DE GENERADOR DE RUTAS ===');
  
  const result = await testRouteGeneratorEndpoint();
  
  console.log('=== RESULTADO FINAL ===');
  console.log(`Prueba ${result ? 'EXITOSA' : 'FALLIDA'}`);
}

main();