import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectValue, 
  SelectTrigger, 
  SelectContent, 
  SelectGroup,
  SelectLabel,
  SelectItem 
} from '@/components/ui/select';
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { ResponsiveMapContainer } from '@/components/ui/responsive-map-container';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Check, 
  CheckCircle, 
  Clock, 
  ClipboardList, 
  ArrowRightCircle,
  ArrowRight,
  Truck, 
  User, 
  BadgeCheck, 
  Ban, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Navigation2,
  Search,
  X,
  Briefcase,
  Package,
  RefreshCcw,
  MessageSquare,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiRequest } from '@/lib/queryClient';

// Interfaces
interface Delivery {
  id: number;
  customerName: string;
  customerAddress: string;
  coordinates: [number, number];
  estimatedTime: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
  priority: 'normal' | 'high' | 'low';
  orderDetails: string;
  orderValue: string;
  containers: {
    delivered: number;
    returned: number;
    balance: number;
  };
  routeId?: number; // ID de la ruta a la que pertenece la entrega
}

interface Route {
  id: number;
  name: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed';
  driverId: number;
  vehicleId: number;
}

interface CashBalance {
  initialBalance: string;
  cashIn: string;
  cashOut: string;
  finalBalance: string;
}

interface Performance {
  deliveredOrders: number;
  totalOrders: number;
  onTimeDeliveries: number;
  averageDeliveryTime: number; // en minutos
}

// Utility functions
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distancia en km
  return d;
}

