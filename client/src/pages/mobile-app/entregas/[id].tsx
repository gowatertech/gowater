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
  FileDown
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  address: string;
  status: "pending" | "in_progress" | "delivered" | "cancelled";
  scheduledTime: string;
  products: { id: number; name: string; quantity: number; price: number }[];
  total: number;
  bottleReturns: BottleReturn[];
}

export default function DeliveryDetails() {
  const [, params] = useRoute('/mobile-app/entregas/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProducts, setEditedProducts] = useState<{id: number; name: string; quantity: number; price: number}[]>([]);
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const [paymentReceived, setPaymentReceived] = useState(0);
  const [updateCustomerBalance, setUpdateCustomerBalance] = useState(true);
  const [companySettings, setCompanySettings] = useState<any>(null);
  
  const deliveryId = params?.id ? parseInt(params.id) : null;
  
  // Obtener el ID de la ruta desde URL o localStorage
  useEffect(() => {
    // Primero intentamos obtener de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const routeIdFromUrl = urlParams.get('routeId');
    
    if (routeIdFromUrl) {
      setRouteId(parseInt(routeIdFromUrl));
    } else {
      // Si no está en la URL, buscamos en localStorage
      const savedRouteId = localStorage.getItem('activeRouteId');
      if (savedRouteId) {
        setRouteId(parseInt(savedRouteId));
      }
    }
  }, []);
  
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
      // Obtener orden específica
      const orderResponse = await fetch(`/api/orders/${deliveryId}`);
      if (!orderResponse.ok) {
        throw new Error('Error al obtener la orden');
      }
      const orderData = await orderResponse.json();
      
      // Obtener retornos de botellas para esta orden
      const bottleReturnsResponse = await fetch(`/api/orders/${deliveryId}/bottle-returns`);
      let bottleReturnsData: BottleReturn[] = [];
      if (bottleReturnsResponse.ok) {
        bottleReturnsData = await bottleReturnsResponse.json();
      }
      
      // Obtener configuración de la empresa para la impresión y PDF
      const settingsResponse = await fetch('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setCompanySettings(settingsData);
      } else {
        console.error('No se pudo cargar la configuración de la empresa');
      }
      
      // Convertir los datos al formato necesario
      const deliveryData: Delivery = {
        id: orderData.id,
        orderId: orderData.id,
        customerId: orderData.customerId,
        customerName: orderData.customerName,
        address: orderData.customerAddress,
        status: orderData.status as "pending" | "in_progress" | "delivered" | "cancelled",
        scheduledTime: new Date(orderData.date).toLocaleTimeString('es-DO', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        products: orderData.products.map((product: any) => ({
          id: product.productId,
          name: product.name,
          quantity: product.quantity,
          price: parseFloat(product.price)
        })),
        total: parseFloat(orderData.total),
        bottleReturns: bottleReturnsData
      };
      
      setDelivery(deliveryData);
    } catch (error) {
      console.error('Error al cargar detalles de la entrega:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la entrega",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Registrar retorno de envases
  const registerBottleReturn = async (productId: number, quantity: number) => {
    if (!deliveryId) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/orders/${deliveryId}/bottle-returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: productId,
          returnedQuantity: quantity,
          expectedQuantity: delivery?.products.find(p => p.id === productId)?.quantity || 0
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al registrar el retorno de envases');
      }
      
      const result = await response.json();
      
      // Recargar los datos actualizados
      loadDeliveryDetails();
      
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

  // Calcular el nuevo total después de la edición
  const calculateTotal = (products: {id: number; name: string; quantity: number; price: number}[]) => {
    return products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
  };

  // Guardar cambios de productos
  const saveProductChanges = async () => {
    if (!delivery) return;

    try {
      setIsLoading(true);
      
      // Calcular el nuevo total
      const newTotal = calculateTotal(editedProducts);
      
      // Preparar datos para enviar al servidor
      const productsData = editedProducts.map(product => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        price: product.price.toString()
      }));
      
      // Enviar la actualización al servidor
      const response = await fetch(`/api/orders/${delivery.orderId}/products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ products: productsData })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar los productos');
      }
      
      const result = await response.json();
      
      // Actualizar el estado local con la respuesta del servidor
      setDelivery({
        ...delivery,
        products: editedProducts,
        total: newTotal
      });
      
      setIsEditing(false);
      
      toast({
        title: "Cambios guardados",
        description: "Los productos fueron actualizados correctamente y se generó una nueva factura"
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
      // Establecer el método de pago en efectivo por defecto
      setPaymentMethod("cash");
      setPaymentReceived(delivery.total);
      setUpdateCustomerBalance(true);
      setShowDeliveryConfirm(true);
      
      // Log para depuración
      console.log("Abriendo diálogo de confirmación, total a cobrar:", delivery.total);
    }
  };

  // Procesar entrega y pago
  const processDelivery = async () => {
    if (!delivery) return;
    
    // Validar que se haya seleccionado un método de pago
    if (!paymentMethod || !["cash", "credit"].includes(paymentMethod)) {
      toast({
        title: "Error",
        description: "Debes seleccionar un método de pago válido (Efectivo o Crédito)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar datos para la actualización
      const updateData = {
        orderId: delivery.orderId,
        status: "delivered",
        paymentMethod: paymentMethod,
        paymentAmount: paymentReceived,
        updateCustomerBalance: updateCustomerBalance
      };

      console.log("Procesando entrega con datos:", JSON.stringify(updateData));
      console.log("Método de pago seleccionado:", paymentMethod);
      
      // Enviar datos al servidor
      const response = await fetch(`/api/orders/${delivery.orderId}/deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error("No se pudo procesar la entrega");
      }

      const responseData = await response.json();
      
      // Actualizar datos locales
      setDelivery({
        ...delivery,
        status: "delivered"
      });
      
      // Mostrar mensaje de éxito
      toast({
        title: "Entrega procesada",
        description: `Entrega marcada como completada. ${responseData.invoiceCreated ? 'Factura generada.' : ''}`
      });
      
      // Cerrar diálogo
      setShowDeliveryConfirm(false);
      
    } catch (error) {
      console.error("Error al procesar la entrega:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la entrega",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para imprimir el pedido
  const handlePrint = async () => {
    if (!delivery) return;
    
    try {
      // Verificar que tenemos la configuración de la empresa
      if (!companySettings) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información de la empresa",
        });
        return;
      }
      
      // Cargar detalles de la orden completa (para obtener información adicional si es necesario)
      const orderResponse = await fetch(`/api/orders/${delivery.orderId}`);
      if (!orderResponse.ok) {
        throw new Error('Error al cargar el pedido');
      }
      const orderData = await orderResponse.json();
      
      // Cargar items del pedido
      const itemsResponse = await fetch(`/api/orders/${delivery.orderId}/items`);
      if (!itemsResponse.ok) {
        throw new Error('Error al cargar los items del pedido');
      }
      const orderItems = await itemsResponse.json();
      
      // Crear el contenido del ticket
      const printContent = document.createElement("div");
      printContent.style.width = "80mm"; // Ancho de 3 pulgadas
      printContent.style.margin = "0 auto";
      printContent.style.fontSize = "10px";
      printContent.style.fontFamily = "Arial, sans-serif";
      
      // Información de la empresa (encabezado)
      const companyMunicipality = companySettings.municipalityName || "Cotuí";
      const companyProvince = companySettings.provinceName || "Sánchez Ramírez";
      
      printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${companySettings.name}</div>
          <div style="margin-bottom: 3px;">RNC: ${companySettings.rnc}</div>
          <div style="margin-bottom: 3px;">${companySettings.street} ${companySettings.streetNumber}</div>
          <div style="margin-bottom: 3px;">${companyMunicipality}, ${companyProvince}</div>
          <div style="margin-bottom: 3px;">Tel: ${companySettings.contactPhone}</div>
          <div style="margin-bottom: 3px;">Email: ${companySettings.email}</div>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 5px 0;"></div>
      `;
      
      // Información del pedido
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; margin: 10px 0; font-size: 14px;">PEDIDO #${delivery.orderId}</div>
        <div style="margin-bottom: 5px;">Fecha: ${new Date(orderData.date).toLocaleDateString()}</div>
        <div style="margin-bottom: 5px;">Cliente: ${orderData.customerName || "Cliente"}</div>
        <div style="margin-bottom: 5px;">Teléfono: ${orderData.customerPhone || ""}</div>
        <div style="margin-bottom: 5px;">Dirección: ${orderData.customerAddress}</div>
        <div style="margin-bottom: 10px;">${orderData.municipalityName || ""}, ${orderData.provinceName || ""}</div>
        <div style="border-top: 1px solid #ddd; margin: 10px 0;"></div>
      `;
      
      // Detalles de productos
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; margin: 10px 0; font-size: 14px;">DETALLE DE PRODUCTOS</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 5px;">
          <tr style="border-bottom: 1px solid #ddd; padding: 5px 0;">
            <th style="text-align: left; padding: 5px 0;">Producto</th>
            <th style="text-align: center; padding: 5px 0;">Cant.</th>
            <th style="text-align: right; padding: 5px 0;">Precio</th>
            <th style="text-align: right; padding: 5px 0;">Total</th>
          </tr>
      `;
      
      // Agregar productos
      delivery.products.forEach(product => {
        const total = product.price * product.quantity;
        
        printContent.innerHTML += `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="text-align: left; padding: 8px 0;">${product.name}</td>
            <td style="text-align: center; padding: 8px 0;">${product.quantity}</td>
            <td style="text-align: right; padding: 8px 0;">RD$${product.price.toFixed(2)}</td>
            <td style="text-align: right; padding: 8px 0;">RD$${total.toFixed(2)}</td>
          </tr>
        `;
      });
      
      // Calcular subtotal e ITBIS
      const subtotal = parseFloat(orderData.subtotal || orderData.total);
      const itbis = parseFloat(orderData.tax || '0');
      const total = parseFloat(orderData.total);
      
      // Totales
      printContent.innerHTML += `
        </table>
        <div style="border-top: 1px solid #ddd; margin: 10px 0;"></div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <div style="flex: 1;"></div>
          <div style="text-align: right; padding-right: 10px;">SUBTOTAL:</div>
          <div style="text-align: right; width: 80px;">RD$${subtotal.toFixed(2)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <div style="flex: 1;"></div>
          <div style="text-align: right; padding-right: 10px;">ITBIS:</div>
          <div style="text-align: right; width: 80px;">RD$${itbis.toFixed(2)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <div style="flex: 1;"></div>
          <div style="text-align: right; padding-right: 10px; font-weight: bold;">TOTAL:</div>
          <div style="text-align: right; width: 80px; font-weight: bold;">RD$${total.toFixed(2)}</div>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 10px 0;"></div>
        <div style="margin: 10px 0 5px 0;"><strong>Nota del Pedido:</strong> ${orderData.notes || ""}</div>
        <div style="margin: 15px 0;"></div>
        <div style="text-align: center; font-size: 10px; margin-top: 15px;">
          <p>¡Gracias por su compra!</p>
        </div>
      `;
      
      // Crear un iframe para la impresión
      const printFrame = document.createElement("iframe");
      printFrame.style.display = "none";
      document.body.appendChild(printFrame);
      
      // Escribir el contenido en el iframe
      if (printFrame.contentWindow) {
        printFrame.contentWindow.document.open();
        printFrame.contentWindow.document.write(`
          <html>
            <head>
              <title>Pedido #${delivery.orderId}</title>
              <style>
                @page {
                  size: 80mm 200mm;
                  margin: 5mm;
                }
                body { 
                  margin: 0;
                  padding: 5mm;
                  width: 80mm;
                  height: auto;
                  font-family: Arial, Helvetica, sans-serif;
                }
                * { box-sizing: border-box; }
                table { width: 100%; }
              </style>
            </head>
            <body>
              ${printContent.outerHTML}
            </body>
          </html>
        `);
        printFrame.contentWindow.document.close();
        
        // Imprimir
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        
        // Remover el iframe después de imprimir
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }
      
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
  
  // Función para descargar el pedido como PDF
  const handleDownload = async () => {
    if (!delivery) return;
    
    try {
      // Verificar que tenemos la configuración de la empresa
      if (!companySettings) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información de la empresa",
        });
        return;
      }
      
      // Cargar detalles de la orden completa
      const orderResponse = await fetch(`/api/orders/${delivery.orderId}`);
      if (!orderResponse.ok) {
        throw new Error('Error al cargar el pedido');
      }
      const orderData = await orderResponse.json();
      
      // Cargar items del pedido
      const itemsResponse = await fetch(`/api/orders/${delivery.orderId}/items`);
      if (!itemsResponse.ok) {
        throw new Error('Error al cargar los items del pedido');
      }
      const orderItems = await itemsResponse.json();
      
      // Crear un documento PDF (tamaño ticket térmico)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200], // 80mm de ancho (3 pulgadas) x 200mm de alto
      });
      
      // Agregar logo o nombre de la empresa
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(companySettings.name, 40, 10, { align: 'center' });
      
      // Información de la empresa
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const companyMunicipality = companySettings.municipalityName || "Cotuí";
      const companyProvince = companySettings.provinceName || "Sánchez Ramírez";
      
      doc.text(`RNC: ${companySettings.rnc}`, 40, 15, { align: 'center' });
      doc.text(`${companySettings.street} ${companySettings.streetNumber}`, 40, 19, { align: 'center' });
      doc.text(`${companyMunicipality}, ${companyProvince}`, 40, 23, { align: 'center' });
      doc.text(`Tel: ${companySettings.contactPhone}`, 40, 27, { align: 'center' });
      doc.text(`Email: ${companySettings.email}`, 40, 31, { align: 'center' });
      
      // Línea separadora
      doc.setDrawColor(200);
      doc.line(5, 34, 75, 34);
      
      // Detalles del pedido
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`PEDIDO #${delivery.orderId}`, 40, 38, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${new Date(orderData.date).toLocaleDateString()}`, 5, 43);
      doc.text(`Cliente: ${orderData.customerName || "Cliente"}`, 5, 47);
      doc.text(`Teléfono: ${orderData.customerPhone || ""}`, 5, 51);
      doc.text(`Dirección: ${orderData.customerAddress}`, 5, 55);
      doc.text(`${orderData.municipalityName || ""}, ${orderData.provinceName || ""}`, 5, 59);
      
      const noteYPosition = 63;
      if (orderData.notes) {
        doc.text(`Notas: ${orderData.notes}`, 5, noteYPosition);
      }
      
      // Línea separadora
      doc.setDrawColor(200);
      const notesOffset = orderData.notes ? 4 : 0;
      doc.line(5, 67, 75, 67);
      
      // Encabezado de productos
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("DETALLE DE PRODUCTOS", 40, 71, { align: 'center' });
      
      doc.setFontSize(7);
      doc.text("Producto", 5, 76);
      doc.text("Cant.", 35, 76, { align: 'center' });
      doc.text("Precio", 55, 76, { align: 'right' });
      doc.text("Total", 75, 76, { align: 'right' });
      
      // Línea separadora
      doc.setDrawColor(200);
      doc.line(5, 78, 75, 78);
      
      // Productos
      let yPos = 85;
      doc.setFont('helvetica', 'normal');
      
      delivery.products.forEach(product => {
        const total = product.price * product.quantity;
        
        doc.text(product.name.length > 18 ? product.name.substring(0, 16) + "..." : product.name, 5, yPos);
        doc.text(`${product.quantity}`, 35, yPos, { align: 'center' });
        doc.text(`RD$${product.price.toFixed(2)}`, 55, yPos, { align: 'right' });
        doc.text(`RD$${total.toFixed(2)}`, 75, yPos, { align: 'right' });
        
        yPos += 8;
      });
      
      // Línea separadora
      doc.setDrawColor(200);
      doc.line(5, yPos, 75, yPos);
      yPos += 5;
      
      // Calcular subtotal e ITBIS
      const subtotal = parseFloat(orderData.subtotal || orderData.total);
      const itbis = parseFloat(orderData.tax || '0');
      const total = parseFloat(orderData.total);
      
      // Subtotal
      doc.setFont('helvetica', 'normal');
      doc.text("SUBTOTAL:", 60, yPos, { align: 'right' });
      doc.text(`RD$${subtotal.toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 5;
      
      // ITBIS
      doc.text("ITBIS:", 60, yPos, { align: 'right' });
      doc.text(`RD$${itbis.toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 5;
      
      // Total
      doc.setFont('helvetica', 'bold');
      doc.text("TOTAL:", 60, yPos, { align: 'right' });
      doc.text(`RD$${total.toFixed(2)}`, 75, yPos, { align: 'right' });
      
      // Nota del Pedido (siempre se muestra el título)
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text("Nota del Pedido:", 5, yPos);
      
      // Si hay notas, mostrarlas
      if (orderData.notes) {
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(orderData.notes, 5, yPos, { 
          maxWidth: 70 
        });
      }
      
      // Siempre agregar un espacio adicional
      yPos += 5;
      
      // Mensaje final
      yPos += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("¡Gracias por su compra!", 40, yPos, { align: 'center' });
      
      // Guardar PDF
      doc.save(`Pedido-${delivery.orderId}.pdf`);
      
      toast({
        title: "PDF generado",
        description: "Se ha descargado el PDF del pedido",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF",
      });
    }
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
            {routeId ? (
              <Button onClick={() => setLocation(`/mobile-app/ruta?routeId=${routeId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a ruta
              </Button>
            ) : (
              <Button onClick={() => setLocation('/mobile-app/entregas')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a entregas
              </Button>
            )}
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
              onClick={() => routeId ? setLocation(`/mobile-app/ruta?routeId=${routeId}`) : setLocation('/mobile-app/entregas')}
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
                    <div key={product.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Precio unitario: ${product.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0 mr-2"
                          onClick={() => updateProductQuantity(product.id, Math.max(0, product.quantity - 1))}
                        >
                          -
                        </Button>
                        <div className="w-12 text-center font-medium">
                          {product.quantity}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0 ml-2"
                          onClick={() => updateProductQuantity(product.id, product.quantity + 1)}
                        >
                          +
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
          <h3 className="font-medium text-lg mb-2 flex items-center">
            <Recycle className="h-5 w-5 mr-2" />
            Envases Retornables
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
                      
                      {bottleReturn.status !== "complete" && (
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => registerBottleReturn(bottleReturn.productId, bottleReturn.pendingQuantity)}
                          >
                            Registrar Retorno
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <CardContent className="p-4 text-center">
                <div className="text-muted-foreground">No hay envases retornables para esta entrega</div>
              </CardContent>
            </Card>
          )}
          
          {/* Botones de impresión y PDF */}
          <div className="flex space-x-2 mt-4">
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={handlePrint}
              disabled={isEditing}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={handleDownload}
              disabled={isEditing}
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF
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
            
            {routeId ? (
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => setLocation(`/mobile-app/ruta?routeId=${routeId}`)}
                disabled={isEditing}
              >
                Volver a Ruta
              </Button>
            ) : (
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => setLocation('/mobile-app/entregas')}
                disabled={isEditing}
              >
                Volver a Entregas
              </Button>
            )}
          </div>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
      
      {/* Diálogo de confirmación de entrega */}
      <Dialog open={showDeliveryConfirm} onOpenChange={setShowDeliveryConfirm}>
        <DialogContent className={`sm:max-w-md ${darkMode ? 'dark bg-gray-800 text-white border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle className="text-xl">Confirmar Entrega</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Sección de total */}
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg">Total a cobrar:</span>
                <span className="text-xl font-bold">${delivery.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Opciones de pago con iconos más grandes y mejor visualización */}
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
            
            {/* Sección de pago en efectivo */}
            {paymentMethod === "cash" && (
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
                
                {/* Botones de acceso rápido para montos comunes */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPaymentReceived(delivery.total)}
                    className="text-xs h-8"
                  >
                    Exacto
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPaymentReceived(Math.ceil(delivery.total / 100) * 100)}
                    className="text-xs h-8"
                  >
                    ${Math.ceil(delivery.total / 100) * 100}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPaymentReceived(Math.ceil(delivery.total / 500) * 500)}
                    className="text-xs h-8"
                  >
                    ${Math.ceil(delivery.total / 500) * 500}
                  </Button>
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
            {paymentMethod === "credit" && (
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Monto a crédito:</span>
                  <span className="font-bold">${delivery.total.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Este monto será añadido a la cuenta de crédito del cliente.
                </p>
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
          
          <DialogFooter className="flex space-x-3 border-t pt-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeliveryConfirm(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={processDelivery}
              disabled={
                !paymentMethod || 
                (paymentMethod === "cash" && paymentReceived < delivery.total)
              }
              className="flex-1"
            >
              <Check className="h-5 w-5 mr-1" />
              Completar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}