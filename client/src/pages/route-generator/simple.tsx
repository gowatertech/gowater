import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

// Interfaces
interface Order {
  id: number;
  customer: {
    businessname: string;
    street: string;
    streetnumber: string;
  };
  date: string;
  total: string;
}

interface Driver {
  id: number;
  name: string;
}

interface Truck {
  id: number;
  plate: string;
  model: string;
}

const SimpleRouteGenerator = () => {
  // Estado
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedTruck, setSelectedTruck] = useState('');
  const [routeName, setRouteName] = useState('');

  const { toast } = useToast();

  // Cargar datos al iniciar
  useEffect(() => {
    loadOrders();
    loadDrivers();
    loadTrucks();
  }, []);

  // Función para cargar pedidos pendientes
  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/route-generator/orders/pending');
      
      if (!response.ok) {
        console.error('Error al cargar pedidos:', response.status, response.statusText);
        toast({
          title: 'Error',
          description: `No se pudieron cargar los pedidos (${response.status})`,
          variant: 'destructive'
        });
        return;
      }

      const data = await response.json();
      console.log('Pedidos pendientes:', data);
      setOrders(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al cargar los pedidos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar conductores
  const loadDrivers = async () => {
    try {
      const response = await fetch('/api/drivers');
      if (!response.ok) return;
      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error('Error al cargar conductores:', error);
    }
  };

  // Función para cargar vehículos
  const loadTrucks = async () => {
    try {
      const response = await fetch('/api/trucks');
      if (!response.ok) return;
      const data = await response.json();
      setTrucks(data);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
    }
  };

  // Manejar selección de pedidos
  const handleOrderSelection = (orderId: number) => {
    setSelectedOrders(prevSelected => {
      if (prevSelected.includes(orderId)) {
        return prevSelected.filter(id => id !== orderId);
      } else {
        return [...prevSelected, orderId];
      }
    });
  };

  // Crear ruta
  const handleCreateRoute = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: 'Advertencia',
        description: 'Seleccione al menos un pedido para crear la ruta',
        variant: 'default'
      });
      return;
    }

    if (!selectedDriver) {
      toast({
        title: 'Advertencia',
        description: 'Seleccione un conductor para la ruta',
        variant: 'default'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Primero optimizamos la ruta
      const optimizeResponse = await fetch('/api/route-generator/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds: selectedOrders })
      });
      
      if (!optimizeResponse.ok) {
        throw new Error('Error al optimizar la ruta');
      }
      
      const optimizedRoute = await optimizeResponse.json();
      
      // Luego creamos la ruta con los pedidos optimizados
      const createResponse = await fetch('/api/route-generator/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: routeName || `Ruta ${new Date().toLocaleDateString()}`,
          driverId: parseInt(selectedDriver),
          truckId: selectedTruck ? parseInt(selectedTruck) : undefined,
          stops: optimizedRoute.stops
        })
      });
      
      if (!createResponse.ok) {
        throw new Error('Error al crear la ruta');
      }
      
      const result = await createResponse.json();
      
      toast({
        title: 'Éxito',
        description: `Ruta creada con ID: ${result.id}`,
        variant: 'default'
      });
      
      // Recargar pedidos después de crear la ruta
      loadOrders();
      
      // Limpiar selecciones
      setSelectedOrders([]);
      setRouteName('');
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la ruta',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Generador de Rutas Simple</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Ruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de la Ruta</label>
                <input
                  type="text"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Ruta del día"
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Conductor</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seleccionar conductor</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id.toString()}>{driver.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Vehículo</label>
                <select
                  value={selectedTruck}
                  onChange={(e) => setSelectedTruck(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seleccionar vehículo</option>
                  {trucks.map(truck => (
                    <option key={truck.id} value={truck.id.toString()}>
                      {truck.plate} - {truck.model}
                    </option>
                  ))}
                </select>
              </div>
              
              <Button 
                onClick={handleCreateRoute}
                disabled={loading || selectedOrders.length === 0}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Ruta'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Pedidos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Cargando pedidos...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center p-4">
                No hay pedidos pendientes disponibles
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Selec.</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => handleOrderSelection(order.id)}
                        />
                      </TableCell>
                      <TableCell>{order.customer?.businessname || 'N/A'}</TableCell>
                      <TableCell>
                        {order.customer ? `${order.customer.street} ${order.customer.streetnumber}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(order.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <div className="mt-4 flex justify-between">
              <span>
                {selectedOrders.length} pedidos seleccionados
              </span>
              <Button
                variant="outline"
                onClick={loadOrders}
                disabled={loading}
              >
                Actualizar Lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleRouteGenerator;