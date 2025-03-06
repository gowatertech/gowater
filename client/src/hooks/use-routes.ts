import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Route } from "@shared/schema";

export function useRoutes() {
  const { 
    data: routes, 
    isLoading: loading, 
    error 
  } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/routes");
      return response.json();
    }
  });

  return { routes, loading, error };
}
