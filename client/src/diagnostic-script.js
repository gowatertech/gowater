/**
 * Script de diagnóstico para verificar el contexto multi-tenant
 * Copia y pega este script en la consola del navegador para ejecutarlo
 */

// Función para hacer una solicitud
async function testEndpoint(url) {
  try {
    console.log(`Probando endpoint: ${url}`);
    const response = await fetch(url);
    
    console.log(`Estado: ${response.status}`);
    
    try {
      const data = await response.json();
      console.log('Datos:', data);
      return data;
    } catch (e) {
      const text = await response.text();
      console.log('Respuesta (texto):', text);
      return text;
    }
  } catch (error) {
    console.error(`Error accediendo a ${url}:`, error);
    return null;
  }
}

// Función para mostrar los resultados con estilo
function logWithStyle(title, data) {
  console.group(`%c ${title}`, 'color: white; background-color: #4CAF50; padding: 3px 6px; border-radius: 3px;');
  console.log(data);
  console.groupEnd();
}

// Ejecutar diagnóstico completo
async function runDiagnostic() {
  console.clear();
  console.log('%c 🔍 INICIANDO DIAGNÓSTICO DE CONTEXTO MULTI-TENANT 🔍', 'color: white; background-color: #2196F3; padding: 5px; border-radius: 3px; font-weight: bold;');
  
  // 1. Verificar sesión de usuario
  const userContext = await testEndpoint('/api/user');
  logWithStyle('1. Contexto de Usuario', userContext);
  
  // 2. Verificar contexto general
  const tenantContext = await testEndpoint('/api/diagnostic/context');
  logWithStyle('2. Contexto Multi-tenant', tenantContext);
  
  // 3. Probar endpoint de zonas normalmente
  if (userContext) {
    const zoneId = 1; // Usar un ID de zona válido
    const zonesNormal = await testEndpoint(`/api/zones/${zoneId}/pending-orders`);
    logWithStyle(`3. Pedidos pendientes Zona ${zoneId} (Normal)`, zonesNormal);
    
    // 4. Probar endpoint de zonas con modo debug
    const zonesDebug = await testEndpoint(`/api/zones/${zoneId}/pending-orders?debug=true`);
    logWithStyle(`4. Pedidos pendientes Zona ${zoneId} (Debug)`, zonesDebug);
  } else {
    console.warn('⚠️ No se detectó sesión de usuario, saltando pruebas de zona');
  }
  
  console.log('%c ✅ DIAGNÓSTICO COMPLETADO ✅', 'color: white; background-color: #4CAF50; padding: 5px; border-radius: 3px; font-weight: bold;');
}

// Ejecutar diagnóstico
runDiagnostic();