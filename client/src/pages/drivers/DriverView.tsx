import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Truck, 
  DollarSign, 
  TrendingUp, 
  Navigation, 
  MapPin, 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  Package, 
  BoxesIcon,
  ClipboardList,
  Calendar,
  AlertTriangle,
  Search,
  X,
  Navigation2,
  CheckCircle2,
  CircleX,
  CircleAlert,
  ReceiptText,
  ArrowRightCircle,
  RefreshCcw,
  Printer,
  Camera,
  Phone,
  MessageSquare
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';

// Tipos de datos
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

// Función para calcular distancia entre coordenadas (fórmula Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Componente para ajustar automáticamente la vista del mapa a todos los puntos
function MapBoundsAdjuster({ deliveries }: { deliveries: Delivery[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (deliveries.length === 0) return;
    
    // Crear los límites iniciales
    const bounds = L.latLngBounds([]);
    
    // Añadir cada punto de entrega a los límites
    deliveries.forEach(delivery => {
      bounds.extend(delivery.coordinates);
    });
    
    // Si tenemos coordenadas válidas, ajustar el mapa
    if (bounds.isValid()) {
      // Añadir un pequeño padding alrededor de los límites
      map.fitBounds(bounds, {
        padding: [50, 50], // 50px de padding en todas direcciones
        maxZoom: 13,       // Limitar el zoom máximo
        animate: true
      });
    }
  }, [map, deliveries]);
  
  return null;
}

// Componente para centrar el mapa en la posición actual
function LocationMarker({ onPositionChange }: { onPositionChange: (pos: [number, number]) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: false, maxZoom: 13 });
    
    map.on('locationfound', (e) => {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      onPositionChange(newPos);
    });

    // Simulación de actualización periódica de ubicación
    const interval = setInterval(() => {
      map.locate({ setView: false });
    }, 30000);

    return () => clearInterval(interval);
  }, [map, onPositionChange]);

  return position === null ? null : (
    <Marker 
      position={position}
      icon={L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin bg-blue-500 flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })}
    >
      <Popup>Tu ubicación actual</Popup>
    </Marker>
  );
}

// Componente para renderizar las rutas en el mapa
function RouteLines({ deliveries, currentPosition }: { 
  deliveries: Delivery[]; 
  currentPosition: [number, number] | null;
}) {
  if (!currentPosition || deliveries.length === 0) return null;

  // Filtrar solo entregas pendientes
  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
  
  if (pendingDeliveries.length === 0) return null;
  
  // Ordenar las entregas por distancia desde la posición actual
  const sortedDeliveries = [...pendingDeliveries].sort((a, b) => {
    const distA = getDistance(
      currentPosition[0], 
      currentPosition[1], 
      a.coordinates[0], 
      a.coordinates[1]
    );
    const distB = getDistance(
      currentPosition[0], 
      currentPosition[1], 
      b.coordinates[0], 
      b.coordinates[1]
    );
    return distA - distB;
  });
  
  // Crear una ruta completa desde la posición actual a todas las entregas pendientes
  const routePoints: LatLngExpression[] = [currentPosition];
  
  // Añadir cada punto de entrega en el orden calculado
  sortedDeliveries.forEach(delivery => {
    routePoints.push(delivery.coordinates as LatLngExpression);
  });

  return (
    <>
      {/* Línea principal que conecta todos los puntos */}
      <Polyline 
        positions={routePoints}
        color="#4F46E5"
        weight={4}
        opacity={0.7}
        dashArray="10,10"
      />
      
      {/* Líneas de conexión entre puntos para mayor claridad */}
      {sortedDeliveries.map((delivery, index) => {
        // Si es el primer punto, conectar desde la posición actual
        const fromPoint = index === 0 
          ? currentPosition 
          : sortedDeliveries[index - 1].coordinates;
          
        return (
          <Polyline 
            key={`route-${delivery.id}`}
            positions={[fromPoint, delivery.coordinates]}
            color={
              index === 0 ? "#FF5722" : // Naranja para la primera conexión
              index === sortedDeliveries.length - 1 ? "#4CAF50" : // Verde para la última
              "#2196F3" // Azul para las intermedias
            }
            weight={3}
            opacity={0.8}
          />
        );
      })}
    </>
  );
}

