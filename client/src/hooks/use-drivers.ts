import { useQuery } from '@tanstack/react-query';

export function useDrivers() {
  return useQuery({
    queryKey: ['/api/drivers'],
    refetchOnWindowFocus: false
  });
}