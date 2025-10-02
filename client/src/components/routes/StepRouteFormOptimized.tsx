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
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  Map as MapIcon,
  DollarSign,
  CalendarIcon,
  Check,
  Map,
  Truck,
  ArrowLeft,
  ArrowRight,
  Calendar,
  RefreshCw
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
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);
  
  // Tracking UI state
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Hooks
  const { toast } = useToast();
  const { user: authUser } = useCurrentUser();
  const authCompanyId = authUser?.companyId || null;
  const { settings } = useCompanySettings();
  
  // Obtener datos de usuarios para los pendingOrders
  const { data: pendingOrdersUserData } = useQuery({
    queryKey: ["/api/user"],
    enabled: !authUser, // Solo ejecutar si no tenemos authUser
  });
  
  // Usar useMemo para calcular el companyId de forma derivada, evitando re-renders
  const derivedCompanyId = React.useMemo(() => {
    let effectiveCompanyId: number | null = null;
    
    // Prioridad 1: Auth Context (más confiable)
    if (authCompanyId !== null && authCompanyId !== undefined && !isNaN(Number(authCompanyId))) {
      effectiveCompanyId = Number(authCompanyId);
    } 
    // Prioridad 2: Usuario autenticado
    else if (authUser?.companyId && !isNaN(Number(authUser.companyId))) {
      effectiveCompanyId = Number(authUser.companyId);
    } 
    // Prioridad 3: Datos de pedidos pendientes
    else if (pendingOrdersUserData && typeof pendingOrdersUserData === 'object' && 'companyId' in pendingOrdersUserData && 
             !isNaN(Number((pendingOrdersUserData as any).companyId))) {
      effectiveCompanyId = Number((pendingOrdersUserData as any).companyId);
    }
    
    return effectiveCompanyId;
  }, [authCompanyId, authUser, pendingOrdersUserData]);
  
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
      driverId: undefined,
      assistantId: null,
      truckId: null,
      date: new Date(),
      status: "pending" as const,
      isCompleted: false,
      stops: [] as string[],
      companyId: derivedCompanyId || undefined,
      zoneId: undefined
    } as any,
  });
  
  // Efecto para actualizar companyId solo cuando cambia de null a un valor válido
  useEffect(() => {
    if (derivedCompanyId && derivedCompanyId > 0) {
      const currentCompanyId = form.getValues("companyId");
      
      // Solo actualizar si es diferente al valor actual
      if (currentCompanyId !== derivedCompanyId) {
        console.log(`✅ CompanyId ${derivedCompanyId} asignado al formulario`);
        form.setValue("companyId", derivedCompanyId, { shouldValidate: false });
      }
    } else if (derivedCompanyId === null) {
      console.error("❌ No se pudo determinar un companyId válido");
    }
  }, [derivedCompanyId]); // Solo depende de derivedCompanyId
  
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
  
  // Obtener todos los pedidos pendientes sin filtrar por zona
  const { data: pendingOrders = [], isLoading: isLoadingPendingOrders } = useQuery<any[]>({
    queryKey: ["/api/orders/pending"],
    queryFn: async () => {      
      console.log("🔍 Obteniendo todos los pedidos pendientes");
      
      try {
        // Obtener todos los pedidos pendientes
        const response = await apiRequest({
          url: "/api/orders/pending",
          method: "GET"
        });
        
        console.log("📦 Respuesta de pedidos pendientes:", response);
        
        // Asegurar que trabajamos con un array
        const data = Array.isArray(response) ? response : 
                    response && typeof response === 'object' ? [response] : [];
        
        if (data.length === 0) {
          console.log("⚠️ No se encontraron pedidos pendientes o el formato de respuesta no es el esperado");
        }
        
        // Transformar cada pedido para normalizar la estructura
        const transformedOrders = data.map((order: any) => {
          // Comprobar si tenemos datos válidos antes de transformar
          if (!order || typeof order !== 'object') {
            console.log("⚠️ Orden inválida en los datos:", order);
            return null;
          }
          
          // Información básica para debugging
          console.log(`📋 Procesando pedido #${order.id || 'sin ID'}`);
          
          // Convertir el total a número si es posible
          let totalNumber = 0;
          if (order.total !== undefined && order.total !== null) {
            if (typeof order.total === 'number') {
              totalNumber = order.total;
            } else {
              // Intentar convertir a número si es string
              const parsed = parseFloat(order.total);
              if (!isNaN(parsed)) {
                totalNumber = parsed;
              }
            }
          }
          
          return {
            ...order,
            id: order.id || Math.random().toString(36).substring(7), // Asegurar que siempre hay un ID
            coordinates: order.deliveryCoordinates || order.coordinates || null,
            customerName: order.customerName || "Cliente sin nombre",
            customerAddress: (order.customerAddress || "Sin dirección") + 
                          (order.customerAddressNumber ? ` #${order.customerAddressNumber}` : ''),
            customerPhone: order.customerPhone || "",
            products: order.products || [],
            // Normalizar el zoneId
            zoneId: order.zoneId || order.zoneid || order.zone_id || null,
            // Asegurar fecha
            date: order.date || new Date().toISOString(),
            // Asegurar estado
            status: order.status || "pending",
            // Asegurar total como número
            total: totalNumber
          };
        }).filter(Boolean); // Remover posibles nulos
        
        console.log(`✅ Procesados ${transformedOrders.length} pedidos pendientes válidos`);
        return transformedOrders;
      } catch (error) {
        console.error("❌ Error al obtener pedidos pendientes:", error);
        return [];
      }
    },
  });
  
  // Actualizar estado de carga cuando los pedidos estén listos
  useEffect(() => {
    if (!isLoadingPendingOrders && pendingOrders) {
      setPendingOrdersLoaded(true);
    }
  }, [isLoadingPendingOrders, pendingOrders]);
  
  // Usar useMemo para filtrar pedidos, evitando re-renders innecesarios
  useEffect(() => {
    // Siempre manejar pendingOrders como un array, incluso si llega null o undefined
    const safeOrders = Array.isArray(pendingOrders) ? pendingOrders : [];
    
    console.log(`🔄 Actualizando pedidos filtrados - Total: ${safeOrders.length}, Zona: ${selectedZoneId}, Cargados: ${pendingOrdersLoaded}`);
    
    try {
      if (pendingOrdersLoaded && selectedZoneId) {
        console.log(`🔎 Filtrando pedidos para zona ID: ${selectedZoneId}`);
        
        // Verificar que pendingOrders sea un array antes de filtrar
        const ordersInZone = safeOrders.filter(order => {
          if (!order || typeof order !== 'object') {
            return false;
          }
          
          // Comprobar múltiples formatos posibles de zoneId
          const orderZoneId = order.zoneId || order.zoneid || order.zone_id;
          
          // Si no hay zoneId, no incluir el pedido
          if (orderZoneId === undefined || orderZoneId === null) {
            return false;
          }
          
          const numericZoneId = Number(orderZoneId);
          const numericSelectedZoneId = Number(selectedZoneId);
          
          // Verificar que ambos sean números válidos
          if (isNaN(numericZoneId) || isNaN(numericSelectedZoneId)) {
            return false;
          }
          
          return numericZoneId === numericSelectedZoneId;
        });
        
        console.log(`✅ Encontrados ${ordersInZone.length} pedidos en la zona ${selectedZoneId}`);
        
        // Siempre actualizar el estado, incluso si no hay pedidos
        setFilteredPendingOrders(ordersInZone || []);
        
        // Limpiar la selección de pedidos anterior al cambiar de zona
        setSelectedOrders([]);
      } else {
        // Si no hay zona seleccionada o los pedidos aún no se han cargado,
        // usar un array vacío para evitar errores
        console.log(`ℹ️ No hay filtro de zona - mostrando lista vacía`);
        setFilteredPendingOrders([]);
      }
    } catch (error) {
      console.error("❌ Error al filtrar pedidos:", error);
      // En caso de error, establecer un array vacío para evitar errores de renderizado
      setFilteredPendingOrders([]);
    }
  }, [pendingOrders, selectedZoneId, pendingOrdersLoaded]); // Removido toast de las dependencias
  
  // Función para obtener el centro del mapa basado en las coordenadas de los puntos
  const getMapCenter = (orders: any[]): [number, number] => {
    if (!orders || orders.length === 0) {
      return [19.432608, -99.133209]; // Default: Ciudad de México
    }

    try {
      // Filtrar solo elementos con coordenadas válidas
      const validOrders = orders.filter(order => {
        if (!order.coordinates) return false;
        
        let coords: number[] = [];
        if (typeof order.coordinates === 'string') {
          coords = order.coordinates.split(',').map(Number);
        } else if (Array.isArray(order.coordinates)) {
          coords = order.coordinates.map(Number);
        }
        
        return coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1]);
      });
      
      if (validOrders.length === 0) {
        return [19.432608, -99.133209]; // Default: Ciudad de México
      }
      
      // Calcular promedio de lat/lng para el centro
      let sumLat = 0;
      let sumLng = 0;
      let count = 0;
      
      validOrders.forEach(order => {
        let coords: number[] = [];
        if (typeof order.coordinates === 'string') {
          coords = order.coordinates.split(',').map(Number);
        } else if (Array.isArray(order.coordinates)) {
          coords = order.coordinates.map(Number);
        }
        
        if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          sumLat += coords[0];
          sumLng += coords[1];
          count++;
        }
      });
      
      return count > 0 ? [sumLat / count, sumLng / count] : [19.432608, -99.133209];
    } catch (e) {
      console.error("Error calculando centro del mapa:", e);
      return [19.432608, -99.133209]; // Default: Ciudad de México
    }
  };
  
  // Componente para fijar el centro del mapa
  const MapCenterFixer = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    
    useEffect(() => {
      if (center && !isNaN(center[0]) && !isNaN(center[1])) {
        map.setView(center, map.getZoom());
      }
    }, [center, map]);
    
    return null;
  };
  
  // Función para cambiar la zona seleccionada
  const handleZoneChange = (zoneId: number) => {
    console.log(`Cambiando a zona ID: ${zoneId}`);
    
    // Siempre limpiar pedidos seleccionados al cambiar de zona
    setSelectedOrders([]);
    
    // Actualizar el ID de la zona seleccionada
    setSelectedZoneId(zoneId);
    
    if (typeof zoneId === 'number' && !isNaN(zoneId) && zoneId > 0) {
      // Actualizar el valor en el formulario
      form.setValue("zoneId", zoneId);
      console.log(`Zona en formulario actualizada a: ${form.getValues("zoneId")}`);
      
      // Forzar la actualización de pedidos pendientes si es necesario
      if (!pendingOrdersLoaded || pendingOrders.length === 0) {
        console.log("🔄 Forzando recarga de pedidos pendientes para nueva zona");
        queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
        
        // Mostrar toast informativo
        toast({
          description: "Cargando pedidos para esta zona...",
        });
      }
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
    console.log(`⏭️ Avanzando al siguiente paso desde: ${pasoActual}`);
    
    if (pasoActual === pasos.SELECCIONAR_ZONA) {
      if (!selectedZoneId) {
        toast({
          title: "Selecciona una zona",
          description: "Debes seleccionar una zona para continuar.",
          variant: "destructive"
        });
        return;
      }
      
      console.log(`✅ Zona seleccionada ID: ${selectedZoneId}, avanzando a selección de pedidos`);
      
      // Forzar la recarga de pedidos pendientes si aún no están cargados
      if (pendingOrdersLoaded === false || (Array.isArray(pendingOrders) && pendingOrders.length === 0)) {
        console.log("🔄 Forzando recarga de pedidos pendientes antes de avanzar");
        queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
      }
      
      // Actualizar state y continuar
      setPasoActual(pasos.SELECCIONAR_PEDIDOS);
      console.log("🚀 Avanzando a selección de pedidos");
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
      
      console.log(`✅ ${selectedOrders.length} pedidos seleccionados, avanzando a optimización`);
      
      try {
        // Verificar que hay pedidos seleccionados
        if (!Array.isArray(selectedOrders) || selectedOrders.length === 0) {
          throw new Error("No hay pedidos seleccionados");
        }
        
        // Verificar que los pedidos tengan coordenadas
        const ordersWithoutCoords = selectedOrders.filter(o => !o.coordinates);
        if (ordersWithoutCoords.length > 0) {
          console.error("❌ Pedidos sin coordenadas:", ordersWithoutCoords);
          throw new Error(`${ordersWithoutCoords.length} pedidos no tienen coordenadas asignadas. Por favor, verifica la información de los clientes.`);
        }
        
        // Añadir el punto de la empresa como primer punto (índice 0)
        const companyCoordinates = settings?.latitude && settings?.longitude 
          ? `${settings.latitude},${settings.longitude}` 
          : "19.432608,-99.133209"; // Coordenadas por defecto
        
        console.log(`🏢 Usando coordenadas de empresa: ${companyCoordinates}`);
          
        // Crear punto de la empresa
        const companyPoint = {
          id: "company",
          customerName: `${settings?.name || "Empresa"} (Punto de partida)`,
          customerAddress: `${settings?.street || ""} ${settings?.streetNumber || ""}`,
          coordinates: companyCoordinates,
          isCompany: true
        };
        
        console.log("🔍 Procesando pedidos seleccionados:", selectedOrders);
        
        // Verificar que los pedidos tengan el formato correcto
        if (!Array.isArray(selectedOrders) || selectedOrders.length === 0) {
          throw new Error("No hay pedidos seleccionados para procesar");
        }
        
        // Agrupar pedidos por cliente (mismas coordenadas) con manejo mejorado de errores
        const groupedOrders = selectedOrders.reduce((acc: any[], order, index) => {
          if (!order || typeof order !== 'object') {
            console.warn(`⚠️ Pedido en posición ${index} inválido:`, order);
            return acc;
          }
          
          // Extraer y verificar coordenadas
          const coordKey = order.coordinates || "";
          console.log(`📍 Procesando pedido #${order.id} con coordenadas ${coordKey}`);
          
          // Buscar si ya existe una parada con estas coordenadas
          const existingStopIndex = acc.findIndex(stop => 
            stop.coordinates === coordKey && !stop.isCompany
          );
          
          if (existingStopIndex >= 0) {
            console.log(`🔄 Agrupando pedido #${order.id} con parada existente`);
            // Si existe, añadimos este pedido a la lista de pedidos de esa parada
            if (!acc[existingStopIndex].orderIds) {
              acc[existingStopIndex].orderIds = [acc[existingStopIndex].id];
            }
            acc[existingStopIndex].orderIds.push(order.id);
            
            // Actualizar información de la parada para mostrar múltiples pedidos
            acc[existingStopIndex].customerName = `${acc[existingStopIndex].customerName} (${acc[existingStopIndex].orderIds.length} pedidos)`;
            
            // Suma los totales de los pedidos
            const currentTotal = typeof acc[existingStopIndex].total === 'number' ? acc[existingStopIndex].total : 0;
            const orderTotal = typeof order.total === 'number' ? order.total : 0;
            acc[existingStopIndex].total = currentTotal + orderTotal;
          } else {
            console.log(`➕ Añadiendo nueva parada para pedido #${order.id}`);
            // Si no existe, creamos una nueva parada
            acc.push({
              ...order,
              orderIds: [order.id]
            });
          }
          
          return acc;
        }, []);
        
        console.log(`✅ Procesamiento completo: ${groupedOrders.length} paradas generadas`);
        
        // Añadir la empresa como primer punto y luego los pedidos agrupados
        const sequence = [companyPoint, ...groupedOrders];
        setOptimizedSequence(sequence);
        
        console.log(`🚀 Secuencia optimizada creada con ${sequence.length} puntos (incluyendo empresa)`);
        
        // Cambiar al siguiente paso solo después de procesar todo correctamente
        setPasoActual(pasos.OPTIMIZAR_RUTA);
      } catch (error) {
        console.error("❌ Error al procesar pedidos para optimización:", error);
        toast({
          title: "Error al procesar pedidos",
          description: "Hubo un problema al preparar la ruta. Por favor, inténtalo de nuevo.",
          variant: "destructive"
        });
        return; // No avanzar al siguiente paso si hay error
      }
    }
    else if (pasoActual === pasos.OPTIMIZAR_RUTA) {
      console.log("✅ Secuencia optimizada, avanzando a completar datos");
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
  
  // Usar useMemo para calcular el tiempo y distancia estimados sin actualizar estado durante el render
  const routeEstimation = React.useMemo(() => {
    try {
      if (optimizedSequence.length <= 1) {
        return { time: "0min", distance: 0 };
      }
      
      let estimatedTime = 0;
      let totalDistance = 0;
      
      // Recorremos la secuencia optimizada para calcular tiempos entre puntos
      for (let i = 0; i < optimizedSequence.length - 1; i++) {
        const currentPoint = optimizedSequence[i];
        const nextPoint = optimizedSequence[i + 1];
        
        // Añadir 5 minutos por cada parada (excepto la empresa que es punto de partida)
        if (!currentPoint.isCompany) {
          estimatedTime += 5; // 5 minutos por parada para entrega
        }
        
        // Calcular distancia entre puntos para estimar tiempo de viaje
        if (currentPoint.coordinates && nextPoint.coordinates) {
          try {
            // Convertir coordenadas a formato adecuado
            const currentCoords = Array.isArray(currentPoint.coordinates) 
              ? currentPoint.coordinates.map(Number)
              : typeof currentPoint.coordinates === 'string'
                ? currentPoint.coordinates.split(',').map(Number)
                : [0, 0];
                
            const nextCoords = Array.isArray(nextPoint.coordinates)
              ? nextPoint.coordinates.map(Number)
              : typeof nextPoint.coordinates === 'string'
                ? nextPoint.coordinates.split(',').map(Number)
                : [0, 0];
            
            // Verificar que las coordenadas son válidas
            if (isNaN(currentCoords[0]) || isNaN(currentCoords[1]) || 
                isNaN(nextCoords[0]) || isNaN(nextCoords[1])) {
              continue;
            }
            
            // Usar Haversine para calcular distancia en km
            const lat1 = currentCoords[0];
            const lon1 = currentCoords[1];
            const lat2 = nextCoords[0];
            const lon2 = nextCoords[1];
            
            const R = 6371; // Radio de la Tierra en km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c; // Distancia en km
            
            // Solo acumular distancias válidas
            if (!isNaN(distance) && isFinite(distance)) {
              totalDistance += distance;
              
              // Estimar tiempo en minutos (asumiendo velocidad promedio de 40 km/h en ciudad)
              // 40 km/h = 0.6667 km/min, por lo que tiempo = distancia / 0.6667
              const travelTime = distance / 0.6667;
              if (!isNaN(travelTime) && isFinite(travelTime)) {
                estimatedTime += travelTime;
              }
            }
          } catch (e) {
            console.error("Error al calcular distancia:", e);
            // Continuar con el siguiente punto en caso de error
          }
        }
      }
      
      // Añadir 5 minutos a la última parada si no es la empresa
      const lastPoint = optimizedSequence[optimizedSequence.length - 1];
      if (lastPoint && !lastPoint.isCompany) {
        estimatedTime += 5;
      }
      
      // Calcular distancia redondeada
      const distanceKm = !isNaN(totalDistance) && isFinite(totalDistance) 
        ? Math.round(totalDistance * 10) / 10 
        : 0;
      
      // Redondear a minutos enteros
      estimatedTime = !isNaN(estimatedTime) ? Math.round(estimatedTime) : 0;
      
      // Convertir a formato horas:minutos
      const hours = Math.floor(estimatedTime / 60);
      const minutes = estimatedTime % 60;
      const timeFormatted = `${hours > 0 ? hours + 'h ' : ''}${minutes}min`;
      
      return { time: timeFormatted, distance: distanceKm };
    } catch (error) {
      console.error("Error general al calcular tiempo estimado:", error);
      return { time: "0min", distance: 0 };
    }
  }, [optimizedSequence]);
  
  // Filtrar pedidos por término de búsqueda (con validación para evitar errores)
  const filteredOrders = React.useMemo(() => {
    // Asegurar que filteredPendingOrders siempre sea un array
    const safeFilteredOrders = Array.isArray(filteredPendingOrders) ? filteredPendingOrders : [];
    
    if (!searchQuery || searchQuery.trim() === '') {
      return safeFilteredOrders;
    }
    
    try {
      return safeFilteredOrders.filter(order => {
        // Validar que el pedido tenga los campos necesarios para evitar errores
        if (!order || typeof order !== 'object') {
          console.warn('⚠️ Pedido inválido en filteredOrders:', order);
          return false;
        }
        
        const customerName = order.customerName || '';
        const customerAddress = order.customerAddress || '';
        const orderId = order.id ? order.id.toString() : '';
        const query = searchQuery.toLowerCase().trim();
        
        return customerName.toLowerCase().includes(query) ||
               customerAddress.toLowerCase().includes(query) ||
               orderId.includes(query);
      });
    } catch (error) {
      console.error('❌ Error al filtrar pedidos por búsqueda:', error);
      return safeFilteredOrders;
    }
  }, [filteredPendingOrders, searchQuery]);
  
  // Función para enviar el formulario y crear la ruta
  const onSubmit = (values: any) => {
    console.log("Datos del formulario:", values);
    
    // Crear un objeto para agrupar pedidos por cliente (coordenadas)
    const stopsObj: Record<string, any> = {};
    
    // Procesar cada orden en la secuencia optimizada
    optimizedSequence.forEach((stop, index) => {
      // Ignorar el punto de la empresa (será manejado por separado)
      if (stop.isCompany) return;
      
      // Si este punto tiene múltiples pedidos (orderIds)
      if (stop.orderIds && stop.orderIds.length > 0) {
        const coordinates = stop.coordinates;
        
        // Añadir cada pedido asociado a este punto como una parada
        stop.orderIds.forEach((orderId: string | number) => {
          // Buscar el pedido original
          const originalOrder = selectedOrders.find(o => o.id === orderId);
          if (originalOrder) {
            stopsObj[orderId.toString()] = {
              orderId: orderId,
              customerId: originalOrder.customerId,
              coordinates: coordinates,
              address: stop.customerAddress,
              name: stop.customerName.replace(/ \(\d+ pedidos\)$/, ''), // Quitar el sufijo de múltiples pedidos
              status: "pending"
            };
          }
        });
      } else {
        // Punto con un solo pedido
        stopsObj[stop.id.toString()] = {
          orderId: stop.id,
          customerId: stop.customerId,
          coordinates: stop.coordinates,
          address: stop.customerAddress,
          name: stop.customerName,
          status: "pending"
        };
      }
    });
    
    // Convertir el objeto a un array
    const stops = Object.values(stopsObj);
    
    // Crear la secuencia de entrega, asegurando que incluimos la empresa como punto 0
    const sequence = optimizedSequence.map(order => order.id);
    
    // Obtener el tiempo estimado de la ruta
    console.log(`Tiempo estimado de la ruta: ${routeEstimation.time}, Distancia: ${routeEstimation.distance} km`);
    
    // Agregar información de la empresa en los datos del formulario
    const companyInfo = optimizedSequence.find(order => order.isCompany);
    
    // Verificar que tengamos companyId válido antes de enviar
    if (!values.companyId || isNaN(Number(values.companyId))) {
      console.error("❌ No hay companyId válido en formulario:", values.companyId);
      toast({
        title: "Error al crear ruta",
        description: "No se pudo determinar la empresa para esta ruta. Por favor, inicie sesión nuevamente.",
        variant: "destructive"
      });
      return;
    }

    // Verificar que tengamos zoneId válido antes de enviar
    if (!values.zoneId || isNaN(Number(values.zoneId))) {
      console.error("❌ No hay zoneId válido en formulario:", values.zoneId);
      toast({
        title: "Error al crear ruta", 
        description: "Debe seleccionar una zona válida para la ruta.",
        variant: "destructive"
      });
      return;
    }
    
    // Asegurar que todos los IDs son números
    const routeData = {
      ...values,
      companyId: Number(values.companyId),
      zoneId: Number(values.zoneId),
      driverId: Number(values.driverId),
      // Solo convertir assistantId y truckId si no son nulos
      assistantId: values.assistantId ? Number(values.assistantId) : null,
      truckId: values.truckId ? Number(values.truckId) : null,
      stops: stops,
      deliverySequence: sequence,
      companyCoordinates: companyInfo?.coordinates || null,
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
              ) : !Array.isArray(filteredOrders) || filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? "No se encontraron pedidos con ese criterio de búsqueda" 
                      : "No hay pedidos pendientes en esta zona"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedZoneId ? (
                      <>La zona {zones.find(z => z.id === selectedZoneId)?.name || `#${selectedZoneId}`} no tiene pedidos pendientes.</>
                    ) : (
                      <>Seleccione una zona para ver los pedidos disponibles.</>
                    )}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Volver a selección de zona
                        setPasoActual(pasos.SELECCIONAR_ZONA);
                        console.log("Volviendo a selección de zona");
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Cambiar zona
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Refrescar la lista de pedidos
                        console.log("🔄 Refrescando pedidos pendientes manualmente");
                        queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
                        
                        // Mostrar mensaje de carga
                        toast({
                          title: "Actualizando pedidos",
                          description: "Buscando pedidos pendientes en esta zona...",
                        });
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Actualizar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredOrders.map(order => {
                    // Validación adicional para cada pedido
                    if (!order || typeof order !== 'object' || !order.id) {
                      console.warn('⚠️ Pedido inválido en el renderizado:', order);
                      return null;
                    }
                    
                    return (
                      <div
                        key={`order-${order.id}`}
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
                              {order.customerName || 'Cliente sin nombre'}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {order.customerAddress || 'Sin dirección'}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {order.date ? format(new Date(order.date), 'dd/MM/yyyy') : 'Sin fecha'}
                              <DollarSign className="h-3 w-3 ml-2 mr-1" />
                              ${typeof order.total === 'number' ? order.total.toFixed(2) : 
                                 order.total ? String(order.total) : '0.00'}
                            </div>
                          </div>
                          
                          <Badge variant={order.status === 'pending' ? 'outline' : 'secondary'} className="text-xs">
                            {order.status === 'pending' ? 'Pendiente' : 'En proceso'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mapa con ruta optimizada */}
              <Card className="md:row-span-2">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Vista previa de la ruta</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[400px] w-full relative">
                    {optimizedSequence.length > 0 ? (
                      <MapContainer
                        center={getMapCenter(optimizedSequence)}
                        zoom={13}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <MapCenterFixer center={getMapCenter(optimizedSequence)} />
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        
                        {/* Dibujar la línea de la ruta */}
                        <Polyline
                          positions={optimizedSequence
                            .filter((order) => order.coordinates)
                            .map((order) => {
                              try {
                                // Intentar convertir las coordenadas a números
                                const coords = typeof order.coordinates === 'string' 
                                  ? order.coordinates.split(',').map(Number) 
                                  : (Array.isArray(order.coordinates) 
                                    ? order.coordinates.map(Number) 
                                    : [0, 0]);
                                
                                return coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1]) 
                                  ? [coords[0], coords[1]] as [number, number]
                                  : [0, 0] as [number, number];
                              } catch (e) {
                                console.error("Error al procesar coordenadas:", e);
                                return [0, 0] as [number, number];
                              }
                            })}
                          color="blue"
                          weight={3}
                          opacity={0.7}
                        />
                        
                        {/* Marcadores para cada punto */}
                        {optimizedSequence
                          .filter((order) => order.coordinates)
                          .map((order, idx) => {
                            try {
                              // Convertir las coordenadas a formato LatLng
                              let coords: [number, number] = [0, 0];
                              
                              if (typeof order.coordinates === 'string') {
                                const latLng = order.coordinates.split(',').map(Number);
                                coords = latLng.length >= 2 ? [latLng[0], latLng[1]] : [0, 0];
                              } else if (Array.isArray(order.coordinates)) {
                                coords = order.coordinates.length >= 2 
                                  ? [Number(order.coordinates[0]), Number(order.coordinates[1])]
                                  : [0, 0];
                              }
                              
                              // Verificar que las coordenadas sean válidas
                              if (isNaN(coords[0]) || isNaN(coords[1])) {
                                return null;
                              }
                              
                              // Determinar si es la empresa (punto 0) o una parada regular
                              const isCompany = order.isCompany === true;
                              
                              // Crear un icono personalizado con el número de orden
                              const customIcon = L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="flex items-center justify-center ${
                                  isCompany ? 'bg-green-600' : 'bg-blue-600'
                                } text-white rounded-full w-6 h-6 text-sm font-semibold shadow border border-white">${
                                  isCompany ? '0' : idx
                                }</div>`,
                                iconSize: [24, 24],
                                iconAnchor: [12, 12]
                              });
                              
                              return (
                                <Marker
                                  key={`marker-${order.id}-${idx}`}
                                  position={coords}
                                  icon={customIcon}
                                >
                                  <Popup>
                                    <div className="text-xs">
                                      <div className="font-semibold">{isCompany ? 'Empresa (Punto de partida)' : `Parada #${idx}`}</div>
                                      <div>{order.customerName}</div>
                                      <div>{order.customerAddress}</div>
                                    </div>
                                  </Popup>
                                </Marker>
                              );
                            } catch (e) {
                              console.error("Error al crear marcador:", e);
                              return null;
                            }
                          })}
                      </MapContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted/20">
                        <div className="text-center">
                          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No hay ruta para visualizar
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Lista de paradas */}
              <Card>
                <CardHeader className="py-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">Secuencia de entregas</CardTitle>
                    {optimizedSequence.length > 1 && (
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          <span>Tiempo: {routeEstimation.time}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <MapIcon className="mr-1 h-3 w-3" />
                          <span>Distancia: {routeEstimation.distance} km</span>
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {optimizedSequence.map((order, idx) => (
                      <div 
                        key={order.id} 
                        className={`flex items-center p-2 border rounded-md ${order.isCompany ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''}`}
                      >
                        <Badge 
                          variant={order.isCompany ? "default" : "outline"} 
                          className="mr-3 flex-shrink-0"
                        >
                          {order.isCompany ? '0' : idx}
                        </Badge>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.customerAddress}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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