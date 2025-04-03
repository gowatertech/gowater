/**
 * Función para realizar solicitudes a la API
 * @param url URL de la API
 * @param options Opciones de la solicitud
 * @returns Respuesta JSON de la API
 */
export async function apiRequest(url: string, options: RequestInit = {}) {
  // Configurar opciones por defecto
  const defaultOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };

  // Combinar opciones
  const requestOptions = { ...defaultOptions, ...options };

  try {
    // Realizar solicitud
    const response = await fetch(url, requestOptions);

    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Error en la solicitud: ${response.status}`
      );
    }

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // Si no es JSON, devolver la respuesta como texto
    return await response.text();
  } catch (error) {
    console.error('Error en la solicitud API:', error);
    throw error;
  }
}