import { useQuery, QueryKey } from '@tanstack/react-query';
import { getAllRoutes, getAllOrders, getAllCustomers, getAllProducts } from '@/lib/offline-db';

interface UseOfflineDataOptions {
  queryKey: QueryKey;
  enabled?: boolean;
  retry?: number;
  staleTime?: number;
}

export function useOfflineRoutes(options: Omit<UseOfflineDataOptions, 'queryKey'> = {}) {
  return useQuery({
    queryKey: ["/api/mobile/routes"],
    queryFn: async () => {
      try {
        // Intentar cargar del servidor
        const response = await fetch('/api/mobile/routes', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.log('[useOfflineRoutes] Error de red, cargando desde IndexedDB', error);
        
        // Si falla, cargar desde IndexedDB
        const offlineRoutes = await getAllRoutes();
        
        // Retornar array vacío si no hay datos, no lanzar error
        return offlineRoutes;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options
  });
}

export function useOfflineOrders(options: Omit<UseOfflineDataOptions, 'queryKey'> = {}) {
  return useQuery({
    queryKey: ["/api/mobile/orders"],
    queryFn: async () => {
      try {
        // Intentar cargar del servidor
        const response = await fetch('/api/mobile/orders', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.log('[useOfflineOrders] Error de red, cargando desde IndexedDB', error);
        
        // Si falla, cargar desde IndexedDB
        const offlineOrders = await getAllOrders();
        
        // Retornar array vacío si no hay datos, no lanzar error
        return offlineOrders;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options
  });
}

export function useOfflineCustomers(options: Omit<UseOfflineDataOptions, 'queryKey'> = {}) {
  return useQuery({
    queryKey: ["/api/mobile/customers"],
    queryFn: async () => {
      try {
        // Intentar cargar del servidor
        const response = await fetch('/api/mobile/customers', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.log('[useOfflineCustomers] Error de red, cargando desde IndexedDB', error);
        
        // Si falla, cargar desde IndexedDB
        const offlineCustomers = await getAllCustomers();
        
        // Retornar array vacío si no hay datos, no lanzar error
        return offlineCustomers;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options
  });
}

export function useOfflineProducts(options: Omit<UseOfflineDataOptions, 'queryKey'> = {}) {
  return useQuery({
    queryKey: ["/api/mobile/products"],
    queryFn: async () => {
      try {
        // Intentar cargar del servidor
        const response = await fetch('/api/products', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.log('[useOfflineProducts] Error de red, cargando desde IndexedDB', error);
        
        // Si falla, cargar desde IndexedDB
        const offlineProducts = await getAllProducts();
        
        // Retornar array vacío si no hay datos, no lanzar error
        return offlineProducts;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options
  });
}
