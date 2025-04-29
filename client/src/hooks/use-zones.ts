import { useQuery } from '@tanstack/react-query';

export function useZones() {
  return useQuery({
    queryKey: ['/api/zones'],
    refetchOnWindowFocus: false
  });
}