import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  DollarSign,
  Recycle,
  Edit,
  Save,
  CreditCard,
  Check,
  X,
  Printer,
  FileDown,
  Trash2
} from "lucide-react";
import { PrinterService } from "@/services/PrinterService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getTimestampRD, formatTimeRD, formatDateRD } from "@/lib/date-utils";
import BottleReturnDialog from "@/components/bottleReturns/BottleReturnDialog";
import { getDB } from "@/lib/offline-db";
import { WhatsAppDialog } from "@/components/WhatsAppDialog";
import { MessageCircle, PenLine } from "lucide-react";
import { useCompanySettings } from "@/hooks/use-company-settings";
import SignaturePad from "@/components/SignaturePad";

// Tipo para un retorno de envase
interface BottleReturn {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  expectedQuantity: number;
  returnedQuantity: number;
  pendingQuantity: number;
  returnDate: string;
  status: "pending" | "complete" | "incomplete";
  amountCharged: string;
  depositAmount: string;
  responsibleType: "customer" | "driver" | "both" | null;
  chargeMethod: "commission" | "cash" | null;
}

// Tipo para una entrega
interface Delivery {
  id: number;
  orderId: number;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerIsCharity?: boolean;
  address: string;
  status: "pending" | "in_progress" | "delivered" | "cancelled";
  scheduledTime: string;
  paymentMethod?: string;
  invoiceId?: number | null; // ID de factura prepagada
  products: { 
    id: number; 
    name: string; 
    quantity: number; 
    price: number;
    isReturnable?: boolean;
    bottleDeposit?: string;
  }[];
  total: number;
  bottleReturns: BottleReturn[];
}

