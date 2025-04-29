import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest } from "@/lib/queryClient";
import { insertRouteSchema } from "@shared/schema";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Components
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  Map
} from "lucide-react";

interface StepRouteFormProps {
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
  orderId?: number; // Para asociar el cliente con un pedido
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
  deliveryCoordinates?: string;
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
  zoneId?: number; // Asegurarse de que zoneId está disponible 
  zoneName?: string; // Nombre de la zona para mostrar
}

interface Truck {
  id: number;
  brand: string;
  model: string;
  plate: string;
  capacity: number;
  status: string;
}

export default function StepRouteForm({ onRouteCreated }: StepRouteFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Definir los pasos del flujo de creación de ruta
  const pasos = {
    SELECCIONAR_ZONA: "seleccionar_zona",
    SELECCIONAR_PEDIDOS: "seleccionar_pedidos",
    OPTIMIZAR_RUTA: "optimizar_ruta",
    COMPLETAR_DATOS: "completar_datos"
  };
  
  // Controlar el estado actual del flujo
  const [pasoActual, setPasoActual] = useState(pasos.SELECCIONAR_ZONA);
  const [selectedOrders, setSelectedOrders] = useState<PendingOrder[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Customer[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Usar el hook de usuario actual
  const { user: pendingOrdersUserData, isLoading: isLoadingUser } = useCurrentUser();
  
  // Obtener el companyId directamente del servidor
  const { data: companyData } = useQuery<{companyId: number}>({
    queryKey: ['/api/companyid'],
    enabled: !isLoadingUser,
  });

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

  // Estado para la zona seleccionada
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  
  // Estados para el filtrado por zona
  const [pendingOrdersLoaded, setPendingOrdersLoaded] = useState(false);
  const [filteredPendingOrders, setFilteredPendingOrders] = useState<OrderWithCustomer[]>([]);

  // Fetch pending orders with optional zoneId filtering
  const {
    data: pendingOrders = [],
    isLoading: isLoadingPendingOrders,
    error: pendingOrdersError,
    refetch: refetchPendingOrders
  } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders/pending", selectedZoneId],
    queryFn: async () => {      
      console.log("Fetching pending orders, zoneId:", selectedZoneId || "No filter");
      
      // Construir URL con opción de filtrado por zona
      const url = selectedZoneId 
        ? `/api/orders/pending?zoneId=${selectedZoneId}` 
        : "/api/orders/pending";
      
      // Obtener pedidos pendientes con o sin filtro de zona
      const response = await apiRequest({
        url: url,
        method: "GET"
      });
      
      // Si la respuesta ya está parseada como JSON, usarla directamente
      const data = Array.isArray(response) ? response : [];
      
      // Transformar los datos para que coincidan con el formato esperado por el componente
      const transformedOrders = data.map((order: any) => ({
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
      
      setPendingOrdersLoaded(true);
      return transformedOrders;
    },
  });
  
  // Efecto para filtrar pedidos por zona seleccionada
  useEffect(() => {
    if (pendingOrdersLoaded && selectedZoneId) {
      console.log(`Filtrando pedidos para zona ID: ${selectedZoneId}`);
      
      // Filtrar pedidos por la zona seleccionada
      const ordersInZone = pendingOrders.filter(order => {
        // Acceder directamente a la propiedad zoneId en la respuesta del API
        // La API debería devolver esta propiedad directamente
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
    
    // Actualizar el formulario con la zona seleccionada
    form.setValue("zoneId", zoneId);
  };
  
  // Funciones para avanzar y retroceder en los pasos
  const avanzarAlSiguientePaso = () => {
    if (pasoActual === pasos.SELECCIONAR_ZONA) {
      if (!selectedZoneId) {
        toast({
          variant: "destructive",
          title: "Seleccione una zona",
          description: "Debe seleccionar una zona para continuar"
        });
        return;
      }
      setPasoActual(pasos.SELECCIONAR_PEDIDOS);
    } 
    else if (pasoActual === pasos.SELECCIONAR_PEDIDOS) {
      if (selectedOrders.length === 0) {
        toast({
          variant: "destructive",
          title: "Seleccione pedidos",
          description: "Debe seleccionar al menos un pedido para continuar"
        });
        return;
      }
      setPasoActual(pasos.OPTIMIZAR_RUTA);
      // Al avanzar a optimizar, iniciamos el proceso automáticamente
      prepareOrdersForRouteOptimization();
    }
    else if (pasoActual === pasos.OPTIMIZAR_RUTA) {
      if (optimizedRoute.length === 0) {
        toast({
          variant: "destructive",
          title: "Optimice la ruta",
          description: "Debe optimizar la ruta para continuar"
        });
        return;
      }
      setPasoActual(pasos.COMPLETAR_DATOS);
    }
  };
  
  const volverAlPasoAnterior = () => {
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

  // Fetch zonas
  const { data: zones = [], isLoading: isLoadingZones } = useQuery<any[]>({
    queryKey: ["/api/zones"],
  });

  // Obtener el companyId de manera dinámica, SIN VALOR POR DEFECTO
  const currentCompanyId = companyData?.companyId || pendingOrdersUserData?.companyId;
  
  const form = useForm({
    resolver: zodResolver(insertRouteSchema.extend({
      // Hacemos companyId obligatorio sin valor por defecto
      companyId: z.coerce.number().positive("El ID de compañía debe ser un número positivo"),
      // Hacemos zoneId obligatorio sin valor por defecto
      zoneId: z.coerce.number().positive("Debe seleccionar una zona"),
      driverId: z.coerce.number(),
      assistantId: z.union([z.coerce.number(), z.literal(null), z.literal('null')]).nullable().transform(val => 
        val === null || val === 'null' ? null : Number(val)),
      truckId: z.union([z.coerce.number(), z.literal(null), z.literal('null')]).nullable().transform(val => 
        val === null || val === 'null' ? null : Number(val))
    })),
    defaultValues: {
      name: "",
      driverId: undefined, // El usuario debe seleccionar un conductor
      assistantId: null,
      truckId: null,
      date: new Date(),
      status: "pending" as const,
      isCompleted: false,
      stops: [] as string[],
      companyId: currentCompanyId ? Number(currentCompanyId) : undefined, // Sin valor por defecto
      zoneId: undefined // El usuario debe seleccionar una zona
    },
  });
  
  // Set a default route name and update companyId when form initializes
  useEffect(() => {
    const today = new Date().toLocaleDateString("es-ES").replace(/\//g, "-");
    form.setValue("name", `Ruta ${today}`);
    
    // Asegurarnos de que companyId siempre sea un número válido
    const numericCompanyId = Number(currentCompanyId);
    if (!isNaN(numericCompanyId) && numericCompanyId > 0) {
      form.setValue("companyId", numericCompanyId);
    }
  }, [form, currentCompanyId]);

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
          : undefined, // Use company coordinates if available
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
          // Si no hay coordenadas, usamos las coordenadas de la empresa desde la configuración
          coordinates: order.deliveryCoordinates || order.coordinates || 
            (settings?.latitude && settings?.longitude ? `${settings.latitude},${settings.longitude}` : undefined),
          orderId: order.id, // Añadir el ID del pedido para asociarlo con el cliente
        } as Customer;
        
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
      
      if (!depot.coordinates) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El almacén principal no tiene coordenadas definidas. Configúrelas en ajustes de compañía.",
        });
        setIsOptimizing(false);
        return;
      }
      
      // Implement nearest neighbor algorithm for route optimization
      const unvisited = [...customersToVisit];
      const path: Customer[] = [];
      let current = depot;
      
      while (unvisited.length > 0) {
        // Find the nearest customer to the current position
        let minDistance = Infinity;
        let nearestIndex = -1;
        
        for (let i = 0; i < unvisited.length; i++) {
          if (!unvisited[i].coordinates) continue;
          
          const distance = calculateDistance(
            current.coordinates || "", 
            unvisited[i].coordinates || ""
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }
        
        if (nearestIndex === -1) {
          // No valid customer with coordinates found
          console.warn("No se encontraron más clientes con coordenadas válidas");
          break;
        }
        
        // Add nearest customer to path and remove from unvisited
        current = unvisited[nearestIndex];
        path.push(current);
        unvisited.splice(nearestIndex, 1);
      }
      
      // Add any remaining customers without coordinates at the end
      for (const customer of unvisited) {
        path.push(customer);
      }
      
      // Final optimized path: depot + sorted customers
      const optimizedPath = path;
      
      // Calculate total distance
      let totalDistance = 0;
      let prev = depot;
      
      for (const customer of optimizedPath) {
        if (customer.coordinates && prev.coordinates) {
          totalDistance += calculateDistance(prev.coordinates, customer.coordinates);
        }
        prev = customer;
      }
      
      console.log("Total distance:", totalDistance.toFixed(2), "km");
      console.log("Optimized path:", optimizedPath);
      
      // Update the state with optimized route
      setOptimizedRoute([depot, ...optimizedPath]);
      
      // Store selected orders in the optimal order that matches the route
      const orderedSelectedOrders = optimizedPath.map(customer => {
        if ('orderId' in customer) {
          return selectedOrders.find(o => o.id === (customer as any).orderId)!;
        }
        return selectedOrders.find(o => o.customerId === customer.id)!;
      }).filter(Boolean);
      
      setSelectedOrders(orderedSelectedOrders);
      
      setIsOptimizing(false);
      
      toast({
        title: "Ruta optimizada",
        description: `Ruta optimizada con ${optimizedPath.length} paradas y ${calculateTotalRouteDistance([depot, ...optimizedPath]).toFixed(2)} km de distancia total.`,
      });
      
    } catch (error) {
      console.error("Error optimizing route:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo optimizar la ruta. Intenta nuevamente.",
      });
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
    mutationFn: async (routeData: any) => {
      console.log("Iniciando envío de datos de ruta:", routeData);
      
      if (!routeData || !routeData.deliverySequence || routeData.deliverySequence.length === 0) {
        throw new Error("No hay una ruta definida para crear");
      }
      
      // Asegurar que el companyId esté configurado correctamente - sin valor por defecto
      const effectiveCompanyId = companyData?.companyId || pendingOrdersUserData?.companyId;
      
      if (!effectiveCompanyId) {
        // Si no podemos obtener un companyId válido, lanzamos un error y detenemos la ejecución
        throw new Error("No se pudo determinar el ID de la empresa. Por favor inicie sesión nuevamente.");
      } else {
        // Aseguramos que el companyId sea un número
        routeData.companyId = Number(effectiveCompanyId);
        
        // Verificación adicional
        if (isNaN(routeData.companyId) || routeData.companyId <= 0) {
          throw new Error("El ID de la empresa no es válido. Debe ser un número positivo.");
        }
      }
      
      // Verificación final de seguridad para los campos requeridos
      if (!routeData.name || !routeData.driverId || !routeData.companyId) {
        const missingFields = [];
        if (!routeData.name) missingFields.push("nombre de ruta");
        if (!routeData.driverId) missingFields.push("conductor");
        if (!routeData.companyId) missingFields.push("compañía");
        
        throw new Error(`Por favor complete todos los campos requeridos: ${missingFields.join(", ")}`);
      }
      
      try {
        // Usar apiRequest para la comunicación con el servidor
        const result = await apiRequest({
          url: '/api/routes',
          method: 'POST',
          data: routeData
        });
        
        return result;
      } catch (error) {
        console.error("Error al enviar datos de ruta:", error);
        
        // Capturar mensajes de error específicos
        let errorMessage = "Error al crear la ruta";
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
          // @ts-ignore
          errorMessage = error.message || error.error || JSON.stringify(error);
        }
        
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      toast({
        title: "Ruta creada",
        description: "La ruta se ha creado exitosamente con los pedidos seleccionados",
      });
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/pending", selectedZoneId] });
      // Reset form and state
      form.reset();
      setSelectedOrders([]);
      setOptimizedRoute([]);
      setPasoActual(pasos.SELECCIONAR_ZONA);
      // Call callback
      onRouteCreated();
    },
    onError: (error: Error) => {
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
    
    // Determinar el companyId efectivo de manera dinámica - SIN VALOR POR DEFECTO
    const effectiveCompanyId = companyData?.companyId || pendingOrdersUserData?.companyId || data.companyId;
    
    if (!effectiveCompanyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo determinar el ID de la empresa. Por favor, vuelve a iniciar sesión.",
      });
      return;
    }
    
    // Asegurar que el companyId sea un número
    const numericCompanyId = Number(effectiveCompanyId);
    
    if (isNaN(numericCompanyId)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El ID de la empresa no es válido. Por favor, vuelve a iniciar sesión.",
      });
      return;
    }
    
    // Asegurar que tenemos la ruta optimizada
    if (!optimizedRoute || optimizedRoute.length < 2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay una ruta optimizada disponible. Por favor, selecciona pedidos y optimiza la ruta.",
      });
      return;
    }

    // Extract order IDs from selected orders
    const orderIds = selectedOrders.map(order => order.id);
    
    // Calculate total distance of the optimized route
    const totalDistance = calculateTotalRouteDistance(optimizedRoute);
    
    // Calculate estimated duration
    const estimatedDuration = calculateEstimatedDuration(totalDistance, optimizedRoute.length - 1);
    
    // Prepare data for server in the format expected by the mutation function
    const routeData = {
      name: data.name || `Ruta ${new Date().toLocaleDateString()}`,
      date: new Date(data.date || new Date()),
      driverId: Number(data.driverId),
      assistantId: data.assistantId && data.assistantId !== "null" ? Number(data.assistantId) : null,
      truckId: data.truckId && data.truckId !== "null" ? Number(data.truckId) : null,
      status: "pending",
      isCompleted: false,
      deliverySequence: optimizedRoute.map(customer => customer.id.toString()),
      stops: optimizedRoute.map(customer => customer.coordinates || ""),
      totalDistance: totalDistance.toFixed(2),
      estimatedDuration: estimatedDuration,
      orderIds: orderIds,
      companyId: numericCompanyId, // Usar el companyId convertido a número
      zoneId: selectedZoneId // Agregar el zoneId seleccionado
    };
    
    // Llamar a la mutación con los datos en el formato correcto
    createRouteMutation.mutate(routeData);
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

  // Create custom marker icon
  const createIcon = (color: string, label: string) => {
    return L.divIcon({
      className: "custom-icon",
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${label}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className="w-full">
      <Card className="mb-3">
        <CardContent className="p-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Crear ruta con pedidos pendientes</h3>
              <div className="text-xs text-muted-foreground">
                CompanyId: {companyData?.companyId || pendingOrdersUserData?.companyId || "No definido"} 
                {pendingOrdersUserData?.role && ` | Rol: ${pendingOrdersUserData.role}`}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Crear un mensaje más amigable para el usuario
                const diagnosticInfo = {
                  companyId: companyData?.companyId || pendingOrdersUserData?.companyId || "No definido",
                  role: pendingOrdersUserData?.role || "No definido",
                  pendingOrdersCount: Array.isArray(pendingOrders) ? pendingOrders.length : 0,
                  filteringMode: selectedZoneId ? `Zona ID: ${selectedZoneId}` : "Todos los pedidos pendientes",
                  selectedOrdersCount: selectedOrders.length,
                  companySettings: settings ? "Configurados" : "No configurados",
                  companyCoordinates: settings?.latitude && settings?.longitude 
                    ? `${settings.latitude},${settings.longitude}` 
                    : "No configuradas",
                  companyIdFromApi: companyData?.companyId || "No disponible"
                };
                
                // Mostrar la información en una alerta
                toast({
                  title: "Diagnóstico",
                  description: (
                    <div className="text-xs space-y-1">
                      <div><strong>CompanyId:</strong> {diagnosticInfo.companyId}</div>
                      <div><strong>CompanyId (API):</strong> {diagnosticInfo.companyIdFromApi}</div>
                      <div><strong>Rol:</strong> {diagnosticInfo.role}</div>
                      <div><strong>Filtrado:</strong> {diagnosticInfo.filteringMode}</div>
                      <div><strong>Pedidos pendientes:</strong> {diagnosticInfo.pendingOrdersCount}</div>
                      <div><strong>Pedidos seleccionados:</strong> {diagnosticInfo.selectedOrdersCount}</div>
                      <div><strong>Coordenadas:</strong> {diagnosticInfo.companyCoordinates}</div>
                    </div>
                  ),
                  duration: 10000, // 10 segundos
                });
              }}
            >
              Diagnóstico
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {/* Interfaz basada en pasos en lugar de pestañas */}
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
            {/* PASO 1: SELECCIONAR ZONA */}
            {pasoActual === pasos.SELECCIONAR_ZONA && (
              <div>
                <h3 className="text-sm font-medium mb-3">Selecciona una zona para la ruta</h3>
                
                {isLoadingZones ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="zoneId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Zona <span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              const numericValue = Number(val);
                              field.onChange(numericValue);
                              handleZoneChange(numericValue);
                            }}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecciona una zona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {zones.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No hay zonas disponibles
                                </SelectItem>
                              ) : (
                                zones.map((zone) => (
                                  <SelectItem key={zone.id} value={zone.id.toString()}>
                                    {zone.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px]">
                            Zona a la que pertenece esta ruta
                          </FormDescription>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={avanzarAlSiguientePaso}
                        disabled={!selectedZoneId}
                        className="h-8 text-xs"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* PASO 2: SELECCIONAR PEDIDOS */}
            {pasoActual === pasos.SELECCIONAR_PEDIDOS && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Selecciona pedidos para la ruta</h3>
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
                  ) : filteredPendingOrders.length === 0 ? (
                    <div className="text-center py-4">
                      <Package className="h-8 w-8 mx-auto text-gray-300 mb-1" />
                      <h3 className="text-sm font-medium text-gray-700">No hay pedidos pendientes</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        No hay pedidos pendientes disponibles en esta zona.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-2 text-xs py-1 h-7"
                        onClick={() => {
                          setSelectedZoneId(null);
                          form.setValue("zoneId", undefined);
                          setPasoActual(pasos.SELECCIONAR_ZONA);
                        }}
                      >
                        Seleccionar otra zona
                      </Button>
                    </div>
                  ) : (
                    filteredPendingOrders
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
                    onClick={volverAlPasoAnterior}
                    className="h-7 text-xs px-2"
                  >
                    Volver
                  </Button>
                  
                  <Button 
                    onClick={avanzarAlSiguientePaso}
                    disabled={selectedOrders.length === 0}
                    className="h-7 text-xs px-2"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
            
            {/* PASO 3: OPTIMIZAR RUTA */}
            {pasoActual === pasos.OPTIMIZAR_RUTA && (
              <div>
                <h3 className="text-sm font-medium mb-2">Optimizando ruta para entrega</h3>
                
                {isOptimizing ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm">Optimizando la ruta para los pedidos seleccionados...</p>
                  </div>
                ) : (
                  <>
                    {optimizedRoute.length > 0 ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <Card className="p-2">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="text-xs">Duración estimada</span>
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
                              <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="text-xs">Valor total</span>
                            </div>
                            <div className="text-sm font-bold mt-1">
                              {routeStats.totalValue}
                            </div>
                          </Card>
                        </div>
                        
                        <div className="mb-3">
                          <h4 className="text-xs font-medium mb-2">Vista previa de ruta</h4>
                          <div className="h-[250px] border rounded-md overflow-hidden">
                            <MapContainer 
                              center={getMapCenter()} 
                              zoom={11} 
                              style={{ height: '100%', width: '100%' }}
                            >
                              <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              />
                              
                              {optimizedRoute.map((customer, index) => {
                                if (!customer.coordinates) return null;
                                
                                const [lat, lng] = customer.coordinates
                                  .split(',')
                                  .map(parseFloat);
                                  
                                if (isNaN(lat) || isNaN(lng)) return null;
                                
                                const isDepot = index === 0;
                                const icon = createIcon(isDepot ? '#1d4ed8' : '#059669', isDepot ? '0' : index.toString());
                                
                                return (
                                  <Marker
                                    key={`${customer.id}-${index}`}
                                    position={[lat, lng]}
                                    icon={icon}
                                  >
                                    <Popup>
                                      <div className="text-xs">
                                        <div className="font-semibold">
                                          {isDepot ? 'Depósito' : `Parada ${index}`}
                                        </div>
                                        <div>{customer.businessname}</div>
                                      </div>
                                    </Popup>
                                  </Marker>
                                );
                              })}
                              
                              {/* Draw route lines between points */}
                              {optimizedRoute.length > 1 && (
                                <Polyline
                                  positions={optimizedRoute
                                    .filter(customer => customer.coordinates)
                                    .map(customer => {
                                      const [lat, lng] = customer.coordinates!
                                        .split(',')
                                        .map(parseFloat);
                                      return [lat, lng] as [number, number];
                                    })}
                                  color="#1d4ed8"
                                  weight={3}
                                  opacity={0.7}
                                  dashArray="5,10"
                                />
                              )}
                              
                              <MapCenterFixer />
                            </MapContainer>
                          </div>
                        </div>
                        
                        <div className="flex justify-between mt-3">
                          <Button
                            variant="outline"
                            onClick={volverAlPasoAnterior}
                            className="h-7 text-xs px-2"
                          >
                            Volver
                          </Button>
                          
                          <Button 
                            onClick={avanzarAlSiguientePaso}
                            className="h-7 text-xs px-2"
                          >
                            Siguiente
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <Route className="h-8 w-8 mx-auto text-gray-300 mb-1" />
                        <h3 className="text-sm font-medium text-gray-700">No hay ruta optimizada</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Haz clic en optimizar para calcular la mejor ruta de entrega.
                        </p>
                        <div className="mt-3 flex justify-center">
                          <Button 
                            onClick={prepareOrdersForRouteOptimization}
                            className="h-7 text-xs px-3"
                          >
                            Optimizar Ruta
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* PASO 4: COMPLETAR DATOS */}
            {pasoActual === pasos.COMPLETAR_DATOS && (
              <div>
                <h3 className="text-sm font-medium mb-3">Completa los datos de la ruta</h3>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-x-3 gap-y-1">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Nombre de la ruta</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nombre para identificar la ruta" 
                                className="h-8 text-xs" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription className="text-[10px]">
                              Un nombre descriptivo para identificar la ruta
                            </FormDescription>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs">Fecha programada</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className="h-8 pl-3 text-left font-normal text-xs"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: es })
                                    ) : (
                                      <span>Selecciona una fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date("1900-01-01")}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription className="text-[10px]">
                              Fecha en que se realizará la ruta
                            </FormDescription>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-x-3 gap-y-1">
                      <FormField
                        control={form.control}
                        name="driverId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Conductor <span className="text-destructive">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Selecciona un conductor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingDrivers ? (
                                  <SelectItem value="loading" disabled>
                                    Cargando conductores...
                                  </SelectItem>
                                ) : drivers.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No hay conductores disponibles
                                  </SelectItem>
                                ) : (
                                  drivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id.toString()}>
                                      {driver.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-[10px]">
                              Conductor asignado a esta ruta
                            </FormDescription>
                            <FormMessage className="text-[10px]" />
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
                              onValueChange={field.onChange}
                              value={field.value?.toString() || "null"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Selecciona un ayudante (opcional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="null">Sin ayudante</SelectItem>
                                {isLoadingAssistants ? (
                                  <SelectItem value="loading" disabled>
                                    Cargando ayudantes...
                                  </SelectItem>
                                ) : assistants.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No hay ayudantes disponibles
                                  </SelectItem>
                                ) : (
                                  assistants.map((assistant) => (
                                    <SelectItem key={assistant.id} value={assistant.id.toString()}>
                                      {assistant.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-[10px]">
                              Ayudante opcional para esta ruta
                            </FormDescription>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-x-3 gap-y-1">
                      <FormField
                        control={form.control}
                        name="truckId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Vehículo</FormLabel>
                            <Select 
                              onValueChange={field.onChange}
                              value={field.value?.toString() || "null"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Selecciona un vehículo (opcional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="null">Sin vehículo asignado</SelectItem>
                                {isLoadingTrucks ? (
                                  <SelectItem value="loading" disabled>
                                    Cargando vehículos...
                                  </SelectItem>
                                ) : trucks.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No hay vehículos disponibles
                                  </SelectItem>
                                ) : (
                                  trucks.map((truck) => (
                                    <SelectItem key={truck.id} value={truck.id.toString()}>
                                      {truck.plate} - {truck.brand} {truck.model}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-[10px]">
                              Vehículo para realizar la ruta
                            </FormDescription>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zoneId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Zona <span className="text-destructive">*</span></FormLabel>
                            <Select 
                              onValueChange={(val) => {
                                const numericValue = Number(val);
                                field.onChange(numericValue);
                                handleZoneChange(numericValue);
                              }}
                              value={field.value?.toString() || ""}
                              disabled
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs bg-muted">
                                  <SelectValue placeholder="Selecciona una zona" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingZones ? (
                                  <SelectItem value="loading" disabled>
                                    Cargando zonas...
                                  </SelectItem>
                                ) : zones.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No hay zonas disponibles
                                  </SelectItem>
                                ) : (
                                  zones.map((zone) => (
                                    <SelectItem key={zone.id} value={zone.id.toString()}>
                                      {zone.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-[10px]">
                              Zona a la que pertenece esta ruta (bloqueado después de seleccionar)
                            </FormDescription>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-between mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={volverAlPasoAnterior}
                      >
                        Volver
                      </Button>
                      
                      <Button 
                        type="submit"
                        className="h-8 text-xs"
                        disabled={createRouteMutation.isPending}
                      >
                        {createRouteMutation.isPending ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Creando Ruta...
                          </>
                        ) : (
                          'Crear Ruta'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}