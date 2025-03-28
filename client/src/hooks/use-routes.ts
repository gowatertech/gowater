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
      try {
        const response = await apiRequest("GET", "/api/routes");
        if (!response.ok) {
          throw new Error(`Error fetching routes: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Routes loaded in useRoutes hook:", data);
        return data;
      } catch (err) {
        console.error("Error fetching routes:", err);
        throw err;
      }
    }
  });

  return { routes, loading, error };
}
