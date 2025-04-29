import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useDrivers } from '@/hooks/use-drivers';
import { useTrucks } from '@/hooks/use-trucks';
import { useZones } from '@/hooks/use-zones';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Truck, MapPin, Calendar, Users } from 'lucide-react';

interface Order {
  id: number;
  customerId: number;
  status: string;
  date: string;
  total: string;
  paymentMethod: string;
  deliveryCoordinates?: string;
  notes?: string;
  customer: Customer | null;
  zone: Zone | null;
}

interface Customer {
  id: number;
  businessname: string;
  phone: string;
  street: string;
  streetnumber: string;
  zoneid: number | null;
}

interface Zone {
  id: number;
  name: string;
  color: string;
}

interface Stop {
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  coordinates?: string;
  sequenceNumber: number;
  distance?: number;
  estimatedTime?: number;
}

interface OptimizationResult {
  stops: Stop[];
  statistics: {
    totalStops: number;
    totalDistance: string;
    estimatedTime: number;
  };
}

const RouteGeneratorPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para los filtros y selección
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedAssistant, setSelectedAssistant] = useState<string>("");
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [routeName, setRouteName] = useState<string>("");
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  
  // Obtener datos
  const { data: drivers = [] } = useDrivers();
  const { data: trucks = [] } = useTrucks();
  const { data: zones = [] } = useZones();
  
  // Consulta para obtener pedidos pendientes
  const { data: pendingOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/route-generator/orders/pending'],
    queryFn: async () => {
      console.log("Fetching pending orders for route generator");
      const response = await apiRequest('/api/route-generator/orders/pending');
      console.log("Pending orders response:", response);
      return response;
    },
    refetchOnWindowFocus: false
  });
  
  // Mutación para optimizar ruta
  const optimizeRouteMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      const response = await apiRequest('/api/route-generator/optimize', {
        method: 'POST',
        body: JSON.stringify({ orderIds }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response;
    },
    onSuccess: (data) => {
      setOptimizationResult(data);
      toast({
        title: t('Ruta optimizada'),
        description: t('Se ha optimizado la ruta con {{count}} paradas', { count: data.stops.length }),
      });
    },
    onError: (error) => {
      console.error('Error al optimizar ruta:', error);
      toast({
        title: t('Error'),
        description: t('No se pudo optimizar la ruta'),
        variant: 'destructive',
      });
    }
  });
  
  // Mutación para crear ruta
  const createRouteMutation = useMutation({
    mutationFn: async (routeData: any) => {
      const response = await apiRequest('/api/route-generator/create', {
        method: 'POST',
        body: JSON.stringify(routeData),
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: t('Ruta creada'),
        description: t('Se ha creado la ruta con éxito'),
      });
      
      // Limpiar estado
      setSelectedOrders([]);
      setOptimizationResult(null);
      setRouteName("");
      
      // Refrescar consultas
      queryClient.invalidateQueries({ queryKey: ['/api/route-generator/orders/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
    },
    onError: (error) => {
      console.error('Error al crear ruta:', error);
      toast({
        title: t('Error'),
        description: t('No se pudo crear la ruta'),
        variant: 'destructive',
      });
    }
  });
  
  // Generar nombre de ruta automáticamente cuando cambie la fecha o zona
  useEffect(() => {
    if (selectedDate && selectedZone) {
      const date = format(selectedDate, 'dd-MM-yyyy', { locale: es });
      const zone = zones.find(z => z.id.toString() === selectedZone)?.name || '';
      setRouteName(`Ruta ${zone} ${date}`);
    }
  }, [selectedDate, selectedZone, zones]);
  
  // Manejar cambio en checkbox de selección
  const handleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };
  
  // Seleccionar todos los pedidos
  const handleSelectAll = () => {
    if (pendingOrders.length === selectedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map((order: Order) => order.id));
    }
  };
  
  // Filtrar por zona
  const filteredOrders = selectedZone 
    ? pendingOrders.filter((order: Order) => order.zone?.id.toString() === selectedZone)
    : pendingOrders;
  
  // Optimizar ruta seleccionada
  const handleOptimizeRoute = () => {
    if (selectedOrders.length === 0) {
      toast({
        title: t('Error'),
        description: t('Seleccione al menos un pedido para optimizar'),
        variant: 'destructive',
      });
      return;
    }
    
    // Enviamos directamente los IDs de los pedidos como espera el servidor
    optimizeRouteMutation.mutate(selectedOrders);
  };
  
  // Crear ruta con los pedidos optimizados
  const handleCreateRoute = () => {
    if (!selectedDriver || !selectedZone || !routeName || !optimizationResult) {
      toast({
        title: t('Error'),
        description: t('Complete todos los campos requeridos'),
        variant: 'destructive',
      });
      return;
    }
    
    const routeData = {
      name: routeName,
      driverId: parseInt(selectedDriver),
      assistantId: selectedAssistant ? parseInt(selectedAssistant) : null,
      truckId: selectedTruck ? parseInt(selectedTruck) : null,
      zoneId: parseInt(selectedZone),
      date: format(selectedDate, 'yyyy-MM-dd'),
      stops: optimizationResult.stops
    };
    
    createRouteMutation.mutate(routeData);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('Generador de Rutas')}</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('Filtros')}</CardTitle>
          <CardDescription>{t('Seleccione los filtros para los pedidos pendientes')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('Fecha de entrega')}
              </label>
              <DatePicker
                date={selectedDate}
                onChange={setSelectedDate}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('Zona')}
              </label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Seleccionar zona')} />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone: any) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={() => refetch()}
                className="mt-6"
                variant="outline"
                size="sm"
              >
                {t('Actualizar pedidos')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('Pedidos Pendientes')}</CardTitle>
              <CardDescription>
                {t('Seleccione los pedidos que desea incluir en la ruta')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">{t('Cargando pedidos...')}</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-4">{t('No hay pedidos pendientes')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>{t('ID')}</TableHead>
                        <TableHead>{t('Cliente')}</TableHead>
                        <TableHead>{t('Dirección')}</TableHead>
                        <TableHead>{t('Zona')}</TableHead>
                        <TableHead>{t('Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order: Order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={() => handleOrderSelection(order.id)}
                            />
                          </TableCell>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.customer?.businessname || '-'}</TableCell>
                          <TableCell>
                            {order.customer 
                              ? `${order.customer.street} ${order.customer.streetnumber || ''}` 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {order.zone && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: order.zone.color }}
                                />
                              )}
                              {order.zone?.name || '-'}
                            </div>
                          </TableCell>
                          <TableCell>RD$ {order.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                {t('Seleccionados')}: {selectedOrders.length} / {filteredOrders.length}
              </div>
              <Button 
                onClick={handleOptimizeRoute} 
                disabled={selectedOrders.length === 0 || optimizeRouteMutation.isPending}
              >
                {optimizeRouteMutation.isPending 
                  ? t('Optimizando...') 
                  : t('Optimizar Ruta')}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('Detalles de la Ruta')}</CardTitle>
              <CardDescription>
                {t('Configure los detalles de la ruta a crear')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Nombre de la Ruta')}</label>
                  <input
                    type="text"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder={t('Nombre de la ruta')}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('Conductor')}
                  </label>
                  <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Seleccionar conductor')} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver: any) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('Asistente (opcional)')}
                  </label>
                  <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Seleccionar asistente')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('Sin asistente')}</SelectItem>
                      {drivers.map((driver: any) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    {t('Vehículo (opcional)')}
                  </label>
                  <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Seleccionar vehículo')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('Sin vehículo')}</SelectItem>
                      {trucks.map((truck: any) => (
                        <SelectItem key={truck.id} value={truck.id.toString()}>
                          {truck.brand} {truck.model} ({truck.plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            
            {optimizationResult && (
              <>
                <Separator />
                <CardHeader>
                  <CardTitle>{t('Resultado de la Optimización')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('Paradas')}:</span>
                      <span className="font-medium">{optimizationResult.statistics.totalStops}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Distancia Total')}:</span>
                      <span className="font-medium">{optimizationResult.statistics.totalDistance} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Tiempo Estimado')}:</span>
                      <span className="font-medium">{optimizationResult.statistics.estimatedTime} minutos</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div>
                      <h4 className="font-medium mb-2">{t('Secuencia de Paradas')}</h4>
                      <ul className="space-y-1 text-sm">
                        {optimizationResult.stops.map((stop, index) => (
                          <li key={stop.orderId} className="flex items-center">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs mr-2">
                              {index + 1}
                            </span>
                            <span className="truncate">{stop.customerName}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
            
            <CardFooter>
              <Button 
                className="w-full"
                onClick={handleCreateRoute}
                disabled={
                  !optimizationResult || 
                  !selectedDriver || 
                  !selectedZone || 
                  !routeName || 
                  createRouteMutation.isPending
                }
              >
                {createRouteMutation.isPending 
                  ? t('Creando...') 
                  : t('Crear Ruta')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RouteGeneratorPage;