import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Smartphone,
  Navigation,
  Package,
  CreditCard,
  Calendar,
  ArrowLeft,
  Moon,
  Sun,
  RotateCcw,
  Bell,
  LogOut,
  Home,
  X,
  Truck,
  CheckCircle,
  MapPin,
  RefreshCw,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useQuery } from "@tanstack/react-query";

// Componentes internos
import { MobileHeader } from "./components/MobileHeader";
import { MobileFooter } from "./components/MobileFooter";
import { InstallPrompt } from "./components/InstallPrompt";
import { OfflineBanner, SyncStatusModal } from "@/components/sync";

// Interfaces para los datos
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
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useCurrentUser();
  const { companyName } = useCompanySettings();
  const [darkMode, setDarkMode] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  // Consulta para obtener rutas pendientes (compatible con multitenant)
  const { data: routes = [], isLoading: isLoadingRoutes, refetch: refetchRoutes } = useQuery<Route[]>({
    queryKey: ["/api/mobile/routes"],
    retry: 2,
    enabled: !!user // Solo cargar cuando el usuario esté disponible
  });

  // Consulta para obtener pedidos (compatible con multitenant)
  const { data: orders = [], isLoading: isLoadingOrders, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ["/api/mobile/orders"],
    retry: 2,
    enabled: !!user // Solo cargar cuando el usuario esté disponible
  });

  // Consulta para obtener clientes (compatible con multitenant)
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/mobile/customers"],
    retry: 2,
    enabled: !!user // Solo cargar cuando el usuario esté disponible
  });
  
  // Rutas pendientes filtradas por el conductor actual (si es conductor)
  const pendingRoutes = Array.isArray(routes) ? routes.filter((route: Route) => 
    route.status === "pending" && 
    (!user || user.role === "admin" || route.driverId === user.id)
  ) : [];
  
  // Pedidos pendientes
  const pendingOrders = Array.isArray(orders) ? orders.filter((order: Order) => 
    order.status === "pending"
  ) : [];

  // Pedidos con rutas asignadas
  const assignedOrders = Array.isArray(orders) ? orders.filter((order: Order) => 
    order.status === "pending" && order.routeId
  ) : [];

  // Verificar si el usuario es un chofer
  useEffect(() => {
    console.log("MobileApp - Estado de usuario:", { isLoading, user: user ? { id: user.id, role: user.role } : null });
    
    // Solo verificar rol cuando user está disponible y ya cargó
    if (!isLoading && user) {
      if (user.role !== "driver" && user.role !== "admin") {
        console.log("MobileApp - Acceso denegado: rol no permitido", user.role);
        toast({
          title: "Acceso denegado",
          description: "Sólo los choferes y administradores pueden acceder a esta aplicación",
          variant: "destructive"
        });
        setLocation("/dashboard");
      } else {
        console.log("MobileApp - Usuario con rol permitido:", user.role);
      }
    }
  }, [user, isLoading, setLocation, toast]);

  // Detectar si la PWA puede ser instalada
  useEffect(() => {
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir que Chrome muestre la instalación automáticamente
      e.preventDefault();
      // Guardar el evento para usarlo después
      deferredPrompt = e;
      // Mostrar nuestro propio prompt
      setShowInstallPrompt(true);
    });

    window.addEventListener('appinstalled', () => {
      // Cuando la PWA se haya instalado, ocultar el prompt
      setShowInstallPrompt(false);
      deferredPrompt = null;
    });

    // Comprobar si ya está en modo standalone (ya instalada)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }
    
    // Verificar el tema guardado
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
    toast({
      title: darkMode ? "Modo claro activado" : "Modo oscuro activado",
      description: "La configuración se ha guardado"
    });
  };
  
  // Manejo de la instalación de PWA
  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwaPromptShown', 'true');
  };

  // Redireccionar a las rutas pendientes
  const goToPendingRoutes = () => {
    setLocation("/mobile-app/rutas-pendientes");
  };
  
  // Refrescar los datos
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

  // Si el usuario no es un chofer o está cargando, mostrar pantalla de carga
  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary/5">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="font-medium text-primary">Cargando GoWater Driver...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-16`}>
      {/* Prompt de instalación */}
      {showInstallPrompt && <InstallPrompt onClose={() => setShowInstallPrompt(false)} />}
      
      {/* Banner de modo sin conexión */}
      <OfflineBanner sticky showDismiss />
      
      {/* Cabecera móvil */}
      <MobileHeader 
        user={user} 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode} 
        onSyncData={refreshData}
        companyName={companyName}
      />

      {/* Contenido principal */}
      <main className="container max-w-md mx-auto px-4 py-4">
        <div className="space-y-4">
          {/* Sección de bienvenida */}
          <Card className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold">{`¡Bienvenido, ${user.name}!`}</h1>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-full p-0 text-muted-foreground"
                  onClick={refreshData}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas en tiempo real */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Truck className="h-6 w-6 mb-1 text-blue-600 dark:text-blue-400" />
                  <span className="text-lg font-bold">{pendingRoutes.length}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Rutas pendientes</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <Package className="h-6 w-6 mb-1 text-green-600 dark:text-green-400" />
                  <span className="text-lg font-bold">{pendingOrders.length}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Pedidos pendientes</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Accesos rápidos */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button 
              className="py-6 h-auto flex-col rounded-xl shadow-sm" 
              onClick={goToPendingRoutes}
            >
              <Navigation className="h-8 w-8 mb-2" />
              <span className="text-sm">Rutas Pendientes</span>
              {pendingRoutes.length > 0 && (
                <Badge className="mt-1" variant="secondary">{pendingRoutes.length}</Badge>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              className="py-6 h-auto flex-col rounded-xl shadow-sm" 
              onClick={() => setLocation("/mobile-app/entregas")}
            >
              <Package className="h-8 w-8 mb-2" />
              <span className="text-sm">Mis Entregas</span>
              {assignedOrders.length > 0 && (
                <Badge className="mt-1" variant="secondary">{assignedOrders.length}</Badge>
              )}
            </Button>
          </div>
          
          {/* Última ruta pendiente */}
          {pendingRoutes.length > 0 && (
            <Card className="mb-4 shadow-sm overflow-hidden">
              <CardHeader className="p-3 bg-primary/10">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Truck className="h-4 w-4 mr-2" />
                  Próxima ruta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-1">{pendingRoutes[0].name}</div>
                <div className="flex items-center text-xs text-muted-foreground mb-2">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>
                    {new Date(pendingRoutes[0].date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                  {pendingRoutes[0].totalDistance && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{Number(pendingRoutes[0].totalDistance).toFixed(1)} km</span>
                    </>
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="w-full h-7 text-xs" 
                  onClick={() => setLocation(`/mobile-app/ruta?routeId=${pendingRoutes[0].id}`)}
                >
                  Ver detalles
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Últimos pedidos pendientes */}
          {pendingOrders.length > 0 && (
            <Card className="mb-4 shadow-sm overflow-hidden">
              <CardHeader className="p-3 bg-green-50 dark:bg-green-900/20">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Pedidos recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {pendingOrders.slice(0, 3).map(order => {
                    // Encontrar el cliente correspondiente
                    const customer = customers.find(c => c.id === order.customerId);
                    
                    return (
                      <div key={order.id} className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-sm">{customer?.businessname || order.customerName}</div>
                          <Badge variant="outline" className="text-xs ml-1">
                            ${Number(order.total).toLocaleString('es-ES', {minimumFractionDigits: 2})}
                          </Badge>
                        </div>
                        <div className="flex items-start text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{customer?.street} {customer?.streetnumber}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {order.products && order.products.map((product, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] h-5">
                              {product.quantity}x {product.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pendingOrders.length > 3 && (
                  <div className="p-2 text-center">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-7" 
                      onClick={() => setLocation("/mobile-app/entregas")}
                    >
                      Ver todos los pedidos ({pendingOrders.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Botón de estado de sincronización */}
          <div className="mt-6 text-center">
            <SyncStatusModal>
              <Button variant="outline" size="sm" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Estado de sincronización
              </Button>
            </SyncStatusModal>
            <div className="mt-2 text-xs text-muted-foreground">
              Todos los cambios se guardan automáticamente de manera local
              y se sincronizan cuando hay conexión a internet.
            </div>
          </div>
        </div>
      </main>

      {/* Barra de navegación inferior */}
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}