// Map Components
function MapBoundsAdjuster({ deliveries }: { deliveries: Delivery[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (deliveries.length > 0) {
      const bounds = new L.LatLngBounds(
        deliveries.map(d => [d.coordinates[0], d.coordinates[1]])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [deliveries, map]);
  
  return null;
}

function LocationMarker({ onPositionChange }: { onPositionChange: (pos: [number, number]) => void }) {
  // Usar la ubicación de la empresa desde la configuración
  const defaultPosition: [number, number] = [19.075380, -70.128822]; // Ubicación del almacén
  const [position, setPosition] = useState<[number, number]>(defaultPosition);
  const map = useMap();

  // Establecer la posición predeterminada
  useEffect(() => {
    setPosition(defaultPosition);
    onPositionChange(defaultPosition);
  }, [onPositionChange]);

  return position === null ? null : (
    <Marker 
      position={position}
      icon={L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin bg-green-600 flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-lg">
                <span class="text-white font-bold">0</span>
              </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })}
    >
      <Popup>
        <div className="p-1">
          <p className="font-semibold">Almacén (punto 0)</p>
        </div>
      </Popup>
    </Marker>
  );
}

function RouteLines({ deliveries, currentPosition }: { 
  deliveries: Delivery[],
  currentPosition: [number, number] | null
}) {
  if (!currentPosition || deliveries.length === 0) return null;
  
  // Sort deliveries by estimated time
  const sortedDeliveries = [...deliveries].sort((a, b) => 
    new Date(a.estimatedTime).getTime() - new Date(b.estimatedTime).getTime()
  );
  
  const positions: LatLngExpression[] = [
    currentPosition,
    ...sortedDeliveries.map(d => d.coordinates as LatLngExpression)
  ];
  
  return (
    <Polyline 
      positions={positions}
      color="#4F46E5"
      weight={4}
      opacity={0.7}
      dashArray="8,8"
    />
  );
}

// Main Component
export default function DriverView() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('entregas');
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  
  // Valores por defecto
  const defaultCashBalance: CashBalance = {
    initialBalance: '0.00',
    cashIn: '0.00',
    cashOut: '0.00',
    finalBalance: '0.00'
  };
  
  const defaultPerformance: Performance = {
    deliveredOrders: 0,
    totalOrders: 0,
    onTimeDeliveries: 0,
    averageDeliveryTime: 0
  };
  
  // Obtener rutas disponibles
  const routesQuery = useQuery<Route[]>({
    queryKey: ['/api/driver/routes']
  });
  
  // Fetching deliveries
  const deliveriesQuery = useQuery<Delivery[]>({
    queryKey: ['/api/driver/deliveries/today']
  });
  
  // Obtener balance de efectivo
  const cashBalanceQuery = useQuery<CashBalance>({
    queryKey: ['/api/driver/cash-balance']
  });
  
  // Obtener datos de rendimiento
  const performanceQuery = useQuery<Performance>({
    queryKey: ['/api/driver/performance']
  });
  
  // Extraer datos con valores por defecto
  const data = deliveriesQuery.data;
  const isLoading = deliveriesQuery.isLoading;
  const refetch = deliveriesQuery.refetch;
  const cashBalance = cashBalanceQuery.data || defaultCashBalance;
  const performance = performanceQuery.data || defaultPerformance;
  
  // Derived data
  const todayDeliveries: Delivery[] = data || [];
  
  const deliveriesByRoute = useMemo(() => {
    if (!selectedRouteId) return todayDeliveries;
    return todayDeliveries.filter(delivery => delivery.routeId === selectedRouteId);
  }, [todayDeliveries, selectedRouteId]);
  
  const filteredDeliveries = useMemo(() => {
    if (!searchTerm) return deliveriesByRoute;
    
    return deliveriesByRoute.filter(delivery => 
      delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      delivery.customerAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deliveriesByRoute, searchTerm]);
  
  const nextDelivery = useMemo(() => {
    const pending = filteredDeliveries.filter(d => d.status === 'pending');
    if (pending.length === 0) return null;
    
    return pending.sort((a, b) => 
      new Date(a.estimatedTime).getTime() - new Date(b.estimatedTime).getTime()
    )[0];
  }, [filteredDeliveries]);
  
  // Stats
  const totalCount = todayDeliveries.length;
  const deliveredCount = todayDeliveries.filter(d => d.status === 'delivered').length;
  const pendingCount = todayDeliveries.filter(d => d.status === 'pending').length;
  const cancelledCount = todayDeliveries.filter(d => d.status === 'cancelled').length;
  
  // Actions
  const completeDeliveryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/driver/deliveries/${id}/complete`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Entrega completada',
        description: 'La entrega ha sido marcada como completada.',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `No se pudo completar la entrega: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleCompleteDelivery = (id: number) => {
    completeDeliveryMutation.mutate(id);
  };
  
  const startNavigation = (delivery: Delivery) => {
    // Esta función abriría la navegación en Google Maps o similar
    const [lat, lng] = delivery.coordinates;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'delivered': return 'text-green-600 border-green-500';
      case 'pending': return 'text-yellow-600 border-yellow-500';
      case 'in_progress': return 'text-blue-600 border-blue-500';
      case 'cancelled': return 'text-red-600 border-red-500';
      default: return '';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'delivered': return <Check className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'in_progress': return <ArrowRight className="h-3 w-3" />;
      case 'cancelled': return <Ban className="h-3 w-3" />;
      default: return null;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-[60vh]" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-2 md:p-4">
      {isMobile ? (
        // Diseño mobile
        <Tabs defaultValue="entregas" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="entregas">
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Entregas
            </TabsTrigger>
            <TabsTrigger value="mapa">
              <Navigation2 className="h-3.5 w-3.5 mr-1.5" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="stats">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Stats
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="entregas" className="space-y-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar cliente o dirección..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <Select value={selectedRouteId?.toString() || ''} onValueChange={(value) => setSelectedRouteId(value ? parseInt(value) : null)}>
              <SelectTrigger className="h-8 mb-2">
                <SelectValue placeholder="Todas las rutas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las rutas</SelectItem>
                {routesQuery.data?.map(route => (
                  <SelectItem key={route.id} value={route.id.toString()}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="relative overflow-hidden rounded-md border shadow-sm">
                <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
                <div className="p-2 pl-2.5">
                  <div className="text-xs font-normal text-gray-500">
                    Total Entregas
                  </div>
                  <div className="mt-1 text-base font-semibold text-blue-600">
                    {totalCount}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-md border shadow-sm">
                <div className="absolute left-0 top-0 h-full w-1 bg-green-500"></div>
                <div className="p-2 pl-2.5">
                  <div className="text-xs font-normal text-gray-500">
                    Completadas
                  </div>
                  <div className="mt-1 text-base font-semibold text-green-600">
                    {deliveredCount}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-md border shadow-sm">
                <div className="absolute left-0 top-0 h-full w-1 bg-yellow-500"></div>
                <div className="p-2 pl-2.5">
                  <div className="text-xs font-normal text-gray-500">
                    Pendientes
                  </div>
                  <div className="mt-1 text-base font-semibold text-yellow-600">
                    {pendingCount}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-md border shadow-sm">
                <div className="absolute left-0 top-0 h-full w-1 bg-red-500"></div>
                <div className="p-2 pl-2.5">
                  <div className="text-xs font-normal text-gray-500">
                    Canceladas
                  </div>
                  <div className="mt-1 text-base font-semibold text-red-600">
                    {cancelledCount}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              {filteredDeliveries.map((delivery) => (
                <Card key={delivery.id} className={`border-l-4 ${delivery.status === 'delivered' ? 'border-l-green-500' : delivery.status === 'pending' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="font-medium text-sm">{delivery.customerName}</p>
                        <p className="text-xs text-gray-600">{delivery.customerAddress}</p>
                      </div>
                      <Badge variant="outline" className={`${getStatusColor(delivery.status)} flex items-center gap-1 text-xs`}>
                        {getStatusIcon(delivery.status)}
                        <span>
                          {delivery.status === 'pending' ? 'Pendiente' : 
                           delivery.status === 'in_progress' ? 'En progreso' : 
                           delivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 my-1.5 text-xs">
                      <div className="border rounded p-1 text-center">
                        <div className="text-gray-500">Hora</div>
                        <div className="font-medium">
                          {new Date(delivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      <div className="border rounded p-1 text-center">
                        <div className="text-gray-500">Valor</div>
                        <div className="font-medium">
                          {delivery.orderValue}
                        </div>
                      </div>
                      <div className="border rounded p-1 text-center">
                        <div className="text-gray-500">Envases</div>
                        <div className="font-medium">
                          {delivery.containers.delivered}/{delivery.containers.returned}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs h-7 flex-1"
                        onClick={() => startNavigation(delivery)}
                      >
                        <Navigation2 className="h-3 w-3 mr-1" />
                        Navegar
                      </Button>
                      {delivery.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleCompleteDelivery(delivery.id)}
                          className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="mapa" className="h-[calc(100vh-10rem)]">
            <div className="mb-2">
              <Select value={selectedRouteId?.toString() || ''} onValueChange={(value) => setSelectedRouteId(value ? parseInt(value) : null)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas las rutas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las rutas</SelectItem>
                  {routesQuery.data?.map(route => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <ResponsiveMapContainer className="h-full rounded-md border">
              <MapContainer 
                center={[19.075380, -70.128822]} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker onPositionChange={setCurrentPosition} />
                {filteredDeliveries.map((delivery, index) => (
                  <Marker 
                    key={delivery.id}
                    position={delivery.coordinates}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div class="marker-pin ${delivery.status === 'delivered' ? 'bg-green-600' : delivery.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'} flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-lg">
                              <span class="text-white font-bold">${index + 1}</span>
                            </div>`,
                      iconSize: [30, 30],
                      iconAnchor: [15, 15]
                    })}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-semibold">{delivery.customerName}</p>
                        <p className="text-xs">{delivery.customerAddress}</p>
                        <p className="text-xs mt-1">Hora: {new Date(delivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <div className="flex gap-1 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => startNavigation(delivery)}
                          >
                            <Navigation2 className="h-3 w-3 mr-1" />
                            Navegar
                          </Button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                <RouteLines deliveries={filteredDeliveries} currentPosition={currentPosition} />
                <MapBoundsAdjuster deliveries={filteredDeliveries} />
              </MapContainer>
            </ResponsiveMapContainer>
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumen del Día</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="border rounded p-2 text-center">
                    <div className="text-sm font-medium">Entregas</div>
                    <div className="text-2xl font-bold text-primary mt-1">{performance.deliveredOrders}/{performance.totalOrders}</div>
                    <div className="text-xs text-gray-500">completadas</div>
                  </div>
                  <div className="border rounded p-2 text-center">
                    <div className="text-sm font-medium">A Tiempo</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">{performance.onTimeDeliveries}</div>
                    <div className="text-xs text-gray-500">entregas</div>
                  </div>
                </div>
                <div className="border rounded p-2 text-center">
                  <div className="text-sm font-medium">Tiempo Promedio</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{performance.averageDeliveryTime} min</div>
                  <div className="text-xs text-gray-500">por entrega</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Balance de Efectivo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Balance Inicial:</span>
                    <span className="font-medium">${cashBalance.initialBalance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Ingresos:</span>
                    <span className="font-medium text-green-600">+${cashBalance.cashIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Gastos:</span>
                    <span className="font-medium text-red-600">-${cashBalance.cashOut}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-sm font-bold">Balance Final:</span>
                    <span className="font-bold">${cashBalance.finalBalance}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Diseño desktop
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Panel del Conductor
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Actualizar Datos
              </Button>
              <Button>
                <Phone className="h-4 w-4 mr-2" />
                Contactar Centro
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Entregas de Hoy</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Select value={selectedRouteId?.toString() || ''} onValueChange={(value) => setSelectedRouteId(value ? parseInt(value) : null)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todas las rutas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas las rutas</SelectItem>
                        {routesQuery.data?.map(route => (
                          <SelectItem key={route.id} value={route.id.toString()}>
                            {route.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="relative overflow-hidden rounded-md border shadow-sm">
                      <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
                      <div className="p-3 pl-4">
                        <div className="text-sm font-normal text-gray-500">
                          Total Entregas
                        </div>
                        <div className="mt-1 text-xl font-semibold text-blue-600">
                          {totalCount}
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-md border shadow-sm">
                      <div className="absolute left-0 top-0 h-full w-1 bg-green-500"></div>
                      <div className="p-3 pl-4">
                        <div className="text-sm font-normal text-gray-500">
                          Completadas
                        </div>
                        <div className="mt-1 text-xl font-semibold text-green-600">
                          {deliveredCount}
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-md border shadow-sm">
                      <div className="absolute left-0 top-0 h-full w-1 bg-yellow-500"></div>
                      <div className="p-3 pl-4">
                        <div className="text-sm font-normal text-gray-500">
                          Pendientes
                        </div>
                        <div className="mt-1 text-xl font-semibold text-yellow-600">
                          {pendingCount}
                        </div>
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-md border shadow-sm">
                      <div className="absolute left-0 top-0 h-full w-1 bg-red-500"></div>
                      <div className="p-3 pl-4">
                        <div className="text-sm font-normal text-gray-500">
                          Canceladas
                        </div>
                        <div className="mt-1 text-xl font-semibold text-red-600">
                          {cancelledCount}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Buscar cliente o dirección..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                    {searchTerm && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                    {nextDelivery && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-500 mb-1">Siguiente entrega:</p>
                        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <p className="font-medium text-sm">{nextDelivery.customerName}</p>
                                <p className="text-xs text-gray-600">{nextDelivery.customerAddress}</p>
                              </div>
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1 text-xs">
                                <ArrowRightCircle className="h-3 w-3" />
                                <span>Siguiente</span>
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 my-2 text-xs">
                              <div className="border rounded p-1 text-center">
                                <div className="text-gray-500">Hora</div>
                                <div className="font-medium">
                                  {new Date(nextDelivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </div>
                              <div className="border rounded p-1 text-center">
                                <div className="text-gray-500">Valor</div>
                                <div className="font-medium">
                                  {nextDelivery.orderValue}
                                </div>
                              </div>
                              <div className="border rounded p-1 text-center">
                                <div className="text-gray-500">Envases</div>
                                <div className="font-medium">
                                  {nextDelivery.containers.delivered}/{nextDelivery.containers.returned}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-xs h-8 flex-1"
                                onClick={() => startNavigation(nextDelivery)}
                              >
                                <Navigation2 className="h-3 w-3 mr-1" />
                                Navegar
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleCompleteDelivery(nextDelivery.id)}
                                className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {filteredDeliveries.filter(d => d.id !== nextDelivery?.id).map((delivery) => (
                      <Card key={delivery.id} className={`border-l-4 ${delivery.status === 'delivered' ? 'border-l-green-500' : delivery.status === 'pending' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <p className="font-medium text-sm">{delivery.customerName}</p>
                              <p className="text-xs text-gray-600">{delivery.customerAddress}</p>
                            </div>
                            <Badge variant="outline" className={`${getStatusColor(delivery.status)} flex items-center gap-1 text-xs`}>
                              {getStatusIcon(delivery.status)}
                              <span>
                                {delivery.status === 'pending' ? 'Pendiente' : 
                                delivery.status === 'in_progress' ? 'En progreso' : 
                                delivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                              </span>
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 my-2 text-xs">
                            <div className="border rounded p-1 text-center">
                              <div className="text-gray-500">Hora</div>
                              <div className="font-medium">
                                {new Date(delivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                            <div className="border rounded p-1 text-center">
                              <div className="text-gray-500">Valor</div>
                              <div className="font-medium">
                                {delivery.orderValue}
                              </div>
                            </div>
                            <div className="border rounded p-1 text-center">
                              <div className="text-gray-500">Envases</div>
                              <div className="font-medium">
                                {delivery.containers.delivered}/{delivery.containers.returned}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs h-8 flex-1"
                              onClick={() => startNavigation(delivery)}
                            >
                              <Navigation2 className="h-3 w-3 mr-1" />
                              Navegar
                            </Button>
                            {delivery.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleCompleteDelivery(delivery.id)}
                                className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <Card className="h-[calc(100vh-12rem)]">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">Mapa de Ruta</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 h-full">
                  <div className="h-[calc(100%-2rem)]">
                    <ResponsiveMapContainer className="h-full rounded-md border">
                      <MapContainer 
                        center={[19.075380, -70.128822]} 
                        zoom={12} 
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <LocationMarker onPositionChange={setCurrentPosition} />
                        {filteredDeliveries.map((delivery, index) => (
                          <Marker 
                            key={delivery.id}
                            position={delivery.coordinates}
                            icon={L.divIcon({
                              className: 'custom-div-icon',
                              html: `<div class="marker-pin ${delivery.status === 'delivered' ? 'bg-green-600' : delivery.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'} flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-lg">
                                      <span class="text-white font-bold">${index + 1}</span>
                                    </div>`,
                              iconSize: [30, 30],
                              iconAnchor: [15, 15]
                            })}
                          >
                            <Popup>
                              <div className="p-2">
                                <p className="font-semibold">{delivery.customerName}</p>
                                <p className="text-xs">{delivery.customerAddress}</p>
                                <p className="text-xs mt-1">Hora: {new Date(delivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                <div className="flex gap-2 mt-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => startNavigation(delivery)}
                                  >
                                    <Navigation2 className="h-3 w-3 mr-1" />
                                    Navegar
                                  </Button>
                                  {delivery.status === 'pending' && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleCompleteDelivery(delivery.id)}
                                      className="text-xs bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Completar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                        <RouteLines deliveries={filteredDeliveries} currentPosition={currentPosition} />
                        <MapBoundsAdjuster deliveries={filteredDeliveries} />
                      </MapContainer>
                    </ResponsiveMapContainer>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Resumen del Día</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="border rounded p-2 text-center">
                        <div className="text-sm font-medium">Entregas</div>
                        <div className="text-2xl font-bold text-primary mt-1">{performance.deliveredOrders}/{performance.totalOrders}</div>
                        <div className="text-xs text-gray-500">completadas</div>
                      </div>
                      <div className="border rounded p-2 text-center">
                        <div className="text-sm font-medium">A Tiempo</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">{performance.onTimeDeliveries}</div>
                        <div className="text-xs text-gray-500">entregas</div>
                      </div>
                    </div>
                    <div className="border rounded p-2 text-center">
                      <div className="text-sm font-medium">Tiempo Promedio</div>
                      <div className="text-2xl font-bold text-blue-600 mt-1">{performance.averageDeliveryTime} min</div>
                      <div className="text-xs text-gray-500">por entrega</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Balance de Efectivo</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Balance Inicial:</span>
                        <span className="font-medium">${cashBalance.initialBalance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Ingresos:</span>
                        <span className="font-medium text-green-600">+${cashBalance.cashIn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Gastos:</span>
                        <span className="font-medium text-red-600">-${cashBalance.cashOut}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="text-sm font-bold">Balance Final:</span>
                        <span className="font-bold">${cashBalance.finalBalance}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}