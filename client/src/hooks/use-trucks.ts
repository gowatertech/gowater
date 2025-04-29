import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useTrucks() {
  return useQuery({
    queryKey: ['/api/trucks'],
    queryFn: async () => {
      console.log("Fetching trucks");
      const response = await apiRequest('/api/trucks');
      console.log("Trucks response:", response);
      return response;
    },
    refetchOnWindowFocus: false
  });
}