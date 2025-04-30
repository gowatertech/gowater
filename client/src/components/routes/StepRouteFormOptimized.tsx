import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { format } from "date-fns";
import L from "leaflet";

// UI Components
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
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import {
  Package,
  MapPin,
  User,
  Search,
  Loader2,
  XCircle,
  Clock,
  Route,
  DollarSign,
  CalendarIcon,
  Check,
  Map,
  Truck,
  ArrowLeft,
  ArrowRight,
  Calendar
} from "lucide-react";

// Schema e interfaces
import { insertRouteSchema } from "@shared/schema";

interface StepRouteFormProps {
  onRouteCreated: () => void;
}

// Definición de estados de pasos
const pasos = {
  SELECCIONAR_ZONA: "seleccionar_zona",
  SELECCIONAR_PEDIDOS: "seleccionar_pedidos",
  OPTIMIZAR_RUTA: "optimizar_ruta",
  COMPLETAR_DATOS: "completar_datos"
};

export default function StepRouteForm({ onRouteCreated }: StepRouteFormProps) {
  // Estado de pasos
  const [pasoActual, setPasoActual] = useState(pasos.SELECCIONAR_ZONA);
  
  // Estado de selección
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [pendingOrdersLoaded, setPendingOrdersLoaded] = useState(false);
  const [filteredPendingOrders, setFilteredPendingOrders] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [optimizedSequence, setOptimizedSequence] = useState<any[]>([]);
  
  // Tracking UI state
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Hooks
  const { toast } = useToast();
  const { user: authUser } = useCurrentUser();
  const authCompanyId = authUser?.companyId || null;
  const { settings } = useCompanySettings();
  
  // Determinar companyId
  const [derivedCompanyId, setDerivedCompanyId] = useState<number | null>(null);
  
  // Obtener datos de usuarios para los pendingOrders
  const { data: pendingOrdersUserData } = useQuery({
    queryKey: ["/api/user"],
    enabled: !authUser, // Solo ejecutar si no tenemos authUser
  });
  
  // Definición del formulario con validación
  const form = useForm({
    resolver: zodResolver(insertRouteSchema.extend({
      // Hacemos companyId obligatorio
      companyId: z.coerce.number().positive("El ID de compañía debe ser un número positivo"),
      // Hacemos zoneId obligatorio
      zoneId: z.coerce.number().positive("Debe seleccionar una zona"),
      driverId: z.coerce.number().positive("Debe seleccionar un conductor"),
      assistantId: z.union([z.coerce.number(), z.literal(null)]).nullable(),
      truckId: z.union([z.coerce.number(), z.literal(null)]).nullable()
    })),
    defaultValues: {
      name: "",
      driverId: 0,
      assistantId: null,
      truckId: null,
      date: new Date(),
      status: "pending" as const,
      isCompleted: false,
      stops: [] as string[],
      companyId: 0, // Se actualizará dinámicamente 
      zoneId: 0 // Se seleccionará por el usuario
    },
  });
  
  // Determinar companyId y asignarlo al formulario
  useEffect(() => {
    console.log("🔄 DIAGNÓSTICO INICIAL - StepRouteForm montado");
    
    // Obtener el companyId de manera dinámica, priorizando useAuth
    let effectiveCompanyId: number = 0; // Inicializamos en 0
    let source = "valor predeterminado";
    
    // Prioridad 1: Auth Context (más confiable)
    if (authCompanyId !== null && authCompanyId !== undefined && !isNaN(Number(authCompanyId))) {
      effectiveCompanyId = Number(authCompanyId);
      source = "Auth Context";
    } 
    // Prioridad 2: Usuario autenticado
    else if (authUser?.companyId && !isNaN(Number(authUser.companyId))) {
      effectiveCompanyId = Number(authUser.companyId);
      source = "Auth User";
    } 
    // Prioridad 3: Datos de pedidos pendientes (asumiendo que puede ser cualquier objeto con propiedad companyId)
    else if (pendingOrdersUserData && typeof pendingOrdersUserData === 'object' && 'companyId' in pendingOrdersUserData && 
             !isNaN(Number((pendingOrdersUserData as any).companyId))) {
      effectiveCompanyId = Number((pendingOrdersUserData as any).companyId);
      source = "Pending Orders Data";
    } 
    
    console.log(`🏢 CompanyId determinado: ${effectiveCompanyId} (fuente: ${source})`);
    setDerivedCompanyId(effectiveCompanyId);
    
    // Asignar al formulario
    form.setValue("companyId", effectiveCompanyId);
    
  }, [authCompanyId, authUser, pendingOrdersUserData, form]);
  
  // Queries para cargar datos necesarios
  const { data: zones = [], isLoading: isLoadingZones } = useQuery<any[]>({
    queryKey: ["/api/zones"],
  });
  
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: trucks = [], isLoading: isLoadingTrucks } = useQuery<any[]>({
    queryKey: ["/api/trucks"],
  });
  
  // Obtener pedidos pendientes
  const { data: pendingOrders = [], isLoading: isLoadingPendingOrders } = useQuery<any[]>({
    queryKey: ["/api/orders/pending", selectedZoneId],
    queryFn: async () => {      
      console.log("Fetching pending orders, zoneId:", selectedZoneId || "No filter");
      
      const url = selectedZoneId 
        ? `/api/orders/pending?zoneId=${selectedZoneId}` 
        : "/api/orders/pending";
      
      const response = await apiRequest({
        url: url,
        method: "GET"
      });
      
      const data = Array.isArray(response) ? response : [];
      
      const transformedOrders = data.map((order: any) => ({
        ...order,
        coordinates: order.deliveryCoordinates || order.coordinates || null,
        customerAddress: order.customerAddress + (order.customerAddressNumber ? ` #${order.customerAddressNumber}` : ''),
        customerPhone: order.customerPhone || "",
        products: order.products || []
      }));
      
      setPendingOrdersLoaded(true);
      return transformedOrders;
    },
  });
  
  // Filtrar pedidos por zona seleccionada
  useEffect(() => {
    if (pendingOrdersLoaded && selectedZoneId) {
      console.log(`Filtrando pedidos para zona ID: ${selectedZoneId}`);
      
      const ordersInZone = pendingOrders.filter(order => {
        return (order as any).zoneId === selectedZoneId;
      });
      
      console.log(`Encontrados ${ordersInZone.length} pedidos en la zona ${selectedZoneId}`);
      setFilteredPendingOrders(ordersInZone);
      
      // Limpiar la selección de pedidos anterior al cambiar de zona
      setSelectedOrders([]);
    } else {
      // Si no hay zona seleccionada, mostrar todos los pedidos
      setFilteredPendingOrders(pendingOrders);
    }
  }, [pendingOrders, selectedZoneId, pendingOrdersLoaded]);
  
  // Función para cambiar la zona seleccionada
  const handleZoneChange = (zoneId: number) => {
    console.log(`Cambiando a zona ID: ${zoneId}`);
    setSelectedZoneId(zoneId);
    
    if (typeof zoneId === 'number' && !isNaN(zoneId) && zoneId > 0) {
      form.setValue("zoneId", zoneId);
      console.log(`Zona en formulario actualizada a: ${form.getValues("zoneId")}`);
    }
  };
  
  // Función para seleccionar/deseleccionar un pedido
  const toggleOrderSelection = (order: any) => {
    if (selectedOrders.some(o => o.id === order.id)) {
      setSelectedOrders(selectedOrders.filter(o => o.id !== order.id));
    } else {
      setSelectedOrders([...selectedOrders, order]);
    }
  };
  
  // Mutación para crear la ruta
  const createRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      setIsCreatingRoute(true);
      
      try {
        const response = await apiRequest({
          url: "/api/routes",
          method: "POST",
          data: data
        });
        
        console.log("Ruta creada:", response);
        return response;
      } finally {
        setIsCreatingRoute(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada exitosamente",
        description: "La ruta ha sido creada con los pedidos seleccionados."
      });
      
      // Invalidar queries para actualizar datos
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      
      // Notificar al componente padre
      onRouteCreated();
    },
    onError: (error: any) => {
      console.error("Error al crear ruta:", error);
      
      toast({
        title: "Error al crear ruta",
        description: error.message || "Hubo un problema al crear la ruta. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  });
  
  // Función para avanzar al siguiente paso
  const avanzarPaso = () => {
    if (pasoActual === pasos.SELECCIONAR_ZONA) {
      if (!selectedZoneId) {
        toast({
          title: "Selecciona una zona",
          description: "Debes seleccionar una zona para continuar.",
          variant: "destructive"
        });
        return;
      }
      
      setPasoActual(pasos.SELECCIONAR_PEDIDOS);
    } 
    else if (pasoActual === pasos.SELECCIONAR_PEDIDOS) {
      if (selectedOrders.length === 0) {
        toast({
          title: "Selecciona pedidos",
          description: "Debes seleccionar al menos un pedido para continuar.",
          variant: "destructive"
        });
        return;
      }
      
      setPasoActual(pasos.OPTIMIZAR_RUTA);
      
      // Aquí podríamos agregar la lógica para optimizar la ruta
      // Por ahora, solo usamos el orden de selección
      setOptimizedSequence(selectedOrders);
    }
    else if (pasoActual === pasos.OPTIMIZAR_RUTA) {
      setPasoActual(pasos.COMPLETAR_DATOS);
    }
  };
  
  // Función para retroceder al paso anterior
  const retrocederPaso = () => {
    if (pasoActual === pasos.SELECCIONAR_PEDIDOS) {
      setPasoActual(pasos.SELECCIONAR_ZONA);
    }
    else if (pasoActual === pasos.OPTIMIZAR_RUTA) {
      setPasoActual(pasos.SELECCIONAR_PEDIDOS);
    }
    else if (pasoActual === pasos.COMPLETAR_DATOS) {
      setPasoActual(pasos.OPTIMIZAR_RUTA);
    }
  };
  
  // Función para manejar la búsqueda
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Filtrar pedidos por término de búsqueda
  const filteredOrders = searchQuery 
    ? filteredPendingOrders.filter(order => 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toString().includes(searchQuery.toLowerCase())
      )
    : filteredPendingOrders;
  
  // Función para enviar el formulario y crear la ruta
  const onSubmit = (values: any) => {
    console.log("Datos del formulario:", values);
    
    // Crear la lista de paradas a partir de los pedidos seleccionados
    const stops = selectedOrders.map(order => ({
      orderId: order.id,
      customerId: order.customerId,
      coordinates: order.coordinates,
      address: order.customerAddress,
      name: order.customerName,
      status: "pending"
    }));
    
    // Crear la secuencia de entrega
    const sequence = optimizedSequence.map(order => order.id);
    
    // Crear el objeto de datos para la API
    const routeData = {
      ...values,
      stops: stops,
      deliverySequence: sequence,
      // Asegurarnos de que companyId se envía como número
      companyId: Number(values.companyId),
      // Asegurarnos de que zoneId se envía como número
      zoneId: Number(values.zoneId),
    };
    
    console.log("Datos a enviar:", routeData);
    
    // Enviar los datos a la API
    createRouteMutation.mutate(routeData);
  };

  // Renderizar contenido específico de cada paso
  const renderStepContent = () => {
    switch (pasoActual) {
      case pasos.SELECCIONAR_ZONA:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingZones ? (
                Array(4).fill(0).map((_, i) => (
                  <Card key={i} className="p-3">
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </Card>
                ))
              ) : zones.length === 0 ? (
                <div className="col-span-full text-center p-6">
                  <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hay zonas definidas</p>
                </div>
              ) : (
                zones.map(zone => (
                  <Card 
                    key={zone.id}
                    className={`p-3 cursor-pointer transition-all hover:ring-1 hover:ring-primary ${
                      selectedZoneId === zone.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleZoneChange(zone.id)}
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium">{zone.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {zone.description || "Sin descripción"}
                          </p>
                        </div>
                        {selectedZoneId === zone.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            <div className="flex justify-end">
              <Button onClick={avanzarPaso} disabled={!selectedZoneId}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case pasos.SELECCIONAR_PEDIDOS:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, dirección o número"
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              <Badge>
                {selectedOrders.length} seleccionados
              </Badge>
            </div>
            
            <ScrollArea className="h-[400px] border rounded-md">
              {isLoadingPendingOrders ? (
                <div className="p-4 space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="p-3 border rounded-md">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hay pedidos pendientes en esta zona</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredOrders.map(order => (
                    <div
                      key={order.id}
                      className={`p-3 border rounded-md cursor-pointer transition-all ${
                        selectedOrders.some(o => o.id === order.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground'
                      }`}
                      onClick={() => toggleOrderSelection(order)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <h4 className="text-sm font-medium">
                              Pedido #{order.id}
                            </h4>
                            {selectedOrders.some(o => o.id === order.id) && (
                              <Check className="ml-2 h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {order.customerName}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {order.customerAddress}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(order.date), 'dd/MM/yyyy')}
                            <DollarSign className="h-3 w-3 ml-2 mr-1" />
                            ${order.total?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                        
                        <Badge variant={order.status === 'pending' ? 'outline' : 'secondary'} className="text-xs">
                          {order.status === 'pending' ? 'Pendiente' : 'En proceso'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={retrocederPaso}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button 
                onClick={avanzarPaso} 
                disabled={selectedOrders.length === 0}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case pasos.OPTIMIZAR_RUTA:
        return (
          <div className="space-y-4">
            <div className="rounded-md border p-3">
              <h3 className="text-sm font-medium mb-2">Secuencia de entregas</h3>
              
              <div className="space-y-2">
                {optimizedSequence.map((order, idx) => (
                  <div key={order.id} className="flex items-center p-2 border rounded-md">
                    <Badge variant="outline" className="mr-3">
                      {idx + 1}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customerAddress}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={retrocederPaso}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button onClick={avanzarPaso}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case pasos.COMPLETAR_DATOS:
        return (
          <div className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Nombre de la Ruta</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Ej: Ruta Norte 30/04/2025"
                          className="h-8 text-xs"
                          defaultValue={`Ruta ${format(new Date(), 'dd/MM/yyyy')}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="driverId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Conductor</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value ? field.value.toString() : "0"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecciona un conductor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users
                              .filter(user => user.role === "driver")
                              .map(user => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name}
                                </SelectItem>
                              ))
                            }
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
                        <FormLabel className="text-xs">Ayudante</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const val = value === "null" ? null : Number(value);
                            field.onChange(val);
                          }}
                          value={field.value !== undefined && field.value !== null ? 
                                String(field.value) : "null"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecciona un ayudante (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Sin ayudante asignado</SelectItem>
                            {users
                              .filter(user => user.role === "assistant")
                              .map(user => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name}
                                </SelectItem>
                              ))
                            }
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
                        <FormLabel className="text-xs">Vehículo</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const val = value === "null" ? null : Number(value);
                            field.onChange(val);
                          }}
                          value={field.value !== undefined && field.value !== null ? 
                                String(field.value) : "null"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecciona un vehículo (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Sin vehículo asignado</SelectItem>
                            {trucks.map(truck => (
                              <SelectItem key={truck.id} value={truck.id.toString()}>
                                {truck.plate} - {truck.brand} {truck.model}
                              </SelectItem>
                            ))}
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
                      <FormItem>
                        <FormLabel className="text-xs">Fecha</FormLabel>
                        <FormControl>
                          <div className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-foreground file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(field.value, 'dd/MM/yyyy')}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Campo oculto para CompanyId */}
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Campo oculto para ZoneId */}
                <FormField
                  control={form.control}
                  name="zoneId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={retrocederPaso}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isCreatingRoute}
                  >
                    {isCreatingRoute ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Crear Ruta
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
            
            {/* Mostrar información de diagnóstico */}
            <div className="text-xs text-muted-foreground p-2 border rounded-md">
              <div className="flex items-center justify-between">
                <span>CompanyId: {form.getValues("companyId")}</span>
                <span>ZoneId: {form.getValues("zoneId")}</span>
                <span>Pedidos: {selectedOrders.length}</span>
              </div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="w-full">
      <Card className="mb-3">
        <CardContent className="p-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Crear ruta con pedidos pendientes</h3>
              <div className="text-xs text-muted-foreground">
                CompanyId: {derivedCompanyId || "No definido"}
                {authUser?.role && ` | Rol: ${authUser.role}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {/* Interfaz basada en pasos */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">
              {pasoActual === pasos.SELECCIONAR_ZONA && "Paso 1: Seleccionar Zona"}
              {pasoActual === pasos.SELECCIONAR_PEDIDOS && "Paso 2: Seleccionar Pedidos"}
              {pasoActual === pasos.OPTIMIZAR_RUTA && "Paso 3: Optimizar Ruta"}
              {pasoActual === pasos.COMPLETAR_DATOS && "Paso 4: Completar Datos"}
            </h2>
            
            {/* Indicador de progreso */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" 
                   style={{ 
                     width: 
                      pasoActual === pasos.SELECCIONAR_ZONA ? '25%' : 
                      pasoActual === pasos.SELECCIONAR_PEDIDOS ? '50%' :
                      pasoActual === pasos.OPTIMIZAR_RUTA ? '75%' : '100%' 
                   }}>
              </div>
            </div>
          </div>
          
          {/* Contenido específico de cada paso */}
          <div className="p-3">
            {renderStepContent()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}