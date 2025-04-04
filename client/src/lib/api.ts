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

/**
 * Función para procesar entrega, pago y generar factura en un solo paso
 * @param orderId ID de la orden a procesar
 * @param paymentMethod Método de pago ('cash', 'credit', 'transfer')
 * @param amountPaid Monto pagado
 * @param userId ID del usuario que procesa la operación (opcional)
 * @returns Objeto con resultado de la operación
 */
export async function processOrderDeliveryAndPayment(
  orderId: number,
  paymentMethod: string,
  amountPaid: number,
  userId?: number
) {
  try {
    const response = await apiRequest(
      `/api/mobile/orders/${orderId}/deliver-and-invoice`,
      {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod,
          amountPaid,
          userId
        }),
      }
    );
    
    return response;
  } catch (error) {
    console.error('Error al procesar entrega y pago:', error);
    throw error;
  }
}