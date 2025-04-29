import { useQuery } from '@tanstack/react-query';

export function useTrucks() {
  return useQuery({
    queryKey: ['/api/trucks'],
    refetchOnWindowFocus: false
  });
}