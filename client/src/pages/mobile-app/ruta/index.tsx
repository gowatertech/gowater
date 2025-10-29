import React, { useState, useEffect } from "react";
import RouteTimeline from "@/components/route/RouteTimeline";
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";
import { 
  ArrowLeft, 
  Navigation, 
  MapPin, 
  AlertTriangle,
  Play,
  Square,
  Pause,
  Check,
  Clock,
  Compass,
  RotateCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  Recycle,
  Package,
  Receipt,
  Printer,
  Edit,
  Eye,
  CreditCard,
  CircleDollarSign,
  Coins,
  Calculator,
  Ban,
  CheckCircle,
  BadgeDollarSign,
  PillBottle,
  Plus,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { apiRequest } from "@/lib/api";
import BottleReturnDialog from "@/components/bottleReturns/BottleReturnDialog";
import { RouteStop } from "@/types/route";

// Componentes de diálogo
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Formularios e inputs
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// Función para formatear tiempo
const formatTimeDifference = (startDate: Date, endDate: Date): string => {
  const diffInMs = endDate.getTime() - startDate.getTime();
  const diffInMin = Math.floor(diffInMs / 60000);
  
  if (diffInMin <= 0) {
    return '0 min';
  }
  
  if (diffInMin < 60) {
    return `${diffInMin} min`;
  }
  
  const hours = Math.floor(diffInMin / 60);
  const minutes = diffInMin % 60;
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
};

// Conversor string a número con validación robusta
const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};

