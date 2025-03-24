import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";

import { Check, MapPin, Truck, User, Loader2 } from "lucide-react";

// Definimos interfaces necesarias
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

interface OptimizedRoutePoint {
  id: number;
  businessname: string;
  coordinates: string;
  order: number;
}

// Schema para validar el formulario
const routeFormSchema = z.object({
  name: z.string().min(1, "El nombre de la ruta es requerido"),
  date: z.date(),
  truckId: z.number({
    required_error: "Debe seleccionar un vehículo",
  }),
  driverId: z.number({
    required_error: "Debe seleccionar un conductor",
  }),
  assistantId: z.number().optional(),
  zoneId: z.number({
    required_error: "Debe seleccionar una zona",
  }),
  selectedCustomers: z.array(z.number()).min(1, "Debe seleccionar al menos un cliente"),
});

type RouteFormValues = z.infer<typeof routeFormSchema>;

export default function RouteCreator() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("select-zone");
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoutePoint[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Obtener zonas
  const { data: zones = [], isLoading: isLoadingZones } = useQuery({
    queryKey: ["/api/zones"],
  });

  // Obtener clientes por zona
  const { data: zoneCustomers = [], isLoading: isLoadingCustomers } = useQuery({
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

  // Obtener conductores
  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery({
    queryKey: ["/api/users?role=driver"],
  });
  
  // Obtener ayudantes
  const { data: assistants = [], isLoading: isLoadingAssistants } = useQuery({
    queryKey: ["/api/users?role=assistant"],
  });

  // Obtener vehículos
  const { data: trucks = [], isLoading: isLoadingTrucks } = useQuery({
    queryKey: ["/api/trucks"],
  });

  // Inicializar formulario
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      zoneId: undefined,
      truckId: undefined,
      driverId: undefined,
      assistantId: undefined,
      selectedCustomers: [],
    },
  });

  // Actualizar valores del formulario cuando cambia la zona seleccionada
  useEffect(() => {
    if (selectedZone) {
      form.setValue("zoneId", selectedZone);
      
      // Generar nombre automático para la ruta
      const selectedZoneObj = zones.find((z: any) => z.id === selectedZone);
      if (selectedZoneObj) {
        const today = new Date().toLocaleDateString("es-ES").replace(/\//g, "-");
        form.setValue("name", `Ruta ${selectedZoneObj.name} - ${today}`);
      }
    }
  }, [selectedZone, zones, form]);

  // Actualizar valores del formulario cuando cambian los clientes seleccionados
  useEffect(() => {
    form.setValue("selectedCustomers", selectedCustomers);
  }, [selectedCustomers, form]);

  // Función para alternar la selección de cliente
  const toggleCustomerSelection = (customerId: number) => {
    if (selectedCustomers.includes(customerId)) {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
    } else {
      setSelectedCustomers([...selectedCustomers, customerId]);
    }
    // Resetear ruta optimizada cuando cambia la selección
    setOptimizedRoute([]);
  };

  // Función para optimizar la ruta basada en coordenadas de clientes
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
      // Obtener detalles de clientes seleccionados
      const customersDetails = zoneCustomers.filter((customer: Customer) => 
        selectedCustomers.includes(customer.id)
      );
      
      // Verificar coordenadas válidas
      const customersWithCoordinates = customersDetails.filter(customer => {
        if (!customer.coordinates) {
          console.warn(`Cliente sin coordenadas: ID ${customer.id}, ${customer.businessname}`);
          return false;
        }
        
        try {
          const [lat, lng] = customer.coordinates.split(',').map(parseFloat);
          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Cliente con coordenadas inválidas: ID ${customer.id}`);
            return false;
          }
          return true;
        } catch (e) {
          console.warn(`Error validando coordenadas del cliente: ID ${customer.id}`, e);
          return false;
        }
      });
      
      if (customersWithCoordinates.length < 2) {
        throw new Error("No hay suficientes clientes con coordenadas válidas");
      }

      // Definir punto de inicio (almacén/empresa)
      const depot = {
        id: 0,
        businessname: "Almacén Principal",
        coordinates: "19.075380,-70.128822", // Coordenadas empresa (ajustar según necesidad)
        order: 0
      };
      
      // Implementar algoritmo de optimización simple (nearest neighbor)
      const optimized: OptimizedRoutePoint[] = [depot];
      const unvisited = [...customersWithCoordinates];
      
      while (unvisited.length > 0) {
        const currentPoint = optimized[optimized.length - 1];
        let closestIdx = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i < unvisited.length; i++) {
          const distance = calculateDistance(
            currentPoint.coordinates || "", 
            unvisited[i].coordinates || ""
          );
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIdx = i;
          }
        }
        
        // Agregar punto más cercano a la ruta
        optimized.push({
          id: unvisited[closestIdx].id,
          businessname: unvisited[closestIdx].businessname,
          coordinates: unvisited[closestIdx].coordinates || "",
          order: optimized.length
        });
        
        unvisited.splice(closestIdx, 1);
      }
      
      // Establecer ruta optimizada
      setOptimizedRoute(optimized);
      
      // Mensaje de éxito
      toast({
        title: "Ruta optimizada",
        description: `Se ha optimizado la ruta para ${optimized.length - 1} clientes`,
      });
      
      // Cambiar a la pestaña de revisión (esta vez dejamos que el usuario decida)
      console.log("Ruta optimizada:", optimized);
      
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

  // Función para calcular distancia entre dos coordenadas
  const calculateDistance = (coord1: string, coord2: string) => {
    try {
      if (!coord1 || !coord2) return Infinity;
      
      const [lat1Str, lng1Str] = coord1.split(',');
      const [lat2Str, lng2Str] = coord2.split(',');
      
      if (!lat1Str || !lng1Str || !lat2Str || !lng2Str) return Infinity;
      
      const lat1 = parseFloat(lat1Str);
      const lng1 = parseFloat(lng1Str);
      const lat2 = parseFloat(lat2Str);
      const lng2 = parseFloat(lng2Str);
      
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return Infinity;
      
      // Cálculo simplificado de distancia euclidiana
      return Math.sqrt(
        Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)
      );
    } catch (e) {
      console.error("Error calculando distancia:", e);
      return Infinity;
    }
  };

  // Función para crear la ruta (envío del formulario)
  const onSubmit = (data: RouteFormValues) => {
    if (optimizedRoute.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe optimizar la ruta antes de guardar",
      });
      return;
    }

    // Prepara los datos para almacenar/guardar la ruta
    const routeData = {
      name: data.name,
      date: data.date,
      truckId: data.truckId,
      driverId: data.driverId,
      assistantId: data.assistantId,
      zoneId: data.zoneId,
      deliveryRoute: optimizedRoute.map(point => ({
        customerId: point.id,
        order: point.order,
        coordinates: point.coordinates
      }))
    };

    console.log("Datos de ruta a guardar:", routeData);
    
    // Aquí iría la mutación para guardar la ruta, por ejemplo:
    toast({
      title: "¡Ruta creada con éxito!",
      description: `Se ha creado la ruta "${data.name}" con ${optimizedRoute.length - 1} clientes.`,
    });
  };

  // Componente para centrar el mapa automáticamente
  function MapCenterFixer() {
    const map = useMap();
    
    useEffect(() => {
      if (optimizedRoute.length > 0) {
        // Calcular centro del mapa basado en todos los puntos
        const points = optimizedRoute
          .filter(point => point.coordinates)
          .map(point => {
            const [lat, lng] = point.coordinates.split(',').map(parseFloat);
            return [lat, lng];
          });
        
        if (points.length > 0) {
          const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }, [map, optimizedRoute]);
    
    return null;
  }

  // Crear iconos personalizados para los marcadores
  const createCustomIcon = (number: number) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #1E88E5; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Dibujar la línea de la ruta optimizada
  const routeLines = optimizedRoute.length > 1
    ? optimizedRoute.map(point => {
        const [lat, lng] = point.coordinates.split(',').map(parseFloat);
        return [lat, lng];
      })
    : [];

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Crear Nueva Ruta</h1>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="select-zone">
            <MapPin className="h-4 w-4 mr-2" />
            Seleccionar Zona
          </TabsTrigger>
          <TabsTrigger 
            value="select-customers"
            disabled={!selectedZone}
          >
            <User className="h-4 w-4 mr-2" />
            Seleccionar Clientes
          </TabsTrigger>
          <TabsTrigger 
            value="review-route"
            disabled={optimizedRoute.length === 0}
          >
            <Truck className="h-4 w-4 mr-2" />
            Revisar y Guardar
          </TabsTrigger>
        </TabsList>

        {/* Primera pestaña: Selección de zona */}
        <TabsContent value="select-zone" className="space-y-4">
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Zona de Entrega</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(Number(value));
                        setSelectedZone(Number(value));
                        setSelectedCustomers([]);
                        setOptimizedRoute([]);
                      }}
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
                <Button 
                  type="button"
                  onClick={() => setSelectedTab("select-customers")}
                  className="w-full"
                >
                  Continuar a Selección de Clientes
                </Button>
              )}
            </div>
          </Form>

          {selectedZone && (
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Vista preliminar de la zona</div>
              <div className="border rounded-md overflow-hidden">
                <ResponsiveMapContainer aspectRatio="square">
                  <MapContainer
                    center={[19.0, -70.0]}
                    zoom={10}
                    style={{ height: "100%", width: "100%" }}
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
                </ResponsiveMapContainer>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Segunda pestaña: Selección de clientes */}
        <TabsContent value="select-customers" className="space-y-4">
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
                    selectedCustomers.includes(customer.id)
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => toggleCustomerSelection(customer.id)}
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
                      {selectedCustomers.includes(customer.id) && (
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
              onClick={() => setSelectedTab("select-zone")}
            >
              Atrás
            </Button>
            
            <div className="space-x-2">
              {optimizedRoute.length > 0 && (
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedTab("review-route")}
                >
                  Revisar Ruta
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
        </TabsContent>

        {/* Tercera pestaña: Revisión y finalización */}
        <TabsContent value="review-route" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
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

                  <div className="grid grid-cols-1 gap-4">
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
                          <FormLabel>Ayudante (Opcional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar un ayudante" />
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

                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setSelectedTab("select-customers")}
                    >
                      Atrás
                    </Button>
                    <Button type="submit">
                      Guardar Ruta
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Vista Previa de la Ruta Optimizada</h3>
              
              <div className="border rounded-md overflow-hidden">
                <ResponsiveMapContainer aspectRatio="square">
                  <MapContainer
                    center={[19.0, -70.0]}
                    zoom={9}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Dibujar la línea de la ruta */}
                    {routeLines.length > 1 && (
                      <Polyline 
                        positions={routeLines as any} 
                        color="#1E88E5" 
                        weight={3} 
                        opacity={0.7} 
                      />
                    )}
                    
                    {/* Mostrar marcadores numerados */}
                    {optimizedRoute.map((point, index) => {
                      if (!point.coordinates) return null;
                      
                      const [lat, lng] = point.coordinates.split(',').map(parseFloat);
                      return (
                        <Marker 
                          key={`${point.id}-${index}`}
                          position={[lat, lng]} 
                          icon={createCustomIcon(index)}
                        >
                          <Popup>
                            <div>
                              <strong>{index === 0 ? "Inicio (Almacén)" : point.businessname}</strong>
                              <br />
                              <span>Parada #{index}</span>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                    
                    <MapCenterFixer />
                  </MapContainer>
                </ResponsiveMapContainer>
              </div>
              
              <div className="space-y-2 mt-4">
                <h4 className="font-medium">Secuencia de Entregas</h4>
                <div className="border rounded-md p-2 max-h-[300px] overflow-y-auto">
                  <ol className="space-y-2 pl-5 list-decimal">
                    {optimizedRoute.map((point, index) => (
                      <li key={index} className={index === 0 ? "font-medium" : ""}>
                        {index === 0 ? "Almacén Principal (Inicio)" : point.businessname}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}