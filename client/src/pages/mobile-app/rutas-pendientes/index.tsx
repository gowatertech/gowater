import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  CalendarIcon, 
  MapPin, 
  TruckIcon, 
  DollarSign, 
  Clock, 
  UserRound, 
  Package, 
  Play, 
  Pause, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Navigation
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { InstallPrompt } from "../components/InstallPrompt";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Route {
  id: number;
  name: string;
  driverId: number;
  status: string;
  date: string;
  totalDistance: string | null;
  totalRevenue: number | null;
  deliverySequence: string[];
  stops: string[];
  orderCount: number;
  orders?: Order[];
  localStatus?: 'in_progress' | 'paused' | undefined;
}

interface Order {
  id: number;
  routeId: number | null;
  customerId: number;
  status: string;
  total: string;
  paymentMethod: string;
  date: string;
  customerName: string;
  customerAddress: string;
  products: Array<{
    productId: number;
    name: string;
    quantity: number;
    price: string;
  }>;
}

const safeLocalStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (key: ${key}):`, error);
    return false;
  }
};

export default function MobilePendingRoutes() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const { companyName } = useCompanySettings();
  const { toast } = useToast();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<number, boolean>>({});
  
  const { data: routes = [], isLoading: isLoadingRoutes, error: routesError } = useQuery<Route[]>({
    queryKey: ["/api/routes/active"],
    queryFn: async () => {
      const url = `/api/routes/active`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('No se pudieron cargar las rutas pendientes');
      }
      return response.json();
    },
    retry: 3,
    enabled: !!user
  });

  const { data: allOrders = [], isLoading: isLoadingOrders, error: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    retry: 3,
    enabled: !!user
  });

  const [allAvailableRoutes, setAllAvailableRoutes] = useState<Route[]>([]);
  const [routesInProgress, setRoutesInProgress] = useState<Route[]>([]);
  const [routesPaused, setRoutesPaused] = useState<Route[]>([]);
  const [routesPending, setRoutesPending] = useState<Route[]>([]);
  
  useEffect(() => {
    if (Array.isArray(routes) && routes.length > 0) {
      const inProgress: Route[] = [];
      const paused: Route[] = [];
      const pending: Route[] = [];
      const available: Route[] = [];
      
      routes.forEach(route => {
        if (route.status === "completed") return;
        
        const savedStatus = safeLocalStorageGet(`routeStatus_${route.id}`);
        
        if (savedStatus === 'in_progress' || route.status === "in_progress") {
          inProgress.push({...route, localStatus: 'in_progress'});
        } 
        else if (savedStatus === 'paused') {
          paused.push({...route, localStatus: 'paused'});
        }
        else if (route.status === "pending") {
          pending.push({...route, localStatus: undefined});
        }
        
        available.push(route);
      });
      
      setRoutesInProgress(inProgress);
      setRoutesPaused(paused);
      setRoutesPending(pending);
      setAllAvailableRoutes(available);
    }
  }, [routes]);

  const [ordersByRoute, setOrdersByRoute] = useState<Record<number, Order[]>>({});

  const getStatusConfig = (route: Route) => {
    if (route.localStatus === 'in_progress' || route.status === 'in_progress') {
      return { label: 'En progreso', icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700' };
    } else if (route.localStatus === 'paused') {
      return { label: 'Pausada', icon: Pause, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700' };
    }
    return { label: 'Pendiente', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700' };
  };

  useEffect(() => {
    if (allAvailableRoutes.length > 0) {
      const routeOrders: Record<number, Order[]> = {};
      
      allAvailableRoutes.forEach(route => {
        if (route.orders && route.orders.length > 0) {
          routeOrders[route.id] = route.orders;
        } else {
          routeOrders[route.id] = allOrders.filter(order => 
            order.routeId === route.id && order.status === "pending"
          );
        }
      });
      
      setOrdersByRoute(routeOrders);
      
      const initialExpandState: Record<number, boolean> = {};
      allAvailableRoutes.forEach(route => {
        initialExpandState[route.id] = false;
      });
      setExpandedRoutes(initialExpandState);
    }
  }, [allAvailableRoutes.length, allOrders.length]);

  const countStops = (route: Route) => {
    return route.deliverySequence.length > 0 ? route.deliverySequence.length - 1 : 0;
  };

  const calculateTotalRevenue = (routeId: number) => {
    const orders = ordersByRoute[routeId] || [];
    return orders.reduce((total, order) => total + parseFloat(order.total || '0'), 0);
  };

  const toggleRouteExpand = (routeId: number) => {
    setExpandedRoutes(prev => ({
      ...prev,
      [routeId]: !prev[routeId]
    }));
  };

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) {
      const hasPromptBeenShown = safeLocalStorageGet('pwaPromptShown');
      if (!hasPromptBeenShown) {
        setShowInstallPrompt(true);
      }
    }
  }, []);

  const handleStartRoute = (routeId: number) => {
    const savedRouteStatus = safeLocalStorageGet(`routeStatus_${routeId}`);
    
    if (savedRouteStatus === 'in_progress' || savedRouteStatus === 'paused') {
      setLocation(`/mobile-app/ruta?routeId=${routeId}`);
      return;
    }
    
    fetch(`/api/routes/${routeId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (data.success) {
        fetch(`/api/routes/${routeId}/orders`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_transit' })
        }).catch(err => console.error("Error al actualizar estado de pedidos:", err));
        
        safeLocalStorageSet(`routeStatus_${routeId}`, 'in_progress');
        safeLocalStorageSet('routeStatus', 'in_progress');
        setLocation(`/mobile-app/ruta?routeId=${routeId}`);
      } else if (data.activeRouteId) {
        toast({
          title: "Ruta activa detectada",
          description: "Ya tienes una ruta en progreso. Debes completarla antes de iniciar una nueva.",
          variant: "destructive",
          duration: 5000,
        });
        
        setTimeout(() => {
          if (confirm("¿Deseas ir a la ruta activa?")) {
            setLocation(`/mobile-app/ruta?routeId=${data.activeRouteId}`);
          }
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo iniciar la ruta",
          variant: "destructive",
        });
      }
    })
    .catch(err => {
      console.error("Error al iniciar la ruta:", err);
      toast({
        title: "Error",
        description: "Error al iniciar la ruta. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    });
  };

  const renderRouteCard = (route: Route) => {
    const routeOrders = ordersByRoute[route.id] || [];
    const stopCount = countStops(route);
    const routeDate = new Date(route.date);
    const totalRevenue = calculateTotalRevenue(route.id);
    const isExpanded = expandedRoutes[route.id] || false;
    const status = getStatusConfig(route);
    
    const buttonText = 
      route.localStatus === 'in_progress' ? 'Continuar Ruta' : 
      route.localStatus === 'paused' ? 'Reanudar Ruta' : 
      'Iniciar Ruta';
    
    return (
      <div 
        key={route.id} 
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden border-l-4 ${status.border}`}
      >
        <div className="p-4">
          <div 
            className="flex justify-between items-start cursor-pointer"
            onClick={() => toggleRouteExpand(route.id)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${status.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <status.icon className={`h-5 w-5 ${status.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900">{route.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={`${status.badge} border-0 text-[10px] h-5 font-medium`}>
                    {status.label}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {routeOrders.length || route.orderCount || 0} pedidos
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 ml-13">
            <div className="flex items-center text-xs text-gray-500">
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <span>{format(routeDate, 'dd MMM yyyy', { locale: es })}</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <span>{stopCount} paradas</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <DollarSign className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <span className="font-medium text-gray-700">${totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Navigation className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <span>{route.totalDistance ? `${route.totalDistance} km` : 'N/D'}</span>
            </div>
          </div>
          
          {isExpanded && routeOrders.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="h-px bg-gray-100" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Pedidos</p>
              {routeOrders.map(order => (
                <div key={order.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-800">{order.customerName}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">${parseFloat(order.total).toFixed(2)}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 flex items-start mb-2">
                    <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{order.customerAddress}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {order.products.map((product, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] h-5 rounded-lg bg-white border border-gray-200 text-gray-600">
                        {product.quantity}x {product.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isExpanded && routeOrders.length === 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center py-2">No hay pedidos asignados</p>
            </div>
          )}
          
          <div className="mt-4 space-y-2">
            <button 
              onClick={() => handleStartRoute(route.id)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/15 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              {buttonText}
            </button>
            
            {(route.localStatus === 'in_progress' || route.status === 'in_progress') && (
              <button 
                onClick={() => setLocation(`/mobile-app/ruta?routeId=${route.id}`)}
                className="w-full py-2.5 px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Finalizar Ruta
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingUser || isLoadingRoutes || isLoadingOrders) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <MobileHeader 
          title="Mis Rutas" 
          showBackButton 
          onBackButtonClick={() => setLocation('/mobile-app')}
          companyName={companyName} 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Cargando rutas...</p>
          </div>
        </div>
        <MobileFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <MobileHeader 
        title="Mis Rutas" 
        showBackButton 
        onBackButtonClick={() => setLocation('/mobile-app')}
        companyName={companyName} 
      />
      
      {showInstallPrompt && (
        <InstallPrompt onClose={() => {
          setShowInstallPrompt(false);
          safeLocalStorageSet('pwaPromptShown', 'true');
        }} />
      )}
      
      <div className="flex-1 px-4 py-5 pb-24 overflow-y-auto">
        {routesError || ordersError ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TruckIcon className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Error al cargar datos</h3>
            <p className="text-sm text-gray-500 mt-1">Por favor, intenta nuevamente.</p>
          </div>
        ) : allAvailableRoutes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TruckIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No hay rutas disponibles</h3>
            <p className="text-sm text-gray-500 mt-1">Actualmente no hay rutas pendientes o en progreso.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {routesInProgress.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Play className="h-3 w-3 text-emerald-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">En progreso</h2>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{routesInProgress.length}</Badge>
                </div>
                <div className="space-y-3">
                  {routesInProgress.map(route => renderRouteCard(route))}
                </div>
              </div>
            )}
            
            {routesPaused.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Pause className="h-3 w-3 text-amber-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Pausadas</h2>
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{routesPaused.length}</Badge>
                </div>
                <div className="space-y-3">
                  {routesPaused.map(route => renderRouteCard(route))}
                </div>
              </div>
            )}
            
            {routesPending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Pendientes</h2>
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{routesPending.length}</Badge>
                </div>
                <div className="space-y-3">
                  {routesPending.map(route => renderRouteCard(route))}
                </div>
              </div>
            )}
            
            {routesInProgress.length === 0 && routesPaused.length === 0 && routesPending.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TruckIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No hay rutas activas</h3>
                <p className="text-sm text-gray-500 mt-1">Todas las rutas han sido completadas.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <MobileFooter />
    </div>
  );
}
