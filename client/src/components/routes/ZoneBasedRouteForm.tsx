import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRouteSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, MapPin, User, Truck, Calendar } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
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

interface ZoneBasedRouteFormProps {
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

interface Truck {
  id: number;
  brand: string;
  model: string;
  plate: string;
  capacity: number;
  status: string;
}

export default function ZoneBasedRouteForm({ onRouteCreated }: ZoneBasedRouteFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("zone");
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Customer[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

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
      const selectedZoneObj = zones.find((z: any) => z.id === selectedZone);
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
    const sumLat = pointsWithCoords.reduce((sum, point) => sum + point[0], 0);
    const sumLng = pointsWithCoords.reduce((sum, point) => sum + point[1], 0);
    
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
      
      // This would normally be an API call to a route optimization service
      // For this example, we'll use a very simple distance-based algorithm
      
      // Start with depot
      const unvisited = [...selectedCustomers];
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
      
      // Add a small delay to ensure state is updated before changing tab
      setTimeout(() => {
        // Progress to the next tab
        setSelectedTab("review");
      }, 100);
      
      toast({
        title: "Ruta optimizada",
        description: `Se ha optimizado la ruta para ${optimized.length} clientes`,
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

  // Calculate simple distance between two coordinates
  const calculateDistance = (coord1: string, coord2: string) => {
    try {
      const [lat1, lng1] = coord1.split(',').map(parseFloat);
      const [lat2, lng2] = coord2.split(',').map(parseFloat);
      
      // Simplified distance calculation (as the crow flies)
      return Math.sqrt(
        Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)
      );
    } catch (e) {
      console.error("Error calculating distance:", e);
      return Infinity;
    }
  };

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting route data:", data);
      const response = await apiRequest("POST", "/api/routes", {
        ...data,
        date: new Date(data.date),
        driverId: Number(data.driverId),
        truckId: Number(data.truckId),
        assistantId: data.assistantId ? Number(data.assistantId) : undefined,
        zoneId: Number(data.zoneId),
        status: "pending",
        isCompleted: false
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la ruta');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        description: t("routeCreated"),
      });
      form.reset();
      onRouteCreated();
    },
    onError: (error: Error) => {
      console.error("Error creating route:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: any) => {
    if (optimizedRoute.length === 0 && selectedCustomers.length > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes optimizar la ruta antes de guardar",
      });
      return;
    }

    try {
      await createRouteMutation.mutateAsync(data);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  return (
    <div>
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="zone">
            <MapPin className="h-4 w-4 mr-2" />
            Zona
          </TabsTrigger>
          <TabsTrigger value="customers" disabled={!selectedZone}>
            <User className="h-4 w-4 mr-2" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="review" disabled={selectedCustomers.length === 0}>
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
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
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
                        ) : (
                          zones?.map((zone: any) => (
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

              {selectedZone && (
                <div className="pt-4">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setSelectedTab("customers")}
                    className="w-full"
                  >
                    Continuar a Selección de Clientes
                  </Button>
                </div>
              )}
            </form>
          </Form>

          {selectedZone && (
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Mapa de la Zona</div>
              <div className="border rounded-md overflow-hidden">
                <ResponsiveMapContainer fixedHeight aspectRatio="square">
                  {typeof window !== "undefined" && (
                    <MapContainer
                      center={[19.0, -70.0]}
                      zoom={10}
                      style={{ height: "240px", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      {zones
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
            ) : zoneCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes registrados en esta zona
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {zoneCustomers.map((customer: Customer) => (
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
                Back
              </Button>
              
              <Button 
                type="button"
                onClick={optimizeRoute}
                disabled={selectedCustomers.length < 2 || isOptimizing}
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  "Optimize Route"
                )}
              </Button>
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
                    <FormLabel>Nombre de la Ruta</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <SelectValue placeholder="Seleccionar un conductor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingDrivers ? (
                            <div className="p-2">
                              <Skeleton className="h-5 w-full" />
                            </div>
                          ) : (
                            drivers?.map((driver: any) => (
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
                      <FormLabel>Ayudante</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar un ayudante (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Sin ayudante</SelectItem>
                          {isLoadingAssistants ? (
                            <div className="p-2">
                              <Skeleton className="h-5 w-full" />
                            </div>
                          ) : (
                            assistants?.map((assistant: any) => (
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="truckId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehículo</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar un vehículo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingTrucks ? (
                            <div className="p-2">
                              <Skeleton className="h-5 w-full" />
                            </div>
                          ) : (
                            trucks?.map((truck: Truck) => (
                              <SelectItem key={truck.id} value={truck.id.toString()}>
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

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de entrega</FormLabel>
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
                                <span>Selecciona una fecha</span>
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
                            {customer.street} {customer.streetnumber}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-md overflow-hidden">
                <ResponsiveMapContainer fixedHeight aspectRatio="square">
                  {typeof window !== "undefined" && optimizedRoute.length > 0 && (
                    <MapContainer
                      center={[19.0, -70.0]}
                      zoom={10}
                      style={{ height: "240px", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      
                      {/* Auto-center map component */}
                      <MapCenterFixer />
                      
                      {/* Draw the complete route as a single polyline */}
                      {optimizedRoute.length > 1 && (
                        <Polyline
                          positions={optimizedRoute
                            .filter(customer => customer.coordinates)
                            .map(customer => {
                              const [lat, lng] = customer.coordinates!.split(',').map(parseFloat);
                              return [lat, lng];
                            })}
                          color="#0088FE"
                          weight={3}
                        />
                      )}
                      
                      {/* Place markers for each stop */}
                      {optimizedRoute.map((customer, index) => {
                        if (customer.coordinates) {
                          const [lat, lng] = customer.coordinates.split(',').map(parseFloat);
                          
                          // Create a custom icon with the order number
                          const numberIcon = new L.DivIcon({
                            html: `<div class="flex items-center justify-center ${index === 0 ? 'bg-green-600' : 'bg-primary'} text-white rounded-full w-6 h-6 text-sm font-semibold">${index}</div>`,
                            className: 'custom-number-icon',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                          });
                          
                          return (
                            <Marker
                              key={customer.id}
                              position={[lat, lng]}
                              icon={numberIcon}
                            >
                              <Popup>
                                <div className="text-sm">
                                  {index === 0 ? (
                                    <strong>Almacén Principal (Inicio)</strong>
                                  ) : (
                                    <strong>Parada {index}</strong>
                                  )}
                                  <div>{customer.businessname}</div>
                                  {customer.street && (
                                    <div>{customer.street} {customer.streetnumber}</div>
                                  )}
                                </div>
                              </Popup>
                            </Marker>
                          );
                        }
                        return null;
                      })}
                    </MapContainer>
                  )}
                </ResponsiveMapContainer>
              </div>

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
                  disabled={createRouteMutation.isPending || !form.watch("driverId") || !form.watch("truckId")}
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
    </div>
  );
}