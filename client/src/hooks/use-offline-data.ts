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

export function useOfflineDeliveries(options: Omit<UseOfflineDataOptions, 'queryKey'> = {}) {
  return useQuery({
    queryKey: ["/api/mobile/deliveries"],
    queryFn: async () => {
      console.log('[useOfflineDeliveries] Starting to load deliveries...');
      
      try {
        // Intentar cargar del servidor
        console.log('[useOfflineDeliveries] Attempting to fetch from server...');
        const response = await fetch('/api/mobile/deliveries', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[useOfflineDeliveries] Successfully loaded', data.length, 'deliveries from server');
        return data;
      } catch (error) {
        console.log('[useOfflineDeliveries] Network error, loading from IndexedDB:', error);
        
        // Si falla, cargar desde IndexedDB y mapear al formato correcto
        const offlineOrders = await getAllOrders();
        console.log('[useOfflineDeliveries] Loaded', offlineOrders.length, 'orders from IndexedDB');
        
        if (offlineOrders.length > 0) {
          console.log('[useOfflineDeliveries] Sample order from IndexedDB:', offlineOrders[0]);
        }
        
        // Mapear los orders de IndexedDB al formato de deliveries esperado
        const mappedDeliveries = offlineOrders.map((order: any) => ({
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          // Preferir address (del endpoint deliveries) con fallback a customerAddress (de routes)
          address: order.address || order.customerAddress || '',
          status: order.status,
          date: order.date,
          total: order.total,
          paymentMethod: order.paymentMethod,
          // Mapear products al formato esperado
          products: (order.products || []).map((p: any) => ({
            // Preferir id (del endpoint deliveries) con fallback a productId (de routes)
            id: p.id ?? p.productId,
            name: p.name,
            quantity: p.quantity,
            price: p.price,
            isReturnable: p.isReturnable
          })),
          // bottleReturns viene del servidor, en offline estará vacío
          bottleReturns: order.bottleReturns || []
        }));
        
        console.log('[useOfflineDeliveries] Mapped', mappedDeliveries.length, 'deliveries for display');
        if (mappedDeliveries.length > 0) {
          console.log('[useOfflineDeliveries] Sample mapped delivery:', mappedDeliveries[0]);
        }
        
        return mappedDeliveries;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options
  });
}
