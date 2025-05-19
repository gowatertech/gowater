/**
 * Componente auxiliar para obtener pedidos pendientes por zona
 * Este archivo ayuda a gestionar las consultas de pedidos pendientes por zona
 * en el contexto del sistema multitenant.
 */

/**
 * Obtiene los pedidos pendientes para una zona específica
 * @param {number} zoneId - ID de la zona
 * @param {number} companyId - ID de la compañía
 * @param {string} token - Token de autenticación opcional
 * @returns {Promise<Array>} Lista de pedidos pendientes
 */
export async function getPendingOrdersByZone(zoneId, companyId, token = null) {
  try {
    console.log(`🔍 Obteniendo pedidos pendientes para zona ${zoneId}, compañía ${companyId}`);
    
    if (!zoneId || isNaN(Number(zoneId))) {
      console.error("❌ ID de zona inválido:", zoneId);
      return [];
    }
    
    if (!companyId || isNaN(Number(companyId))) {
      console.error("❌ ID de compañía inválido:", companyId);
      return [];
    }
    
    // Construir la URL con el parámetro companyId explícito
    const url = `/api/zones/${zoneId}/pending-orders?companyId=${companyId}`;
    
    // Configurar cabeceras para la petición
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Agregar token de autenticación si se proporciona
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`🌐 Consultando URL: ${url}`);
    
    // Realizar la petición
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Detalle del error: ${errorText}`);
      return [];
    }
    
    const data = await response.json();
    
    // Verificar formato de respuesta
    if (!Array.isArray(data)) {
      console.warn("⚠️ La respuesta no es un array:", data);
      // Intentar extraer datos de la respuesta si tiene formato diferente
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        console.log("📋 Extrayendo datos del campo 'data' de la respuesta");
        return data.data;
      }
      
      // Si hay un error específico, mostrarlo
      if (data && typeof data === 'object' && 'error' in data) {
        console.error(`❌ Error en la respuesta: ${data.error}`);
        return [];
      }
      
      // Si todo falla, devolver array vacío
      return [];
    }
    
    console.log(`✅ Se encontraron ${data.length} pedidos pendientes para la zona ${zoneId}`);
    return data;
  } catch (error) {
    console.error("❌ Error al obtener pedidos pendientes por zona:", error);
    return [];
  }
}

/**
 * Obtiene todas las zonas disponibles para una compañía
 * @param {number} companyId - ID de la compañía
 * @returns {Promise<Array>} Lista de zonas
 */
export async function getZones(companyId) {
  try {
    console.log(`🔍 Obteniendo zonas para compañía ${companyId}`);
    
    if (!companyId || isNaN(Number(companyId))) {
      console.error("❌ ID de compañía inválido:", companyId);
      return [];
    }
    
    // Construir la URL con el parámetro companyId explícito
    const url = `/api/zones?companyId=${companyId}`;
    
    console.log(`🌐 Consultando URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} - ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn("⚠️ La respuesta no es un array:", data);
      return [];
    }
    
    console.log(`✅ Se encontraron ${data.length} zonas para la compañía ${companyId}`);
    return data;
  } catch (error) {
    console.error("❌ Error al obtener zonas:", error);
    return [];
  }
}