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

export async function apiRequest(
  url: string,
  options?: RequestInit | string | { method?: string; data?: unknown }
): Promise<any> {
  let method = 'GET';
  let data = undefined;
  
  // Handle backwards compatibility with previous signatures
  if (typeof options === 'string') {
    method = options;
  } else if (options && 'method' in options) {
    method = options.method || 'GET';
    if ('data' in options) {
      data = options.data;
    }
  } else if (options) {
    // It's a RequestInit object
    method = options.method || 'GET';
    // For RequestInit, body is already set, so we don't need to handle data
  }
  
  const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
  const fullUrl = `${getBaseUrl()}${apiUrl}`;

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      ...(typeof options === 'object' && !('data' in options) && !('method' in options) ? options : {}),
    });

    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    console.error(`API Request Error (${method} ${fullUrl}):`, error);
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
      const res = await fetch(fullUrl, {
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
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
