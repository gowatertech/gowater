import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// Interfaces para tipado
interface Customer {
  id: number;
  businessname: string;
  street?: string;
  streetnumber?: string;
  coordinates?: string;
  zoneid?: number;
}

interface Zone {
  id: number;
  name: string;
  color: string;
}

interface Order {
  id: number;
  customerId: number;
  status: string;
  date: string;
  total: string;
  customer?: Customer;
  zone?: Zone;
}

interface Driver {
  id: number;
  name: string;
}

interface Truck {
  id: number;
  brand: string;
  model: string;
  plate: string;
}

interface Stop {
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  coordinates?: string;
  sequenceNumber: number;
  distance: number;
  estimatedTime: number;
}

interface OptimizedRoute {
  stops: Stop[];
  statistics: {
    totalStops: number;
    totalDistance: string;
    estimatedTime: number;
  };
}

// Versión simplificada del generador de rutas para detectar el problema
const FixedRouteGenerator = () => {
  const { toast } = useToast();
  
  // Estados principales
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  
  // Estados del formulario
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedTruck, setSelectedTruck] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [routeName, setRouteName] = useState('');
  
  // Estado de optimización
  const [optimizedStops, setOptimizedStops] = useState(null);
  
  // Cargar pedidos al iniciar
  useEffect(() => {
    fetchPendingOrders();
    fetchDrivers();
    fetchTrucks();
    fetchZones();
  }, []);
  
  // Funciones para cargar datos
  const fetchPendingOrders = async () => {
    try {
      setIsLoading(true);
      console.log('Obteniendo pedidos pendientes...');
      
      // Usamos el endpoint /newgen para evitar problemas con los existentes
      const response = await fetch('/newgen/pending-orders');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Pedidos pendientes recibidos:', data);
      setOrders(data);
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pedidos pendientes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchDrivers = async () => {
    try {
      const response = await fetch('/newgen/drivers');
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error('Error al obtener conductores:', error);
    }
  };
  
  const fetchTrucks = async () => {
    try {
      const response = await fetch('/newgen/trucks');
      if (response.ok) {
        const data = await response.json();
        setTrucks(data);
      }
    } catch (error) {
      console.error('Error al obtener vehículos:', error);
    }
  };
  
  const fetchZones = async () => {
    try {
      const response = await fetch('/newgen/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data);
      }
    } catch (error) {
      console.error('Error al obtener zonas:', error);
    }
  };
  
  // Manejar selección de pedidos
  const handleOrderSelection = (orderId) => {
    setSelectedOrderIds(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };
  
  // Optimizar ruta
  const handleOptimizeRoute = async () => {
    if (selectedOrderIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Seleccione al menos un pedido',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/newgen/optimize-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: selectedOrderIds })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setOptimizedStops(data);
      
      toast({
        title: 'Ruta optimizada',
        description: `Se optimizó la ruta con ${data.stops.length} paradas`
      });
    } catch (error) {
      console.error('Error al optimizar ruta:', error);
      toast({
        title: 'Error',
        description: 'No se pudo optimizar la ruta',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Crear ruta
  const handleCreateRoute = async () => {
    if (!selectedDriver || !selectedZone || !routeName || !optimizedStops) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos requeridos',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const routeData = {
        name: routeName,
        driverId: parseInt(selectedDriver),
        truckId: selectedTruck ? parseInt(selectedTruck) : null,
        zoneId: parseInt(selectedZone),
        date: new Date().toISOString().split('T')[0],
        stops: optimizedStops.stops
      };
      
      const response = await fetch('/newgen/create-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(routeData)
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      toast({
        title: 'Ruta creada',
        description: 'La ruta se ha creado exitosamente'
      });
      
      // Limpiar estado
      setSelectedOrderIds([]);
      setOptimizedStops(null);
      setRouteName('');
      
      // Recargar pedidos
      fetchPendingOrders();
    } catch (error) {
      console.error('Error al crear ruta:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la ruta',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Generador de Rutas (Versión Arreglada)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sección de pedidos */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Pendientes</CardTitle>
              <CardDescription>Seleccione los pedidos para la ruta</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">No hay pedidos pendientes</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Zona</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrderIds.includes(order.id)}
                              onCheckedChange={() => handleOrderSelection(order.id)}
                            />
                          </TableCell>
                          <TableCell>{order.customer?.businessname || '-'}</TableCell>
                          <TableCell>
                            {order.customer ? `${order.customer.street || ''} ${order.customer.streetnumber || ''}` : '-'}
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
              <div>Seleccionados: {selectedOrderIds.length} / {orders.length}</div>
              <Button 
                onClick={handleOptimizeRoute} 
                disabled={selectedOrderIds.length === 0 || isLoading}
              >
                {isLoading ? 'Optimizando...' : 'Optimizar Ruta'}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Sección de detalles */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Ruta</CardTitle>
              <CardDescription>Configure los detalles de la ruta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="routeName" className="text-sm font-medium">
                  Nombre de la Ruta
                </label>
                <Input
                  id="routeName"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Nombre de la ruta"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="driver" className="text-sm font-medium">
                  Conductor
                </label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="truck" className="text-sm font-medium">
                  Vehículo
                </label>
                <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id.toString()}>
                        {truck.plate} - {truck.brand} {truck.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="zone" className="text-sm font-medium">
                  Zona
                </label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id.toString()}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleCreateRoute}
                disabled={!optimizedStops || isLoading || !selectedDriver || !selectedZone || !routeName}
              >
                {isLoading ? 'Creando...' : 'Crear Ruta'}
              </Button>
            </CardFooter>
          </Card>
          
          {optimizedStops && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Resumen de la Ruta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Paradas:</span> {optimizedStops.statistics.totalStops}
                  </div>
                  <div>
                    <span className="font-medium">Distancia:</span> {optimizedStops.statistics.totalDistance}
                  </div>
                  <div>
                    <span className="font-medium">Tiempo estimado:</span> {optimizedStops.statistics.estimatedTime} minutos
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixedRouteGenerator;