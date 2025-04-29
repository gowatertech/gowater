import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRouteSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/use-company-settings";
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
  XCircle
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
import { Checkbox } from "@/components/ui/checkbox";

interface PendingOrdersRouteFormProps {
  onRouteCreated: () => void;
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
  deliveryCoordinates?: string; // Añadir esta propiedad
  date: string;
  products: {
    productId: number;
    name: string;
    quantity: number;
    price: number;
  }[];
}

interface OrderWithCustomer extends PendingOrder {
  customer?: Customer;
}

interface Truck {
  id: number;
  brand: string;
  model: string;
  plate: string;
  capacity: number;
  status: string;
}

export default function PendingOrdersRouteForm({ onRouteCreated }: PendingOrdersRouteFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("zone");
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<PendingOrder[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Customer[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingOrdersUserData, setPendingOrdersUserData] = useState<any>(null);

  // Fetch drivers
  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery<any[]>({
    queryKey: ["/api/users?role=driver"],
  });
  
  // Fetch assistants
  const { data: assistants = [], isLoading: isLoadingAssistants } = useQuery<any[]>({
    queryKey: ["/api/users?role=assistant"],
  });

  // Fetch trucks (vehículos)
  const { data: trucks = [], isLoading: isLoadingTrucks } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  // Fetch zones
  const { data: zones = [], isLoading: isLoadingZones } = useQuery<any[]>({
    queryKey: ["/api/zones"],
  });

  // Obtener información del usuario autenticado para mostrar companyId
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiRequest({
          url: "/user",
          method: "GET"
        });
        
        if (response.ok) {
          const data = await response.json();
          setPendingOrdersUserData(data);
          console.log("Pending Orders - User data loaded:", data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    
    fetchUserData();
  }, []);

  // Fetch pending orders for the selected zone
  const {
    data: pendingOrders = [],
    isLoading: isLoadingPendingOrders,
    error: pendingOrdersError,
    refetch: refetchPendingOrders
  } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/zones", selectedZone, "pending-orders"],
    queryFn: async () => {
      if (!selectedZone) return [];
      
      console.log(`Fetching pending orders for zone ${selectedZone}`);
      
      // Usar el formato de objeto para apiRequest - sin hardcoding
      // Obtener información del usuario primero para obtener su companyId
      const userResponse = await apiRequest({
        url: "/user",
        method: "GET"
      });
      
      // Preparar parámetros con modo debug activado
      const params: Record<string, any> = {
        debug: "true"
      };
      
      // Si tenemos sesión de usuario, intentar obtener el companyId
      if (userResponse.ok) {
        try {
          const userData = await userResponse.json();
          setPendingOrdersUserData(userData);
          if (userData.companyId) {
            params.companyId = userData.companyId.toString();
            console.log(`Usando companyId=${userData.companyId} de la sesión del usuario`);
          }
        } catch (e) {
          console.warn("No se pudo obtener companyId del usuario:", e);
        }
      }
      
      // Usar fallback para desarrollo si no hay companyId
      if (!params.companyId) {
        params.companyId = "1"; // Fallback para desarrollo
        console.log("FALLBACK: Usando companyId=1 por defecto (solo para desarrollo)");
      }
      
      const response = await apiRequest({
        url: `/zones/${selectedZone}/pending-orders`,
        method: "GET",
        params
      });
      
      console.log("Pending orders response:", response);
      
      // Si la respuesta ya está parseada como JSON, usarla directamente
      const data = Array.isArray(response) ? response : [];
      console.log("Pending orders data:", data);
      
      // Transformar los datos para que coincidan con el formato esperado por el componente
      return data.map((order: any) => ({
        ...order,
        // Asegurarnos de que cada pedido tenga una propiedad coordinates
        coordinates: order.deliveryCoordinates || order.coordinates || null,
        // Agregar customerAddress completo con número (para mostrar en la vista)
        customerAddress: order.customerAddress + (order.customerAddressNumber ? ` #${order.customerAddressNumber}` : ''),
        // Si customerPhone no está presente, usar un valor por defecto
        customerPhone: order.customerPhone || "",
        // Inicializar un array vacío de productos (opcional, ya que hemos agregado la verificación)
        products: order.products || []
      }));
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
      setSelectedOrders([]);
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

  // Toggle order selection
  const toggleOrderSelection = (order: PendingOrder) => {
    if (selectedOrders.some(o => o.id === order.id)) {
      setSelectedOrders(selectedOrders.filter(o => o.id !== order.id));
    } else {
      setSelectedOrders([...selectedOrders, order]);
    }
  };

  // Use company settings hook to get configured coordinates
  const { settings } = useCompanySettings();
  
  // Get company location from settings or default to Dominican Republic center
  const getCompanyCoordinates = (): [number, number] => {
    if (settings?.latitude && settings?.longitude) {
      const lat = parseFloat(settings.latitude);
      const lng = parseFloat(settings.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return [19.0, -70.0]; // Default center (Dominican Republic) if company coordinates not available
  };
  
  // Calculate map center and bounds based on optimized route coordinates
  const getMapCenter = () => {
    if (optimizedRoute.length === 0) {
      return getCompanyCoordinates(); // Use company location as default center
    }
    
    const pointsWithCoords = optimizedRoute
      .filter(customer => customer.coordinates)
      .map(customer => {
        const [lat, lng] = customer.coordinates!.split(',').map(parseFloat);
        return [lat, lng];
      });
      
    if (pointsWithCoords.length === 0) {
      return getCompanyCoordinates(); // Use company coordinates as default
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

  // Convert selected orders to customers for route optimization
  const prepareOrdersForRouteOptimization = () => {
    if (selectedOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona al menos un pedido para crear la ruta",
      });
      return;
    }

    setIsOptimizing(true);

    try {
      // Define depot/almacén principal (empresa) using company settings
      const depot: Customer = {
        id: 0, // Use 0 to represent depot
        businessname: "Almacén Principal",
        phone: "",
        street: "",
        streetnumber: "",
        coordinates: settings?.latitude && settings?.longitude 
          ? `${settings.latitude},${settings.longitude}` 
          : "19.075380,-70.128822", // Use company coordinates or fallback
      };

      // Convert orders to customers for the route algorithm
      const customersFromOrders = selectedOrders.map(order => {
        // Obtener cliente por ID si existe en la zona
        const customer = {
          id: order.customerId,
          businessname: order.customerName,
          phone: order.customerPhone || "",
          street: order.customerAddress,
          streetnumber: "",
          // Si no hay coordenadas, usamos las coordenadas reales del cliente o un valor predeterminado
          coordinates: order.deliveryCoordinates || order.coordinates || 
            (settings?.latitude && settings?.longitude ? `${settings.latitude},${settings.longitude}` : "19.105433,-70.086588"), // Use company coordinates as fallback
          orderId: order.id, // Añadir el ID del pedido para asociarlo con el cliente
        } as Customer;
        
        console.log("Cliente para optimización:", customer);
        return customer;
      });

      // Ensure we have unique customers (multiple orders from same customer)
      const uniqueCustomers = customersFromOrders.reduce((acc: Customer[], current) => {
        if (!acc.some(c => c.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Optimize the route
      optimizeRoute([depot, ...uniqueCustomers]);
    } catch (error) {
      console.error("Error preparing orders for route:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al preparar los pedidos para la ruta",
      });
      setIsOptimizing(false);
    }
  };

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

  // Optimize route order based on proximity
  const optimizeRoute = (customers: Customer[]) => {
    try {
      console.log("Optimizando ruta para clientes:", customers);
      
      // Extract depot (first customer) and remaining customers
      const depot = customers[0];
      const customersToVisit = customers.slice(1);
      
      console.log("Depot:", depot);
      console.log("Clientes a visitar:", customersToVisit);
      
      if (customersToVisit.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay clientes para optimizar la ruta",
        });
        setIsOptimizing(false);
        return;
      }
      
      // Start with depot
      const unvisited = [...customersToVisit];
      const optimized = [depot];

      // Verificar que todos los clientes tengan coordenadas válidas
      const invalidCustomers = unvisited.filter(
        customer => !customer.coordinates || customer.coordinates === "null,null"
      );
      
      if (invalidCustomers.length > 0) {
        console.warn("Hay clientes sin coordenadas:", invalidCustomers);
        // Asignar coordenadas predeterminadas para permitir la optimización
        invalidCustomers.forEach(customer => {
          customer.coordinates = settings?.latitude && settings?.longitude 
            ? `${settings.latitude},${settings.longitude}` 
            : "19.105433,-70.086588"; // Use company coordinates as fallback
        });
      }

      while (unvisited.length > 0) {
        const currentPoint = optimized[optimized.length - 1];
        
        // Find the closest unvisited point
        let closestIdx = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
          // Get depot coordinates from company settings or use fallback
          const depotCoordinates = settings?.latitude && settings?.longitude 
            ? `${settings.latitude},${settings.longitude}` 
            : "19.075380,-70.128822";
            
          const distance = calculateDistance(
            currentPoint.coordinates || depotCoordinates, 
            unvisited[i].coordinates || depotCoordinates
          );
          
          console.log(`Distancia desde ${currentPoint.businessname} hasta ${unvisited[i].businessname}: ${distance} km`);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIdx = i;
          }
        }
        
        // Add the closest point to our route
        optimized.push(unvisited[closestIdx]);
        console.log(`Añadiendo a la ruta: ${unvisited[closestIdx].businessname}`);
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
        description: "No se pudo optimizar la ruta. Intenta nuevamente.",
      });
    } finally {
      setIsOptimizing(false);
    }
  };
  
  // Calculate total route distance in kilometers
  const calculateTotalRouteDistance = (route: Customer[]) => {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      if (!route[i].coordinates || !route[i+1].coordinates) {
        continue;
      }
      
      totalDistance += calculateDistance(
        route[i].coordinates || "",
        route[i+1].coordinates || ""
      );
    }
    
    return totalDistance; // in km
  };

  // Estimate duration in minutes based on distance and stops
  const calculateEstimatedDuration = (distance: number, numStops: number) => {
    const AVERAGE_SPEED = 30; // km/h
    const TIME_PER_STOP = 5; // minutes per stop
    
    // Calculate travel time in minutes: distance (km) / speed (km/h) * 60 min/h
    const travelTimeMinutes = distance / AVERAGE_SPEED * 60;
    
    // Add time for stops
    const stopTimeMinutes = numStops * TIME_PER_STOP;
    
    // Total estimated minutes, rounded up
    return Math.ceil(travelTimeMinutes + stopTimeMinutes);
  };

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting route data:", data);
      
      // Calculate total distance of the optimized route
      const totalDistance = calculateTotalRouteDistance(optimizedRoute);
      
      // Calculate estimated duration based on distance and number of stops
      const estimatedDuration = calculateEstimatedDuration(totalDistance, optimizedRoute.length - 1);
      
      // Get order IDs from selected orders
      const orderIds = selectedOrders.map(order => order.id);
      
      // Prepare data for server
      const routeData = {
        name: data.name,
        date: new Date(data.date),
        driverId: Number(data.driverId),
        assistantId: data.assistantId && data.assistantId !== "null" ? Number(data.assistantId) : null,
        truckId: data.truckId && data.truckId !== "null" ? Number(data.truckId) : null,
        zoneId: Number(data.zoneId || selectedZone),
        status: "pending",
        isCompleted: false,
        deliverySequence: optimizedRoute.map(customer => customer.id.toString()),
        stops: optimizedRoute.map(customer => customer.coordinates || ""),
        totalDistance: totalDistance.toFixed(2),
        estimatedDuration: estimatedDuration,
        orderIds: orderIds // Pass order IDs to assign to this route
      };
      
      // Send route data to server
      const response = await apiRequest({
        method: "POST", 
        url: "/api/routes", 
        data: routeData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create route");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada",
        description: "La ruta se ha creado exitosamente con los pedidos seleccionados",
      });
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones", selectedZone, "pending-orders"] });
      // Reset form and state
      form.reset();
      setSelectedZone(null);
      setSelectedOrders([]);
      setOptimizedRoute([]);
      setSelectedTab("zone");
      // Call callback
      onRouteCreated();
    },
    onError: (error: Error) => {
      console.error("Error creating route:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear la ruta. Inténtalo de nuevo.",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: any) => {
    if (selectedOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona al menos un pedido para crear la ruta",
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

  // Format price to currency
  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Calculate and format total selected orders value
  const getTotalOrdersValue = () => {
    const total = selectedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return formatCurrency(total);
  };

  // Calculate and display route stats
  const routeStats = {
    totalDistance: optimizedRoute.length >= 2 
      ? `${calculateTotalRouteDistance(optimizedRoute).toFixed(2)} km` 
      : "0.00 km",
    estimatedDuration: optimizedRoute.length >= 2 
      ? calculateEstimatedDuration(
          calculateTotalRouteDistance(optimizedRoute), 
          optimizedRoute.length - 1
        ) 
      : 0,
    totalOrders: selectedOrders.length,
    totalValue: getTotalOrdersValue()
  };

  return (
    <div className="w-full">
      <Card>
        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger 
                value="zone" 
                className="rounded-none border-b-2 border-transparent px-2 py-1 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <MapPin className="h-3 w-3 mr-0.5" />
                Zona
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="rounded-none border-b-2 border-transparent px-2 py-1 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
                disabled={!selectedZone}
              >
                <Package className="h-3 w-3 mr-0.5" />
                Pedidos
              </TabsTrigger>
              <TabsTrigger 
                value="review" 
                className="rounded-none border-b-2 border-transparent px-2 py-1 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent"
                disabled={optimizedRoute.length === 0}
              >
                <Check className="h-3 w-3 mr-0.5" />
                Revisar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zone">
              <div className="p-3">
                <h3 className="text-sm font-medium mb-2">Selecciona la zona para la ruta</h3>
                <Form {...form}>
                  <form onSubmit={e => e.preventDefault()} className="space-y-3">
                    <FormField
                      control={form.control}
                      name="zoneId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Zona</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              setSelectedOrders([]);
                            }}
                            defaultValue={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Selecciona una zona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingZones ? (
                                <div className="p-1">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-full mt-1" />
                                </div>
                              ) : zones.length === 0 ? (
                                <div className="p-1 text-center text-xs text-gray-500">
                                  No hay zonas disponibles
                                </div>
                              ) : (
                                zones.map((zone: any) => (
                                  <SelectItem 
                                    key={zone.id} 
                                    value={String(zone.id)}
                                    className="text-xs"
                                  >
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

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Nombre de la ruta</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-7 text-xs" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-1">
                          <FormLabel className="text-xs">Fecha</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full h-7 px-2 text-xs text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                  ) : (
                                    <span>Selecciona una fecha</span>
                                  )}
                                  <Calendar className="ml-auto h-3 w-3 opacity-50" />
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
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-1">
                      <Button 
                        type="button" 
                        onClick={() => setSelectedTab("orders")}
                        disabled={!selectedZone}
                        className="h-7 text-xs px-2"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Selecciona pedidos</h3>
                  <div className="flex items-center space-x-1">
                    <div className="relative">
                      <Search className="h-3 w-3 absolute left-2 top-[7px] text-gray-400" />
                      <Input
                        placeholder="Buscar pedidos..."
                        className="pl-7 h-7 text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          className="absolute right-2 top-[7px]"
                          onClick={() => setSearchQuery("")}
                        >
                          <XCircle className="h-3 w-3 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <Badge variant="outline" className="px-1.5 py-0.5 text-xs h-5">
                      {selectedOrders.length} pedidos
                    </Badge>
                    <Badge variant="outline" className="px-1.5 py-0.5 text-xs h-5">
                      Total: {getTotalOrdersValue()}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-[350px] pr-2">
                  {isLoadingPendingOrders ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="mb-2">
                        <CardHeader className="p-2 pb-1">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-48 mt-1" />
                        </CardHeader>
                        <CardContent className="p-2 pt-1">
                          <Skeleton className="h-3 w-20" />
                        </CardContent>
                      </Card>
                    ))
                  ) : pendingOrders.length === 0 ? (
                    <div className="text-center py-4">
                      <Package className="h-8 w-8 mx-auto text-gray-300 mb-1" />
                      <h3 className="text-sm font-medium text-gray-700">No hay pedidos pendientes</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        No hay pedidos pendientes en la zona seleccionada.
                      </p>
                    </div>
                  ) : (
                    pendingOrders
                      .filter(order => 
                        searchQuery 
                          ? order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            String(order.id).includes(searchQuery)
                          : true
                      )
                      .map((order) => (
                        <div 
                          key={order.id}
                          className={`mb-2 border rounded-md transition-all ${
                            selectedOrders.some(o => o.id === order.id) 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`}
                        >
                          <div className="p-2 flex items-start gap-2">
                            <Checkbox
                              checked={selectedOrders.some(o => o.id === order.id)}
                              onCheckedChange={() => toggleOrderSelection(order)}
                              className="mt-0.5 h-3.5 w-3.5"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium text-xs">Pedido #{order.id}</h4>
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <User className="h-2.5 w-2.5 mr-0.5" />
                                    {order.customerName}
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                    {order.customerAddress}
                                  </div>
                                  <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                      <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    {order.deliveryCoordinates || order.coordinates || "Sin coordenadas"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className="ml-auto text-xs py-0 px-1.5 h-4">
                                    {formatCurrency(Number(order.total))}
                                  </Badge>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(order.date).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Solo mostrar productos si existen en el objeto order */}
                              {order.products && Array.isArray(order.products) && order.products.length > 0 ? (
                                <div className="mt-1">
                                  <h5 className="text-[10px] font-medium mb-0.5">Productos:</h5>
                                  <div className="grid gap-0.5">
                                    {order.products.map((product, idx) => (
                                      <div key={idx} className="text-[10px] flex justify-between">
                                        <div className="flex items-center">
                                          <Package className="h-2.5 w-2.5 mr-0.5 text-gray-400" />
                                          <span className="truncate max-w-[140px]">
                                            {product.quantity} x {product.name}
                                          </span>
                                        </div>
                                        <span className="text-muted-foreground">
                                          {formatCurrency(Number(product.price) * product.quantity)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </ScrollArea>

                <div className="flex justify-between mt-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTab("zone")}
                    className="h-7 text-xs px-2"
                  >
                    Atrás
                  </Button>
                  <Button 
                    onClick={prepareOrdersForRouteOptimization}
                    disabled={isOptimizing || selectedOrders.length === 0}
                    className="h-7 text-xs px-2"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Optimizando...
                      </>
                    ) : (
                      'Optimizar Ruta'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="review">
              <div className="p-3">
                <div className="mb-3">
                  <h3 className="text-sm font-medium mb-1">Revisar y confirmar ruta</h3>
                  <p className="text-xs text-muted-foreground">
                    Revisa los detalles y selecciona conductor y vehículo para finalizar.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Card className="p-2">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="text-xs">Duración</span>
                    </div>
                    <div className="text-sm font-bold mt-1">
                      {routeStats.estimatedDuration} min
                    </div>
                  </Card>
                  <Card className="p-2">
                    <div className="flex items-center">
                      <Route className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="text-xs">Distancia</span>
                    </div>
                    <div className="text-sm font-bold mt-1">
                      {routeStats.totalDistance}
                    </div>
                  </Card>
                  <Card className="p-2">
                    <div className="flex items-center">
                      <ShoppingCart className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="text-xs">Valor</span>
                    </div>
                    <div className="text-sm font-bold mt-1">
                      {routeStats.totalValue}
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  <div className="col-span-1">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                        <FormField
                          control={form.control}
                          name="driverId"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Conductor</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value ? String(field.value) : undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Selecciona conductor" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingDrivers ? (
                                    <div className="p-1">
                                      <Skeleton className="h-4 w-full" />
                                    </div>
                                  ) : drivers.length === 0 ? (
                                    <div className="p-1 text-center text-xs text-gray-500">
                                      No hay conductores disponibles
                                    </div>
                                  ) : (
                                    drivers.map((driver: any) => (
                                      <SelectItem 
                                        key={driver.id} 
                                        value={String(driver.id)}
                                        className="text-xs"
                                      >
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
                          name="assistantId"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Asistente (opcional)</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value ? String(field.value) : undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Selecciona asistente" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="null" className="text-xs">Ninguno</SelectItem>
                                  {isLoadingAssistants ? (
                                    <div className="p-1">
                                      <Skeleton className="h-4 w-full" />
                                    </div>
                                  ) : assistants.length === 0 ? (
                                    <div className="p-1 text-center text-xs text-gray-500">
                                      No hay asistentes disponibles
                                    </div>
                                  ) : (
                                    assistants.map((assistant: any) => (
                                      <SelectItem 
                                        key={assistant.id} 
                                        value={String(assistant.id)}
                                        className="text-xs"
                                      >
                                        {assistant.name}
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
                          name="truckId"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Vehículo</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value ? String(field.value) : undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Selecciona vehículo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="null" className="text-xs">Ninguno</SelectItem>
                                  {isLoadingTrucks ? (
                                    <div className="p-1">
                                      <Skeleton className="h-4 w-full" />
                                    </div>
                                  ) : trucks.length === 0 ? (
                                    <div className="p-1 text-center text-xs text-gray-500">
                                      No hay vehículos disponibles
                                    </div>
                                  ) : (
                                    trucks.map((truck) => (
                                      <SelectItem 
                                        key={truck.id} 
                                        value={String(truck.id)}
                                        className="text-xs"
                                      >
                                        {truck.brand} {truck.model} - {truck.plate}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />

                        <div className="border rounded-md p-2 mb-2">
                          <h4 className="text-xs font-medium mb-1">Pedidos en esta ruta</h4>
                          <ScrollArea className="h-[100px]">
                            {selectedOrders.map(order => (
                              <div key={order.id} className="flex items-center justify-between mb-1 text-xs">
                                <div className="flex items-center">
                                  <Package className="h-2.5 w-2.5 mr-0.5 text-gray-400" />
                                  <span className="truncate max-w-[100px]">#{order.id} - {order.customerName}</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] py-0 px-1 h-4">
                                  {formatCurrency(Number(order.total))}
                                </Badge>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setSelectedTab("orders")}
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
                                Creando...
                              </>
                            ) : (
                              "Crear Ruta"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>

                  <div className="col-span-2">
                    <div className="border rounded-md overflow-hidden h-[250px]">
                      <ResponsiveMapContainer>
                        <MapContainer 
                          center={getMapCenter() as [number, number]} 
                          zoom={10} 
                          style={{ height: "100%", width: "100%" }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />

                          <MapCenterFixer />
                          
                          {optimizedRoute.length > 0 && (
                            <>
                              {/* Markers for each point */}
                              {optimizedRoute.map((point, index) => {
                                if (!point.coordinates) return null;
                                
                                const [lat, lng] = point.coordinates.split(',').map(parseFloat);
                                if (isNaN(lat) || isNaN(lng)) return null;
                                
                                // Almacén en verde, el resto en azul
                                const icon = index === 0 
                                  ? new L.Icon({
                                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                      iconSize: [20, 33], // Smaller icons
                                      iconAnchor: [10, 33],
                                      popupAnchor: [1, -34],
                                    })
                                  : new L.Icon({
                                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                      iconSize: [20, 33], // Smaller icons
                                      iconAnchor: [10, 33],
                                      popupAnchor: [1, -34],
                                    });
                                
                                return (
                                  <Marker 
                                    key={`point-${index}`} 
                                    position={[lat, lng]}
                                    icon={icon}
                                  >
                                    <Popup>
                                      <div className="text-xs">
                                        <strong>{point.businessname}</strong><br />
                                        {index === 0 
                                          ? 'Almacén (Parada 0)' 
                                          : index === 1 
                                            ? 'Parada 1'
                                            : index === 2
                                              ? 'Parada 2'
                                              : `Parada ${index}`
                                        }
                                      </div>
                                    </Popup>
                                  </Marker>
                                );
                              })}
                              
                              {/* Polyline for the route */}
                              <Polyline 
                                positions={
                                  optimizedRoute
                                    .filter(point => point.coordinates)
                                    .map(point => {
                                      const [lat, lng] = point.coordinates!.split(',').map(parseFloat);
                                      return [lat, lng];
                                    }) as [number, number][]
                                }
                                color="#0088FE"
                                weight={2}
                                opacity={0.7}
                              />
                            </>
                          )}
                        </MapContainer>
                      </ResponsiveMapContainer>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}