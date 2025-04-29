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
  Map as MapIcon,
  AlertTriangle,
  RefreshCw
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
import { Switch } from "@/components/ui/switch";
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
import { Label } from "@/components/ui/label";

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
  total: string | number; // Puede venir como string desde el backend
  customerName: string;
  customerAddress: string;
  customerAddressNumber: string;
  notes?: string;
  date?: string; // Fecha de creación del pedido
  estimatedDeliveryTime?: string | null;
  deliveryCoordinates?: string | null;
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
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Estados para panel de depuración
  const [useDebugMode, setUseDebugMode] = useState<boolean>(true); // Activado por defecto para pruebas
  const [debugCompanyId, setDebugCompanyId] = useState<number | null>(15); // Valor por defecto para pruebas
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch drivers
  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery({
    queryKey: ["/api/users?role=driver"]
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
    queryKey: ["/api/zones"]
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
  
  // Fetch pending orders for the selected zone with debug support
  const {
    data: pendingOrders = [],
    isLoading: isLoadingPendingOrders,
    error: pendingOrdersError,
    refetch: refetchPendingOrders
  } = useQuery<PendingOrder[]>({
    queryKey: ["/api/zones", selectedZone, "pending-orders", useDebugMode, debugCompanyId],
    queryFn: async () => {
      if (!selectedZone) return [];
      
      console.log(`Fetching pending orders for zone ${selectedZone} (debug mode: ${useDebugMode}, companyId: ${debugCompanyId})`);
      setAuthError(null);
      
      try {
        let url = "";
        
        // Si estamos en modo debug, solicitar con parámetros debug=true y companyId
        if (useDebugMode && debugCompanyId) {
          url = `/api/zones/${selectedZone}/pending-orders?debug=true&companyId=${debugCompanyId}`;
          console.log(`MODO DEBUG: Solicitando pedidos pendientes en modo debug: ${url}`);
        } else {
          // Obtener el companyId de la sesión (para modo normal)
          const userResponse = await apiRequest("GET", "/api/user");
          
          if (!userResponse.ok) {
            console.warn("No se pudo obtener el usuario de la sesión");
            setAuthError("Error de autenticación: No se encontró una sesión válida. Por favor inicie sesión nuevamente.");
            
            // Si estamos en modo debug pero sin companyId específico, usar solo debug=true
            if (useDebugMode) {
              url = `/api/zones/${selectedZone}/pending-orders?debug=true`;
              console.log(`MODO DEBUG FALLBACK: Usando solo parámetro debug=true sin hardcodear companyId`);
            } else {
              throw new Error("Sin sesión de usuario válida");
            }
          } else {
            // Usuario está autenticado, obtenemos sus datos
            const userData = await userResponse.json();
            
            // Usamos la URL normal ya que el backend obtendrá el companyId de la sesión
            url = `/api/zones/${selectedZone}/pending-orders`;
            console.log(`Solicitando pedidos pendientes con sesión activa para zona ${selectedZone}`);
          }
        }
        
        if (!url) {
          throw new Error("No se pudo determinar la URL para obtener pedidos pendientes");
        }
        
        console.log(`Enviando solicitud a: ${url}`);
        const response = await apiRequest("GET", url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error fetching pending orders:", errorText);
          if (errorText.includes("No autenticado") || errorText.includes("Acceso denegado")) {
            setAuthError("Error de autenticación: Sesión inválida. Por favor inicie sesión nuevamente.");
            throw new Error("Error de autenticación");
          }
          throw new Error("Error al obtener pedidos pendientes de la zona");
        }
        
        const data = await response.json();
        console.log("Pending orders data:", data);
        
        if (Array.isArray(data) && data.length === 0) {
          console.log("No se encontraron pedidos pendientes para esta zona");
        }
        
        return data;
      } catch (error) {
        console.error("Error en la consulta de pedidos pendientes:", error);
        throw error;
      }
    },
    enabled: !!selectedZone,
    retry: 2, // Reintentar dos veces en caso de error
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
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
      }
    }, [map, optimizedRoute]);
    
    return null;
  }

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (coord1: string, coord2: string) => {
    try {
      if (!coord1 || !coord2 || typeof coord1 !== 'string' || typeof coord2 !== 'string') {
        return Infinity;
      }
      
      const [lat1Str, lng1Str] = coord1.split(',');
      const [lat2Str, lng2Str] = coord2.split(',');
      
      if (!lat1Str || !lng1Str || !lat2Str || !lng2Str) {
        return Infinity;
      }
      
      const lat1 = parseFloat(lat1Str);
      const lng1 = parseFloat(lng1Str);
      const lat2 = parseFloat(lat2Str);
      const lng2 = parseFloat(lng2Str);
      
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
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

  // Calculate total route distance
  const calculateTotalRouteDistance = (route: Customer[]) => {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const coord1 = route[i].coordinates || "";
      const coord2 = route[i + 1].coordinates || "";
      
      const distance = calculateDistance(coord1, coord2);
      if (distance !== Infinity) {
        totalDistance += distance;
      }
    }
    
    return totalDistance;
  };

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
      
      // Verificar que los clientes tengan coordenadas válidas
      const customersWithCoordinates = selectedCustomers.filter(customer => {
        if (!customer.coordinates) {
          console.warn(`Cliente ${customer.id} (${customer.businessname}) no tiene coordenadas`);
          return false;
        }
        return true;
      });
      
      if (customersWithCoordinates.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ninguno de los clientes seleccionados tiene coordenadas válidas",
        });
        setIsOptimizing(false);
        return;
      }

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
            currentPoint.coordinates || "19.075380,-70.128822", // Coordenadas del depósito por defecto
            unvisited[i].coordinates || "19.075380,-70.128822"  // Coordenadas del depósito por defecto
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
      
      console.log("Ruta optimizada final:", optimized);
      
      // Set the optimized route
      setOptimizedRoute(optimized);
      
      // Calcular distancia total
      const totalDistance = calculateTotalRouteDistance(optimized);
      console.log(`Distancia total de la ruta: ${totalDistance.toFixed(2)} km`);
      
      // Update stops in form with format esperado por el backend
      const stops = optimized.map(customer => customer.coordinates || "");
      form.setValue("stops", stops);
      
      // Cambiar automáticamente a la pestaña de revisión
      setSelectedTab("review");
      
      // Mensaje de éxito
      toast({
        title: "Ruta optimizada",
        description: `Se ha optimizado la ruta para ${optimized.length - 1} clientes (${totalDistance.toFixed(2)} km)`,
      });
    } catch (error) {
      console.error("Error optimizing route:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo optimizar la ruta",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Submit route
  const onSubmit = async (values: any) => {
    try {
      console.log("Creando ruta con datos:", values);
      
      // Check if stops is empty
      if (!values.stops || values.stops.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La ruta debe tener al menos una parada",
        });
        return;
      }
      
      const response = await apiRequest("POST", "/api/routes", values);
      if (!response.ok) {
        throw new Error("Error al crear la ruta");
      }
      
      toast({
        title: "Ruta creada",
        description: "La ruta se ha creado exitosamente",
      });
      
      // Reset form
      form.reset();
      setSelectedCustomers([]);
      setOptimizedRoute([]);
      
      // Notify parent component
      onRouteCreated();
    } catch (error) {
      console.error("Error creating route:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la ruta",
      });
    }
  };

  const handleZoneSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value.toLowerCase());
  };

  const renderDebugPanel = () => {
    if (!showDebugPanel) return null;
    
    return (
      <Card className="mb-4 border-dashed border-yellow-500">
        <CardHeader className="bg-yellow-50 dark:bg-yellow-950">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base text-yellow-700 dark:text-yellow-400">Panel de Depuración</CardTitle>
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">DEBUG</Badge>
          </div>
          <CardDescription>Herramientas para diagnosticar problemas de carga de pedidos por zona</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="debug-mode" className="cursor-pointer">Modo Debug</Label>
              <Switch 
                id="debug-mode" 
                checked={useDebugMode} 
                onCheckedChange={setUseDebugMode}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="company-id">ID Compañía:</Label>
              <Input 
                id="company-id" 
                value={debugCompanyId || ""} 
                onChange={e => setDebugCompanyId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-16"
                disabled={!useDebugMode}
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (selectedZone) {
                  refetchPendingOrders();
                } else {
                  toast({
                    title: "Seleccione una zona",
                    description: "Debe seleccionar una zona antes de recargar los pedidos",
                  });
                }
              }}
              disabled={!selectedZone}
              className="h-8"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Recargar
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>URL de diagnóstico: {selectedZone ? 
              `/api/zones/${selectedZone}/pending-orders${useDebugMode ? `?debug=true&companyId=${debugCompanyId || 15}` : ""}`
              : "Seleccione una zona primero"
            }</p>
            
            {authError && (
              <div className="bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 inline-block mr-1" />
                {authError}
              </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
              <p>Estado: 
                {isLoadingPendingOrders 
                  ? <span className="text-blue-600 dark:text-blue-400 ml-1">Cargando pedidos...</span>
                  : pendingOrdersError 
                  ? <span className="text-red-600 dark:text-red-400 ml-1">Error al cargar pedidos</span>
                  : <span className="text-green-600 dark:text-green-400 ml-1">
                      {pendingOrders.length} pedidos encontrados para zona {selectedZone || "ninguna"}
                    </span>
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredZones = zones.filter((zone: any) => 
    zone.name.toLowerCase().includes(searchQuery)
  );

  // Filter customers in the selected zone
  const filteredZoneCustomers = zoneCustomers.filter((customer: Customer) => 
    customer.businessname.toLowerCase().includes(searchQuery) ||
    customer.street.toLowerCase().includes(searchQuery)
  );

  // Filter customers with pending orders in the selected zone
  const customersWithPendingOrders = pendingOrders.length > 0
    ? zoneCustomers.filter((customer: Customer) => 
        pendingOrders.some(order => order.customerId === customer.id)
      )
    : [];

  return (
    <div className={`space-y-6 ${compact ? 'p-0' : 'p-0 sm:p-4'}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Crear ruta basada en zona</h3>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
        >
          {showDebugPanel ? "Ocultar" : "Mostrar"} Panel Debug
        </Button>
      </div>
      
      {renderDebugPanel()}
      
      <Tabs defaultValue="zone" onValueChange={setSelectedTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="zone">1. Selección de Zona</TabsTrigger>
          <TabsTrigger value="customers">2. Selección de Clientes</TabsTrigger>
          <TabsTrigger value="review">3. Revisión</TabsTrigger>
        </TabsList>
        
        <TabsContent value="zone" className="space-y-4 pt-4">
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="zoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar zona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingZones ? (
                            <div className="p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <>
                              <div className="px-3 pb-2">
                                <Input
                                  placeholder="Buscar zona..."
                                  value={searchQuery}
                                  onChange={handleZoneSearch}
                                  className="h-8 mt-1"
                                />
                              </div>
                              <Separator className="mb-2" />
                              {filteredZones.length === 0 ? (
                                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                  No se encontraron zonas
                                </div>
                              ) : (
                                filteredZones.map((zone: any) => (
                                  <SelectItem key={zone.id} value={zone.id.toString()}>
                                    {zone.name}
                                  </SelectItem>
                                ))
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Ruta</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conductor</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar conductor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingDrivers ? (
                            <div className="p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            drivers.map((driver: any) => (
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
                  name="assistantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auxiliar</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar auxiliar (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Ninguno</SelectItem>
                          {isLoadingAssistants ? (
                            <div className="p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            assistants.map((assistant: any) => (
                              <SelectItem key={assistant.id} value={assistant.id.toString()}>
                                {assistant.name}
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
                  name="truckId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehículo</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar vehículo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingTrucks ? (
                            <div className="p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            trucks.map((truck) => (
                              <SelectItem key={truck.id} value={truck.id.toString()}>
                                {truck.brand} {truck.model} ({truck.plate})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  onClick={() => setSelectedTab("customers")} 
                  disabled={!selectedZone}
                >
                  Siguiente
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Clientes en la zona</h4>
            <div className="relative w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-8"
                value={searchQuery}
                onChange={handleZoneSearch}
              />
            </div>
          </div>
          
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">
                Todos los clientes ({filteredZoneCustomers.length})
              </TabsTrigger>
              <TabsTrigger value="with-orders">
                Con pedidos pendientes ({customersWithPendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="selected">
                Seleccionados ({selectedCustomers.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="pt-4">
              {isLoadingCustomers ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-10 flex-1" />
                    </div>
                  ))}
                </div>
              ) : filteredZoneCustomers.length === 0 ? (
                <div className="text-center p-8">
                  <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No hay clientes en esta zona</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredZoneCustomers.map((customer: Customer) => (
                      <div 
                        key={customer.id}
                        className={`flex items-center p-2 border rounded ${
                          selectedCustomers.some(c => c.id === customer.id)
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={selectedCustomers.some(c => c.id === customer.id)}
                          onCheckedChange={() => toggleCustomerSelection(customer)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{customer.businessname}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>
                              {customer.street} {customer.streetnumber}
                              {customer.municipalityName && `, ${customer.municipalityName}`}
                            </span>
                          </div>
                        </div>
                        {customer.coordinates ? (
                          <Badge variant="outline" className="text-xs ml-2">
                            <MapPin className="h-3 w-3 mr-1" />
                            GPS
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-red-500 ml-2">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Sin GPS
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="with-orders" className="pt-4">
              {isLoadingPendingOrders ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-10 flex-1" />
                    </div>
                  ))}
                </div>
              ) : customersWithPendingOrders.length === 0 ? (
                <div className="text-center p-8">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No hay clientes con pedidos pendientes en esta zona</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {customersWithPendingOrders.map((customer: Customer) => (
                      <div 
                        key={customer.id}
                        className={`flex items-center p-2 border rounded ${
                          selectedCustomers.some(c => c.id === customer.id)
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={selectedCustomers.some(c => c.id === customer.id)}
                          onCheckedChange={() => toggleCustomerSelection(customer)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{customer.businessname}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>
                              {customer.street} {customer.streetnumber}
                              {customer.municipalityName && `, ${customer.municipalityName}`}
                            </span>
                          </div>
                        </div>
                        <Badge className="ml-2 text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {pendingOrders.filter(order => order.customerId === customer.id).length} pedidos
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="selected" className="pt-4">
              {selectedCustomers.length === 0 ? (
                <div className="text-center p-8">
                  <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Selecciona clientes para incluir en la ruta</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {selectedCustomers.map((customer: Customer) => (
                      <div 
                        key={customer.id}
                        className="flex items-center p-2 border rounded border-primary bg-primary/5"
                      >
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => toggleCustomerSelection(customer)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{customer.businessname}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>
                              {customer.street} {customer.streetnumber}
                              {customer.municipalityName && `, ${customer.municipalityName}`}
                            </span>
                          </div>
                        </div>
                        
                        {pendingOrders.some(order => order.customerId === customer.id) && (
                          <Badge className="ml-2 text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {pendingOrders.filter(order => order.customerId === customer.id).length} pedidos
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setSelectedTab("zone")}>
              Atrás
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={optimizeRoute}
                disabled={selectedCustomers.length < 2 || isOptimizing}
              >
                {isOptimizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Optimizar Ruta
              </Button>
              <Button 
                onClick={() => setSelectedTab("review")}
                disabled={selectedCustomers.length === 0}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="review" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalles de la Ruta</CardTitle>
                <CardDescription>Información sobre la ruta que será creada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Nombre:</div>
                  <div>{form.getValues().name}</div>
                  
                  <div className="font-medium">Fecha:</div>
                  <div>{format(form.getValues().date, "PPP", { locale: es })}</div>
                  
                  <div className="font-medium">Zona:</div>
                  <div>
                    {zones.find((z: any) => z.id === selectedZone)?.name || "No seleccionada"}
                  </div>
                  
                  <div className="font-medium">Conductor:</div>
                  <div>
                    {drivers.find((d: any) => d.id === form.getValues().driverId)?.name || "No seleccionado"}
                  </div>
                  
                  <div className="font-medium">Auxiliar:</div>
                  <div>
                    {assistants.find((a: any) => a.id === form.getValues().assistantId)?.name || "Ninguno"}
                  </div>
                  
                  <div className="font-medium">Vehículo:</div>
                  <div>
                    {trucks.find((t) => t.id === form.getValues().truckId)?.plate || "No seleccionado"}
                  </div>
                  
                  <div className="font-medium">Clientes:</div>
                  <div>{optimizedRoute.length > 0 ? optimizedRoute.length - 1 : selectedCustomers.length}</div>
                  
                  <div className="font-medium">Distancia:</div>
                  <div>
                    {optimizedRoute.length > 0 
                      ? `${calculateTotalRouteDistance(optimizedRoute).toFixed(2)} km`
                      : "No calculada"
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Previsualización de la Ruta</CardTitle>
                <CardDescription>Mapa de la ruta optimizada</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {optimizedRoute.length > 0 ? (
                  <ResponsiveMapContainer className="h-[300px]">
                    <MapContainer
                      center={getMapCenter() as [number, number]}
                      zoom={11}
                      style={{ height: "100%", width: "100%" }}
                      zoomControl={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      
                      <MapCenterFixer />
                      
                      {optimizedRoute.map((customer, index) => {
                        if (!customer.coordinates) return null;
                        
                        const [lat, lng] = customer.coordinates.split(',').map(parseFloat);
                        if (isNaN(lat) || isNaN(lng)) return null;
                        
                        const isDepot = index === 0;
                        const icon = isDepot
                          ? new L.Icon({
                              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                              iconSize: [25, 41],
                              iconAnchor: [12, 41],
                              popupAnchor: [1, -34],
                              shadowSize: [41, 41]
                            })
                          : new L.Icon({
                              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                              iconSize: [25, 41],
                              iconAnchor: [12, 41],
                              popupAnchor: [1, -34],
                              shadowSize: [41, 41]
                            });
                        
                        return (
                          <Marker 
                            key={`${customer.id}-${index}`} 
                            position={[lat, lng]}
                            icon={icon}
                          >
                            <Popup>
                              <div className="text-sm">
                                <p className="font-semibold">{customer.businessname}</p>
                                <p>{customer.street} {customer.streetnumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  Parada #{index} {isDepot && "(Depósito)"}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                      
                      {/* Draw the route line */}
                      {optimizedRoute.length > 1 && (
                        <Polyline
                          positions={
                            optimizedRoute
                              .filter(customer => customer.coordinates)
                              .map(customer => {
                                const [lat, lng] = customer.coordinates!.split(',').map(parseFloat);
                                return [lat, lng] as [number, number];
                              })
                          }
                          color="#3b82f6"
                          weight={3}
                          opacity={0.7}
                          dashArray="5, 10"
                        />
                      )}
                    </MapContainer>
                  </ResponsiveMapContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] bg-muted/20">
                    <div className="text-center">
                      <MapIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Optimiza la ruta para visualizar el mapa
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium mt-4">Secuencia de Paradas</h4>
            
            {optimizedRoute.length > 0 ? (
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-4 space-y-2">
                  {optimizedRoute.map((customer, index) => (
                    <div 
                      key={`${customer.id}-${index}`}
                      className={`flex items-center p-2 border rounded ${index === 0 ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" : ""}`}
                    >
                      <div className="flex-none w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold">{index}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {index === 0 ? "Almacén Principal (Inicio/Fin)" : customer.businessname}
                        </p>
                        {index > 0 && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>
                              {customer.street} {customer.streetnumber}
                              {customer.municipalityName && `, ${customer.municipalityName}`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {index > 0 && pendingOrders.some(order => order.customerId === customer.id) && (
                        <Badge className="ml-2 text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {pendingOrders.filter(order => order.customerId === customer.id).length} pedidos
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[200px] border rounded-md bg-muted/10">
                <div className="text-center">
                  <Route className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Optimiza la ruta para ver la secuencia de paradas
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setSelectedTab("customers")}>
              Atrás
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={!selectedZone || selectedCustomers.length === 0 || optimizedRoute.length === 0 || !form.getValues().driverId || !form.getValues().truckId}
            >
              Crear Ruta
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}