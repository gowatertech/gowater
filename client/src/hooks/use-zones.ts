import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useZones() {
  return useQuery({
    queryKey: ['/api/zones'],
    queryFn: async () => {
      console.log("Fetching zones");
      const response = await apiRequest('/api/zones');
      console.log("Zones response:", response);
      return response;
    },
    refetchOnWindowFocus: false
  });
}