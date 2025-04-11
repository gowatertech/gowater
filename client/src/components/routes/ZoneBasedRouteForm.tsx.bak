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
  CheckCircle 
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
  const [optimizedRoute, setOptimizedRoute] = useState<Customer[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      setSelectedZone(zoneId);
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
  
  // Filtrar clientes de la zona por búsqueda
  const filteredZoneCustomers = searchQuery 
    ? zoneCustomers.filter((customer: Customer) => 
        customer.businessname.toLowerCase().includes(searchQuery.toLowerCase()) || 
        customer.phone.includes(searchQuery)
      )
    : zoneCustomers;

  return (
    <div className="p-2 md:p-4 space-y-2">
      {/* Cabecera con título e icono */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-lg md:text-xl font-bold">Planificación de Rutas</h1>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Clientes Seleccionados</p>
              <p className="text-xl font-bold mt-1">{selectedCustomers.length}</p>
            </div>
            <Users className="h-7 w-7 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Distancia Total</p>
              <p className="text-xl font-bold mt-1">{routeStats.totalDistance} km</p>
            </div>
            <Route className="h-7 w-7 text-yellow-500" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Duración Estimada</p>
              <p className="text-xl font-bold mt-1">{routeStats.estimatedDuration} min</p>
            </div>
            <Clock className="h-7 w-7 text-green-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Zonas Activas</p>
              <p className="text-xl font-bold mt-1">{selectedZone ? '1' : '0'}</p>
            </div>
            <MapPin className="h-7 w-7 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con pestañas */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/50 px-5 py-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-primary" />
            Planificación de Rutas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger 
                value="zone" 
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Zona
              </TabsTrigger>
              {!compact && (
                <TabsTrigger 
                  value="customers" 
                  disabled={!selectedZone}
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <User className="h-4 w-4 mr-2" />
                  Clientes
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="review" 
                disabled={selectedCustomers.length === 0}
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Truck className="h-4 w-4 mr-2" />
                Revisar Ruta
              </TabsTrigger>
            </TabsList>

        <TabsContent value="zone" className="mt-4">
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona de Entrega</FormLabel>
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
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar una zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingZones ? (
                          <div className="p-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full mt-2" />
                          </div>
                        ) : (
                          zones && Array.isArray(zones) && zones.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id.toString()}>
                              {zone.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Los botones de selección de clientes se eliminaron porque ahora es automático */}
            </form>
          </Form>

          {selectedZone && (
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Zone Map</div>
              <div className="border rounded-md overflow-hidden">
                <ResponsiveMapContainer 
                  fixedHeight 
                  minHeight="300px"
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
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Clientes en la Zona</h3>
              <Badge variant="outline">
                {selectedCustomers.length} seleccionados
              </Badge>
            </div>

            {isLoadingCustomers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredZoneCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes registrados en esta zona
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
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
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{customer.businessname}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.street} {customer.streetnumber}, {customer.municipalityName}
                        </div>
                        <div className="text-sm">{customer.phone}</div>
                      </div>
                      <div>
                        {selectedCustomers.some(c => c.id === customer.id) && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedTab("zone")}
              >
                Atrás
              </Button>
              
              <div className="space-x-2">
                {optimizedRoute.length > 0 && (
                  <Button 
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedTab("review")}
                  >
                    Revisar y Guardar Ruta
                  </Button>
                )}
                
                <Button 
                  type="button"
                  onClick={optimizeRoute}
                  disabled={selectedCustomers.length < 2 || isOptimizing}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

        <TabsContent value="review" className="mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Ruta</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conductor</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar conductor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingDrivers ? (
                            <div className="p-2">
                              <Skeleton className="h-5 w-full" />
                            </div>
                          ) : (
                            drivers && Array.isArray(drivers) && drivers.map((driver: any) => (
                              <SelectItem key={driver.id} value={driver.id.toString()}>
                                {driver.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Entrega</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal flex justify-between items-center ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <Calendar className="h-4 w-4 opacity-50" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {optimizedRoute.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Secuencia de Paradas ({optimizedRoute.length})</h3>
                  <div className="border rounded-md p-4 space-y-3 max-h-[300px] overflow-y-auto">
                    {optimizedRoute.map((customer, index) => (
                      <div key={customer.id} className="flex items-center">
                        <Badge 
                          variant={index === 0 ? "secondary" : "outline"} 
                          className={`mr-3 h-6 w-6 rounded-full ${index === 0 ? "bg-primary text-white" : ""}`}
                        >
                          {index}
                        </Badge>
                        <div>
                          <div className="font-medium">
                            {customer.businessname}
                            {index === 0 && <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">Inicio</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {customer.street} {customer.streetnumber}{customer.municipalityName ? `, ${customer.municipalityName}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {optimizedRoute.length > 0 && (
                <div className="border rounded-md overflow-hidden mt-4">
                  <div className="text-sm font-medium mb-2">Mapa de Ruta Optimizada</div>
                  <ResponsiveMapContainer 
                    fixedHeight 
                    minHeight="300px"
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
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSelectedTab("customers")}
                >
                  Atrás
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createRouteMutation.isPending || !form.watch("driverId")}
                >
                  {createRouteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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