// Componente principal
export default function DriverView() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>("route");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showDetails, setShowDetails] = useState<boolean>(false);
  
  // Datos de ejemplo para desarrollo - En producción, estos vendrían de la API
  const mockDeliveries: Delivery[] = [
    {
      id: 1,
      customerName: "Supermercado Nacional",
      customerAddress: "Av. Winston Churchill #123",
      coordinates: [18.4739, -69.9345],
      estimatedTime: "2025-03-24T10:30:00",
      status: 'pending',
      priority: 'high',
      orderDetails: "5 Botellones de 5 galones, 3 cajas de agua embotellada",
      orderValue: "2,500.00",
      containers: {
        delivered: 5,
        returned: 3,
        balance: 2
      }
    },
    {
      id: 2,
      customerName: "Restaurante La Plaza",
      customerAddress: "Av. Abraham Lincoln #456",
      coordinates: [18.4663, -69.9317],
      estimatedTime: "2025-03-24T11:15:00",
      status: 'pending',
      priority: 'normal',
      orderDetails: "8 Botellones de 5 galones",
      orderValue: "3,200.00",
      containers: {
        delivered: 8,
        returned: 8,
        balance: 0
      }
    },
    {
      id: 3,
      customerName: "Hotel Costa Azul",
      customerAddress: "Calle El Conde #789",
      coordinates: [18.4721, -69.8941],
      estimatedTime: "2025-03-24T09:00:00",
      status: 'delivered',
      priority: 'normal',
      orderDetails: "10 Botellones de 5 galones, 5 dispensadores",
      orderValue: "5,500.00",
      containers: {
        delivered: 10,
        returned: 7,
        balance: 3
      }
    }
  ];

  // Consultas para obtener datos del conductor (usando mock data por ahora)
  const { data: todayDeliveries = mockDeliveries, refetch } = useQuery<Delivery[]>({
    queryKey: ["/api/driver/deliveries/today"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/driver/deliveries/today");
        if (!response.ok) throw new Error("Error al obtener entregas");
        return await response.json();
      } catch (error) {
        console.error("Error al obtener entregas:", error);
        // Retornamos mock data solo para propósitos de desarrollo
        return mockDeliveries;
      }
    }
  });

  const mockCashBalance: CashBalance = {
    initialBalance: "1000.00",
    cashIn: "2500.00",
    cashOut: "500.00",
    finalBalance: "3000.00"
  };

  const { data: cashBalance = mockCashBalance } = useQuery<CashBalance>({
    queryKey: ["/api/driver/cash-balance"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/driver/cash-balance");
        if (!response.ok) throw new Error("Error al obtener balance de efectivo");
        return await response.json();
      } catch (error) {
        console.error("Error al obtener balance de efectivo:", error);
        return mockCashBalance;
      }
    }
  });

  const mockPerformance: Performance = {
    deliveredOrders: 8,
    totalOrders: 10,
    onTimeDeliveries: 7,
    averageDeliveryTime: 35
  };

  const { data: performance = mockPerformance } = useQuery<Performance>({
    queryKey: ["/api/driver/performance"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/driver/performance");
        if (!response.ok) throw new Error("Error al obtener rendimiento");
        return await response.json();
      } catch (error) {
        console.error("Error al obtener rendimiento:", error);
        return mockPerformance;
      }
    }
  });

  // Filtrar entregas por término de búsqueda
  const filteredDeliveries = todayDeliveries.filter(
    delivery => delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                delivery.customerAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar entregas: primero pendientes, luego en progreso, finalmente completadas
  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    const order = { 'pending': 0, 'in_progress': 1, 'delivered': 2, 'cancelled': 3 };
    return order[a.status] - order[b.status];
  });

  // Calcular estadísticas
  const pendingCount = todayDeliveries.filter(d => d.status === 'pending').length;
  const deliveredCount = todayDeliveries.filter(d => d.status === 'delivered').length;
  const cancelledCount = todayDeliveries.filter(d => d.status === 'cancelled').length;
  const totalCount = todayDeliveries.length;
  
  // Calcular próxima entrega y distancia
  const nextDelivery = sortedDeliveries.find(d => d.status === 'pending');
  const distanceToNext = nextDelivery && currentPosition 
    ? getDistance(currentPosition[0], currentPosition[1], nextDelivery.coordinates[0], nextDelivery.coordinates[1]).toFixed(2)
    : null;

  // Función para marcar entrega como completada
  const handleCompleteDelivery = (deliveryId: number) => {
    // Aquí iría la llamada a la API para actualizar el estado
    toast({
      title: "Entrega completada",
      description: "La entrega ha sido marcada como completada exitosamente.",
      duration: 3000,
    });
    
    // Actualizar la UI optimistamente
    refetch();
  };

  // Función para obtener color según el estado
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Función para obtener icono según el estado
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Navigation className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <CircleX className="h-4 w-4" />;
      default: return <CircleAlert className="h-4 w-4" />;
    }
  };

  // Función para iniciar navegación
  const startNavigation = (delivery: Delivery) => {
    if (!delivery.coordinates) return;
    
    // Verificar si está en un dispositivo móvil
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const [lat, lng] = delivery.coordinates;
    let navigationUrl = '';
    
    if (isMobile) {
      // Para dispositivos móviles, crear enlaces para Google Maps o Waze
      navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      
      // Opcionalmente ofrecer Waze como alternativa
      // navigationUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    } else {
      // Para desktop, abrir Google Maps en el navegador
      navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    
    // Abrir en una nueva pestaña
    window.open(navigationUrl, '_blank');
  };

  return (
    <div className={`${isMobile ? 'p-2' : 'p-4'} max-w-6xl mx-auto`}>
      {/* Diseño móvil */}
      {isMobile ? (
        <Tabs defaultValue="route" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="route" className="flex items-center gap-1">
              <Navigation className="h-4 w-4" />
              <span>Ruta</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1">
              <BoxesIcon className="h-4 w-4" />
              <span>Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>Estadísticas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="route" className="space-y-4">
            {/* Mapa en la vista móvil */}
            <Card className="overflow-hidden p-0">
              <ResponsiveMapContainer minHeight="35vh">
                <MapContainer
                  center={[19.0700, -70.1300]} // Coordenadas de República Dominicana (centro)
                  zoom={10}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationMarker onPositionChange={setCurrentPosition} />
                  <RouteLines deliveries={todayDeliveries} currentPosition={currentPosition} />
                  <MapBoundsAdjuster deliveries={todayDeliveries} />
                  
                  {todayDeliveries.map((delivery, index) => (
                    <Marker 
                      key={delivery.id}
                      position={delivery.coordinates as LatLngExpression}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div class="marker-pin ${
                          delivery.status === 'delivered' ? 'bg-green-500' : 
                          delivery.status === 'pending' 
                            ? (index === 0 ? 'bg-orange-500' : 
                               index === todayDeliveries.length - 1 ? 'bg-green-500' : 
                               'bg-blue-500') 
                            : 'bg-purple-500'
                        } flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-md font-bold">${delivery.id}</div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                      })}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-medium">{delivery.customerName}</h3>
                          <p className="text-sm">{delivery.customerAddress}</p>
                          <p className="text-xs mt-1">{delivery.orderDetails}</p>
                          <div className="mt-2 flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => startNavigation(delivery)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Navigation2 className="h-3 w-3 mr-1" />
                              Navegar
                            </Button>
                            {delivery.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleCompleteDelivery(delivery.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
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
                </MapContainer>
              </ResponsiveMapContainer>
            </Card>

            {/* Siguiente entrega */}
            {nextDelivery && (
              <Card className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <h2 className="font-semibold">Próxima Entrega</h2>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(nextDelivery.status)} flex items-center gap-1`}>
                    {getStatusIcon(nextDelivery.status)}
                    <span>
                      {nextDelivery.status === 'pending' ? 'Pendiente' : 
                       nextDelivery.status === 'in_progress' ? 'En progreso' : 
                       nextDelivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                    </span>
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{nextDelivery.customerName}</h3>
                  <p className="text-sm text-gray-600">{nextDelivery.customerAddress}</p>
                  <div className="flex gap-2 text-sm">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-600" /> {new Date(nextDelivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    {distanceToNext && <span className="flex items-center gap-1"><Navigation className="h-3.5 w-3.5 text-red-600" /> {distanceToNext} km</span>}
                  </div>
                  <div className="py-2">
                    <p className="text-sm font-medium">Detalles del pedido:</p>
                    <p className="text-sm">{nextDelivery.orderDetails}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button 
                    onClick={() => startNavigation(nextDelivery)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Navigation2 className="h-4 w-4 mr-2" />
                    Iniciar Navegación
                  </Button>
                  <Button 
                    onClick={() => handleCompleteDelivery(nextDelivery.id)}
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completar
                  </Button>
                </div>
              </Card>
            )}

            {/* Lista de entregas (simplificada) */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
                  <h2 className="font-semibold">Todas las Entregas</h2>
                </div>
                <Badge variant="outline">{pendingCount} pendientes</Badge>
              </div>
              
              <div className="relative mb-4">
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
              
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {sortedDeliveries.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No se encontraron entregas
                    </div>
                  ) : (
                    sortedDeliveries.map((delivery) => (
                      <Card 
                        key={delivery.id} 
                        className={`p-3 border-l-4 ${
                          delivery.status === 'delivered' ? 'border-l-green-500' : 
                          delivery.status === 'pending' ? 'border-l-yellow-500' : 
                          delivery.status === 'in_progress' ? 'border-l-blue-500' :
                          'border-l-red-500'
                        }`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium">{delivery.customerName}</h3>
                            <p className="text-xs text-gray-500">{delivery.customerAddress}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge variant="outline" className={getStatusColor(delivery.status)}>
                              {delivery.status === 'pending' ? 'Pendiente' : 
                               delivery.status === 'in_progress' ? 'En progreso' : 
                               delivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                            </Badge>
                            <p className="text-xs mt-1">
                              {new Date(delivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-2 text-xs">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                            onClick={() => startNavigation(delivery)}
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Navegar
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50 px-2"
                            onClick={() => handleCompleteDelivery(delivery.id)}
                            disabled={delivery.status !== 'pending'}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completar
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 ml-auto"
                            onClick={() => {
                              setSelectedDelivery(delivery);
                              setShowDetails(true);
                            }}
                          >
                            <Package className="h-3 w-3 mr-1" />
                            Detalles
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BoxesIcon className="h-5 w-5 text-orange-600" />
                <h2 className="font-semibold">Inventario de Envases</h2>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Entregados</TableHead>
                    <TableHead className="text-right">Devueltos</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.customerName}</TableCell>
                      <TableCell className="text-right">{delivery.containers.delivered}</TableCell>
                      <TableCell className="text-right">{delivery.containers.returned}</TableCell>
                      <TableCell className={`text-right font-medium ${delivery.containers.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {delivery.containers.balance}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 bg-orange-50 p-3 rounded-md border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Recordatorio:</p>
                    <p className="text-xs text-orange-700">No olvides recoger todos los envases vacíos. Cada envase tiene un valor de RD$500.</p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold">Balance de Efectivo</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Balance Inicial:</span>
                  <span className="font-medium">${cashBalance.initialBalance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ingresos:</span>
                  <span className="font-medium text-green-600">+${cashBalance.cashIn}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Salidas:</span>
                  <span className="font-medium text-red-600">-${cashBalance.cashOut}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Balance Final:</span>
                    <span className="font-bold text-lg">${cashBalance.finalBalance}</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h2 className="font-semibold">Estadísticas del Día</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-md p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">Total Entregas</p>
                  <p className="text-2xl font-bold text-blue-700">{totalCount}</p>
                </div>
                <div className="bg-green-50 rounded-md p-3 border border-green-100">
                  <p className="text-xs text-green-600 font-medium">Completadas</p>
                  <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
                </div>
                <div className="bg-yellow-50 rounded-md p-3 border border-yellow-100">
                  <p className="text-xs text-yellow-600 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
                </div>
                <div className="bg-red-50 rounded-md p-3 border border-red-100">
                  <p className="text-xs text-red-600 font-medium">Canceladas</p>
                  <p className="text-2xl font-bold text-red-700">{cancelledCount}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">Entregas Completadas</p>
                    <p className="text-sm font-medium">{performance.deliveredOrders}/{performance.totalOrders}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${(performance.deliveredOrders / (performance.totalOrders || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">Entregas a Tiempo</p>
                    <p className="text-sm font-medium">{performance.onTimeDeliveries}/{performance.deliveredOrders}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${(performance.onTimeDeliveries / (performance.deliveredOrders || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">Tiempo Promedio de Entrega</p>
                    <p className="text-sm font-medium">{performance.averageDeliveryTime} min</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(performance.averageDeliveryTime / 60) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold">Programación de Hoy</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Inicio de Ruta:</span>
                  <span className="font-medium">8:00 AM</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Descanso Programado:</span>
                  <span className="font-medium">12:00 PM - 1:00 PM</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Fin de Ruta Estimado:</span>
                  <span className="font-medium">4:00 PM</span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-9">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reportar Problema
                  </Button>
                  <Button variant="outline" className="flex-1 h-9">
                    <Phone className="h-4 w-4 mr-2" />
                    Llamar Oficina
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Diseño desktop
        <div className="space-y-4">
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
          
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Entregas</p>
                  <p className="text-2xl font-bold text-blue-700">{totalCount}</p>
                </div>
                <div className="p-2 bg-blue-600 rounded-full text-white">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
            </Card>
            
            <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-green-600 font-medium">Completadas</p>
                  <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
                </div>
                <div className="p-2 bg-green-600 rounded-full text-white">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
            </Card>
            
            <Card className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
                </div>
                <div className="p-2 bg-yellow-600 rounded-full text-white">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
            </Card>
            
            <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Tiempo Promedio</p>
                  <p className="text-2xl font-bold text-purple-700">{performance.averageDeliveryTime} min</p>
                </div>
                <div className="p-2 bg-purple-600 rounded-full text-white">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
            </Card>
          </div>
          
          <div className="grid grid-cols-12 gap-4">
            {/* Mapa */}
            <Card className="col-span-7 p-0 overflow-hidden">
              <ResponsiveMapContainer minHeight="70vh">
                <MapContainer
                  center={[18.4700, -69.9100]} // Santo Domingo
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationMarker onPositionChange={setCurrentPosition} />
                  <RouteLines deliveries={todayDeliveries} currentPosition={currentPosition} />
                  
                  {todayDeliveries.map((delivery) => (
                    <Marker 
                      key={delivery.id}
                      position={delivery.coordinates as LatLngExpression}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div class="marker-pin ${
                          delivery.status === 'delivered' ? 'bg-green-500' : 
                          delivery.status === 'pending' ? 'bg-yellow-500' : 
                          'bg-blue-500'
                        } flex items-center justify-center text-white rounded-full w-8 h-8 border-2 border-white shadow-md">${delivery.id}</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                      })}
                    >
                      <Popup>
                        <div className="p-2 w-[250px]">
                          <h3 className="font-medium text-lg">{delivery.customerName}</h3>
                          <p className="text-sm">{delivery.customerAddress}</p>
                          <div className="my-2">
                            <Badge variant="outline" className={getStatusColor(delivery.status)}>
                              {delivery.status === 'pending' ? 'Pendiente' : 
                               delivery.status === 'in_progress' ? 'En progreso' : 
                               delivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{delivery.orderDetails}</p>
                          <div className="mt-3 flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => startNavigation(delivery)}
                              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                            >
                              <Navigation2 className="h-3 w-3 mr-2" />
                              Navegar
                            </Button>
                            {delivery.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleCompleteDelivery(delivery.id)}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                <CheckCircle className="h-3 w-3 mr-2" />
                                Completar
                              </Button>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </ResponsiveMapContainer>
            </Card>
          
            {/* Sidebar derecho */}
            <div className="col-span-5 space-y-4">
              {/* Buscador */}
              <Card className="p-4">
                <div className="relative">
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
              </Card>
              
              {/* Próxima entrega */}
              {nextDelivery && (
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <ArrowRightCircle className="h-5 w-5 text-blue-600" />
                      <h2 className="font-semibold">Próxima Entrega</h2>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(nextDelivery.status)} flex items-center gap-1`}>
                      {getStatusIcon(nextDelivery.status)}
                      <span>
                        {nextDelivery.status === 'pending' ? 'Pendiente' : 
                         nextDelivery.status === 'in_progress' ? 'En progreso' : 
                         nextDelivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                      </span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{nextDelivery.customerName}</h3>
                    <p className="text-sm text-gray-600">{nextDelivery.customerAddress}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-600" /> {new Date(nextDelivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {distanceToNext && <span className="flex items-center gap-1"><Navigation className="h-3.5 w-3.5 text-red-600" /> {distanceToNext} km</span>}
                      <span className="flex items-center gap-1"><ReceiptText className="h-3.5 w-3.5 text-green-600" /> ${nextDelivery.orderValue}</span>
                    </div>
                    <div className="py-2">
                      <p className="text-sm font-medium">Detalles del pedido:</p>
                      <p className="text-sm">{nextDelivery.orderDetails}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t">
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <p className="text-xs text-blue-600">Entregados</p>
                        <p className="text-lg font-semibold text-blue-700">{nextDelivery.containers.delivered}</p>
                      </div>
                      <div className="bg-green-50 rounded p-2 text-center">
                        <p className="text-xs text-green-600">A Recoger</p>
                        <p className="text-lg font-semibold text-green-700">{nextDelivery.containers.returned}</p>
                      </div>
                      <div className="bg-amber-50 rounded p-2 text-center">
                        <p className="text-xs text-amber-600">Balance</p>
                        <p className="text-lg font-semibold text-amber-700">{nextDelivery.containers.balance}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <Button 
                      onClick={() => startNavigation(nextDelivery)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Navigation2 className="h-4 w-4 mr-2" />
                      Navegar
                    </Button>
                    <Button 
                      onClick={() => handleCompleteDelivery(nextDelivery.id)}
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completar
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-purple-500 text-purple-600 hover:bg-purple-50"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </Button>
                  </div>
                </Card>
              )}
              
              {/* Lista de entregas */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-purple-600" />
                    <h2 className="font-semibold">Lista de Entregas</h2>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => refetch()}>
                    <RefreshCcw className="h-3 w-3 mr-1" />
                    Actualizar
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {sortedDeliveries.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No se encontraron entregas
                      </div>
                    ) : (
                      sortedDeliveries.map((delivery) => (
                        <Card 
                          key={delivery.id} 
                          className={`p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                            delivery.status === 'delivered' ? 'border-l-green-500' : 
                            delivery.status === 'pending' ? 'border-l-yellow-500' : 
                            delivery.status === 'in_progress' ? 'border-l-blue-500' :
                            'border-l-red-500'
                          }`}
                        >
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium text-base">{delivery.customerName}</h3>
                              <p className="text-xs text-gray-500">{delivery.customerAddress}</p>
                              <div className="flex gap-2 items-center mt-1">
                                <Badge variant="outline" className={getStatusColor(delivery.status)}>
                                  {delivery.status === 'pending' ? 'Pendiente' : 
                                  delivery.status === 'in_progress' ? 'En progreso' : 
                                  delivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                                </Badge>
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {new Date(delivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className="text-sm font-medium">${delivery.orderValue}</p>
                              <div className="mt-1 flex gap-1">
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                                  onClick={() => startNavigation(delivery)}
                                >
                                  <Navigation className="h-3 w-3 mr-1" />
                                  Navegar
                                </Button>
                                {delivery.status === 'pending' && (
                                  <Button 
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-green-600 hover:bg-green-50"
                                    onClick={() => handleCompleteDelivery(delivery.id)}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completar
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </div>
          
          {/* Fila inferior */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BoxesIcon className="h-5 w-5 text-orange-600" />
                <h2 className="font-semibold">Balance de Envases</h2>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Entregados</TableHead>
                    <TableHead className="text-right">Devueltos</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.customerName}</TableCell>
                      <TableCell className="text-right">{delivery.containers.delivered}</TableCell>
                      <TableCell className="text-right">{delivery.containers.returned}</TableCell>
                      <TableCell className={`text-right font-medium ${delivery.containers.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {delivery.containers.balance}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold">Balance de Efectivo</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Balance Inicial:</span>
                  <span className="font-medium">${cashBalance.initialBalance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ingresos:</span>
                  <span className="font-medium text-green-600">+${cashBalance.cashIn}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Salidas:</span>
                  <span className="font-medium text-red-600">-${cashBalance.cashOut}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Balance Final:</span>
                    <span className="font-bold text-lg">${cashBalance.finalBalance}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t">
                <Button className="w-full">
                  <ReceiptText className="h-4 w-4 mr-2" />
                  Registrar Transacción
                </Button>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h2 className="font-semibold">Estadísticas y Rendimiento</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">Entregas Completadas</p>
                    <p className="text-sm font-medium">{performance.deliveredOrders}/{performance.totalOrders}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${(performance.deliveredOrders / (performance.totalOrders || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">Entregas a Tiempo</p>
                    <p className="text-sm font-medium">{performance.onTimeDeliveries}/{performance.deliveredOrders}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${(performance.onTimeDeliveries / (performance.deliveredOrders || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-600">Tiempo Promedio de Entrega</p>
                    <p className="text-sm font-medium">{performance.averageDeliveryTime} min</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(performance.averageDeliveryTime / 60) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t">
                <Button variant="outline" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Reportar Incidencia
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
      
      {/* Modal para detalles de entrega en móvil */}
      {isMobile && showDetails && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">{selectedDelivery.customerName}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setShowDetails(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm">{selectedDelivery.customerAddress}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className={getStatusColor(selectedDelivery.status)}>
                    {selectedDelivery.status === 'pending' ? 'Pendiente' : 
                     selectedDelivery.status === 'in_progress' ? 'En progreso' : 
                     selectedDelivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {new Date(selectedDelivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Badge>
                </div>
                
                <div className="mt-3">
                  <h4 className="text-sm font-medium">Detalles del Pedido:</h4>
                  <p className="text-sm">{selectedDelivery.orderDetails}</p>
                </div>
                
                <div className="mt-3">
                  <h4 className="text-sm font-medium">Valor del Pedido:</h4>
                  <p className="text-base font-bold">${selectedDelivery.orderValue}</p>
                </div>
                
                <div className="bg-orange-50 p-3 rounded-md border border-orange-200 mt-3">
                  <h4 className="text-sm font-medium text-orange-800">Balance de Envases:</h4>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center">
                      <p className="text-xs text-orange-600">Entregados</p>
                      <p className="text-lg font-semibold">{selectedDelivery.containers.delivered}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-orange-600">Devueltos</p>
                      <p className="text-lg font-semibold">{selectedDelivery.containers.returned}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-orange-600">Balance</p>
                      <p className="text-lg font-semibold">{selectedDelivery.containers.balance}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button 
                  onClick={() => {
                    startNavigation(selectedDelivery);
                    setShowDetails(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Navigation2 className="h-4 w-4 mr-2" />
                  Navegar
                </Button>
                {selectedDelivery.status === 'pending' && (
                  <Button 
                    onClick={() => {
                      handleCompleteDelivery(selectedDelivery.id);
                      setShowDetails(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completar
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
