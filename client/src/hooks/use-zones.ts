import { useQuery } from "@tanstack/react-query";

interface Zone {
  id: number;
  name: string;
  color: string;
}

export function useZones() {
  return useQuery<Zone[]>({
    queryKey: ["/api/route-generator/zones"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}