export default function DeliveryDetails() {
  const [, params] = useRoute('/mobile-app/entregas/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { companyName } = useCompanySettings();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [fromDashboard, setFromDashboard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProducts, setEditedProducts] = useState<{id: number; name: string; quantity: number; price: number}[]>([]);
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit" | "donation">("cash");
  const [paymentReceived, setPaymentReceived] = useState(0);
  const [updateCustomerBalance, setUpdateCustomerBalance] = useState(true);
  const [receivedBy, setReceivedBy] = useState("");
  const [receiverSignature, setReceiverSignature] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [autoEnterEditMode, setAutoEnterEditMode] = useState(false);
  const [showBottleReturnDialog, setShowBottleReturnDialog] = useState(false);
  const [showPartialPaymentConfirm, setShowPartialPaymentConfirm] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [customerBalance, setCustomerBalance] = useState<string>("0.00");
  
  const deliveryId = params?.id ? parseInt(params.id) : null;
  
  // Obtener el ID de la ruta desde URL o localStorage
  useEffect(() => {
    // Primero intentamos obtener de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const routeIdFromUrl = urlParams.get('routeId');
    const editMode = urlParams.get('edit');
    const fromParam = urlParams.get('from');
    
    if (fromParam === 'dashboard') {
      setFromDashboard(true);
    }
    
    if (routeIdFromUrl) {
      setRouteId(parseInt(routeIdFromUrl));
    } else {
      // Si no está en la URL, buscamos en localStorage
      const savedRouteId = localStorage.getItem('activeRouteId');
      if (savedRouteId) {
        setRouteId(parseInt(savedRouteId));
      }
    }
    
    // Si el parámetro edit=true está presente, marcar para auto-entrar en modo edición
    if (editMode === 'true') {
      setAutoEnterEditMode(true);
    }
  }, []);
  
  // Auto-activar modo edición cuando el delivery esté cargado
  useEffect(() => {
    if (autoEnterEditMode && delivery && !isLoading) {
      setEditedProducts([...delivery.products]);
      setIsEditing(true);
      setAutoEnterEditMode(false); // Reset flag
    }
  }, [autoEnterEditMode, delivery, isLoading]);
  
  // Cargar datos cuando se monta el componente
  useEffect(() => {
    if (deliveryId) {
      loadDeliveryDetails();
    }
  }, [deliveryId]);
  
  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };
  
  // Cargar datos de la entrega
  const loadDeliveryDetails = async () => {
    if (!deliveryId) {
      toast({
        title: "Error",
        description: "No se encontró un ID de entrega válido",
        variant: "destructive"
      });
      setLocation('/mobile-app/entregas');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let orderData: any = null;
      let bottleReturnsData: BottleReturn[] = [];
      
      // Intentar cargar desde el servidor primero
      try {
        orderData = await apiRequest({
          url: `/api/orders/${deliveryId}`,
          method: 'GET'
        });
        
        // Obtener retornos de botellas para esta orden
        try {
          bottleReturnsData = await apiRequest({
            url: `/api/orders/${deliveryId}/bottle-returns`,
            method: 'GET'
          });
        } catch (error) {
          console.log('[DeliveryDetails] No se pudieron obtener retornos de botellas:', error);
        }
        
        // Obtener configuración de la empresa para la impresión y PDF
        try {
          const settingsData = await apiRequest({
            url: '/api/settings',
            method: 'GET'
          });
          setCompanySettings(settingsData);
        } catch (error) {
          console.error('[DeliveryDetails] No se pudo cargar la configuración de la empresa:', error);
        }
      } catch (error) {
        // Si falla la carga online, intentar desde IndexedDB
        console.log('[DeliveryDetails] Error de red, cargando desde IndexedDB', error);
        
        try {
          const db = await getDB();
          const offlineOrder = await db.get('orders', deliveryId);
          
          if (!offlineOrder) {
            throw new Error('Orden no encontrada en caché offline');
          }
          
          console.log('[DeliveryDetails] Orden cargada desde IndexedDB:', offlineOrder);
          
          // Mapear el formato de IndexedDB al formato esperado
          orderData = {
            id: offlineOrder.id,
            customerId: offlineOrder.customerId,
            customerName: offlineOrder.customerName,
            customerIsCharity: offlineOrder.customerIsCharity,
            customerAddress: offlineOrder.address || offlineOrder.customerAddress,
            customerStreet: offlineOrder.address || offlineOrder.customerAddress,
            paymentMethod: offlineOrder.paymentMethod,
            invoiceId: offlineOrder.invoiceId,
            status: offlineOrder.status,
            date: offlineOrder.date,
            total: offlineOrder.total,
            items: (offlineOrder.products || []).map((p: any) => ({
              productId: p.id ?? p.productId,
              quantity: p.quantity,
              unitPrice: p.price,
              price: p.price,
              product: {
                name: p.name,
                isReturnable: p.isReturnable,
                bottleDeposit: p.bottleDeposit || '0.00'
              }
            }))
          };
          
          // En offline, los bottle returns estarán vacíos
          bottleReturnsData = [];
          
          toast({
            title: "Modo offline",
            description: "Cargando datos desde caché local",
            variant: "default"
          });
        } catch (offlineError) {
          console.error('[DeliveryDetails] Error cargando desde IndexedDB:', offlineError);
          throw offlineError;
        }
      }
      
      // Convertir los datos al formato necesario
      const deliveryData: Delivery = {
        id: orderData.id,
        orderId: orderData.id,
        customerId: orderData.customerId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone || '',
        customerIsCharity: orderData.customerIsCharity,
        paymentMethod: orderData.paymentMethod,
        invoiceId: orderData.invoiceId,
        address: orderData.customerStreet || orderData.customerAddress || 'Dirección no disponible',
        status: orderData.status as "pending" | "in_progress" | "delivered" | "cancelled",
        scheduledTime: formatTimeRD(orderData.date, {
          hour: '2-digit',
          minute: '2-digit'
        }),
        products: (orderData.items || []).map((item: any) => ({
          id: item.productId,
          name: item.product?.name || 'Producto',
          quantity: item.quantity,
          price: parseFloat(item.unitPrice || item.price || '0'),
          isReturnable: item.product?.isReturnable || false,
          bottleDeposit: item.product?.bottleDeposit || '0.00'
        })),
        total: parseFloat(orderData.total),
        bottleReturns: bottleReturnsData
      };
      
      setDelivery(deliveryData);
      
      try {
        const balanceData = await apiRequest({
          url: `/api/mobile/customers/${deliveryData.customerId}/pending-invoices`,
          method: 'GET'
        });
        if (balanceData && balanceData.customerBalance) {
          setCustomerBalance(balanceData.customerBalance);
        }
      } catch (balanceError) {
        console.log('[DeliveryDetails] No se pudo obtener balance CXC:', balanceError);
      }
    } catch (error) {
      console.error('[DeliveryDetails] Error al cargar detalles de la entrega:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[DeliveryDetails] Detalles del error:', errorMessage);
      toast({
        title: "Error",
        description: `No se pudieron cargar los detalles de la entrega: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Registrar retorno de envases
  const registerBottleReturn = async (productId: number, quantity: number) => {
    if (!deliveryId) return;
    
    // Obtener la cantidad esperada del producto
    const expectedQuantity = delivery?.products.find(p => p.id === productId)?.quantity || 0;
    
    // Verificar si ya existe un retorno previo para este producto
    const existingReturn = delivery?.bottleReturns?.find(br => br.productId === productId);
    const alreadyReturned = existingReturn?.returnedQuantity || 0;
    const remainingAllowance = expectedQuantity - alreadyReturned;
    
    // Validación de cantidad
    if (quantity <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }
    
    if (quantity > remainingAllowance) {
      toast({
        title: "Error",
        description: `Solo puedes devolver ${remainingAllowance} envases adicionales. Ya se han devuelto ${alreadyReturned} de ${expectedQuantity}.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Calcular el nuevo total retornado y pendiente
      const newReturnedTotal = alreadyReturned + quantity;
      const newPendingQuantity = expectedQuantity - newReturnedTotal;
      const newStatus = newPendingQuantity === 0 ? "complete" : "incomplete";
      
      const result = await apiRequest({
        url: `/api/orders/${deliveryId}/bottle-returns`,
        method: 'POST',
        data: {
          orderId: deliveryId,
          productId: productId,
          expectedQuantity: expectedQuantity,
          returnedQuantity: quantity,
          pendingQuantity: newPendingQuantity,
          returnDate: getTimestampRD(),
          status: newStatus,
          amountCharged: "0.00",
          depositAmount: "0.00",
          automaticAlert: false,
          manuallyAssigned: false
        }
      });
      
      // Recargar los datos actualizados
      await loadDeliveryDetails();
      
      toast({
        title: "Envases retornados",
        description: `Se registraron ${quantity} envases del producto correctamente`,
      });
    } catch (error) {
      console.error('Error al registrar retorno de envases:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el retorno de envases",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar edición de productos
  const startEditing = () => {
    if (delivery) {
      setEditedProducts([...delivery.products]);
      setIsEditing(true);
    }
  };

  // Actualizar cantidad de un producto
  const updateProductQuantity = (id: number, quantity: number) => {
    setEditedProducts(
      editedProducts.map(product => 
        product.id === id ? { ...product, quantity } : product
      )
    );
  };

  // Eliminar un producto del pedido
  const removeProduct = (id: number) => {
    setEditedProducts(editedProducts.filter(product => product.id !== id));
  };

  // Calcular el nuevo total después de la edición
  const calculateTotal = (products: {id: number; name: string; quantity: number; price: number}[]) => {
    return products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
  };

  // Obtener productos retornables
  const getReturnableProducts = () => {
    if (!delivery) return [];
    return delivery.products.filter(p => p.isReturnable);
  };

  // Obtener retornos existentes en formato simple
  const getExistingReturns = () => {
    if (!delivery) return [];
    return delivery.bottleReturns.map(br => ({
      productId: br.productId,
      returnedQuantity: br.returnedQuantity
    }));
  };

  // Guardar cambios de productos
  const saveProductChanges = async () => {
    if (!delivery) return;

    try {
      setIsLoading(true);
      
      // Filtrar productos con cantidad mayor a 0
      const validProducts = editedProducts.filter(product => product.quantity > 0);
      
      if (validProducts.length === 0) {
        toast({
          title: "Error",
          description: "Debe haber al menos un producto con cantidad mayor a 0",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Preparar datos para enviar al servidor
      const productsData = validProducts.map(product => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        price: product.price.toString()
      }));
      
      // Enviar la actualización al servidor
      await apiRequest({
        url: `/api/orders/${delivery.orderId}/products`,
        method: 'PATCH',
        data: { products: productsData }
      });
      
      // Recargar los datos completos desde el servidor para asegurar consistencia
      await loadDeliveryDetails();
      
      // Invalidar el caché de la lista de entregas para que se actualice cuando el usuario regrese
      await queryClient.invalidateQueries({ queryKey: ["/api/mobile/deliveries"] });
      
      setIsEditing(false);
      
      toast({
        title: "Cambios guardados",
        description: "Los productos fueron actualizados correctamente"
      });
    } catch (error) {
      console.error('Error al guardar cambios de productos:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cancelar edición
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedProducts([]);
  };

  // Abrir diálogo de confirmación de entrega
  const openDeliveryConfirm = () => {
    if (delivery) {
      // Detectar si es una donación y setear método de pago apropiado
      const isDonation = delivery.customerIsCharity && delivery.paymentMethod === 'donation';
      // Pre-seleccionar el método de pago según cómo se creó el pedido
      const initialPaymentMethod = isDonation 
        ? "donation" 
        : (delivery.paymentMethod === "credit" ? "credit" : "cash");
      setPaymentMethod(initialPaymentMethod as "cash" | "credit" | "donation");
      setPaymentReceived(delivery.total);
      setUpdateCustomerBalance(true);
      setReceivedBy("");
      setReceiverSignature(null);
      setShowDeliveryConfirm(true);
      
      // Log para depuración
      console.log("Abriendo diálogo de confirmación, total a cobrar:", delivery.total);
      console.log("Método de pago original del pedido:", delivery.paymentMethod);
      console.log("Método de pago pre-seleccionado:", initialPaymentMethod);
      if (isDonation) {
        console.log("Este es un pedido de DONACIÓN");
      }
    }
  };

  // Procesar entrega y pago
  const processDelivery = async () => {
    if (!delivery) return;
    
    // Si el pedido ya tiene factura prepagada, solo marcar como entregado
    if (delivery.invoiceId) {
      await executeDeliveryProcessPrepaid();
      return;
    }
    
    // Validar que se haya seleccionado un método de pago
    if (!paymentMethod || !["cash", "credit", "donation"].includes(paymentMethod)) {
      toast({
        title: "Error",
        description: "Debes seleccionar un método de pago válido",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === "credit" && !receiverSignature) {
      toast({
        title: "Firma requerida",
        description: "Para entregas a crédito, debe capturar la firma de quien recibe.",
        variant: "destructive"
      });
      return;
    }

    const isPartialPayment = paymentMethod === "cash" && paymentReceived < delivery.total;
    
    if (isPartialPayment) {
      // Mostrar confirmación de pago parcial
      setShowPartialPaymentConfirm(true);
      return;
    }

    // Si no es pago parcial, proceder normalmente
    await executeDeliveryProcess();
  };

  // Función para procesar entrega de pedidos prepagados
  const executeDeliveryProcessPrepaid = async () => {
    if (!delivery) return;

    setIsLoading(true);
    
    try {
      console.log("Procesando entrega de pedido prepagado");
      
      // Actualizar estado del pedido a entregado
      await apiRequest({
        url: `/api/orders/${delivery.orderId}/status`,
        method: 'PATCH',
        data: { status: 'delivered' }
      });
      
      // Actualizar datos locales
      setDelivery({
        ...delivery,
        status: "delivered"
      });
      
      // Invalidar el caché de la lista de entregas para que se actualice el estado
      await queryClient.invalidateQueries({ queryKey: ["/api/mobile/deliveries"] });
      
      // Resetear estado de edición
      setIsEditing(false);
      
      toast({
        title: "Entrega completada",
        description: "El pedido prepagado ha sido entregado exitosamente."
      });
      
      // Cerrar diálogos
      setShowDeliveryConfirm(false);
      
      // Navegar de regreso a la lista de entregas después de un breve delay
      setTimeout(() => {
        setLocation('/mobile-app/entregas');
      }, 1500);
      
    } catch (error) {
      console.error("Error al procesar la entrega prepagada:", error);
      
      // IMPORTANTE: Cerrar los diálogos en caso de error para evitar que la UI quede bloqueada
      setShowDeliveryConfirm(false);
      setShowPartialPaymentConfirm(false);
      
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la entrega",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para ejecutar el proceso de entrega (separada para reutilización)
  const executeDeliveryProcess = async () => {
    if (!delivery) return;

    setIsLoading(true);
    
    try {
      // Detectar pago parcial en efectivo para convertir a crédito (incluye $0)
      const isPartialPayment = paymentMethod === "cash" && paymentReceived < delivery.total;
      
      // Preparar datos para la actualización
      const requestBody: any = {
        paymentMethod: isPartialPayment ? "credit" : paymentMethod,
        amountPaid: paymentReceived,
        userId: user?.id
      };

      if (paymentMethod === "credit" || isPartialPayment) {
        if (receivedBy.trim()) requestBody.receivedBy = receivedBy.trim();
        if (receiverSignature) requestBody.receiverSignature = receiverSignature;
      }

      console.log("Procesando entrega con datos:", JSON.stringify(requestBody));
      console.log("Método de pago seleccionado:", paymentMethod);
      if (isPartialPayment) {
        console.log("PAGO PARCIAL DETECTADO - Creando factura a crédito con pago de:", paymentReceived);
      }
      
      // Enviar datos al servidor usando el endpoint correcto que crea la factura
      const responseData = await apiRequest({
        url: `/api/mobile/orders/${delivery.orderId}/deliver-and-invoice`,
        method: 'POST',
        data: requestBody
      });
      
      // Actualizar datos locales
      setDelivery({
        ...delivery,
        status: "delivered"
      });
      
      // Invalidar el caché de la lista de entregas para que se actualice el estado
      await queryClient.invalidateQueries({ queryKey: ["/api/mobile/deliveries"] });
      
      // Resetear estado de edición
      setIsEditing(false);
      
      // Mostrar mensaje de éxito
      const pendingAmount = delivery.total - paymentReceived;
      const successMessage = isPartialPayment 
        ? `Entrega procesada. Abono de $${paymentReceived.toFixed(2)}. Pendiente: $${pendingAmount.toFixed(2)}`
        : `Entrega marcada como completada. ${responseData.invoiceCreated ? 'Factura #' + responseData.invoiceNumber + ' generada.' : ''}`;
      
      toast({
        title: "Entrega procesada",
        description: successMessage
      });
      
      // Cerrar diálogos
      setShowDeliveryConfirm(false);
      setShowPartialPaymentConfirm(false);
      
      // Navegar de regreso a la lista de entregas después de un breve delay
      setTimeout(() => {
        setLocation('/mobile-app/entregas');
      }, 1500);
      
    } catch (error) {
      console.error("Error al procesar la entrega:", error);
      
      // IMPORTANTE: Cerrar los diálogos en caso de error para evitar que la UI quede bloqueada
      setShowDeliveryConfirm(false);
      setShowPartialPaymentConfirm(false);
      
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la entrega",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePrint = async () => {
    if (!delivery) return;
    
    try {
      if (!companySettings) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información de la empresa",
        });
        return;
      }
      
      const orderData = await apiRequest({
        url: `/api/orders/${delivery.orderId}`,
        method: 'GET'
      });
      
      const orderItems = await apiRequest({
        url: `/api/orders/${delivery.orderId}/items`,
        method: 'GET'
      });
      
      const productsRes = await apiRequest({
        url: '/api/products',
        method: 'GET'
      });
      
      const customer = orderData.customerId ? 
        await apiRequest({ url: `/api/customers/${orderData.customerId}`, method: 'GET' }).catch(() => null) : null;
      
      await PrinterService.printOrder(orderData, orderItems, customer, companySettings, productsRes);
      
      toast({
        title: "Imprimiendo",
        description: "Se está enviando el pedido a la impresora",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el ticket",
      });
    }
  };
  
  const handleDownload = async (): Promise<void> => {
    if (!delivery) {
      throw new Error("No hay entrega disponible");
    }
    
    if (!companySettings) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información de la empresa",
      });
      throw new Error("No se pudo cargar la información de la empresa");
    }
    
    const orderData = await apiRequest({
      url: `/api/orders/${delivery.orderId}`,
      method: 'GET'
    });
    
    const orderItems = await apiRequest({
      url: `/api/orders/${delivery.orderId}/items`,
      method: 'GET'
    });
    
    const productsRes = await apiRequest({
      url: '/api/products',
      method: 'GET'
    });
    
    const customer = orderData.customerId ? 
      await apiRequest({ url: `/api/customers/${orderData.customerId}`, method: 'GET' }).catch(() => null) : null;
    
    await PrinterService.generateOrderPDF(orderData, orderItems, customer, companySettings, productsRes);
    
    toast({
      title: "PDF generado",
      description: "Se ha descargado el PDF del pedido",
    });
  };

  const generateOrderPDFForWhatsApp = async (): Promise<void> => {
    if (!delivery) {
      throw new Error("No hay entrega disponible");
    }
    
    if (!companySettings) {
      throw new Error("No se pudo cargar la información de la empresa");
    }
    
    const orderData = await apiRequest({
      url: `/api/orders/${delivery.orderId}`,
      method: 'GET'
    });
    
    const orderItems = await apiRequest({
      url: `/api/orders/${delivery.orderId}/items`,
      method: 'GET'
    });
    
    const productsRes = await apiRequest({
      url: '/api/products',
      method: 'GET'
    });
    
    const customer = orderData.customerId ? 
      await apiRequest({ url: `/api/customers/${orderData.customerId}`, method: 'GET' }).catch(() => null) : null;
    
    await PrinterService.generateOrderPDF(orderData, orderItems, customer, companySettings, productsRes);
  };
  
  // Cargar datos al montar el componente
  useEffect(() => {
    loadDeliveryDetails();
  }, [deliveryId]);
  
  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode}
        />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="font-medium text-primary">Cargando detalles...</h3>
          </div>
        </div>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  // Si no hay entrega encontrada
  if (!delivery) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode}
        />
        <div className="container max-w-md mx-auto px-4 py-8 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Entrega no encontrada</h2>
          <p className="text-muted-foreground mb-6">No se pudo encontrar la información de esta entrega</p>
          
          <div className="flex space-x-2 justify-center">
            <Button onClick={() => setLocation('/mobile-app/entregas')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a entregas
            </Button>
          </div>
        </div>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
      <MobileHeader 
        user={user} 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode}
      />
      
      <main className="container max-w-md mx-auto px-4 pb-6">
        <div className="py-4">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2 p-1" 
              onClick={() => routeId ? setLocation(`/mobile-app/ruta?routeId=${routeId}`) : fromDashboard ? setLocation('/mobile-app') : setLocation('/mobile-app/entregas')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Detalles de la Entrega</h1>
            {routeId && (
              <Badge variant="outline" className="ml-auto">
                <Truck className="h-3 w-3 mr-1" />
                Ruta activa
              </Badge>
            )}
          </div>
          
          {/* Información de la entrega */}
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-medium text-lg">{delivery.customerName}</h2>
                <div className="flex flex-col gap-2 items-end">
                  <Badge 
                    variant={
                      delivery.status === "delivered" ? "secondary" :
                      delivery.status === "in_progress" ? "outline" :
                      delivery.status === "cancelled" ? "destructive" :
                      "default"
                    }
                  >
                    {delivery.status === "pending" && "Pendiente"}
                    {delivery.status === "in_progress" && "En camino"}
                    {delivery.status === "delivered" && "Entregado"}
                    {delivery.status === "cancelled" && "Cancelado"}
                  </Badge>
                  {delivery.invoiceId && (
                    <Badge className="bg-green-600 hover:bg-green-700">
                      ✓ PAGADO
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{delivery.address}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Programado para: {delivery.scheduledTime}</span>
                </div>
                <div className="flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Orden #: {delivery.orderId}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Total: ${delivery.total.toFixed(2)}</span>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${parseFloat(customerBalance) > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                    <CreditCard className={`h-4 w-4 ${parseFloat(customerBalance) > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CXC del Cliente</p>
                    <p className={`text-sm font-bold ${parseFloat(customerBalance) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      RD$ {parseFloat(customerBalance).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => {
                    const returnUrl = encodeURIComponent(`/mobile-app/entregas/${delivery.id}${routeId ? `?routeId=${routeId}` : ''}`);
                    setLocation(`/mobile-app/payments/abono-cuenta?customerId=${delivery.customerId}&returnUrl=${returnUrl}`);
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Abono a Cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Lista de productos */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg">Productos</h3>
            {!isEditing && delivery.status !== "delivered" && delivery.status !== "cancelled" && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2"
                onClick={startEditing}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {isEditing && (
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={saveProductChanges}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
          
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="space-y-3">
                {isEditing ? (
                  // Modo edición
                  editedProducts.map(product => (
                    <div key={product.id} className="flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Precio unitario: ${product.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateProductQuantity(product.id, Math.max(0, product.quantity - 1))}
                        >
                          -
                        </Button>
                        <div className="w-10 text-center font-medium">
                          {product.quantity}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateProductQuantity(product.id, product.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeProduct(product.id)}
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  // Modo vista normal
                  delivery.products.map(product => (
                    <div key={product.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Precio unitario: ${product.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>{product.quantity} unidades</div>
                        <div className="font-medium">${(product.quantity * product.price).toFixed(2)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {isEditing && (
                <div className="mt-4 pt-3 border-t flex justify-between">
                  <div className="font-medium">Nuevo total:</div>
                  <div className="font-bold text-lg">
                    ${calculateTotal(editedProducts).toFixed(2)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Sección de envases retornables */}
          <h3 className="font-medium text-lg mb-2 flex items-center justify-between">
            <span className="flex items-center">
              <Recycle className="h-5 w-5 mr-2" />
              Envases Retornables
            </span>
            {getReturnableProducts().length > 0 && delivery.status !== "delivered" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBottleReturnDialog(true)}
                disabled={isEditing}
              >
                <Recycle className="h-4 w-4 mr-1" />
                Retornar
              </Button>
            )}
          </h3>
          
          {delivery.bottleReturns && delivery.bottleReturns.length > 0 ? (
            <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {delivery.bottleReturns.map(bottleReturn => (
                    <div key={bottleReturn.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{bottleReturn.productName}</div>
                        <Badge 
                          variant={
                            bottleReturn.status === "complete" ? "secondary" : 
                            bottleReturn.status === "incomplete" ? "outline" : 
                            "default"
                          }
                        >
                          {bottleReturn.status === "pending" && "Pendiente"}
                          {bottleReturn.status === "complete" && "Completo"}
                          {bottleReturn.status === "incomplete" && "Incompleto"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div>
                          <div className="text-muted-foreground">Esperados</div>
                          <div className="font-medium">{bottleReturn.expectedQuantity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Retornados</div>
                          <div className="font-medium">{bottleReturn.returnedQuantity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Pendientes</div>
                          <div className="font-medium">{bottleReturn.pendingQuantity}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : getReturnableProducts().length > 0 ? (
            <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <CardContent className="p-4 text-center">
                <div className="text-muted-foreground mb-3">
                  Esta entrega tiene {getReturnableProducts().length} producto(s) retornable(s)
                </div>
                {delivery.status !== "delivered" && (
                  <Button
                    onClick={() => setShowBottleReturnDialog(true)}
                    disabled={isEditing}
                  >
                    <Recycle className="h-4 w-4 mr-2" />
                    Registrar Retorno
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <CardContent className="p-4 text-center">
                <div className="text-muted-foreground">No hay envases retornables para esta entrega</div>
              </CardContent>
            </Card>
          )}
          
          {/* Botones de impresión, PDF y WhatsApp */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Button 
              className="h-11 px-2 text-xs" 
              variant="outline"
              onClick={handlePrint}
              disabled={isEditing}
            >
              <Printer className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">Imprimir</span>
            </Button>
            
            <Button 
              className="h-11 px-2 text-xs" 
              variant="outline"
              onClick={handleDownload}
              disabled={isEditing}
            >
              <FileDown className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">PDF</span>
            </Button>
            
            <Button 
              className="h-11 px-2 text-xs text-green-600" 
              variant="outline"
              onClick={() => setWhatsappDialogOpen(true)}
              disabled={isEditing}
              data-testid="button-whatsapp-delivery"
            >
              <MessageCircle className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">WhatsApp</span>
            </Button>
          </div>
          
          {/* Botones de acción */}
          <div className="flex space-x-2 mt-4">
            <Button 
              className="flex-1" 
              variant={delivery.status === "delivered" ? "outline" : "default"}
              disabled={delivery.status === "delivered" || delivery.status === "cancelled" || isEditing}
              onClick={openDeliveryConfirm}
            >
              {delivery.status === "delivered" ? "Entregado" : "Marcar como Entregado"}
            </Button>
            
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => setLocation('/mobile-app/entregas')}
              disabled={isEditing}
            >
              Volver a Entregas
            </Button>
          </div>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
      
      {/* Diálogo de confirmación de entrega */}
      <Dialog open={showDeliveryConfirm} onOpenChange={setShowDeliveryConfirm}>
        <DialogContent className={`sm:max-w-md max-h-[90vh] flex flex-col ${darkMode ? 'dark bg-gray-800 text-white border-gray-700' : ''}`}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">Confirmar Entrega</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4 overflow-y-auto flex-1 min-h-0">
            {/* Sección de total */}
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg">{delivery.invoiceId ? "Total del pedido:" : "Total a cobrar:"}</span>
                <span className="text-xl font-bold">${delivery.total.toFixed(2)}</span>
              </div>
              {delivery.invoiceId && (
                <div className="mt-3 flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 p-3 rounded-md">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-600 dark:text-green-400">Este pedido ya está pagado</span>
                </div>
              )}
            </div>

            {/* Opciones de pago con iconos más grandes y mejor visualización */}
            {delivery.invoiceId ? (
              /* Si tiene factura prepagada, solo mostrar mensaje */
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  Este pedido ya fue facturado y pagado anticipadamente. Solo necesitas confirmar la entrega.
                </p>
              </div>
            ) : delivery && delivery.customerIsCharity && delivery.paymentMethod === 'donation' ? (
              /* Si es una donación, mostrar SOLO opción de Donación */
              <div>
                <Label className="text-md font-medium mb-3 block">Método de pago:</Label>
                <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-lg text-amber-800 dark:text-amber-200">Donación</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Este pedido es una donación a institución benéfica. No se generará factura.
                  </p>
                </div>
              </div>
            ) : (
              /* Si NO es donación, mostrar opciones normales */
              <div>
                <Label className="text-md font-medium mb-3 block">Seleccione método de pago:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("cash");
                      // Mantener el monto recibido como el total si es un valor válido
                      if (!paymentReceived || paymentReceived < delivery.total) {
                        setPaymentReceived(delivery.total);
                      }
                    }}
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    className={`p-3 h-auto flex flex-col items-center justify-center gap-2 ${
                      paymentMethod === "cash" ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <DollarSign className="h-8 w-8" />
                    <span className="font-medium">Efectivo</span>
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("credit");
                      setPaymentReceived(delivery.total);
                    }}
                    variant={paymentMethod === "credit" ? "default" : "outline"}
                    className={`p-3 h-auto flex flex-col items-center justify-center gap-2 ${
                      paymentMethod === "credit" ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <CreditCard className="h-8 w-8" />
                    <span className="font-medium">Crédito</span>
                  </Button>
                </div>
              </div>
            )}
            
            {/* Sección de pago en efectivo */}
            {!delivery.invoiceId && paymentMethod === "cash" && !(delivery?.customerIsCharity && delivery?.paymentMethod === 'donation') && (
              <div className="border rounded-lg p-3 space-y-3">
                <Label htmlFor="payment-amount" className="font-medium block">
                  Monto recibido:
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  value={paymentReceived}
                  onChange={(e) => setPaymentReceived(parseFloat(e.target.value) || 0)}
                  className={`text-lg ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                />
                
                {/* Botones de denominaciones de billetes */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Denominaciones de billetes:</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setPaymentReceived(100)}
                      className="h-14 text-base font-bold"
                      data-testid="button-set-100"
                    >
                      $100
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPaymentReceived(200)}
                      className="h-14 text-base font-bold"
                      data-testid="button-set-200"
                    >
                      $200
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPaymentReceived(500)}
                      className="h-14 text-base font-bold"
                      data-testid="button-set-500"
                    >
                      $500
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPaymentReceived(1000)}
                      className="h-14 text-base font-bold"
                      data-testid="button-set-1000"
                    >
                      $1,000
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPaymentReceived(2000)}
                      className="h-14 text-base font-bold"
                      data-testid="button-set-2000"
                    >
                      $2,000
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setPaymentReceived(delivery.total)}
                      className="h-14 text-sm font-semibold"
                      data-testid="button-exact-amount"
                    >
                      Exacto<br/>${delivery.total.toFixed(2)}
                    </Button>
                  </div>
                </div>

                {/* Mostrar cambio si aplica */}
                {paymentReceived > delivery.total && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-900 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Cambio a devolver:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${(paymentReceived - delivery.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección de crédito */}
            {!delivery.invoiceId && paymentMethod === "credit" && !(delivery?.customerIsCharity && delivery?.paymentMethod === 'donation') && (
              <div className="border rounded-lg p-3 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Monto a crédito:</span>
                  <span className="font-bold">${delivery.total.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Este monto será añadido a la cuenta de crédito del cliente.
                </p>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <PenLine className="h-4 w-4" />
                    <span>Confirmación de recepción</span>
                  </div>
                  <div>
                    <Label htmlFor="received-by" className="text-sm font-medium block mb-1">
                      Nombre de quien recibe:
                    </Label>
                    <Input
                      id="received-by"
                      placeholder="Ej: Juan Pérez"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium block mb-1">Firma del receptor:</Label>
                    <SignaturePad
                      onSignatureChange={setReceiverSignature}
                      height={120}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Opción para actualizar balance */}
            <div className="flex items-center space-x-2 border-t pt-3">
              <Checkbox 
                id="update-balance" 
                checked={updateCustomerBalance} 
                onCheckedChange={(checked) => setUpdateCustomerBalance(!!checked)}
                className="h-5 w-5"
              />
              <Label htmlFor="update-balance" className="cursor-pointer text-sm">
                Actualizar balance del cliente
              </Label>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-3 border-t pt-3 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setShowDeliveryConfirm(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={processDelivery}
              disabled={!paymentMethod}
              className="flex-1"
              data-testid="button-complete-delivery"
            >
              <Check className="h-5 w-5 mr-1" />
              Completar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de pago parcial */}
      <AlertDialog open={showPartialPaymentConfirm} onOpenChange={setShowPartialPaymentConfirm}>
        <AlertDialogContent className={darkMode ? 'dark bg-gray-800 text-white border-gray-700' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirmar Pago Parcial</AlertDialogTitle>
            <AlertDialogDescription className={darkMode ? 'text-gray-300' : ''}>
              {delivery && (
                <div className="space-y-3 mt-3">
                  <p className="text-base">
                    El monto recibido es <strong className="text-orange-600 dark:text-orange-400">menor</strong> al total del pedido.
                  </p>
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total del pedido:</span>
                      <span className="text-lg font-bold">${delivery.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Monto a abonar:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">${paymentReceived.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-orange-200 dark:border-orange-700 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Quedará pendiente:</span>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                          ${(delivery.total - paymentReceived).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm">
                    ¿Está seguro que solo quiere abonar <strong>${paymentReceived.toFixed(2)}</strong>?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Se creará una factura a crédito por el total y se registrará este pago parcial.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowPartialPaymentConfirm(false)}
              data-testid="button-cancel-partial-payment"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDeliveryProcess}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-confirm-partial-payment"
            >
              Sí, abonar ${paymentReceived.toFixed(2)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de retorno de envases */}
      <BottleReturnDialog
        open={showBottleReturnDialog}
        orderId={deliveryId}
        returnableProducts={getReturnableProducts().map(p => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          bottleDeposit: p.bottleDeposit || '0.00',
          isReturnable: p.isReturnable || false
        }))}
        existingReturns={getExistingReturns()}
        onOpenChange={setShowBottleReturnDialog}
        darkMode={darkMode}
        onComplete={loadDeliveryDetails}
      />

      {/* Diálogo de WhatsApp */}
      <WhatsAppDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        type="invoice"
        customerName={delivery?.customerName || ""}
        customerPhone={delivery?.customerPhone || ""}
        companyName={companyName}
        amount={delivery?.total || 0}
        onGeneratePDF={generateOrderPDFForWhatsApp}
      />
    </div>
  );
}