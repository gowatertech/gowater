import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRouteSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Check, 
  Loader2, 
  MapPin, 
  User, 
  Truck, 
  Calendar, 
  Search, 
  Route, 
  Clock, 
  Users,
  CheckCircle,
  FileText,
  Package,
  ShoppingCart,
  DollarSign,
  Map as MapIcon
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import L from "leaflet";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ZoneBasedRouteFormProps {
  onRouteCreated: () => void;
  compact?: boolean;
}

interface Customer {
  id: number;
  businessname: string;
  phone: string;
  street: string;
  streetnumber: string;
  coordinates?: string; // Format: "lat,lng"
  municipalityName?: string;
  provinceName?: string;
}

interface PendingOrder {
  id: number;
  customerId: number;
  status: string;
  total: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  coordinates?: string;
  createdAt: string;
  products: {
    productId: number;
    name: string;
    quantity: number;
    price: number;
  }[];
}

interface Truck {
  id: number;
  brand: string;
  model: string;
  plate: string;
  capacity: number;
  status: string;
}

export default function ZoneBasedRouteForm({ onRouteCreated, compact = false }: ZoneBasedRouteFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("zone");
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<PendingOrder[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Customer[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [routeCreationMode, setRouteCreationMode] = useState<"customers" | "orders">("customers");

  // Fetch drivers
  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery({
    queryKey: ["/api/users?role=driver"],
  });
  
  // Fetch assistants
  const { data: assistants = [], isLoading: isLoadingAssistants } = useQuery({
    queryKey: ["/api/users?role=assistant"],
  });

  // Fetch trucks (vehículos)
  const { data: trucks = [], isLoading: isLoadingTrucks } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  // Fetch zones
  const { data: zones = [], isLoading: isLoadingZones } = useQuery({
    queryKey: ["/api/zones"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/zones");
      console.log("Zonas cargadas en ZoneBasedRouteForm:", await response.clone().json());
      return response.json();
    }
  });

  // Fetch customers for the selected zone
  const { 
    data: zoneCustomers = [], 
    isLoading: isLoadingCustomers,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ["/api/customers/by-zone", selectedZone],
    queryFn: async () => {
      if (!selectedZone) return [];
      const response = await apiRequest("GET", `/api/customers/by-zone?zoneId=${selectedZone}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customers for zone");
      }
      return response.json();
    },
    enabled: !!selectedZone,
  });
  
  // Fetch pending orders for the selected zone
  const {
    data: pendingOrders = [],
    isLoading: isLoadingPendingOrders
  } = useQuery<PendingOrder[]>({
    queryKey: ["/api/zones/pending-orders", selectedZone],
    queryFn: async () => {
      if (!selectedZone) return [];
      console.log(`Fetching pending orders for zone ${selectedZone}`);
      const response = await apiRequest("GET", `/api/zones/${selectedZone}/pending-orders`);
      if (!response.ok) {
        throw new Error("Error al obtener pedidos pendientes de la zona");
      }
      const data = await response.json();
      console.log("Pending orders data:", data);
      return data;
    },
    enabled: !!selectedZone,
  });

  const form = useForm({
    resolver: zodResolver(insertRouteSchema),
    defaultValues: {
      name: "",
      driverId: undefined,
      assistantId: undefined,
      truckId: undefined,
      zoneId: undefined,
      date: new Date(),
      status: "pending" as const,
      isCompleted: false,
      stops: [] as string[]
    },
  });

  // When zone is selected in the form
  useEffect(() => {
    const zoneId = form.watch("zoneId");
    if (zoneId !== selectedZone) {
      setSelectedZone(zoneId || null);
      setSelectedCustomers([]);
      setOptimizedRoute([]);
    }
  }, [form.watch("zoneId"), selectedZone]);

  // Update form name when zone is selected
  useEffect(() => {
    if (selectedZone) {
      const selectedZoneObj = zones && Array.isArray(zones) ? zones.find((z: any) => z.id === selectedZone) : null;
      if (selectedZoneObj) {
        const today = new Date().toLocaleDateString("es-ES").replace(/\//g, "-");
        form.setValue("name", `Ruta ${selectedZoneObj.name} - ${today}`);
      }
    }
  }, [selectedZone, zones, form]);

  // Update stops array when optimized route changes
  useEffect(() => {
    if (optimizedRoute.length > 0) {
      const stops = optimizedRoute.map(customer => 
        `${customer.id}:${customer.businessname}:${customer.coordinates || ""}`
      );
      form.setValue("stops", stops);
    }
  }, [optimizedRoute, form]);

  // Toggle customer selection
  const toggleCustomerSelection = (customer: Customer) => {
    // Asegurar que el cliente tenga coordenadas
    const customerWithCoordinates = {
      ...customer,
      // Usar las coordenadas existentes o crear coordenadas de ejemplo basadas en la posición relativa al depósito
      coordinates: customer.coordinates || `${19.075380 + (customer.id * 0.005)},${-70.128822 - (customer.id * 0.004)}`
    };
    
    if (selectedCustomers.some(c => c.id === customer.id)) {
      setSelectedCustomers(selectedCustomers.filter(c => c.id !== customer.id));
    } else {
      setSelectedCustomers([...selectedCustomers, customerWithCoordinates]);
    }
    // Reset optimized route when selection changes
    setOptimizedRoute([]);
  };

  // Calculate map center and bounds based on optimized route coordinates
  const getMapCenter = () => {
    if (optimizedRoute.length === 0) {
      return [19.0, -70.0]; // Default center if no route
    }
    
    const pointsWithCoords = optimizedRoute
      .filter(customer => customer.coordinates)
      .map(customer => {
        const [lat, lng] = customer.coordinates!.split(',').map(parseFloat);
        return [lat, lng];
      });
      
    if (pointsWithCoords.length === 0) {
      return [19.0, -70.0]; // Default center if no coordinates
    }
    
    // Calculate center point
    const sumLat = pointsWithCoords.reduce((sum: number, point: number[]) => sum + point[0], 0);
    const sumLng = pointsWithCoords.reduce((sum: number, point: number[]) => sum + point[1], 0);
    
    return [sumLat / pointsWithCoords.length, sumLng / pointsWithCoords.length];
  };
  
  // Auto-center map component for the route review
  function MapCenterFixer() {
    const map = useMap();
    
    useEffect(() => {
      if (optimizedRoute.length > 0) {
        const center = getMapCenter();
        map.setView(center as [number, number], 11);
        console.log("Mapa centrado en:", center);
      }
    }, [map, optimizedRoute]);
    
    return null;
  }
  
  // Optimize route order based on proximity
  const optimizeRoute = async () => {
    if (selectedCustomers.length < 2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona al menos 2 clientes para optimizar la ruta",
      });
      return;
    }

    setIsOptimizing(true);

    try {
      // Define depot/almacén principal (empresa) - hardcoded coordinates
      const depot: Customer = {
        id: 0, // Use 0 to represent depot
        businessname: "Almacén Principal",
        phone: "",
        street: "",
        streetnumber: "",
        coordinates: "19.075380,-70.128822", // Coordenadas empresa
        municipalityName: "",
        provinceName: ""
      };
      
      // Log para depuración
      console.log("Optimizando ruta con clientes:", selectedCustomers.map(c => ({
        id: c.id,
        name: c.businessname,
        coords: c.coordinates
      })));
      
      // Verificar que los clientes tengan coordenadas válidas
      const customersWithCoordinates = selectedCustomers.filter(customer => {
        if (!customer.coordinates) {
          console.warn(`Cliente sin coordenadas: ID ${customer.id}, ${customer.businessname}. Se omitirá de la optimización.`);
          return false;
        }
        
        try {
          const [lat, lng] = customer.coordinates.split(',').map(parseFloat);
          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Cliente con coordenadas inválidas: ID ${customer.id}, ${customer.businessname}, coords: ${customer.coordinates}`);
            return false;
          }
          return true;
        } catch (e) {
          console.warn(`Error validando coordenadas del cliente: ID ${customer.id}`, e);
          return false;
        }
      });
      
      if (customersWithCoordinates.length < 1) {
        throw new Error("Ninguno de los clientes seleccionados tiene coordenadas válidas");
      }
      
      // This would normally be an API call to a route optimization service
      // For this example, we'll use a very simple distance-based algorithm
      
      // Start with depot
      const unvisited = [...customersWithCoordinates];
      const optimized = [depot];

      while (unvisited.length > 0) {
        const currentPoint = optimized[optimized.length - 1];
        
        // Find the closest unvisited point
        let closestIdx = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
          const distance = calculateDistance(
            currentPoint.coordinates || "19.0,-70.0", 
            unvisited[i].coordinates || "19.0,-70.0"
          );
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIdx = i;
          }
        }
        
        // Add the closest point to our route
        optimized.push(unvisited[closestIdx]);
        unvisited.splice(closestIdx, 1);
      }
      
      // Set the optimized route and log for debugging
      console.log("Ruta optimizada:", optimized);
      
      // Establecemos la ruta optimizada
      setOptimizedRoute(optimized);
      
      // Mensaje de éxito
      toast({
        title: "Ruta optimizada",
        description: `Se ha optimizado la ruta para ${optimized.length - 1} clientes`, // -1 porque el depósito no es un cliente
      });
      
      // Limpiar cualquier error anterior
      form.clearErrors();
      
      // Generar un nombre de ruta automático si no hay uno
      if (!form.getValues("name")) {
        const today = new Date();
        const dateStr = today.toLocaleDateString("es-DO", { day: '2-digit', month: '2-digit', year: 'numeric' });
        form.setValue("name", `Ruta ${dateStr} - Zona ${selectedZone}`);
      }
      
      // Cambiar automáticamente a la pestaña de revisión después de optimizar
      setSelectedTab("review");
    } catch (error) {
      console.error("Error optimizing route:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo optimizar la ruta. Intenta nuevamente.",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (coord1: string, coord2: string) => {
    try {
      // Verificar formato de coordenadas
      console.log("Calculando distancia entre coordenadas:", coord1, coord2);
      
      if (!coord1 || !coord2 || typeof coord1 !== 'string' || typeof coord2 !== 'string') {
        console.error("Coordenadas inválidas:", { coord1, coord2 });
        return Infinity;
      }
      
      const [lat1Str, lng1Str] = coord1.split(',');
      const [lat2Str, lng2Str] = coord2.split(',');
      
      if (!lat1Str || !lng1Str || !lat2Str || !lng2Str) {
        console.error("Formato de coordenadas incorrecto:", { coord1, coord2 });
        return Infinity;
      }
      
      const lat1 = parseFloat(lat1Str);
      const lng1 = parseFloat(lng1Str);
      const lat2 = parseFloat(lat2Str);
      const lng2 = parseFloat(lng2Str);
      
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        console.error("Coordenadas no son números válidos:", { lat1, lng1, lat2, lng2 });
        return Infinity;
      }
      
      // Haversine formula for more accurate distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
        
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // Distance in km
      
      return distance;
    } catch (e) {
      console.error("Error calculating distance:", e);
      return Infinity;
    }
  };
  
  // Calculate total route distance in meters
  const calculateTotalRouteDistance = (route: Customer[]) => {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      if (!route[i].coordinates || !route[i+1].coordinates) {
        console.warn("Missing coordinates for distance calculation");
        continue;
      }
      
      totalDistance += calculateDistance(
        route[i].coordinates || "",
        route[i+1].coordinates || ""
      );
    }
    
    // Convert to meters
    return Math.round(totalDistance * 1000);
  };
  
  // Estimate duration in minutes based on distance and stops
  const calculateEstimatedDuration = (distance: number, numStops: number) => {
    const AVERAGE_SPEED = 30; // km/h
    const TIME_PER_STOP = 5; // minutos por parada de entrega (ajustado a 5 min)
    const EXTRA_TIME_PER_DELIVERY = 5; // 5 minutos adicionales por entrega
    
    // Calcular tiempo de viaje en minutos: distancia (km) / velocidad (km/h) * 60 min/h
    const travelTimeMinutes = (distance / 1000) / AVERAGE_SPEED * 60;
    
    // Añadir tiempo para entregas (tiempo por parada + tiempo adicional por entrega)
    const stopTimeMinutes = numStops * TIME_PER_STOP;
    const deliveryTimeMinutes = numStops * EXTRA_TIME_PER_DELIVERY;
    
    // Total de minutos estimados, redondeado hacia arriba
    return Math.ceil(travelTimeMinutes + stopTimeMinutes + deliveryTimeMinutes);
  };

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting route data:", data);
      
      // Calcular la distancia total de la ruta optimizada
      const totalDistance = calculateTotalRouteDistance(optimizedRoute);
      
      // Calcular la duración estimada basada en la distancia y el número de paradas
      const estimatedDuration = calculateEstimatedDuration(totalDistance, optimizedRoute.length - 1); // -1 porque el depósito no es una parada
      
      console.log(`Ruta calculada: Distancia total: ${totalDistance} metros, Duración estimada: ${estimatedDuration} minutos`);
      
      // Preparar los datos para enviar al servidor
      const routeData = {
        name: data.name,
        date: new Date(data.date),
        driverId: Number(data.driverId),
        zoneId: Number(data.zoneId || selectedZone),
        status: "pending",
        isCompleted: false,
        // Incluir datos de la ruta optimizada
        deliverySequence: optimizedRoute.map(customer => customer.id.toString()),
        stops: optimizedRoute.map(customer => customer.coordinates || ""),
        // Añadir información calculada
        totalDistance: (totalDistance / 1000).toFixed(2), // Convertir a km y formatear a 2 decimales
        estimatedDuration: estimatedDuration
      };
      
      // Enviar los datos de la ruta al servidor
      const response = await apiRequest("POST", "/api/routes", routeData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create route");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada",
        description: "La ruta se ha creado exitosamente",
      });
      // Invalidate routes cache to refresh list
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      // Reset form and state
      form.reset();
      setSelectedZone(null);
      setSelectedCustomers([]);
      setOptimizedRoute([]);
      setSelectedTab("zone");
      // Call onRouteCreated callback
      onRouteCreated();
    },
    onError: (error: Error) => {
      console.error("Error creating route:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear la ruta. Intenta nuevamente.",
      });
    }
  });

  // Form submission handler
  const onSubmit = (data: any) => {
    if (optimizedRoute.length < 2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes optimizar la ruta antes de guardarla",
      });
      return;
    }
    
    if (!data.driverId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar un conductor para la ruta",
      });
      return;
    }
    
    createRouteMutation.mutate(data);
  };

  // Calcular estadísticas de la ruta para mostrar en las tarjetas
  const routeStats = {
    totalDistance: optimizedRoute.length >= 2 
      ? (calculateTotalRouteDistance(optimizedRoute) / 1000).toFixed(2) 
      : "0.00",
    estimatedDuration: optimizedRoute.length >= 2 
      ? calculateEstimatedDuration(calculateTotalRouteDistance(optimizedRoute), optimizedRoute.length - 1) 
      : 0
  };
  
  // Filtrar clientes de la zona que tienen pedidos pendientes
  const customersWithPendingOrders = zoneCustomers.filter((customer: Customer) => 
    pendingOrders.some(order => order.customerId === customer.id)
  );
  
  // Filtrar clientes por búsqueda (solo entre los que tienen pedidos pendientes)
  const filteredZoneCustomers = searchQuery 
    ? customersWithPendingOrders.filter((customer: Customer) => 
        customer.businessname.toLowerCase().includes(searchQuery.toLowerCase()) || 
        customer.phone.includes(searchQuery)
      )
    : customersWithPendingOrders;

  return (
    <div className="p-1 md:p-2 space-y-2">
      {/* Tarjetas de estadísticas en filas compactas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 mb-2">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-2 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Clientes</p>
              <p className="text-sm font-bold">{selectedCustomers.length}</p>
            </div>
            <Users className="h-3.5 w-3.5 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardContent className="p-2 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Distancia</p>
              <p className="text-sm font-bold">{routeStats.totalDistance} km</p>
            </div>
            <Route className="h-3.5 w-3.5 text-yellow-500" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-2 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="text-sm font-bold">{routeStats.estimatedDuration} min</p>
            </div>
            <Clock className="h-3.5 w-3.5 text-green-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-2 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Zona</p>
              <p className="text-sm font-bold">{selectedZone ? '1' : '0'}</p>
            </div>
            <MapPin className="h-3.5 w-3.5 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con pestañas */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/50 px-3 py-1.5">
          <CardTitle className="flex items-center gap-1 text-sm">
            <Truck className="h-3 w-3 text-primary" />
            Planificación de Rutas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger 
                value="zone" 
                className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Zona
              </TabsTrigger>
              {!compact && (
                <>
                  <TabsTrigger 
                    value="customers" 
                    disabled={!selectedZone}
                    className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <User className="h-4 w-4 mr-1" />
                    Clientes
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="pending_orders" 
                    disabled={!selectedZone}
                    className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Pedidos Pendientes
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger 
                value="review" 
                disabled={selectedCustomers.length === 0}
                className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Truck className="h-4 w-4 mr-1" />
                Revisar Ruta
              </TabsTrigger>
            </TabsList>

        <TabsContent value="zone" className="mt-2">
          <Form {...form}>
            <form className="space-y-2">
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Zona de Entrega</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(Number(value));
                        setSelectedZone(Number(value));
                        
                        // Automáticamente mostrar los clientes después de seleccionar la zona
                        setTimeout(() => {
                          // Generate an automatic name for the route
                          const selectedZoneObj = zones && Array.isArray(zones) ? zones.find((z: any) => z.id === Number(value)) : null;
                          if (selectedZoneObj) {
                            const today = new Date().toLocaleDateString("en-US").replace(/\//g, "-");
                            form.setValue("name", `Ruta ${selectedZoneObj.name} - ${today}`);
                            // Cambiar automáticamente a la tab de clientes
                            setSelectedTab("customers");
                          }
                        }, 500);
                      }}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Seleccionar una zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingZones ? (
                          <div className="p-1">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full mt-1" />
                          </div>
                        ) : (
                          zones && Array.isArray(zones) && zones.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id.toString()} className="text-xs">
                              {zone.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              {/* Los botones de selección de clientes se eliminaron porque ahora es automático */}
            </form>
          </Form>

          {selectedZone && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <MapIcon className="h-3 w-3 text-primary" />
                  <h3 className="text-xs font-medium">Mapa de la Zona</h3>
                </div>
                {zones && Array.isArray(zones) && zones.find((z: any) => z.id === selectedZone) && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200 h-4">
                    {zones.find((z: any) => z.id === selectedZone)?.name || ""}
                  </Badge>
                )}
              </div>
              <Card className="overflow-hidden shadow-sm">
                <CardContent className="p-0">
                  <ResponsiveMapContainer 
                    fixedHeight 
                    minHeight="200px"
                    className="map-container"
                  >
                    {typeof window !== "undefined" && (
                      <MapContainer
                        center={[19.0, -70.0]}
                        zoom={10}
                        style={{ width: "100%" }}
                        className="zone-map"
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {zones && Array.isArray(zones) &&
                          zones
                          .filter((zone: any) => zone.id === selectedZone)
                          .map((zone: any) => (
                            <Polyline
                              key={zone.id}
                              positions={zone.coordinates.map((coord: string) => {
                                const [lat, lng] = coord.split(",").map(parseFloat);
                                return [lat, lng];
                              })}
                              color={zone.color}
                              weight={3}
                            />
                          ))}
                      </MapContainer>
                    )}
                  </ResponsiveMapContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="mt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Clientes en la Zona</h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {selectedCustomers.length} seleccionados
              </Badge>
            </div>

            {isLoadingCustomers ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2 mt-1" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredZoneCustomers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-xs">
                No hay clientes registrados en esta zona
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {filteredZoneCustomers.map((customer: Customer) => (
                  <Card 
                    key={customer.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedCustomers.some(c => c.id === customer.id)
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => toggleCustomerSelection(customer)}
                  >
                    <CardContent className="p-2 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-xs">{customer.businessname}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {customer.street} {customer.streetnumber}, {customer.municipalityName}
                        </div>
                        <div className="text-[10px]">{customer.phone}</div>
                      </div>
                      <div>
                        {selectedCustomers.some(c => c.id === customer.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedTab("zone")}
                className="h-7 text-xs px-2"
              >
                Atrás
              </Button>
              
              <div className="space-x-1">
                {optimizedRoute.length > 0 && (
                  <Button 
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedTab("review")}
                    className="h-7 text-xs px-2"
                  >
                    Revisar Ruta
                  </Button>
                )}
                
                <Button 
                  type="button"
                  onClick={optimizeRoute}
                  disabled={selectedCustomers.length < 2 || isOptimizing}
                  className="h-7 text-xs px-2"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Optimizando...
                    </>
                  ) : (
                    "Optimizar Ruta"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pending_orders" className="mt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Pedidos Pendientes</h3>
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-50 text-[10px] py-0 px-1.5 h-4">
                {pendingOrders.length} pedidos sin asignar
              </Badge>
            </div>

            {isLoadingPendingOrders ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2 mt-1" />
                      <Skeleton className="h-2 w-1/4 mt-1" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-xs">
                No hay pedidos pendientes sin asignar en esta zona
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {pendingOrders.map((order: PendingOrder) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="p-2 pb-1 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center text-xs">
                            <User className="h-3 w-3 mr-1 text-primary" />
                            {order.customerName}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                            <MapPin className="h-2.5 w-2.5 mr-0.5 text-gray-400" />
                            {order.customerAddress}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                            <Calendar className="h-2.5 w-2.5 mr-0.5 text-gray-400" />
                            {new Date(order.createdAt).toLocaleDateString("es-ES", {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-50 text-green-600 hover:bg-green-50 text-[10px] py-0 px-1.5 h-4">
                            <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                            ${typeof order.total === 'string' ? parseFloat(order.total).toFixed(2) : order.total.toFixed(2)}
                          </Badge>
                          <div className="text-[9px] mt-0.5 text-muted-foreground">
                            {order.products.reduce((acc, p) => acc + p.quantity, 0)} productos
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-2 pt-0">
                        <div className="text-[10px] font-medium text-muted-foreground mb-1">Productos:</div>
                        <ScrollArea className="h-[60px] w-full rounded-md border p-1">
                          <div className="space-y-0.5">
                            {order.products.map((product, idx) => (
                              <div key={idx} className="flex justify-between text-[10px]">
                                <div className="flex items-center">
                                  <Package className="h-2.5 w-2.5 mr-0.5 text-primary" />
                                  {product.name}
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Badge variant="outline" className="h-4 px-1 text-[9px]">
                                    {product.quantity} unid.
                                  </Badge>
                                  <span className="text-gray-600">${typeof product.price === 'string' ? parseFloat(product.price).toFixed(2) : product.price.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedTab("zone")}
                className="h-7 text-xs px-2"
              >
                Atrás
              </Button>
              
              <Button 
                type="button"
                variant="secondary"
                onClick={() => setSelectedTab("customers")}
                className="h-7 text-xs px-2"
              >
                Seleccionar Clientes
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="review" className="mt-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Nombre de Ruta</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-7 text-xs" />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-2">
                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Conductor</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Seleccionar conductor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingDrivers ? (
                            <div className="p-1">
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ) : (
                            drivers && Array.isArray(drivers) && drivers.map((driver: any) => (
                              <SelectItem key={driver.id} value={driver.id.toString()} className="text-xs">
                                {driver.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-1">
                      <FormLabel className="text-xs">Fecha de Entrega</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full h-7 px-2 text-xs text-left font-normal flex justify-between items-center ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <Calendar className="h-3 w-3 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                date.setHours(12); // Set to noon to avoid timezone issues
                                field.onChange(date);
                              }
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              {optimizedRoute.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium mb-1">Secuencia de Paradas ({optimizedRoute.length})</h3>
                  <div className="border rounded-md p-2 space-y-2 max-h-[250px] overflow-y-auto">
                    {optimizedRoute.map((customer, index) => (
                      <div key={customer.id} className="flex items-center">
                        <Badge 
                          variant={index === 0 ? "secondary" : "outline"} 
                          className={`mr-2 h-5 w-5 rounded-full ${index === 0 ? "bg-primary text-white" : ""} text-[10px]`}
                        >
                          {index}
                        </Badge>
                        <div>
                          <div className="font-medium text-xs">
                            {customer.businessname}
                            {index === 0 && <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0 rounded-full">Inicio</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {customer.street} {customer.streetnumber}{customer.municipalityName ? `, ${customer.municipalityName}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {optimizedRoute.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      <h3 className="text-xs font-medium">Mapa de Ruta Optimizada</h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-600 border-green-200 h-4">
                      {optimizedRoute.length} paradas
                    </Badge>
                  </div>
                  <Card className="overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                      <ResponsiveMapContainer 
                        fixedHeight 
                        minHeight="200px"
                        className="map-container"
                      >
                        {typeof window !== "undefined" && (
                          <MapContainer
                            center={getMapCenter() as [number, number]}
                            zoom={11}
                            style={{ width: "100%" }}
                            className="route-map"
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <MapCenterFixer />
                            {/* Polyline para la ruta */}
                            {optimizedRoute.length > 1 && (
                              <Polyline
                                positions={optimizedRoute
                                  .filter(customer => customer.coordinates)
                                  .map(customer => {
                                    const [lat, lng] = customer.coordinates!.split(',').map(parseFloat);
                                    return [lat, lng] as [number, number];
                                  })}
                                color="#3366ff"
                                weight={3}
                                opacity={0.7}
                                dashArray="5,10"
                              />
                            )}
                        
                        {/* Markers for each point */}
                        {optimizedRoute.map((customer, index) => {
                          try {
                            if (!customer.coordinates) {
                              console.warn(`No coordinates for customer: ${customer.id}`);
                              return null;
                            }
                            
                            const [lat, lng] = customer.coordinates.split(',').map(parseFloat);
                            if (isNaN(lat) || isNaN(lng)) {
                              console.warn(`Invalid coordinates for customer: ${customer.id}`, customer.coordinates);
                              return null;
                            }
                            
                            // Use Leaflet divIcon to customize marker appearance
                            const customIcon = L.divIcon({
                              className: 'custom-marker',
                              html: `<div class="flex items-center justify-center ${index === 0 ? 'bg-green-600' : 'bg-primary'} text-white rounded-full w-6 h-6 text-sm font-semibold">${index}</div>`,
                              iconSize: [24, 24],
                              iconAnchor: [12, 12]
                            });
                            
                            return (
                              <Marker 
                                key={`${customer.id}-${index}`}
                                position={[lat, lng]}
                                icon={customIcon}
                              >
                                <Popup>
                                  <div className="text-sm">
                                    <strong>{customer.businessname}</strong>
                                    <br />
                                    Parada #{index}
                                    {index === 0 && " (Inicio)"}
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          } catch (e) {
                            console.error("Error rendering marker:", e, customer);
                            return null;
                          }
                        })}
                      </MapContainer>
                    )}
                  </ResponsiveMapContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSelectedTab("customers")}
                  className="h-7 text-xs px-2"
                >
                  Atrás
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createRouteMutation.isPending || !form.watch("driverId")}
                  className="h-7 text-xs px-2"
                >
                  {createRouteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Creando ruta...
                    </>
                  ) : (
                    "Crear Ruta"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}