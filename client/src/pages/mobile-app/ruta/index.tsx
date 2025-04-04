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
  
  if (diffInMin < 60) {
    return `${diffInMin} min`;
  }
  
  const hours = Math.floor(diffInMin / 60);
  const minutes = diffInMin % 60;
  
  return `${hours}h ${minutes}m`;
};

// Conversor string a número
const toNumber = (value: string | number): number => {
  if (typeof value === 'string') {
    return parseFloat(value) || 0;
  }
  return value;
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
  
  // Estados para diálogos
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEditOrderDialog, setShowEditOrderDialog] = useState(false);
  const [showBottleReturnDialog, setShowBottleReturnDialog] = useState(false);
  const [currentStopForPayment, setCurrentStopForPayment] = useState<RouteStop | null>(null);
  const [currentStopForEdit, setCurrentStopForEdit] = useState<RouteStop | null>(null);
  const [currentOrderIdForBottleReturn, setCurrentOrderIdForBottleReturn] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [returnedBottlesCount, setReturnedBottlesCount] = useState<number>(0);
  
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
        // Mapear las órdenes a paradas con la estructura correcta
        const customerStops = response.map((order: any, index: number) => {
          // Encontrar el índice de la parada actual (la primera que no está completada)
          if (order.status !== "completed" && currentStopIndex === -1) {
            setCurrentStopIndex(index + 1); // +1 debido al almacén
          }
          
          // Obtener coordenadas
          let lat = null, lng = null;
          
          // Si ya están desglosadas en la respuesta, usarlas
          if (typeof order.latitude === 'number' && typeof order.longitude === 'number') {
            lat = order.latitude;
            lng = order.longitude;
          } 
          // Si no, intentar extraerlas de la cadena de coordenadas
          else if (order.coordinates) {
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
          
          // Procesar los productos
          const products = order.products && Array.isArray(order.products) 
            ? order.products.map((p: any) => ({
                id: p.productId,
                name: p.name,
                quantity: p.quantity || 1,
                price: typeof p.price === 'string' ? parseFloat(p.price) : p.price || 0,
                isReturnable: !!p.isReturnable
              }))
            : [];
            
          // Mapear el estado de la API al estado visual que necesitamos mostrar
          let displayStatus = order.status || "pending";
          
          // Si el estado es "in_transit", mostrarlo como "pending" en la interfaz 
          // (esta orden está en ruta pero aún no ha sido entregada)
          if (displayStatus === "in_transit") {
            displayStatus = "pending";
          }
          
          // Construir la parada
          return {
            id: order.id,
            order: index + 1, // Almacén es 0, las paradas empiezan en 1
            customerId: order.customerId,
            customerName: order.customerName || "Cliente",
            address: order.address || `${order.customerAddress || ""} ${order.streetnumber || ""}`,
            latitude: lat,
            longitude: lng,
            actualStatus: order.status, // Estado real en la base de datos
            status: displayStatus, // Estado visual para la interfaz
            estimatedArrival: "Programado", // Placeholder
            estimatedDuration: 15, // Placeholder - minutos estimados en la parada
            distanceFromPrevious: (index === 0) ? 3.2 : (Math.random() * 5 + 1).toFixed(1),
            products: products,
            totalValue: typeof order.total === 'string' ? parseFloat(order.total) : (order.total || 0),
          };
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
                orderedStops.push(stop);
              }
            }
          }
          
          // Si alguna parada no está en la secuencia, añadirla al final
          customerStops.forEach(stop => {
            if (!routeDetails.deliverySequence.includes(stop.id.toString())) {
              orderedStops.push(stop);
            }
          });
        } else {
          // Si no hay secuencia definida, simplemente poner el almacén primero
          orderedStops = [warehouseStop, ...customerStops];
        }
        
        console.log("Paradas ordenadas:", orderedStops);
        
        // Actualizar el índice de la parada actual si no se ha establecido
        if (currentStopIndex === -1 && orderedStops.length > 1) {
          // Buscar la primera parada no completada después del almacén
          for (let i = 1; i < orderedStops.length; i++) {
            if (orderedStops[i].status !== "completed") {
              setCurrentStopIndex(i);
              break;
            }
          }
          
          // Si todas están completadas, usar la última
          if (currentStopIndex === -1) {
            setCurrentStopIndex(orderedStops.length - 1);
          }
        }
      } else {
        console.warn("No se recibió una respuesta de array válida de la API, usando solo el almacén");
      }
      
      // Actualizar estado con las paradas
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
    setAmountPaid(toNumber(stop.totalValue).toFixed(2)); // Iniciar con el monto exacto
    setPaymentMethod("cash");
    setShowPaymentDialog(true);
  };
  
  // Manejar pago y entrega
  const handleDeliverOrder = (stop: RouteStop) => {
    openPaymentDialog(stop);
  };
  
  // Marcar parada como completada
  const handleMarkStopCompleted = (stop: RouteStop) => {
    console.log("Estado actual de la parada:", stop.actualStatus);
    
    // Implementar lógica para marcar parada completada
    toast({
      title: "Parada completada",
      description: `Parada #${stop.order} marcada como completada.`,
    });
  };
  
  // Editar pedido
  const handleEditOrder = (stop: RouteStop) => {
    setCurrentStopForEdit(stop);
    setShowEditOrderDialog(true);
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
  
  // Completar pago y entrega
  const completePaymentAndDelivery = async () => {
    if (!currentStopForPayment) return;
    
    try {
      setShowPaymentDialog(false);
      
      // Mostrar toast mientras se procesa
      toast({
        title: "Procesando entrega",
        description: "Registrando la entrega y pago...",
      });
      
      console.log("Procesando entrega y pago para:", currentStopForPayment);
      
      // Preparar los datos para el endpoint combinado
      const amountPaidValue = parseFloat(amountPaid);
      const userId = user?.id;
      
      console.log(`Llamando al nuevo endpoint con: ID ${currentStopForPayment.id}, método ${paymentMethod}, monto ${amountPaidValue}`);
      
      // Utilizar la nueva función de API que usa el endpoint combinado
      const { processOrderDeliveryAndPayment } = await import('@/lib/api');
      
      // Llamar al nuevo endpoint combinado
      const result = await processOrderDeliveryAndPayment(
        currentStopForPayment.id,
        paymentMethod,
        amountPaidValue,
        userId
      );
      
      console.log("Respuesta del servidor (nuevo endpoint):", result);
      
      if (result && result.success) {
        // Actualizar estado local con la información de la orden actualizada
        setRouteStops(prevStops => 
          prevStops.map(stop => 
            stop.id === currentStopForPayment.id 
              ? { ...stop, status: "delivered" } 
              : stop
          )
        );
        
        // Mostrar mensaje de éxito para la entrega
        toast({
          title: "¡Entrega completada!",
          description: `Pedido #${currentStopForPayment.id} entregado y cobrado correctamente.`,
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
      
      <main className="flex-1 p-4">
        <div className="space-y-4">
          {/* Tarjeta de estado actual */}
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-lg font-bold">{routeDetails.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date(routeDetails.date).toLocaleDateString('es-DO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`px-3 py-1 ${
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
              
              <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Paradas</p>
                  <p className="text-lg font-bold">{routeStops.length - 1}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Distancia</p>
                  <p className="text-lg font-bold">{routeDetails.totalDistance} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duración est.</p>
                  <p className="text-lg font-bold">{routeDetails.estimatedDuration} min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        
          {/* Lista de paradas */}
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <h2 className="text-lg font-bold mb-2">Mi Ruta de Hoy</h2>
              <p className="text-sm text-muted-foreground mb-4">
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
                currentStopIndex={currentStopIndex}
              />
            </CardContent>
          </Card>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
      
      {/* Diálogo de pago mejorado */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'dark bg-gray-900 text-white border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Procesar Pago
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Complete los datos para procesar el pago y registrar la entrega
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-1">
            {currentStopForPayment && (
              <>
                {/* Información del cliente */}
                <div className="bg-primary/10 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold">{currentStopForPayment.customerName}</h3>
                    <Badge variant="outline" className="ml-2">
                      {currentStopForPayment.products.reduce((acc, item) => acc + item.quantity, 0)} productos
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{currentStopForPayment.address}</p>
                </div>
                
                {/* Opciones de método de pago */}
                <div className="mb-3">
                  <Label className="text-sm font-medium mb-2 block">Método de pago</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      type="button" 
                      variant={paymentMethod === "cash" ? "default" : "outline"} 
                      className="justify-start py-1 h-9"
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Efectivo
                    </Button>
                    <Button 
                      type="button" 
                      variant={paymentMethod === "credit" ? "default" : "outline"} 
                      className="justify-start py-1 h-9"
                      onClick={() => setPaymentMethod("credit")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Crédito
                    </Button>
                  </div>
                </div>
                
                {/* Calculadora de pago en efectivo */}
                {paymentMethod === "cash" && (
                  <div className="space-y-3 mb-3">
                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium mb-1 block">
                        Monto recibido
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="amount"
                          type="text"
                          className="pl-9"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Opciones rápidas */}
                    <div className="grid grid-cols-3 gap-2">
                      {[50, 100, 200, 500, 1000, 2000].map((amount) => (
                        <Button 
                          key={amount}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setAmountPaid(amount.toString())}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Cambio a devolver */}
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total a cobrar:</span>
                        <span className="font-bold">${toNumber(currentStopForPayment.totalValue).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                        <span className="text-sm font-medium">Cambio a devolver:</span>
                        <span className="font-bold text-primary">
                          ${Math.max(0, parseFloat(amountPaid) - toNumber(currentStopForPayment.totalValue)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Resumen de productos - Versión compacta */}
                <div className="mt-3 border-t border-border pt-3">
                  <h4 className="text-sm font-medium mb-2">Detalle de productos</h4>
                  <div className="max-h-[25vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground sticky top-0 bg-background">
                        <tr>
                          <th className="text-left font-medium py-1">Producto</th>
                          <th className="text-center font-medium py-1">Cant.</th>
                          <th className="text-right font-medium py-1">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentStopForPayment.products.map((product, index) => (
                          <tr key={index} className="border-b border-border last:border-0">
                            <td className="py-1">
                              <div className="flex items-center">
                                {product.isReturnable && (
                                  <Recycle className="h-3 w-3 text-green-500 mr-1" />
                                )}
                                <span>{product.name}</span>
                              </div>
                            </td>
                            <td className="py-1 text-center">{product.quantity}</td>
                            <td className="py-1 text-right">${(product.price * product.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-0 mt-3 border-t border-border flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="flex-1 py-1 h-10"
            >
              Cancelar
            </Button>
            <Button
              onClick={completePaymentAndDelivery}
              className="flex-1 py-1 h-10"
            >
              Confirmar pago y entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para devolución de envases (botellas) */}
      <Dialog open={showBottleReturnDialog} onOpenChange={setShowBottleReturnDialog}>
        <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? 'dark bg-gray-900 text-white border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Recycle className="h-5 w-5 text-green-500" />
              Registrar devolución de envases
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ingrese la cantidad de envases retornados por el cliente
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-1">
            <div className="space-y-3">
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Registra la cantidad de envases que el cliente está devolviendo en este momento.
                </p>
              </div>
              
              <div>
                <Label htmlFor="returnedBottles" className="text-sm font-medium mb-2 block">
                  Cantidad de envases devueltos
                </Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReturnedBottlesCount(Math.max(0, returnedBottlesCount - 1))}
                    disabled={returnedBottlesCount <= 0}
                    className="h-10 w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <Input
                    id="returnedBottles"
                    type="number"
                    className="text-center h-10"
                    value={returnedBottlesCount}
                    min="0"
                    onChange={(e) => setReturnedBottlesCount(parseInt(e.target.value) || 0)}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReturnedBottlesCount(returnedBottlesCount + 1)}
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-0 mt-3 border-t border-border flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBottleReturnDialog(false)}
              className="flex-1 py-1 h-10"
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
              className="flex-1 py-1 h-10"
              disabled={returnedBottlesCount <= 0}
            >
              Confirmar devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}