import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Navigation,
  Package,
  Calendar,
  Truck,
  MapPin,
  RefreshCw,
  Database,
  ShoppingCart,
  ChevronRight,
  TrendingUp,
  Clock,
  Droplets
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useQuery } from "@tanstack/react-query";
import { usePreventBackNavigation } from "@/hooks/use-prevent-back-navigation";
import { formatTodayRD, formatDateRD } from "@/lib/date-utils";
import { useOfflineRoutes, useOfflineOrders, useOfflineCustomers } from "@/hooks/use-offline-data";

import { MobileHeader } from "./components/MobileHeader";
import { MobileFooter } from "./components/MobileFooter";
import { InstallPrompt } from "./components/InstallPrompt";
import { OfflineBanner, SyncStatusModal } from "@/components/sync";
import { isNative } from "@/lib/capacitor";

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
  isCompleted: boolean;
}

interface Order {
  id: number;
  routeId: number;
  customerId: number;
  customerName: string;
  customerAddress: string;
  total: string;
  status: string;
  products: Array<{
    productId: number;
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface Customer {
  id: number;
  businessname: string;
  managername: string;
  phone: string;
  street: string;
  streetnumber: string;
  coordinates: string;
}

export default function GoWaterDriverApp() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useCurrentUser();
  const { companyName } = useCompanySettings();
  const [darkMode, setDarkMode] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  usePreventBackNavigation('/mobile-app/login', '/api/user');
  
  const { data: routes = [], isLoading: isLoadingRoutes, refetch: refetchRoutes } = useOfflineRoutes({
    enabled: !!user
  });

  const { data: orders = [], isLoading: isLoadingOrders, refetch: refetchOrders } = useOfflineOrders({
    enabled: !!user
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useOfflineCustomers({
    enabled: !!user
  });
  
  const pendingRoutes = Array.isArray(routes) ? routes.filter((route: Route) => 
    route.status === "pending" && 
    (!user || user.role === "admin" || route.driverId === user.id)
  ) : [];
  
  const pendingOrders = Array.isArray(orders) ? orders.filter((order: Order) => 
    order.status === "pending"
  ) : [];

  const assignedOrders = Array.isArray(orders) ? orders.filter((order: Order) => 
    order.status === "pending" && order.routeId
  ) : [];

  useEffect(() => {
    if (!isLoading && user) {
      console.log("MobileApp - Usuario detectado:", user.role);
    }
  }, [user, isLoading, setLocation, toast]);

  useEffect(() => {
    let deferredPrompt: any;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const hasShownPrompt = localStorage.getItem('pwaPromptShown');
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // @ts-ignore
      window.deferredPrompt = e;
      if (!hasShownPrompt) {
        setShowInstallPrompt(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      deferredPrompt = null;
      // @ts-ignore
      window.deferredPrompt = null;
    });

    if (isIOS && !isStandalone && !hasShownPrompt) {
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 1000);
    }
    
    if (isStandalone) {
      setShowInstallPrompt(false);
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };
  
  const refreshData = async () => {
    toast({
      title: "Actualizando...",
      description: "Obteniendo datos más recientes"
    });
    
    try {
      await Promise.all([
        refetchRoutes(),
        refetchOrders()
      ]);
      
      toast({
        title: "Datos actualizados",
        description: "La información ha sido actualizada"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/mobile-app/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Droplets className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h3 className="font-semibold text-white text-lg">GoWater Driver</h3>
          <p className="text-blue-200 text-sm mt-1">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} pb-20`}>
      {!isNative && showInstallPrompt && <InstallPrompt onClose={() => setShowInstallPrompt(false)} />}
      
      <OfflineBanner sticky showDismiss />
      
      <MobileHeader 
        user={user} 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode} 
        onSyncData={refreshData}
        companyName={companyName}
      />

      <main className="px-4 py-5 max-w-lg mx-auto">
        <div className="space-y-5">
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20 -mt-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-200 text-xs font-medium">
                  {formatTodayRD({
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </p>
                <h1 className="text-lg font-bold mt-0.5">¡Buen día, {user.name?.split(' ')[0]}!</h1>
                <p className="text-blue-200 text-xs mt-1">Tienes {pendingRoutes.length} rutas y {pendingOrders.length} pedidos pendientes</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-white hover:bg-white/20"
                onClick={refreshData}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-2">
                <Truck className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{pendingRoutes.length}</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Rutas</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-2">
                <Package className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{pendingOrders.length}</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Pedidos</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-2">
                <TrendingUp className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{assignedOrders.length}</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Asignados</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-4 shadow-md shadow-blue-500/20 text-left transition-transform active:scale-[0.98]" 
              onClick={() => setLocation("/mobile-app/rutas-pendientes")}
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <Navigation className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold block">Rutas Pendientes</span>
              {pendingRoutes.length > 0 && (
                <span className="text-xs text-blue-200 mt-0.5 block">{pendingRoutes.length} disponibles</span>
              )}
            </button>
            
            <button 
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left transition-transform active:scale-[0.98]" 
              onClick={() => setLocation("/mobile-app/new-order")}
              data-testid="button-crear-pedido"
            >
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white block">Crear Pedido</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">Nuevo pedido</span>
            </button>
          </div>
          
          {pendingRoutes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Próxima ruta</h2>
                <button 
                  className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
                  onClick={() => setLocation("/mobile-app/rutas-pendientes")}
                >
                  Ver todas <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{pendingRoutes[0].name}</h3>
                        <div className="flex items-center text-xs text-gray-500 mt-0.5 gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateRD(pendingRoutes[0].date, { day: 'numeric', month: 'short' })}
                          </span>
                          {pendingRoutes[0].totalDistance && (
                            <span>{Number(pendingRoutes[0].totalDistance).toFixed(1)} km</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs font-medium">
                      Pendiente
                    </Badge>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full h-10 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/15" 
                    onClick={() => setLocation(`/mobile-app/ruta?routeId=${pendingRoutes[0].id}`)}
                  >
                    Iniciar ruta
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {pendingOrders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pedidos recientes</h2>
                <button 
                  className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
                  onClick={() => setLocation("/mobile-app/entregas")}
                >
                  Ver todos <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                {pendingOrders.slice(0, 3).map(order => {
                  const customer = customers.find((c: any) => c.id === order.customerId);
                  
                  return (
                    <div 
                      key={order.id} 
                      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-transform cursor-pointer"
                      onClick={() => setLocation(`/mobile-app/entregas/${order.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{customer?.businessname || order.customerName}</div>
                            <div className="flex items-center text-xs text-gray-500 mt-0.5">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="line-clamp-1">{customer?.street} {customer?.streetnumber}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            ${Number(order.total).toLocaleString('es-ES', {minimumFractionDigits: 2})}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-12">
                        {order.products && order.products.map((product: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] h-5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-0">
                            {product.quantity}x {product.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="text-center pt-2">
            <SyncStatusModal>
              <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-gray-600">
                <Database className="h-3 w-3 mr-1" />
                Estado de sincronización
              </Button>
            </SyncStatusModal>
          </div>
        </div>
      </main>

      <MobileFooter darkMode={darkMode} />
    </div>
  );
}