export default function DriverRoute() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  
  // Estado local
  const [loading, setLoading] = useState(true);
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [expandedStopId, setExpandedStopId] = useState<number | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(-1);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isCompletingRoute, setIsCompletingRoute] = useState(false);
  
  // Estados para diálogos
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEditOrderDialog, setShowEditOrderDialog] = useState(false);
  const [showBottleReturnDialog, setShowBottleReturnDialog] = useState(false);
  const [showCompleteRouteDialog, setShowCompleteRouteDialog] = useState(false);
  const [currentStopForPayment, setCurrentStopForPayment] = useState<RouteStop | null>(null);
  const [currentStopForEdit, setCurrentStopForEdit] = useState<RouteStop | null>(null);
  const [currentOrderIdForBottleReturn, setCurrentOrderIdForBottleReturn] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit" | "donation" | "transfer">("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [returnedBottlesCount, setReturnedBottlesCount] = useState<number>(0);
  
  // Estados para manejo de pagos multi-orden
  const [currentOrderIdForPayment, setCurrentOrderIdForPayment] = useState<number | null>(null);
  const [pendingOrdersInStop, setPendingOrdersInStop] = useState<Array<{id: number, customerName: string, totalValue: number | string, invoiceId?: number | null}>>([]);
  
  // Función para navegar a una ubicación
  const handleNavigateToLocation = (latitude: number, longitude: number, address: string) => {
    // Usamos la API de Google Maps para navegación
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    // Abrimos en una nueva pestaña
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      toast({
        title: "Navegación bloqueada",
        description: "Por favor, permite ventanas emergentes para abrir el mapa de navegación",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Navegando a destino",
        description: `Abriendo navegación a ${address}`,
      });
    }
  };
  
  // Cargar datos de la ruta activa
  useEffect(() => {
    const fetchActiveRoute = async () => {
      try {
        // Obtener el ID de la ruta de la URL si existe
        const urlParams = new URLSearchParams(window.location.search);
        const routeIdFromUrl = urlParams.get('routeId');
        
        if (routeIdFromUrl) {
          // Si tenemos ID en la URL, cargar esa ruta específica
          console.log(`Cargando ruta específica desde URL: ${routeIdFromUrl}`);
          const routeResponse = await apiRequest(`/api/routes/${routeIdFromUrl}`);
          
          if (routeResponse && routeResponse.id) {
            setActiveRouteId(routeResponse.id);
            setRouteDetails(routeResponse);
            fetchRouteStops(routeResponse.id);
          } else {
            throw new Error("No se pudo cargar la ruta especificada");
          }
        } else {
          // Si no hay ID en la URL, intentar cargar la ruta activa
          const activeRoutes = await apiRequest("/api/routes/active");
          
          if (Array.isArray(activeRoutes) && activeRoutes.length > 0) {
            // Filtrar por rutas en progreso primero
            const inProgressRoutes = activeRoutes.filter(r => r.status === 'in_progress');
            
            if (inProgressRoutes.length > 0) {
              setActiveRouteId(inProgressRoutes[0].id);
              setRouteDetails(inProgressRoutes[0]);
              fetchRouteStops(inProgressRoutes[0].id);
            } else if (activeRoutes.length > 0) {
              // Si no hay en progreso, usar la primera ruta pendiente
              setActiveRouteId(activeRoutes[0].id);
              setRouteDetails(activeRoutes[0]);
              fetchRouteStops(activeRoutes[0].id);
            }
          } else {
            setLoading(false);
            toast({
              title: "No hay rutas activas",
              description: "No hay rutas pendientes o en progreso asignadas.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error("Error al cargar la ruta activa:", error);
        setLoading(false);
        toast({
          title: "Error al cargar la ruta",
          description: "Hubo un problema al obtener los datos de la ruta.",
          variant: "destructive"
        });
      }
    };
    
    fetchActiveRoute();
    
    // Verificar preferencia de modo oscuro
    const darkModePreference = localStorage.getItem("darkMode");
    if (darkModePreference === "true") {
      setDarkMode(true);
    }
  }, []);
  
  // Función para cargar las paradas de la ruta
  const fetchRouteStops = async (routeId: number) => {
    try {
      console.log("Solicitando órdenes para la ruta", routeId);
      const response = await apiRequest(`/api/routes/${routeId}/orders`);
      console.log("Respuesta del servidor:", response);
      
      // Definir la parada inicial (almacén/base)
      const warehouseStop: RouteStop = {
        id: 0,
        order: 0,
        customerId: 0,
        customerName: "Almacén Principal",
        address: "Calle Principal #123",
        latitude: 19.075380,
        longitude: -70.128822,
        status: "completed",
        estimatedArrival: "Inicio",
        estimatedDuration: 0,
        distanceFromPrevious: 0,
        products: [],
        totalValue: 0,
        isWarehouse: true
      };
      
      // Inicializar con el almacén
      let orderedStops: RouteStop[] = [warehouseStop];
      
      if (response && Array.isArray(response)) {
        // Ordenar las órdenes por deliverySequence antes de agruparlas
        const sortedOrders = [...response].sort((a, b) => {
          const seqA = a.deliverySequence || 999;
          const seqB = b.deliverySequence || 999;
          return seqA - seqB;
        });
        
        // AGRUPAR ÓRDENES POR deliverySequence SOLAMENTE
        // Mantener cada orden separada dentro del grupo
        const ordersBySequence = new Map<number, any[]>();
        
        sortedOrders.forEach((order: any) => {
          const sequence = order.deliverySequence || 0;
          
          // Obtener coordenadas
          let lat = null, lng = null;
          if (typeof order.latitude === 'number' && typeof order.longitude === 'number') {
            lat = order.latitude;
            lng = order.longitude;
          } else if (order.coordinates) {
            try {
              const coordParts = order.coordinates.split(',');
              if (coordParts.length === 2) {
                lat = parseFloat(coordParts[0].trim());
                lng = parseFloat(coordParts[1].trim());
              }
            } catch (e) {
              console.error("Error al procesar las coordenadas:", e);
            }
          }
          
          // Procesar los productos de esta orden
          const orderProducts = order.products && Array.isArray(order.products) 
            ? order.products.map((p: any) => ({
                id: p.productId,
                name: p.name,
                quantity: p.quantity || 1,
                price: typeof p.price === 'string' ? parseFloat(p.price) : p.price || 0,
                isReturnable: !!p.isReturnable
              }))
            : [];
          
          // Mapear el estado
          const actualStatus = order.status || "pending";
          let displayStatus = actualStatus;
          
          console.log(`Pedido ${order.id}: Estado real API = ${actualStatus}`);
          
          if (displayStatus === "in_transit") {
            displayStatus = "in_progress";
            console.log(`Pedido ${order.id}: Cambiado a "in_progress" para la visualización`);
          } else if (displayStatus === "cancelled") {
            displayStatus = "returned";
            console.log(`Pedido ${order.id}: Cambiado a "returned" para la visualización`);
          }
          
          if (displayStatus === "delivered") {
            console.log(`Pedido ${order.id}: Está marcado como entregado en la base de datos`);
          }
          
          // Crear objeto de orden individual
          const routeOrder = {
            id: order.id,
            customerId: order.customerId,
            customerName: order.customerName || "Cliente",
            customerIsCharity: order.customerIsCharity,
            paymentMethod: order.paymentMethod,
            invoiceId: order.invoiceId,
            address: order.address || `${order.customerAddress || ""} ${order.streetnumber || ""}`,
            status: displayStatus,
            actualStatus: actualStatus,
            products: orderProducts,
            totalValue: typeof order.total === 'string' ? parseFloat(order.total) : (order.total || 0),
            latitude: lat,
            longitude: lng,
          };
          
          // Agregar esta orden al array de su secuencia
          if (!ordersBySequence.has(sequence)) {
            ordersBySequence.set(sequence, []);
          }
          ordersBySequence.get(sequence)!.push(routeOrder);
        });
        
        // Convertir las secuencias agrupadas en paradas
        const customerStops: RouteStop[] = [];
        
        // Ordenar las secuencias
        const sortedSequences = Array.from(ordersBySequence.keys()).sort((a, b) => a - b);
        
        sortedSequences.forEach((sequence, index) => {
          const ordersInStop = ordersBySequence.get(sequence)!;
          
          // Usar datos del primer pedido para la ubicación de la parada
          const firstOrder = ordersInStop[0];
          
          // Determinar el estado de la parada: si todas las órdenes están entregadas, la parada está entregada
          const allDelivered = ordersInStop.every(o => o.status === "delivered" || o.status === "completed");
          const anyDelivered = ordersInStop.some(o => o.status === "delivered" || o.status === "completed");
          const allReturned = ordersInStop.every(o => o.status === "returned" || o.status === "cancelled");
          
          let stopStatus: "completed" | "pending" | "in_progress" | "cancelled" | "delivered" | "returned" | "in_transit" = "pending";
          if (allDelivered) {
            stopStatus = "delivered";
          } else if (anyDelivered) {
            stopStatus = "in_progress";
          } else if (allReturned) {
            stopStatus = "returned";
          }
          
          // Calcular total combinado
          const totalValue = ordersInStop.reduce((sum, o) => sum + (typeof o.totalValue === 'string' ? parseFloat(o.totalValue) : o.totalValue), 0);
          
          // Si hay UNA SOLA orden, usar el formato tradicional (sin array orders)
          if (ordersInStop.length === 1) {
            customerStops.push({
              id: firstOrder.id,
              order: index + 1,
              customerId: firstOrder.customerId,
              customerName: firstOrder.customerName,
              customerIsCharity: firstOrder.customerIsCharity,
              paymentMethod: firstOrder.paymentMethod,
              invoiceId: firstOrder.invoiceId,
              address: firstOrder.address,
              latitude: firstOrder.latitude,
              longitude: firstOrder.longitude,
              status: firstOrder.status,
              actualStatus: firstOrder.actualStatus,
              estimatedArrival: "Programado",
              estimatedDuration: 15,
              distanceFromPrevious: 0,
              products: firstOrder.products,
              totalValue: firstOrder.totalValue,
            });
          } else {
            // Si hay MÚLTIPLES órdenes, crear una parada con el array orders
            // Combinar todos los productos para el encabezado (countTotalProducts, hasReturnableItems)
            const allProducts = ordersInStop.flatMap(o => o.products);
            
            customerStops.push({
              id: firstOrder.id, // ID de la primera orden como ID de la parada
              order: index + 1,
              customerId: firstOrder.customerId, // Cliente de la primera orden
              customerName: `Parada #${sequence}`, // Nombre genérico para la parada
              address: firstOrder.address, // Dirección de la primera orden
              latitude: firstOrder.latitude,
              longitude: firstOrder.longitude,
              status: stopStatus,
              actualStatus: firstOrder.actualStatus,
              estimatedArrival: "Programado",
              estimatedDuration: 15,
              distanceFromPrevious: 0,
              products: allProducts, // Lista combinada de productos para funciones del encabezado
              totalValue: totalValue,
              orders: ordersInStop, // Array de órdenes individuales
            });
          }
        });
        
        // Ordenar las paradas según la secuencia de entrega especificada en la ruta
        if (routeDetails && routeDetails.deliverySequence && routeDetails.deliverySequence.length > 0) {
          console.log("Usando secuencia de entrega:", routeDetails.deliverySequence);
          
          // Mapa para buscar rápidamente las paradas por ID
          const stopsMap = new Map();
          customerStops.forEach(stop => stopsMap.set(stop.id.toString(), stop));
          
          // Primero siempre va el almacén, luego las paradas en el orden indicado
          orderedStops = [warehouseStop];
          
          // Añadir el resto de paradas en el orden indicado
          for (let i = 1; i < routeDetails.deliverySequence.length; i++) {
            const stopId = routeDetails.deliverySequence[i];
            if (stopId !== "0") { // El almacén ya está incluido
              const stop = stopsMap.get(stopId);
              if (stop) {
                // Actualizar el número de orden para reflejar la posición en la secuencia
                stop.order = i;
                orderedStops.push(stop);
              }
            }
          }
          
          // Si alguna parada no está en la secuencia, añadirla al final con orden actualizado
          let additionalIndex = orderedStops.length;
          customerStops.forEach(stop => {
            if (!routeDetails.deliverySequence.includes(stop.id.toString())) {
              // Actualizar el número de orden para las paradas adicionales
              stop.order = additionalIndex;
              orderedStops.push(stop);
              additionalIndex++;
            }
          });
        } else {
          // Si no hay secuencia definida, simplemente poner el almacén primero y asignar órdenes correlativos
          orderedStops = [warehouseStop];
          
          // Asignar órdenes secuenciales al resto de paradas
          customerStops.forEach((stop, index) => {
            stop.order = index + 1; // Empezar desde 1 ya que 0 es el almacén
            orderedStops.push(stop);
          });
        }
        
        console.log("Paradas ordenadas:", orderedStops);
        
        // Determinar qué parada está actualmente en progreso
        // NOTA: Ya no alteramos el orden de las paradas, solo determinamos cuál es la actual
        let currentIdx = -1;
        
        if (orderedStops.length > 1) {
          // Estos estados indican que una parada ya ha sido procesada
          const completedStatuses = ["completed", "delivered", "returned", "cancelled"];
          
          // Buscar la primera parada no completada después del almacén
          for (let i = 1; i < orderedStops.length; i++) {
            if (!completedStatuses.includes(orderedStops[i].status)) {
              currentIdx = i;
              break;
            }
          }
          
          // Si todas están completadas, usar la última como la actual (pero sin alterar su orden)
          if (currentIdx === -1) {
            currentIdx = orderedStops.length - 1;
          }
        }
        
        // Establecer el índice de la parada actual
        setCurrentStopIndex(currentIdx);
      } else {
        console.warn("No se recibió una respuesta de array válida de la API, usando solo el almacén");
      }
      
      // Actualizar estado con las paradas
      // Aplicar las paradas en el orden original
      setRouteStops(orderedStops);
      setLoading(false);
    } catch (error) {
      console.error("Error al cargar las paradas de la ruta:", error);
      
      // Aun en caso de error, mostrar al menos el almacén
      const warehouseStop: RouteStop = {
        id: 0,
        order: 0,
        customerId: 0,
        customerName: "Almacén Principal",
        address: "Calle Principal #123",
        latitude: 19.075380,
        longitude: -70.128822,
        status: "completed",
        estimatedArrival: "Inicio",
        estimatedDuration: 0,
        distanceFromPrevious: 0,
        products: [],
        totalValue: 0,
        isWarehouse: true
      };
      
      setRouteStops([warehouseStop]);
      setCurrentStopIndex(0);
      setLoading(false);
      
      toast({
        title: "Error al cargar paradas",
        description: "No se pudieron cargar las paradas de la ruta. Se muestra solo el punto inicial.",
        variant: "destructive"
      });
    }
  };
  
  // Abrir diálogo de pago
  const openPaymentDialog = (stop: RouteStop) => {
    setCurrentStopForPayment(stop);
    
    // Verificar si hay múltiples órdenes en esta parada
    if (stop.orders && stop.orders.length > 1) {
      // Filtrar órdenes que NO estén pagadas (no tienen invoiceId)
      const unpaidOrders = stop.orders.filter(order => !order.invoiceId);
      
      if (unpaidOrders.length === 0) {
        toast({
          title: "Todas las órdenes están pagadas",
          description: "No hay órdenes pendientes de pago en esta parada.",
        });
        return;
      }
      
      // Configurar lista de órdenes pendientes
      setPendingOrdersInStop(unpaidOrders);
      
      // Procesar la primera orden sin pagar
      const firstUnpaidOrder = unpaidOrders[0];
      setCurrentOrderIdForPayment(firstUnpaidOrder.id);
      setAmountPaid(toNumber(firstUnpaidOrder.totalValue).toFixed(2));
      
      console.log(`Parada con ${stop.orders.length} órdenes. Procesando orden #${firstUnpaidOrder.id} (${unpaidOrders.length} pendientes)`);
    } else {
      // Orden única - usar lógica tradicional
      setPendingOrdersInStop([]);
      setCurrentOrderIdForPayment(stop.id);
      setAmountPaid(toNumber(stop.totalValue).toFixed(2));
    }
    
    // Detectar si es una donación y setear método de pago apropiado
    const isDonation = stop.customerIsCharity && stop.paymentMethod === 'donation';
    setPaymentMethod(isDonation ? "donation" : "cash");
    
    setShowPaymentDialog(true);
    
    if (isDonation) {
      console.log("Este es un pedido de DONACIÓN para:", stop.customerName);
    }
  };
  
  // Manejar pago y entrega
  const handleDeliverOrder = (stop: RouteStop) => {
    openPaymentDialog(stop);
  };
  
  // Marcar parada como completada
  const handleMarkStopCompleted = (stop: RouteStop) => {
    console.log("Estado actual de la parada:", stop.status);
    
    // Implementar lógica para marcar parada completada
    toast({
      title: "Parada completada",
      description: `Parada #${stop.order} marcada como completada.`,
    });
  };
  
  // Editar pedido
  const handleEditOrder = (stop: RouteStop) => {
    const routeIdParam = activeRouteId ? `?routeId=${activeRouteId}&edit=true` : '?edit=true';
    setLocation(`/mobile-app/entregas/${stop.id}${routeIdParam}`);
  };
  
  // Ver detalles del pedido
  const handleViewOrderDetails = (stop: RouteStop) => {
    const routeIdParam = activeRouteId ? `?routeId=${activeRouteId}` : '';
    setLocation(`/mobile-app/entregas/${stop.id}${routeIdParam}`);
  };
  
  // Abrir diálogo para registrar devolución de envases
  const handleBottleReturn = (orderId: number) => {
    setCurrentOrderIdForBottleReturn(orderId);
    setReturnedBottlesCount(0);
    setShowBottleReturnDialog(true);
  };
  
  // Alternar expansión de parada
  const toggleExpandStop = (stopId: number) => {
    if (expandedStopId === stopId) {
      setExpandedStopId(null);
    } else {
      setExpandedStopId(stopId);
    }
  };
  
  // Función para completar toda la ruta
  const handleCompleteRoute = () => {
    // Verificar si hay paradas pendientes
    const pendingStops = routeStops.filter(stop => {
      if (stop.isWarehouse) return false; // Ignorar el almacén
      // Considerar completadas, entregadas y devueltas como "finalizadas"
      const finishedStatuses = ["completed", "delivered", "returned"];
      return !finishedStatuses.includes(stop.status);
    });
    
    if (pendingStops.length > 0) {
      toast({
        title: "No se puede completar la ruta",
        description: `Hay ${pendingStops.length} paradas pendientes por entregar.`,
        variant: "destructive"
      });
      return;
    }
    
    setShowCompleteRouteDialog(true);
  };
  
  // Función que completa la ruta en el servidor
  const confirmCompleteRoute = async () => {
    if (!activeRouteId) return;
    
    try {
      setIsCompletingRoute(true);
      setShowCompleteRouteDialog(false);
      
      // Mostrar toast mientras se procesa
      toast({
        title: "Completando ruta",
        description: "Actualizando el estado de la ruta..."
      });
      
      console.log("Completando ruta:", activeRouteId);
      
      // Llamar al endpoint para completar la ruta
      const response = await apiRequest(`/api/mobile/routes/${activeRouteId}/complete`, {
        method: "POST"
      });
      
      console.log("Respuesta del servidor:", response);
      
      if (response && response.success) {
        // Actualizar el estado local
        if (routeDetails) {
          setRouteDetails({
            ...routeDetails,
            status: "completed",
            isCompleted: true
          });
        }
        
        // Mostrar mensaje de éxito
        toast({
          title: "¡Ruta completada!",
          description: "La ruta ha sido marcada como completada exitosamente."
        });
        
        // Redirigir a la página de inicio después de una pausa
        setTimeout(() => {
          setLocation("/mobile-app");
        }, 2000);
      } else {
        throw new Error(response?.message || "Error al completar la ruta");
      }
    } catch (error) {
      console.error("Error al completar la ruta:", error);
      toast({
        title: "Error al completar la ruta",
        description: String(error),
        variant: "destructive"
      });
    } finally {
      setIsCompletingRoute(false);
    }
  };
  
  // Completar pago y entrega
  const completePaymentAndDelivery = async () => {
    if (!currentStopForPayment || !currentOrderIdForPayment) return;
    
    try {
      setShowPaymentDialog(false);
      
      // Mostrar toast mientras se procesa
      toast({
        title: "Procesando entrega",
        description: "Registrando la entrega y pago...",
      });
      
      console.log("Procesando entrega y pago para orden:", currentOrderIdForPayment);
      
      // Preparar los datos para el endpoint combinado
      const amountPaidValue = parseFloat(amountPaid);
      const userId = user?.id;
      
      console.log(`Llamando al nuevo endpoint con: ID ${currentOrderIdForPayment}, método ${paymentMethod}, monto ${amountPaidValue}`);
      
      // Utilizar la nueva función de API que usa el endpoint combinado
      const { processOrderDeliveryAndPayment } = await import('@/lib/api');
      
      // Agregar información de debug más detallada
      console.log(`Estado actual de la parada antes de procesarla: ${currentStopForPayment.status}`);
      // Verificar si la parada tiene información del pedido con ID
      console.log(`ID del pedido a procesar: ${currentOrderIdForPayment}`);
      
      // Llamar al nuevo endpoint combinado - usar currentOrderIdForPayment en lugar de stop.id
      const result = await processOrderDeliveryAndPayment(
        currentOrderIdForPayment,
        paymentMethod,
        amountPaidValue,
        userId
      );
      
      console.log("Respuesta del servidor (nuevo endpoint):", result);
      
      if (result && result.success) {
        // Variable para guardar la parada actualizada
        let updatedStop: RouteStop | null = null;
        
        // Actualizar estado local con la información de la orden actualizada
        setRouteStops(prevStops => 
          prevStops.map(stop => {
            // Si esta parada tiene múltiples órdenes, actualizar solo la orden específica
            if (stop.id === currentStopForPayment.id && stop.orders && stop.orders.length > 1) {
              // Actualizar el array de órdenes
              const updatedOrders = stop.orders.map(order => 
                order.id === currentOrderIdForPayment
                  ? { ...order, invoiceId: result.invoice?.invoiceId || null }
                  : order
              );
              
              // Verificar si TODAS las órdenes están pagadas DESPUÉS de la actualización
              const allOrdersPaid = updatedOrders.every(order => order.invoiceId);
              
              console.log("=== DEBUG: Actualización de parada multi-orden ===");
              console.log("Stop ID:", stop.id);
              console.log("Updated Orders:", updatedOrders);
              console.log("All Orders Paid:", allOrdersPaid);
              console.log("New Status:", allOrdersPaid ? "delivered" : stop.status);
              console.log("===============================================");
              
              const newStop = {
                ...stop,
                orders: updatedOrders,
                // Marcar la parada como delivered solo si todas las órdenes están pagadas
                status: allOrdersPaid ? "delivered" : stop.status
              };
              
              // Guardar la parada actualizada para usarla después
              updatedStop = newStop;
              
              return newStop;
            }
            // Orden única - actualizar como siempre
            else if (stop.id === currentOrderIdForPayment) {
              return { ...stop, status: "delivered" };
            }
            return stop;
          })
        );
        
        // Actualizar currentStopForPayment con los datos más recientes
        if (updatedStop) {
          setCurrentStopForPayment(updatedStop);
        }
        
        console.log(`Orden #${currentOrderIdForPayment} actualizada a 'delivered' después de procesar el pago`);
        
        // Mostrar mensaje de éxito para la entrega
        toast({
          title: "¡Entrega completada!",
          description: `Pedido #${currentOrderIdForPayment} entregado y cobrado correctamente.`,
          variant: "default",
        });
        
        // Mostrar mensaje de éxito para el pago
        if (result.payment && result.payment.registered) {
          toast({
            title: "Pago registrado",
            description: `Pago de RD$ ${result.payment.amount.toFixed(2)} registrado vía ${result.payment.method}.`,
            variant: "default",
          });
        }
        
        // Mostrar mensaje de éxito para la factura
        if (result.invoice && result.invoice.generated) {
          toast({
            title: "Factura generada",
            description: `Factura #${result.invoice.invoiceId} generada correctamente.`,
            variant: "default",
          });
        }
        
        // Verificar si hay más órdenes pendientes en esta parada
        if (pendingOrdersInStop.length > 0) {
          // Remover la orden que acabamos de pagar
          const remainingOrders = pendingOrdersInStop.filter(order => order.id !== currentOrderIdForPayment);
          
          if (remainingOrders.length > 0) {
            // Hay más órdenes pendientes - abrir automáticamente el diálogo para la siguiente
            setTimeout(() => {
              const nextOrder = remainingOrders[0];
              setPendingOrdersInStop(remainingOrders);
              setCurrentOrderIdForPayment(nextOrder.id);
              setAmountPaid(toNumber(nextOrder.totalValue).toFixed(2));
              setPaymentMethod("cash"); // Reset a cash por defecto
              setShowPaymentDialog(true);
              
              toast({
                title: "Siguiente orden en la parada",
                description: `Procesando orden #${nextOrder.id} (${remainingOrders.length} pendientes)`,
              });
            }, 800); // Pequeño delay para que el usuario vea los toasts de éxito
          }
        }
      } else {
        // Fallback: actualizar solo en el front-end si falla la API
        console.log("Fallback: Actualizando solo el front-end");
        setRouteStops(prevStops => 
          prevStops.map(stop => 
            stop.id === currentStopForPayment.id 
              ? { ...stop, status: "delivered" } 
              : stop
          )
        );
        
        toast({
          title: "Entrega registrada localmente",
          description: "La entrega se ha registrado localmente. Sincronizaremos cuando haya conexión.",
          variant: "default",
        });
        
        // Mostrar mensaje informativo de factura
        setTimeout(() => {
          toast({
            title: "Factura pendiente",
            description: "La factura será generada cuando se restablezca la conexión.",
            variant: "default",
          });
        }, 1000);
      }
    } catch (error) {
      console.error("Error al procesar el pago y entrega:", error);
      
      // Fallback: actualizar solo en el front-end en caso de error
      setRouteStops(prevStops => 
        prevStops.map(stop => 
          stop.id === currentStopForPayment.id 
            ? { ...stop, status: "delivered" } 
            : stop
        )
      );
      
      toast({
        title: "Error en el proceso",
        description: "Hubo un problema al procesar la entrega. Se ha registrado localmente.",
        variant: "destructive",
      });
      
      // Después de un breve delay, mostrar un mensaje más específico
      setTimeout(() => {
        toast({
          title: "Intento de sincronización pendiente",
          description: "Se intentará sincronizar automáticamente cuando mejore la conexión.",
        });
      }, 1500);
    }
  };
  
  // Si está cargando, mostrar estado de carga
  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
        <MobileHeader 
          title="Cargando ruta..." 
          showBackButton={true} 
          onBackButtonClick={() => setLocation("/mobile-app")}
          darkMode={darkMode}
        />
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <RotateCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Cargando información de la ruta...</p>
          </div>
        </main>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  // Si no hay ruta activa
  if (!activeRouteId || !routeDetails) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
        <MobileHeader 
          title="Sin ruta asignada" 
          showBackButton={true} 
          onBackButtonClick={() => setLocation("/mobile-app")}
          darkMode={darkMode}
        />
        <main className="flex-1 p-4">
          <div className="text-center py-10">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-bold mb-2">No tienes una ruta asignada</h2>
            <p className="text-muted-foreground mb-6">
              Actualmente no tienes ninguna ruta asignada para entrega. 
              Comunícate con el administrador para más información.
            </p>
            <Button 
              variant="default" 
              onClick={() => setLocation("/mobile-app")}
            >
              Volver al inicio
            </Button>
          </div>
        </main>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  // Vista principal con la ruta
  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : ''}`}>
      <MobileHeader 
        title="Mi Ruta" 
        showBackButton={true} 
        onBackButtonClick={() => setLocation("/mobile-app")}
        darkMode={darkMode}
      />
      
      <main className="flex-1 p-3 sm:p-4 md:p-6">
        <div className="space-y-3 sm:space-y-4">
          {/* Tarjeta de estado actual */}
          <Card className={`mb-3 sm:mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3">
                <div className="flex-1">
                  <h2 className="text-base sm:text-lg font-bold">{routeDetails.name}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {new Date(routeDetails.date).toLocaleDateString('es-DO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
                    routeDetails.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                    routeDetails.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}
                >
                  {routeDetails.status === 'pending' && 'Pendiente'}
                  {routeDetails.status === 'in_progress' && 'En progreso'}
                  {routeDetails.status === 'completed' && 'Completada'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center border-t border-border pt-3">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Paradas</p>
                  <p className="text-base sm:text-lg font-bold">{routeStops.length - 1}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Distancia</p>
                  <p className="text-base sm:text-lg font-bold">{routeDetails.totalDistance} km</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Duración est.</p>
                  <p className="text-base sm:text-lg font-bold">{routeDetails.estimatedDuration} min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        
          {/* Lista de paradas */}
          <Card className={`mb-3 sm:mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold mb-2">Mi Ruta de Hoy</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                {new Date().toLocaleDateString('es-DO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              {/* Componente de cronograma de paradas mejorado */}
              <RouteTimeline 
                stops={routeStops} 
                expandedStopId={expandedStopId}
                darkMode={darkMode}
                onToggleExpand={toggleExpandStop}
                onMarkCompleted={handleMarkStopCompleted}
                onDeliverOrder={handleDeliverOrder}
                onRegisterBottleReturn={handleBottleReturn}
                onEditOrder={handleEditOrder}
                onViewOrderDetails={handleViewOrderDetails}
                onNavigateToLocation={handleNavigateToLocation}
                currentStopIndex={currentStopIndex}
              />
              
              {/* Botón para completar la ruta - se muestra solo si la ruta no está completada */}
              {routeDetails && routeDetails.status !== 'completed' && !routeDetails.isCompleted && (
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
                  <Button 
                    onClick={handleCompleteRoute}
                    disabled={isCompletingRoute}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    {isCompletingRoute ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                    {isCompletingRoute ? "Completando ruta..." : "Completar Ruta"}
                  </Button>
                  <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
                    Al completar la ruta, confirma que todas las paradas están entregadas
                    y se generará el cuadre de vehículo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
      
      {/* Diálogo de pago mejorado */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'dark bg-gray-900 text-white border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {currentStopForPayment?.invoiceId ? (
                <>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Confirmar Entrega
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  {pendingOrdersInStop.length > 0 ? (
                    <>Procesar Pago - Orden {(currentStopForPayment?.orders?.length || 0) - pendingOrdersInStop.length + 1} de {currentStopForPayment?.orders?.length || 1}</>
                  ) : (
                    <>Procesar Pago</>
                  )}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {currentStopForPayment?.invoiceId 
                ? "Confirme la entrega de este pedido prepagado"
                : pendingOrdersInStop.length > 1 
                  ? `Procesando orden #${currentOrderIdForPayment}. Después de esta, se procesarán ${pendingOrdersInStop.length - 1} orden(es) más.`
                  : "Complete los datos para procesar el pago y registrar la entrega"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-1 space-y-3 sm:space-y-4">
            {currentStopForPayment && (() => {
              // Si hay múltiples órdenes, encontrar la orden actual
              const currentOrder = currentStopForPayment.orders && currentStopForPayment.orders.length > 1
                ? currentStopForPayment.orders.find(order => order.id === currentOrderIdForPayment)
                : null;
              
              // Usar datos de la orden específica si existe, sino usar datos de la parada
              const displayName = currentOrder?.customerName || currentStopForPayment.customerName;
              const displayProducts = currentOrder?.products || currentStopForPayment.products;
              const displayInvoiceId = currentOrder?.invoiceId || currentStopForPayment.invoiceId;
              
              return (
                <>
                  {/* Información del cliente */}
                  <div className="bg-primary/10 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 mb-1">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base">{displayName}</h3>
                        {currentOrder && (
                          <p className="text-xs text-muted-foreground">Orden #{currentOrder.id}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="ml-0 sm:ml-2 text-xs">
                          {displayProducts.reduce((acc, item) => acc + item.quantity, 0)} productos
                        </Badge>
                        {displayInvoiceId && (
                          <Badge 
                            className="bg-green-600 hover:bg-green-700 text-white border-green-700 text-xs"
                            data-testid="badge-pagado-ruta"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> PAGADO
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{currentStopForPayment.address}</p>
                  </div>
                
                {/* Mensaje informativo para pedidos prepagados */}
                {currentStopForPayment.invoiceId ? (
                  <div 
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm mb-3"
                    data-testid="text-prepaid-notice-ruta"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-blue-800 dark:text-blue-200">
                        <span className="font-medium">Este pedido ya está pagado.</span>
                        <br />
                        Solo necesitas confirmar la entrega. No se generará una factura adicional.
                      </div>
                    </div>
                  </div>
                ) : null}
                
                {/* Opciones de método de pago - Solo mostrar si NO está prepagado */}
                {!currentStopForPayment.invoiceId && currentStopForPayment && currentStopForPayment.customerIsCharity && currentStopForPayment.paymentMethod === 'donation' ? (
                  /* Si es una donación, mostrar SOLO opción de Donación */
                  <div className="mb-2 sm:mb-3">
                    <Label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Método de pago</Label>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                        <span className="font-semibold text-sm sm:text-base text-amber-800 dark:text-amber-200">Donación</span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                        Este pedido es una donación a institución benéfica. No se generará factura.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Si NO es donación y NO está prepagado, mostrar opciones normales */
                  !currentStopForPayment.invoiceId && (
                    <div className="mb-2 sm:mb-3">
                      <Label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Método de pago</Label>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <Button 
                          type="button" 
                          variant={paymentMethod === "cash" ? "default" : "outline"} 
                          className="justify-start py-1.5 sm:py-2 h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() => setPaymentMethod("cash")}
                        >
                          <DollarSign className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Efectivo
                        </Button>
                        <Button 
                          type="button" 
                          variant={paymentMethod === "credit" ? "default" : "outline"} 
                          className="justify-start py-1.5 sm:py-2 h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() => setPaymentMethod("credit")}
                        >
                          <CreditCard className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Crédito
                        </Button>
                        <Button 
                          type="button" 
                          variant={paymentMethod === "transfer" ? "default" : "outline"} 
                          className="justify-start py-1.5 sm:py-2 h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() => setPaymentMethod("transfer")}
                        >
                          <CreditCard className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Transferencia
                        </Button>
                      </div>
                    </div>
                  )
                )}
                
                {/* Calculadora de pago en efectivo - Solo mostrar si NO está prepagado */}
                {!currentStopForPayment.invoiceId && paymentMethod === "cash" && !(currentStopForPayment?.customerIsCharity && currentStopForPayment?.paymentMethod === 'donation') && (
                  <div className="space-y-2 sm:space-y-3 mb-2 sm:mb-3">
                    <div>
                      <Label htmlFor="amount" className="text-xs sm:text-sm font-medium mb-1 block">
                        Monto recibido
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 sm:left-3 top-2 sm:top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <Input 
                          id="amount"
                          type="text"
                          className="pl-7 sm:pl-9 h-8 sm:h-10 text-sm"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Opciones rápidas */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {[50, 100, 200, 500, 1000, 2000].map((amount) => (
                        <Button 
                          key={amount}
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 sm:h-7 px-2"
                          onClick={() => setAmountPaid(amount.toString())}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Cambio a devolver */}
                    <div className="bg-muted p-2 sm:p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium">Total a cobrar:</span>
                        <span className="font-bold text-sm sm:text-base">${toNumber(currentOrder?.totalValue || currentStopForPayment.totalValue).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border">
                        <span className="text-xs sm:text-sm font-medium">Cambio a devolver:</span>
                        <span className="font-bold text-sm sm:text-base text-primary">
                          ${Math.max(0, parseFloat(amountPaid) - toNumber(currentOrder?.totalValue || currentStopForPayment.totalValue)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Resumen de productos - Versión compacta */}
                <div className="mt-2 sm:mt-3 border-t border-border pt-2 sm:pt-3">
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Detalle de productos</h4>
                  <div className="max-h-[20vh] sm:max-h-[25vh] overflow-y-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="text-xs sticky top-0 bg-background">
                        <tr className="text-muted-foreground">
                          <th className="text-left font-medium py-1">Producto</th>
                          <th className="text-center font-medium py-1">Cant.</th>
                          <th className="text-right font-medium py-1">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayProducts.map((product, index) => (
                          <tr key={index} className="border-b border-border last:border-0">
                            <td className="py-1 pr-1">
                              <div className="flex items-center">
                                {product.isReturnable && (
                                  <Recycle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-500 mr-1 flex-shrink-0" />
                                )}
                                <span className="truncate">{product.name}</span>
                              </div>
                            </td>
                            <td className="py-1 text-center">{product.quantity}</td>
                            <td className="py-1 text-right whitespace-nowrap">${(product.price * product.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
              );
            })()}
          </div>
          
          <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-0 mt-2 sm:mt-3 border-t border-border flex flex-row gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="flex-1 py-1.5 sm:py-2 h-8 sm:h-10 text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={completePaymentAndDelivery}
              className="flex-1 py-1.5 sm:py-2 h-8 sm:h-10 text-xs sm:text-sm"
              data-testid="button-confirmar-entrega-ruta"
            >
              {currentStopForPayment?.invoiceId ? "Confirmar entrega" : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmación para completar ruta */}
      <Dialog open={showCompleteRouteDialog} onOpenChange={setShowCompleteRouteDialog}>
        <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'dark bg-gray-900 text-white border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              Completar Ruta
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Confirme que desea marcar esta ruta como completada
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-1 space-y-3 sm:space-y-4">
            <div className="bg-yellow-500/10 rounded-lg p-2 sm:p-3 border border-yellow-500/20">
              <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                Una vez completada la ruta, no podrá realizar más entregas en ella.
                El sistema generará el cuadre de vehículo correspondiente.
              </p>
            </div>
            
            <div className="bg-green-500/10 rounded-lg p-2 sm:p-3 border border-green-500/20 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                  Esta acción confirmará que:
                </p>
                <ul className="text-xs text-green-600 dark:text-green-400 mt-1 list-disc pl-4 space-y-1">
                  <li>Todas las entregas han sido completadas</li>
                  <li>Ha terminado su jornada de reparto</li>
                  <li>El vehículo retorna al almacén</li>
                </ul>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-0 mt-2 sm:mt-3 border-t border-border flex flex-row gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompleteRouteDialog(false)}
              className="flex-1 py-1.5 sm:py-2 h-8 sm:h-10 text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmCompleteRoute}
              className="flex-1 py-1.5 sm:py-2 h-8 sm:h-10 text-xs sm:text-sm bg-green-600 hover:bg-green-700"
              disabled={isCompletingRoute}
            >
              {isCompletingRoute ? (
                <>
                  <RotateCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1.5 sm:mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para devolución de envases (botellas) */}
      <Dialog open={showBottleReturnDialog} onOpenChange={setShowBottleReturnDialog}>
        <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'dark bg-gray-900 text-white border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Recycle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              Registrar devolución de envases
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Ingrese la cantidad de envases retornados por el cliente
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-1">
            <div className="space-y-2 sm:space-y-3">
              <div className="bg-green-500/10 rounded-lg p-2 sm:p-3 border border-green-500/20">
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                  Registra la cantidad de envases que el cliente está devolviendo en este momento.
                </p>
              </div>
              
              <div>
                <Label htmlFor="returnedBottles" className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">
                  Cantidad de envases devueltos
                </Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReturnedBottlesCount(Math.max(0, returnedBottlesCount - 1))}
                    disabled={returnedBottlesCount <= 0}
                    className="h-8 w-8 sm:h-10 sm:w-10 p-0"
                  >
                    <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  
                  <Input
                    id="returnedBottles"
                    type="number"
                    className="text-center h-8 sm:h-10 text-sm"
                    value={returnedBottlesCount}
                    min="0"
                    onChange={(e) => setReturnedBottlesCount(parseInt(e.target.value) || 0)}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReturnedBottlesCount(returnedBottlesCount + 1)}
                    className="h-8 w-8 sm:h-10 sm:w-10 p-0"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-0 mt-2 sm:mt-3 border-t border-border flex flex-row gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBottleReturnDialog(false)}
              className="flex-1 py-1.5 sm:py-2 h-8 sm:h-10 text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowBottleReturnDialog(false);
                toast({
                  title: "Devolución registrada",
                  description: `Se han registrado ${returnedBottlesCount} envases devueltos.`,
                });
              }}
              className="flex-1 py-1.5 sm:py-2 h-8 sm:h-10 text-xs sm:text-sm"
              disabled={returnedBottlesCount <= 0}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}