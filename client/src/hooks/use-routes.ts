import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Ruta } from "@shared/schema";

export function useRutas() {
  const { 
    data: rutas, 
    isLoading: cargando, 
    error 
  } = useQuery<Ruta[]>({
    queryKey: ["/api/rutas"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/rutas");
      return response.json();
    }
  });

  return { rutas, cargando, error };
}

// Mantenemos la función useRoutes como alias para compatibilidad
export const useRoutes = useRutas;