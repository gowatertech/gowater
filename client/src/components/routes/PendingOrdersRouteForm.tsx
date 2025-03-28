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
      // Define depot/almacén principal (empresa) - hardcoded coordinates
      const depot: Customer = {
        id: 0, // Use 0 to represent depot
        businessname: "Almacén Principal",
        phone: "",
        street: "",
        streetnumber: "",
        coordinates: "19.075380,-70.128822", // Coordenadas empresa
      };

      // Convert orders to customers for the route algorithm
      const customersFromOrders = selectedOrders.map(order => {
        return {
          id: order.customerId,
          businessname: order.customerName,
          phone: order.customerPhone || "",
          street: order.customerAddress,
          streetnumber: "",
          coordinates: order.coordinates || `19.${Math.random().toFixed(6)},-70.${Math.random().toFixed(6)}`, // Use real coordinates or generate random ones for testing
          orderId: order.id, // Add the order ID to associate with the customer
        } as Customer;
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
      // Extract depot (first customer) and remaining customers
      const depot = customers[0];
      const customersToVisit = customers.slice(1);
      
      // Start with depot
      const unvisited = [...customersToVisit];
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
      
      // Set the optimized route
      setOptimizedRoute(optimized);
      
      // Update stops in form
      const stops = optimized.map(customer => 
        `${customer.id}:${customer.businessname}:${customer.coordinates || ""}`
      );
      form.setValue("stops", stops);
      
      // Cambiar automáticamente a la pestaña de revisión
      setSelectedTab("review");
      
      // Mensaje de éxito
      toast({
        title: "Ruta optimizada",
        description: `Se ha optimizado la ruta para ${optimized.length - 1} clientes`,
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
        assistantId: data.assistantId ? Number(data.assistantId) : null,
        truckId: data.truckId ? Number(data.truckId) : null,
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
      const response = await apiRequest("POST", "/api/routes-with-orders", routeData);
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
      queryClient.invalidateQueries({ queryKey: ["/api/zones/pending-orders"] });
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
                className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Zona
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
                disabled={!selectedZone}
              >
                <Package className="h-4 w-4 mr-1" />
                Pedidos Pendientes
              </TabsTrigger>
              <TabsTrigger 
                value="review" 
                className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent"
                disabled={optimizedRoute.length === 0}
              >
                <Check className="h-4 w-4 mr-1" />
                Revisar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zone">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Selecciona la zona para la ruta</h3>
                <Form {...form}>
                  <form onSubmit={e => e.preventDefault()} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="zoneId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zona</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              setSelectedOrders([]);
                            }}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una zona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingZones ? (
                                <div className="p-2">
                                  <Skeleton className="h-5 w-full" />
                                  <Skeleton className="h-5 w-full mt-2" />
                                </div>
                              ) : zones.length === 0 ? (
                                <div className="p-2 text-center text-sm text-gray-500">
                                  No hay zonas disponibles
                                </div>
                              ) : (
                                zones.map((zone: any) => (
                                  <SelectItem 
                                    key={zone.id} 
                                    value={zone.id.toString()}
                                  >
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

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la ruta</FormLabel>
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
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                  ) : (
                                    <span>Selecciona una fecha</span>
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

                    <div className="flex justify-end">
                      <Button 
                        type="button" 
                        onClick={() => setSelectedTab("orders")}
                        disabled={!selectedZone}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Selecciona pedidos pendientes</h3>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-2.5 text-gray-400" />
                      <Input
                        placeholder="Buscar pedidos..."
                        className="pl-8 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          className="absolute right-2 top-2.5"
                          onClick={() => setSearchQuery("")}
                        >
                          <XCircle className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="px-2 py-1">
                      {selectedOrders.length} pedidos seleccionados
                    </Badge>
                    <Badge variant="outline" className="px-2 py-1">
                      Valor total: {getTotalOrdersValue()}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  {isLoadingPendingOrders ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="mb-3">
                        <CardHeader className="p-4 pb-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-64 mt-2" />
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <Skeleton className="h-4 w-24" />
                        </CardContent>
                      </Card>
                    ))
                  ) : pendingOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <h3 className="text-lg font-medium text-gray-700">No hay pedidos pendientes</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        No hay pedidos pendientes para asignar a esta ruta en la zona seleccionada.
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
                          className={`mb-3 border rounded-lg transition-all ${
                            selectedOrders.some(o => o.id === order.id) 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`}
                        >
                          <div className="p-4 flex items-start gap-4">
                            <Checkbox
                              checked={selectedOrders.some(o => o.id === order.id)}
                              onCheckedChange={() => toggleOrderSelection(order)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium">Pedido #{order.id}</h4>
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <User className="h-3 w-3 mr-1" />
                                    {order.customerName}
                                  </div>
                                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {order.customerAddress}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className="ml-auto">
                                    {formatCurrency(Number(order.total))}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(order.date).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-2">
                                <h5 className="text-xs font-medium mb-1">Productos:</h5>
                                <div className="grid gap-1">
                                  {order.products.map((product, idx) => (
                                    <div key={idx} className="text-xs flex justify-between">
                                      <div className="flex items-center">
                                        <Package className="h-3 w-3 mr-1 text-gray-400" />
                                        <span>
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
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </ScrollArea>

                <div className="flex justify-between mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTab("zone")}
                  >
                    Atrás
                  </Button>
                  <Button 
                    onClick={prepareOrdersForRouteOptimization}
                    disabled={isOptimizing || selectedOrders.length === 0}
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Optimizando ruta...
                      </>
                    ) : (
                      'Generar Ruta'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="review">
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Revisar y confirmar ruta</h3>
                  <p className="text-sm text-muted-foreground">
                    Revisa los detalles de la ruta y selecciona el conductor y vehículo para finalizar.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Duración Estimada
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {routeStats.estimatedDuration} min
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        <Route className="h-4 w-4 inline mr-1" />
                        Distancia Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {routeStats.totalDistance}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        <ShoppingCart className="h-4 w-4 inline mr-1" />
                        Valor Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {routeStats.totalValue}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="col-span-1">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="driverId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Conductor</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un conductor" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingDrivers ? (
                                    <div className="p-2">
                                      <Skeleton className="h-5 w-full" />
                                    </div>
                                  ) : drivers.length === 0 ? (
                                    <div className="p-2 text-center text-sm text-gray-500">
                                      No hay conductores disponibles
                                    </div>
                                  ) : (
                                    drivers.map((driver: any) => (
                                      <SelectItem 
                                        key={driver.id} 
                                        value={driver.id.toString()}
                                      >
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
                              <FormLabel>Asistente (opcional)</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un asistente" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">Ninguno</SelectItem>
                                  {isLoadingAssistants ? (
                                    <div className="p-2">
                                      <Skeleton className="h-5 w-full" />
                                    </div>
                                  ) : assistants.length === 0 ? (
                                    <div className="p-2 text-center text-sm text-gray-500">
                                      No hay asistentes disponibles
                                    </div>
                                  ) : (
                                    assistants.map((assistant: any) => (
                                      <SelectItem 
                                        key={assistant.id} 
                                        value={assistant.id.toString()}
                                      >
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
                                onValueChange={field.onChange} 
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un vehículo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingTrucks ? (
                                    <div className="p-2">
                                      <Skeleton className="h-5 w-full" />
                                    </div>
                                  ) : trucks.length === 0 ? (
                                    <div className="p-2 text-center text-sm text-gray-500">
                                      No hay vehículos disponibles
                                    </div>
                                  ) : (
                                    trucks.map((truck) => (
                                      <SelectItem 
                                        key={truck.id} 
                                        value={truck.id.toString()}
                                      >
                                        {truck.brand} {truck.model} - {truck.plate}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="border rounded-md p-4 mb-4">
                          <h4 className="text-sm font-medium mb-2">Pedidos en esta ruta</h4>
                          <ScrollArea className="h-[120px]">
                            {selectedOrders.map(order => (
                              <div key={order.id} className="flex items-center justify-between mb-2 text-sm">
                                <div className="flex items-center">
                                  <Package className="h-3 w-3 mr-1 text-gray-400" />
                                  Pedido #{order.id} - {order.customerName}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {formatCurrency(Number(order.total))}
                                </Badge>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>

                        <div className="flex justify-between pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setSelectedTab("orders")}
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
                  </div>

                  <div className="col-span-2">
                    <div className="border rounded-md overflow-hidden h-[400px]">
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
                                
                                // Different icon for depot
                                const icon = index === 0 
                                  ? new L.Icon({
                                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                      iconSize: [25, 41],
                                      iconAnchor: [12, 41],
                                      popupAnchor: [1, -34],
                                    })
                                  : new L.Icon({
                                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                      iconSize: [25, 41],
                                      iconAnchor: [12, 41],
                                      popupAnchor: [1, -34],
                                    });
                                
                                return (
                                  <Marker 
                                    key={`point-${index}`} 
                                    position={[lat, lng]}
                                    icon={icon}
                                  >
                                    <Popup>
                                      <div>
                                        <strong>{point.businessname}</strong><br />
                                        {index === 0 ? 'Inicio' : `Parada ${index}`}
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
                                weight={3}
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