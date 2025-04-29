import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Truck, 
  Users, 
  Route as RouteIcon, 
  Map, 
  Package, 
  Check, 
  Clock, 
  MapPin, 
  Filter 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageTitle } from "@/components/ui/page-title";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { queryClient } from "@/lib/queryClient";

// Define los tipos de datos que necesitamos
interface Customer {
  id: number;
  businessname: string;
  phone: string;
  street: string;
  streetnumber: string;
  zoneid?: number | null;
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

interface RouteStop {
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  coordinates?: string;
  sequenceNumber: number;
}

interface NewRoute {
  name: string;
  driverId: number;
  assistantId: number | null;
  truckId: number | null;
  zoneId: number;
  date: string;
  stops: RouteStop[];
}

const RouteGeneratorPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("select-orders");
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [optimizedStops, setOptimizedStops] = useState<RouteStop[]>([]);
  const [newRoute, setNewRoute] = useState<NewRoute>({
    name: `Ruta ${new Date().toLocaleDateString('es-ES')}`,
    driverId: 0,
    assistantId: null,
    truckId: null,
    zoneId: 0,
    date: new Date().toISOString().split('T')[0],
    stops: []
  });

  // Obtener pedidos pendientes
  const { data: pendingOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/orders/pending'],
    queryFn: async () => {
      const response = await fetch('/api/orders/pending');
      if (!response.ok) throw new Error('Error al cargar pedidos pendientes');
      const data = await response.json();
      return data as Order[];
    }
  });

  // Obtener zonas
  const { data: zones, isLoading: isLoadingZones } = useQuery({
    queryKey: ['/api/zones'],
    queryFn: async () => {
      const response = await fetch('/api/zones');
      if (!response.ok) throw new Error('Error al cargar zonas');
      const data = await response.json();
      return data as Zone[];
    }
  });

  // Obtener conductores
  const { data: drivers, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['/api/users/drivers'],
    queryFn: async () => {
      const response = await fetch('/api/users/drivers');
      if (!response.ok) throw new Error('Error al cargar conductores');
      const data = await response.json();
      return data;
    }
  });

  // Obtener asistentes
  const { data: assistants, isLoading: isLoadingAssistants } = useQuery({
    queryKey: ['/api/users/assistants'],
    queryFn: async () => {
      const response = await fetch('/api/users/assistants');
      if (!response.ok) throw new Error('Error al cargar asistentes');
      const data = await response.json();
      return data;
    }
  });

  // Obtener vehículos
  const { data: trucks, isLoading: isLoadingTrucks } = useQuery({
    queryKey: ['/api/trucks'],
    queryFn: async () => {
      const response = await fetch('/api/trucks');
      if (!response.ok) throw new Error('Error al cargar vehículos');
      const data = await response.json();
      return data;
    }
  });

  // Filtrar pedidos por zona y término de búsqueda
  const filteredOrders = pendingOrders ? pendingOrders.filter(order => {
    const matchesZone = selectedZone ? order.customer?.zoneid === parseInt(selectedZone) : true;
    const matchesSearch = searchTerm 
      ? (order.customer?.businessname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         order.id.toString().includes(searchTerm))
      : true;
    return matchesZone && matchesSearch;
  }) : [];

  // Manejar la selección de pedidos
  const toggleOrderSelection = (orderId: number) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  // Manejar la optimización de ruta
  const handleOptimizeRoute = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "Sin pedidos seleccionados",
        description: "Debes seleccionar al menos un pedido para generar una ruta",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/route-generator/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderIds: selectedOrders
        })
      });

      if (!response.ok) {
        throw new Error('Error al optimizar la ruta');
      }

      const data = await response.json();
      setOptimizedStops(data.stops);
      setActiveTab("optimize-route");
    } catch (error) {
      toast({
        title: "Error al optimizar ruta",
        description: error instanceof Error ? error.message : "Ocurrió un error al calcular la ruta óptima",
        variant: "destructive"
      });
    }
  };

  // Manejar la creación de la ruta
  const handleCreateRoute = async () => {
    if (!newRoute.driverId) {
      toast({
        title: "Error al crear ruta",
        description: "Debes seleccionar un conductor",
        variant: "destructive"
      });
      return;
    }

    if (!newRoute.zoneId) {
      toast({
        title: "Error al crear ruta",
        description: "Debes seleccionar una zona",
        variant: "destructive"
      });
      return;
    }

    try {
      const routePayload = {
        ...newRoute,
        stops: optimizedStops
      };

      const response = await fetch('/api/route-generator/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(routePayload)
      });

      if (!response.ok) {
        throw new Error('Error al crear la ruta');
      }

      // Invalidar consultas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pending'] });

      toast({
        title: "Ruta creada exitosamente",
        description: "La ruta ha sido creada y los pedidos asignados",
      });

      // Resetear el estado
      setSelectedOrders([]);
      setOptimizedStops([]);
      setActiveTab("select-orders");
    } catch (error) {
      toast({
        title: "Error al crear ruta",
        description: error instanceof Error ? error.message : "Ocurrió un error al crear la ruta",
        variant: "destructive"
      });
    }
  };

  // Actualizar la información de la ruta
  const handleRouteChange = (field: string, value: any) => {
    setNewRoute({
      ...newRoute,
      [field]: value
    });
  };

  // Mover parada hacia arriba o abajo en la secuencia
  const moveStop = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === optimizedStops.length - 1)
    ) {
      return;
    }

    const newOptimizedStops = [...optimizedStops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Intercambiar elementos
    [newOptimizedStops[index], newOptimizedStops[targetIndex]] = 
    [newOptimizedStops[targetIndex], newOptimizedStops[index]];
    
    // Actualizar sequenceNumber
    newOptimizedStops.forEach((stop, idx) => {
      stop.sequenceNumber = idx + 1;
    });
    
    setOptimizedStops(newOptimizedStops);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <PageTitle 
          title="Generador de Rutas" 
          subtitle="Crea rutas optimizadas a partir de pedidos pendientes"
          icon={<RouteIcon className="h-6 w-6 text-amber-500" />}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full md:w-[500px] grid-cols-2">
            <TabsTrigger value="select-orders" className="flex gap-2">
              <Package className="h-4 w-4" />
              <span>1. Seleccionar Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="optimize-route" className="flex gap-2">
              <Map className="h-4 w-4" />
              <span>2. Optimizar y Crear</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select-orders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex gap-2 items-center">
                  <Package className="h-5 w-5 text-amber-500" />
                  Selección de Pedidos
                </CardTitle>
                <CardDescription>
                  Selecciona los pedidos que quieres incluir en la ruta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-4 mb-6">
                  <div className="col-span-1">
                    <Label htmlFor="zone">Filtrar por Zona</Label>
                    <Select 
                      value={selectedZone}
                      onValueChange={setSelectedZone}
                    >
                      <SelectTrigger id="zone">
                        <SelectValue placeholder="Todas las zonas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas las zonas</SelectItem>
                        {zones?.map(zone => (
                          <SelectItem key={zone.id} value={zone.id.toString()}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="search">Buscar por Cliente o # Pedido</Label>
                    <div className="relative">
                      <Input
                        id="search"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                      <Filter className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                </div>

                {isLoadingOrders ? (
                  <div className="text-center py-8">
                    <p>Cargando pedidos...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-gray-50">
                    <p className="text-gray-500">No hay pedidos que coincidan con los filtros</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Sel.</TableHead>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Zona</TableHead>
                          <TableHead>Dirección</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map(order => (
                          <TableRow 
                            key={order.id}
                            className={selectedOrders.includes(order.id) ? "bg-primary/5" : ""}
                          >
                            <TableCell>
                              <div className="flex justify-center">
                                <Checkbox 
                                  checked={selectedOrders.includes(order.id)} 
                                  onCheckedChange={() => toggleOrderSelection(order.id)}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">#{order.id}</TableCell>
                            <TableCell>{order.customer?.businessname || 'N/A'}</TableCell>
                            <TableCell>
                              {order.customer?.zoneid ? (
                                <Badge 
                                  style={{
                                    backgroundColor: zones?.find(z => z.id === order.customer?.zoneid)?.color || '#888'
                                  }}
                                  className="text-white"
                                >
                                  {zones?.find(z => z.id === order.customer?.zoneid)?.name || 'Zona'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Sin zona</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.customer ? 
                                `${order.customer.street} ${order.customer.streetnumber || ''}` : 
                                'N/A'
                              }
                            </TableCell>
                            <TableCell>{formatDate(new Date(order.date))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(order.total))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  <Badge variant="outline" className="mr-2">
                    {selectedOrders.length} pedidos seleccionados
                  </Badge>
                </div>
                <Button 
                  onClick={handleOptimizeRoute}
                  disabled={selectedOrders.length === 0}
                  className="gap-2"
                >
                  <Map className="h-4 w-4" />
                  Optimizar Ruta
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="optimize-route" className="mt-4">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex gap-2 items-center">
                      <Truck className="h-5 w-5 text-amber-500" />
                      Datos de la Ruta
                    </CardTitle>
                    <CardDescription>
                      Ingresa la información para crear la ruta
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="routeName">Nombre de la Ruta</Label>
                      <Input 
                        id="routeName" 
                        placeholder="Nombre de la ruta"
                        value={newRoute.name}
                        onChange={(e) => handleRouteChange('name', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="driver">Conductor</Label>
                      <Select 
                        onValueChange={(value) => handleRouteChange('driverId', parseInt(value))}
                      >
                        <SelectTrigger id="driver">
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers?.map((driver: any) => (
                            <SelectItem key={driver.id} value={driver.id.toString()}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="assistant">Asistente (opcional)</Label>
                      <Select 
                        onValueChange={(value) => handleRouteChange('assistantId', parseInt(value))}
                      >
                        <SelectTrigger id="assistant">
                          <SelectValue placeholder="Seleccionar asistente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ninguno</SelectItem>
                          {assistants?.map((assistant: any) => (
                            <SelectItem key={assistant.id} value={assistant.id.toString()}>
                              {assistant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="truck">Vehículo (opcional)</Label>
                      <Select 
                        onValueChange={(value) => handleRouteChange('truckId', parseInt(value))}
                      >
                        <SelectTrigger id="truck">
                          <SelectValue placeholder="Seleccionar vehículo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ninguno</SelectItem>
                          {trucks?.map((truck: any) => (
                            <SelectItem key={truck.id} value={truck.id.toString()}>
                              {truck.brand} {truck.model} ({truck.plate})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="zone">Zona de la Ruta</Label>
                      <Select 
                        onValueChange={(value) => handleRouteChange('zoneId', parseInt(value))}
                      >
                        <SelectTrigger id="zone">
                          <SelectValue placeholder="Seleccionar zona" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones?.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id.toString()}>
                              {zone.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="date">Fecha de Ruta</Label>
                      <Input 
                        id="date" 
                        type="date"
                        value={newRoute.date}
                        onChange={(e) => handleRouteChange('date', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-2">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl flex gap-2 items-center">
                      <MapPin className="h-5 w-5 text-amber-500" />
                      Secuencia de Entregas
                    </CardTitle>
                    <CardDescription>
                      Revisa y ajusta el orden de las paradas según sea necesario
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {optimizedStops.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-gray-50 h-full flex items-center justify-center">
                        <div>
                          <Map className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">Aún no hay paradas optimizadas</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Selecciona pedidos y optimiza la ruta en el paso anterior
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ScrollArea className="h-[450px] border rounded-lg p-4">
                        <div className="space-y-4">
                          {optimizedStops.map((stop, index) => (
                            <div key={stop.orderId} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50">
                              <div className="bg-primary/10 text-primary font-bold rounded-full w-8 h-8 flex items-center justify-center">
                                {stop.sequenceNumber}
                              </div>
                              <div className="flex-grow">
                                <div className="font-medium">{stop.customerName}</div>
                                <div className="text-sm text-gray-500">{stop.address}</div>
                                <div className="text-xs text-gray-400">Pedido #{stop.orderId}</div>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  disabled={index === 0}
                                  onClick={() => moveStop(index, 'up')}
                                >
                                  ↑
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  disabled={index === optimizedStops.length - 1}
                                  onClick={() => moveStop(index, 'down')}
                                >
                                  ↓
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4 mt-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("select-orders")}
                      className="gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Volver a Pedidos
                    </Button>
                    <Button 
                      onClick={handleCreateRoute}
                      disabled={
                        optimizedStops.length === 0 || 
                        !newRoute.driverId || 
                        !newRoute.zoneId
                      }
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Crear Ruta
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default RouteGeneratorPage;