import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
}

function getBaseUrl() {
  // Always use relative URLs for API requests
  return '';
}

interface ApiRequestOptions {
  url: string;
  method: string;
  data?: unknown;
  params?: Record<string, string>;
}

export async function apiRequest(
  options: ApiRequestOptions | string,
  requestOptions?: Record<string, any>
): Promise<any> {
  let url: string;
  let method: string = 'GET';
  let data: unknown | undefined;
  let params: Record<string, string> | undefined;

  // Manejar tanto el formato de objeto como el formato de cadena + opciones
  if (typeof options === 'string') {
    url = options;
    method = requestOptions?.method || 'GET';
    data = requestOptions?.data;
    params = requestOptions?.params;
  } else {
    url = options.url;
    method = options.method;
    data = options.data;
    params = options.params;
  }

  // Agregar parámetros de consulta a la URL si existen
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    url = `${url}${url.includes('?') ? '&' : '?'}${queryParams.toString()}`;
  }

  const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
  const fullUrl = `${getBaseUrl()}${apiUrl}`;
  
  console.log(`[apiRequest] Iniciando ${method} a ${fullUrl}`, 
    data ? JSON.stringify(data, null, 2) : 'Sin datos');

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`[apiRequest] Respuesta recibida de ${fullUrl}:`, {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get('content-type'),
    });

    if (!res.ok) {
      let errorText = await res.text();
      try {
        // Intentar parsearlo como JSON para mostrar un error más descriptivo
        const errorJson = JSON.parse(errorText);
        console.error(`[apiRequest] Error respuesta JSON:`, errorJson);
        throw new Error(`Error ${res.status}: ${errorJson.error || errorJson.message || res.statusText}`);
      } catch (parseError) {
        // Si no es JSON, mostrar el texto tal cual
        console.error(`[apiRequest] Error respuesta texto:`, errorText);
        throw new Error(`Error ${res.status}: ${errorText || res.statusText}`);
      }
    }
    
    // Leer la respuesta como texto primero para evitar el error "body stream already read"
    const textResponse = await res.text();
    
    // Intentar analizar la respuesta como JSON
    try {
      const jsonResponse = JSON.parse(textResponse);
      console.log(`[apiRequest] Respuesta JSON de ${fullUrl}:`, jsonResponse);
      return jsonResponse;
    } catch (e) {
      // Si no es JSON válido, devolver el texto tal cual
      console.log(`[apiRequest] Respuesta texto de ${fullUrl}:`, 
        textResponse.length > 100 ? `${textResponse.substring(0, 100)}...` : textResponse);
      return textResponse;
    }
  } catch (error) {
    console.error(`[apiRequest] Error en ${method} ${fullUrl}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
    const fullUrl = `${getBaseUrl()}${apiUrl}`;

    try {
      console.log(`Fetching data from ${fullUrl}`);
      const res = await fetch(fullUrl, {
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized access to ${fullUrl}, returning null`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Data received from ${fullUrl}:`, data);
      return data;
    } catch (error) {
      console.error(`Query Error (${fullUrl}):`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 10000,
      retry: 2,
      retryDelay: 1000
    },
    mutations: {
      retry: 2,
      retryDelay: 1000
    },
  },
});
