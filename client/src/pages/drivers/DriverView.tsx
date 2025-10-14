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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  ClipboardList, 
  ArrowRightCircle,
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
  Phone,
  Check,
  Clock,
  ArrowRight,
  CheckCircle,
  Info,
  CreditCard,
  Receipt,
  Plus,
  Minus,
  FileText,
  ShoppingCart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiRequest } from '@/lib/queryClient';

// Interfaces
interface DeliveryProduct {
  id: number;
  name: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface Delivery {
  id: number;
  customerId: number;
  customerName: string;
  customerAddress: string;
  coordinates: [number, number];
  estimatedTime: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled';
  priority: 'normal' | 'high' | 'low';
  orderDetails: string;
  orderValue: string;
  pendingPayment: boolean;
  paymentMethod?: 'cash' | 'transfer' | 'credit' | 'pending';
  orderNumber?: string;
  invoiceNumber?: string;
  containers: {
    delivered: number;
    returned: number;
    balance: number;
  };
  products?: DeliveryProduct[];
  notes?: string;
  hasRecurringOrder?: boolean;
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
  
  const filteredDeliveries = useMemo(() => {
    if (!searchTerm) return todayDeliveries;
    
    return todayDeliveries.filter(delivery => 
      delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      delivery.customerAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [todayDeliveries, searchTerm]);
  
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
      return apiRequest(`/api/driver/deliveries/${id}/complete`, { method: 'POST', data: {} });
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
  
  // Estado para el modal de detalle de entrega
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('info');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [returnedContainers, setReturnedContainers] = useState(0);
  
  // Estado para pedido futuro
  const [newOrderDate, setNewOrderDate] = useState<Date | undefined>(undefined);
  const [newOrderProducts, setNewOrderProducts] = useState<{id: number, quantity: number}[]>([]);
  const [newOrderNotes, setNewOrderNotes] = useState('');

  const startNavigation = (delivery: Delivery) => {
    try {
      const [lat, lng] = delivery.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        toast({
          title: 'Navegación bloqueada',
          description: 'Por favor permite las ventanas emergentes para abrir el navegador.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error al abrir navegación',
        description: `No se pudo abrir Google Maps: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  };
  
  const handleOpenDetail = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setReturnedContainers(0);
    setPaymentAmount(delivery.orderValue);
    setPaymentMethod('cash');
    setIsDetailOpen(true);
  };
  
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedDelivery(null);
    setActiveDetailTab('info');
  };
  
  const handleProcessPayment = async () => {
    if (!selectedDelivery) return;
    
    try {
      await apiRequest(`/api/driver/deliveries/${selectedDelivery.id}/payment`, {
        method: 'POST',
        data: {
          amount: paymentAmount,
          method: paymentMethod,
          returnedContainers: returnedContainers
        }
      });
      
      toast({
        title: 'Pago procesado',
        description: 'El pago ha sido registrado exitosamente.',
      });
      
      refetch();
      handleCompleteDelivery(selectedDelivery.id);
      handleCloseDetail();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo procesar el pago: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  };
  
  const handleCreateInvoice = async () => {
    if (!selectedDelivery) return;
    
    try {
      await apiRequest(`/api/driver/deliveries/${selectedDelivery.id}/invoice`, { method: 'POST', data: {} });
      
      toast({
        title: 'Factura creada',
        description: 'La factura ha sido generada exitosamente.',
      });
      
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo crear la factura: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  };
  
  const handleCreateFutureOrder = async () => {
    if (!selectedDelivery || !newOrderDate) return;
    
    try {
      await apiRequest(`/api/driver/customers/${selectedDelivery.customerId}/future-order`, {
        method: 'POST',
        data: {
          scheduledDate: newOrderDate,
          products: newOrderProducts,
          notes: newOrderNotes
        }
      });
      
      toast({
        title: 'Pedido programado',
        description: 'El pedido futuro ha sido creado exitosamente.',
      });
      
      setNewOrderDate(undefined);
      setNewOrderProducts([]);
      setNewOrderNotes('');
      handleCloseDetail();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo crear el pedido: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
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
                          {delivery.containers.delivered}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 mt-2">
                      <Button 
                        size="sm" 
                        onClick={() => startNavigation(delivery)}
                        className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white flex-1/3"
                      >
                        <Navigation2 className="h-3 w-3 mr-1" />
                        Navegar
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenDetail(delivery)}
                        className="text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white flex-1/3"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Detalle
                      </Button>
                      {delivery.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleCompleteDelivery(delivery.id)}
                          className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white flex-1/3"
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
          
          <TabsContent value="mapa">
            <ResponsiveMapContainer minHeight="70vh">
              <MapContainer
                center={[19.075380, -70.128822]} // Ubicación del almacén
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
          </TabsContent>
          
          <TabsContent value="stats">
            <Card className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <h2 className="font-semibold text-sm">Balance de Efectivo</h2>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-gray-600">Saldo Inicial:</span>
                  <span className="font-semibold">RD$ {cashBalance.initialBalance}</span>
                </div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-gray-600">Cobros en Efectivo:</span>
                  <span className="font-semibold text-green-600">+ RD$ {cashBalance.cashIn}</span>
                </div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-gray-600">Gastos:</span>
                  <span className="font-semibold text-red-600">- RD$ {cashBalance.cashOut}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t text-sm">
                  <span className="font-medium">Balance Final:</span>
                  <span className="font-bold">RD$ {cashBalance.finalBalance}</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 mt-2">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <h2 className="font-semibold text-sm">Estadísticas del Día</h2>
              </div>
              
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-xs text-gray-600">Entregas Completadas</p>
                    <p className="text-xs font-medium">{performance.deliveredOrders}/{performance.totalOrders}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${(performance.deliveredOrders / (performance.totalOrders || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-xs text-gray-600">Entregas a Tiempo</p>
                    <p className="text-xs font-medium">{performance.onTimeDeliveries}/{performance.deliveredOrders}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(performance.onTimeDeliveries / (performance.deliveredOrders || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-xs text-gray-600">Tiempo Promedio de Entrega</p>
                    <p className="text-xs font-medium">{performance.averageDeliveryTime} min</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(performance.averageDeliveryTime / 60) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 mt-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Programación de Hoy</h2>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span>Inicio de Ruta:</span>
                  <span className="font-medium">8:00 AM</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Descanso Programado:</span>
                  <span className="font-medium">12:00 PM - 1:00 PM</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Fin de Ruta Estimado:</span>
                  <span className="font-medium">4:00 PM</span>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t">
                <div className="flex gap-1.5">
                  <Button variant="outline" className="flex-1 h-8 text-xs">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Reportar Problema
                  </Button>
                  <Button variant="outline" className="flex-1 h-8 text-xs">
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    Llamar Oficina
                  </Button>
                </div>
              </div>
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
          
          <div className="grid grid-cols-4 gap-2">
            <div className="relative overflow-hidden rounded-md border shadow-sm">
              <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
              <div className="p-2 pl-2.5">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-normal text-gray-500">
                    Total Entregas
                  </div>
                  <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="mt-1 text-base font-semibold text-blue-600">
                  {totalCount}
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-md border shadow-sm">
              <div className="absolute left-0 top-0 h-full w-1 bg-green-500"></div>
              <div className="p-2 pl-2.5">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-normal text-gray-500">
                    Completadas
                  </div>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div className="mt-1 text-base font-semibold text-green-600">
                  {deliveredCount}
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-md border shadow-sm">
              <div className="absolute left-0 top-0 h-full w-1 bg-yellow-500"></div>
              <div className="p-2 pl-2.5">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-normal text-gray-500">
                    Pendientes
                  </div>
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                </div>
                <div className="mt-1 text-base font-semibold text-yellow-600">
                  {pendingCount}
                </div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-md border shadow-sm">
              <div className="absolute left-0 top-0 h-full w-1 bg-purple-500"></div>
              <div className="p-2 pl-2.5">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-normal text-gray-500">
                    Tiempo Promedio
                  </div>
                  <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div className="mt-1 text-base font-semibold text-purple-600">
                  {performance.averageDeliveryTime} min
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-12 gap-3">
            {/* Mapa */}
            <Card className="col-span-7 p-0 overflow-hidden">
              <ResponsiveMapContainer minHeight="70vh">
                <MapContainer
                  center={[19.075380, -70.128822]} // Ubicación del almacén
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
            <div className="col-span-5 space-y-2">
              {/* Buscador */}
              <Card className="p-3">
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
                <Card className="p-3 border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5">
                      <ArrowRightCircle className="h-4 w-4 text-blue-600" />
                      <h2 className="font-semibold text-sm">Próxima Entrega</h2>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(nextDelivery.status)} flex items-center gap-1 text-xs`}>
                      {getStatusIcon(nextDelivery.status)}
                      <span>
                        {nextDelivery.status === 'pending' ? 'Pendiente' : 
                         nextDelivery.status === 'in_progress' ? 'En progreso' : 
                         nextDelivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                      </span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-base font-medium">{nextDelivery.customerName}</h3>
                    <p className="text-xs text-gray-600">{nextDelivery.customerAddress}</p>
                    <div className="flex gap-4 text-xs my-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-blue-600" /> 
                        {new Date(nextDelivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-green-600" /> 
                        {nextDelivery.orderValue}
                      </span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Button 
                        size="sm" 
                        onClick={() => startNavigation(nextDelivery)}
                        className="text-xs h-7 flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Navigation2 className="h-3 w-3 mr-1.5" />
                        Navegar
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleCompleteDelivery(nextDelivery.id)}
                        className="text-xs h-7 flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1.5" />
                        Completar
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Lista de entregas */}
              <div className="space-y-1.5">
                <h2 className="font-semibold text-sm flex items-center gap-1.5 px-1">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Listado de Entregas
                </h2>
                
                <div className="space-y-1.5 overflow-auto max-h-[60vh] pr-1">
                  {filteredDeliveries.map((delivery) => (
                    <Card key={delivery.id} className={`border-l-4 ${delivery.status === 'delivered' ? 'border-l-green-500' : delivery.status === 'pending' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                      <CardContent className="p-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{delivery.customerName}</p>
                            <p className="text-xs text-gray-600 line-clamp-1">{delivery.customerAddress}</p>
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
                              {delivery.containers.delivered}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-1 mt-1.5">
                          <Button 
                            size="sm" 
                            onClick={() => startNavigation(delivery)}
                            className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white flex-1"
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de entrega */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          {selectedDelivery && (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Detalle de Entrega #{selectedDelivery.id}</DialogTitle>
                <DialogDescription>
                  Cliente: {selectedDelivery.customerName}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="info" value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
                <TabsList className="grid grid-cols-4 p-0 m-4">
                  <TabsTrigger value="info" className="text-xs">
                    <Info className="h-3.5 w-3.5 mr-1.5" />
                    Información
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="text-xs">
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    Pago
                  </TabsTrigger>
                  <TabsTrigger value="invoice" className="text-xs">
                    <Receipt className="h-3.5 w-3.5 mr-1.5" />
                    Factura
                  </TabsTrigger>
                  <TabsTrigger value="future" className="text-xs">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Pedido
                  </TabsTrigger>
                </TabsList>
                
                {/* Tab de Información */}
                <TabsContent value="info" className="p-4 pt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Dirección</h4>
                        <p className="text-sm text-gray-600">{selectedDelivery.customerAddress}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Hora Estimada</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(selectedDelivery.estimatedTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Detalles del Pedido</h4>
                      <p className="text-sm text-gray-600">{selectedDelivery.orderDetails}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Estado</h4>
                        <Badge variant="outline" className={getStatusColor(selectedDelivery.status)}>
                          {selectedDelivery.status === 'pending' ? 'Pendiente' : 
                           selectedDelivery.status === 'in_progress' ? 'En progreso' : 
                           selectedDelivery.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Prioridad</h4>
                        <Badge variant={
                          selectedDelivery.priority === 'high' ? 'destructive' : 
                          selectedDelivery.priority === 'normal' ? 'default' : 'secondary'
                        }>
                          {selectedDelivery.priority === 'high' ? 'Alta' : 
                           selectedDelivery.priority === 'normal' ? 'Normal' : 'Baja'}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Valor</h4>
                        <p className="text-sm font-semibold">RD$ {selectedDelivery.orderValue}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Envases</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="border rounded p-2">
                          <span className="text-gray-600 block text-xs">Entregados</span>
                          <span className="font-semibold">{selectedDelivery.containers.delivered}</span>
                        </div>
                        <div className="border rounded p-2">
                          <span className="text-gray-600 block text-xs">Devueltos</span>
                          <span className="font-semibold">{selectedDelivery.containers.returned}</span>
                        </div>
                        <div className="border rounded p-2">
                          <span className="text-gray-600 block text-xs">Balance</span>
                          <span className="font-semibold">{selectedDelivery.containers.balance}</span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedDelivery.products && selectedDelivery.products.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Productos</h4>
                        <div className="border rounded-md">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="p-2 text-left">Producto</th>
                                <th className="p-2 text-center">Cant.</th>
                                <th className="p-2 text-right">Precio</th>
                                <th className="p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDelivery.products.map((product) => (
                                <tr key={product.id} className="border-t">
                                  <td className="p-2 text-left">{product.name}</td>
                                  <td className="p-2 text-center">{product.quantity}</td>
                                  <td className="p-2 text-right">RD$ {product.unitPrice}</td>
                                  <td className="p-2 text-right">RD$ {product.total}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {selectedDelivery.notes && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Notas</h4>
                        <p className="text-sm text-gray-600">{selectedDelivery.notes}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                {/* Tab de Pago */}
                <TabsContent value="payment" className="p-4 pt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Total a Cobrar</h4>
                        <Input 
                          type="text" 
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="text-right"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Método de Pago</h4>
                        <Select
                          value={paymentMethod}
                          onValueChange={(value) => setPaymentMethod(value as 'cash' | 'transfer' | 'credit')}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar método" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                            <SelectItem value="credit">Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Envases Devueltos</h4>
                      <div className="flex items-center">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setReturnedContainers(Math.max(0, returnedContainers - 1))}
                          disabled={returnedContainers <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-semibold">{returnedContainers}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setReturnedContainers(returnedContainers + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleProcessPayment}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Procesar Pago
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Tab de Factura */}
                <TabsContent value="invoice" className="p-4 pt-0">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md text-center space-y-2">
                      {selectedDelivery.invoiceNumber ? (
                        <>
                          <Receipt className="h-12 w-12 mx-auto text-green-600" />
                          <h4 className="text-lg font-medium">Factura Generada</h4>
                          <p className="text-sm text-gray-600">Nro. Factura: {selectedDelivery.invoiceNumber}</p>
                        </>
                      ) : (
                        <>
                          <Receipt className="h-12 w-12 mx-auto text-gray-400" />
                          <h4 className="text-lg font-medium">Sin Factura</h4>
                          <p className="text-sm text-gray-600">No se ha generado factura para esta entrega</p>
                        </>
                      )}
                    </div>
                    
                    {!selectedDelivery.invoiceNumber && (
                      <Button 
                        className="w-full" 
                        onClick={handleCreateInvoice}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generar Factura
                      </Button>
                    )}
                  </div>
                </TabsContent>
                
                {/* Tab de Pedido Futuro */}
                <TabsContent value="future" className="p-4 pt-0">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Fecha del Próximo Pedido</h4>
                      <Input 
                        type="date" 
                        value={newOrderDate ? newOrderDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => setNewOrderDate(e.target.value ? new Date(e.target.value) : undefined)}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Productos</h4>
                      <div className="space-y-2">
                        {/* Aquí iría un selector de productos que modificaría newOrderProducts */}
                        <p className="text-xs text-gray-500">Los mismos productos serán incluidos en el nuevo pedido.</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Notas</h4>
                      <Textarea 
                        placeholder="Instrucciones especiales para el próximo pedido..." 
                        value={newOrderNotes}
                        onChange={(e) => setNewOrderNotes(e.target.value)}
                        className="resize-none h-20"
                      />
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleCreateFutureOrder}
                      disabled={!newOrderDate}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Crear Pedido Futuro
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="p-4 bg-gray-50">
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleCloseDetail}>Cerrar</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}