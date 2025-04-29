import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useDrivers() {
  return useQuery({
    queryKey: ['/api/drivers'],
    queryFn: async () => {
      console.log("Fetching drivers");
      const response = await apiRequest('/api/drivers');
      console.log("Drivers response:", response);
      return response;
    },
    refetchOnWindowFocus: false
  });
}