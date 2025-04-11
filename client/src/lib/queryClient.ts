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
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
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
    });

    await throwIfResNotOk(res);
    return res;
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
