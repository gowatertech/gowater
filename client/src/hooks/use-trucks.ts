import { useQuery } from "@tanstack/react-query";

interface Truck {
  id: number;
  plate: string;
  brand: string;
  model: string;
}

export function useTrucks() {
  return useQuery<Truck[]>({
    queryKey: ["/api/route-generator/trucks"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}