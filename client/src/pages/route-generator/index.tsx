import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Loader2, CheckCircle, AlarmClock, TruckIcon, Users, MapPin } from "lucide-react";

// Interfaces para los tipos de datos
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

interface Driver {
  id: number;
  name: string;
}

interface Assistant {
  id: number;
  name: string;
}

interface Truck {
  id: number;
  plate: string;
  brand: string;
  model: string;
}

const RouteGenerator: React.FC = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [optimizedStops, setOptimizedStops] = useState<RouteStop[]>([]);
  const [routeData, setRouteData] = useState<{
    name: string;
    driverId: string;
    assistantId: string;
    truckId: string;
    zoneId: string;
    date: string;
  }>({
    name: `Ruta ${format(new Date(), "dd/MM/yyyy")}`,
    driverId: "",
    assistantId: "",
    truckId: "",
    zoneId: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  // Consulta para obtener órdenes pendientes
  const pendingOrdersQuery = useQuery({
    queryKey: ["/api/route-generator/orders/pending"],
    staleTime: 60 * 1000, // 1 minuto
  });

  // Consulta para obtener conductores
  const driversQuery = useQuery({
    queryKey: ["/api/route-generator/drivers"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Consulta para obtener asistentes
  const assistantsQuery = useQuery({
    queryKey: ["/api/route-generator/assistants"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Consulta para obtener camiones
  const trucksQuery = useQuery({
    queryKey: ["/api/route-generator/trucks"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Consulta para obtener zonas
  const zonesQuery = useQuery({
    queryKey: ["/api/route-generator/zones"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutación para optimizar ruta
  const optimizeRouteMutation = useMutation({
    mutationFn: (selectedOrders: Order[]) => apiRequest('/api/route-generator/optimize', {
      method: 'POST',
      data: { selectedOrders }
    }),
    onSuccess: (data) => {
      setOptimizedStops(data);
      setCurrentStep(2);
      toast({
        title: "Ruta optimizada",
        description: `Se han optimizado ${data.length} paradas para la ruta.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al optimizar ruta",
        description: "No se pudo calcular la ruta óptima. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      console.error("Error optimizing route:", error);
    }
  });

  // Mutación para crear ruta
  const createRouteMutation = useMutation({
    mutationFn: (routeData: NewRoute) => apiRequest('/api/route-generator/create', {
      method: 'POST',
      data: routeData
    }),
    onSuccess: (data) => {
      setCurrentStep(3);
      toast({
        title: "Ruta creada exitosamente",
        description: `La ruta ha sido creada con ${optimizedStops.length} paradas.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al crear ruta",
        description: "No se pudo crear la ruta. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      console.error("Error creating route:", error);
    }
  });

  // Manejadores de eventos
  const handleOrderSelection = (order: Order, isSelected: boolean) => {
    if (isSelected) {
      setSelectedOrders([...selectedOrders, order]);
    } else {
      setSelectedOrders(selectedOrders.filter(o => o.id !== order.id));
    }
  };

  const handleOptimizeRoute = () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos una orden para optimizar la ruta.",
        variant: "destructive",
      });
      return;
    }

    optimizeRouteMutation.mutate(selectedOrders);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRouteData({
      ...routeData,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setRouteData({
      ...routeData,
      [name]: value,
    });
  };

  const handleCreateRoute = () => {
    // Validar datos
    if (!routeData.name || !routeData.driverId || !routeData.zoneId) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    // Crear objeto de ruta para enviar
    const completeRouteData: NewRoute = {
      name: routeData.name,
      driverId: parseInt(routeData.driverId),
      assistantId: routeData.assistantId ? parseInt(routeData.assistantId) : null,
      truckId: routeData.truckId ? parseInt(routeData.truckId) : null,
      zoneId: parseInt(routeData.zoneId),
      date: routeData.date,
      stops: optimizedStops
    };

    // Enviar datos
    createRouteMutation.mutate(completeRouteData);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedOrders([]);
    setOptimizedStops([]);
    setRouteData({
      name: `Ruta ${format(new Date(), "dd/MM/yyyy")}`,
      driverId: "",
      assistantId: "",
      truckId: "",
      zoneId: "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  // Obtener datos
  const pendingOrders = pendingOrdersQuery.data || [];
  const drivers = driversQuery.data || [];
  const assistants = assistantsQuery.data || [];
  const trucks = trucksQuery.data || [];
  const zones = zonesQuery.data || [];

  // Renderizar pasos
  const renderStepOne = () => (
    <Card>
      <CardHeader>
        <CardTitle>Seleccionar Órdenes</CardTitle>
        <CardDescription>
          Selecciona las órdenes pendientes que deseas incluir en la ruta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingOrdersQuery.isLoading ? (
          <div className="flex justify-center items-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No hay órdenes pendientes disponibles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.some(o => o.id === order.id)}
                        onCheckedChange={(checked) => handleOrderSelection(order, !!checked)}
                      />
                    </TableCell>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customer?.businessname || "N/A"}</TableCell>
                    <TableCell>
                      {`${order.customer?.street || ""} ${order.customer?.streetnumber || ""}`}
                    </TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center gap-2"
                        style={{ color: order.zone?.color || 'inherit' }}
                      >
                        <MapPin size={16} />
                        {order.zone?.name || "Sin zona"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.date), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>RD$ {parseFloat(order.total).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedOrders.length} órdenes seleccionadas
        </div>
        <Button 
          onClick={handleOptimizeRoute} 
          disabled={selectedOrders.length === 0 || optimizeRouteMutation.isPending}
        >
          {optimizeRouteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Optimizar Ruta
        </Button>
      </CardFooter>
    </Card>
  );

  const renderStepTwo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Configurar y Confirmar Ruta</CardTitle>
        <CardDescription>
          Completa los detalles de la ruta y revisa el orden de las paradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Ruta</Label>
            <Input
              id="name"
              name="name"
              value={routeData.name}
              onChange={handleInputChange}
              placeholder="Ruta del día"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={routeData.date}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverId">Conductor</Label>
            <Select 
              value={routeData.driverId} 
              onValueChange={value => handleSelectChange("driverId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar conductor" />
              </SelectTrigger>
              <SelectContent>
                {driversQuery.isLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  drivers.map((driver: Driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistantId">Asistente (Opcional)</Label>
            <Select 
              value={routeData.assistantId} 
              onValueChange={value => handleSelectChange("assistantId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar asistente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ninguno</SelectItem>
                {assistantsQuery.isLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  assistants.map((assistant: Assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id.toString()}>
                      {assistant.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="truckId">Camión (Opcional)</Label>
            <Select 
              value={routeData.truckId} 
              onValueChange={value => handleSelectChange("truckId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar camión" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ninguno</SelectItem>
                {trucksQuery.isLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  trucks.map((truck: Truck) => (
                    <SelectItem key={truck.id} value={truck.id.toString()}>
                      {truck.plate} - {truck.brand} {truck.model}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zoneId">Zona</Label>
            <Select 
              value={routeData.zoneId} 
              onValueChange={value => handleSelectChange("zoneId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent>
                {zonesQuery.isLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  zones.map((zone: Zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <h3 className="text-lg font-medium mb-2">Paradas de la Ruta</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Secuencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optimizedStops.map((stop) => (
                <TableRow key={stop.orderId}>
                  <TableCell>{stop.orderId}</TableCell>
                  <TableCell>{stop.customerName}</TableCell>
                  <TableCell>{stop.address}</TableCell>
                  <TableCell>{stop.sequenceNumber}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          Volver
        </Button>
        <Button 
          onClick={handleCreateRoute} 
          disabled={createRouteMutation.isPending}
        >
          {createRouteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear Ruta
        </Button>
      </CardFooter>
    </Card>
  );

  const renderStepThree = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-primary" />
        </div>
        <CardTitle>¡Ruta Creada Exitosamente!</CardTitle>
        <CardDescription>
          La ruta ha sido creada y asignada correctamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Nombre:</p>
            <p className="font-medium">{routeData.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Fecha:</p>
            <p className="font-medium">{format(new Date(routeData.date), "dd/MM/yyyy", { locale: es })}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Conductor:</p>
            <p className="font-medium flex items-center gap-2">
              <Users size={16} />
              {drivers.find(d => d.id.toString() === routeData.driverId)?.name || "No asignado"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Camión:</p>
            <p className="font-medium flex items-center gap-2">
              <TruckIcon size={16} />
              {trucks.find(t => t.id.toString() === routeData.truckId)?.plate || "No asignado"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Paradas:</p>
            <p className="font-medium">{optimizedStops.length} paradas</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Zona:</p>
            <p className="font-medium flex items-center gap-2">
              <MapPin size={16} />
              {zones.find(z => z.id.toString() === routeData.zoneId)?.name || "No asignada"}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={handleReset}>
          Crear Nueva Ruta
        </Button>
      </CardFooter>
    </Card>
  );

  // Renderizar el paso actual
  let currentStepContent;
  switch (currentStep) {
    case 1:
      currentStepContent = renderStepOne();
      break;
    case 2:
      currentStepContent = renderStepTwo();
      break;
    case 3:
      currentStepContent = renderStepThree();
      break;
    default:
      currentStepContent = renderStepOne();
  }

  // Indicador de progreso
  const renderProgress = () => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <div className={`flex flex-col items-center ${currentStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`rounded-full p-2 ${currentStep >= 1 ? "bg-primary text-white" : "bg-muted"}`}>
            <CheckCircle className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1">Selección</span>
        </div>
        <div className="grow border-t border-dashed my-4 mx-2"></div>
        <div className={`flex flex-col items-center ${currentStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`rounded-full p-2 ${currentStep >= 2 ? "bg-primary text-white" : "bg-muted"}`}>
            <AlarmClock className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1">Optimización</span>
        </div>
        <div className="grow border-t border-dashed my-4 mx-2"></div>
        <div className={`flex flex-col items-center ${currentStep >= 3 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`rounded-full p-2 ${currentStep >= 3 ? "bg-primary text-white" : "bg-muted"}`}>
            <TruckIcon className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1">Confirmación</span>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Generador de Rutas</h1>
        </div>
        
        {renderProgress()}
        
        {currentStepContent}
      </div>
    </DashboardLayout>
  );
};

export default RouteGenerator;