import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// @ts-ignore
import { jsPDF } from "jspdf";
// @ts-ignore
import 'jspdf-autotable';
// @ts-ignore
import html2canvas from "html2canvas";

// Iconos
import { 
  Search, 
  X, 
  ShoppingCart, 
  Plus, 
  ListFilter, 
  Eye, 
  Tag, 
  Clock, 
  CheckCircle, 
  CircleX, 
  AlertTriangle,
  Calendar,
  SearchX,
  Printer,
  Download
} from "lucide-react";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrdersList() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Obtener los pedidos
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  // Obtener clientes para mostrar sus nombres
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });
  
  // Obtener productos para mostrar nombres
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });
  
  // Obtener información de la empresa para los tickets
  const { data: companySettings } = useQuery<any>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/settings`);
      if (!response.ok) {
        throw new Error('Error al cargar la configuración de la empresa');
      }
      return response.json();
    },
  });

  // Filtrar pedidos según criterios de búsqueda
  const filteredOrders = orders
    .filter((order: any) => {
      // Filtrar por término de búsqueda
      const customer = customers?.find((c: any) => c.id === order.customerId);
      const searchMatch = 
        customer?.businessname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm) ||
        order.total.toString().includes(searchTerm);
      
      // Filtrar por estado
      const statusMatch = statusFilter === "all" || order.status === statusFilter;
      
      return searchMatch && statusMatch;
    })
    // Ordenar por ID de mayor a menor (más recientes primero)
    .sort((a: any, b: any) => b.id - a.id);

  // Obtener estadísticas de pedidos
  const getOrderStats = () => {
    const pending = orders.filter((o: any) => o.status === "pending").length;
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const total = orders.length;

    const totalAmount = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total.toString()), 0);

    return {
      pending,
      delivered,
      cancelled,
      total,
      totalAmount
    };
  };

  const stats = getOrderStats();

  // Función para renderizar el estado con color apropiado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Entregado
        </Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pendiente
        </Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 flex items-center gap-1">
          <CircleX className="h-3 w-3" /> Cancelado
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Desconocido
        </Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "border-l-green-500";
      case "pending":
        return "border-l-yellow-500";
      case "cancelled":
        return "border-l-red-500";
      default:
        return "border-l-gray-500";
    }
  };
  
  // Función para generar e imprimir el ticket
  const handlePrint = async (orderId: number) => {
    // Primero obtener los detalles del pedido
    try {
      const response = await apiRequest("GET", `/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Error al cargar el pedido');
      }
      const order = await response.json();
      
      // Obtener los items del pedido
      const itemsResponse = await apiRequest("GET", `/api/orders/${orderId}/items`);
      if (!itemsResponse.ok) {
        throw new Error('Error al cargar los items del pedido');
      }
      const orderItems = await itemsResponse.json();
      
      // Verificar que tengamos la configuración de la empresa
      if (!companySettings) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información de la empresa",
        });
        return;
      }
      
      const customer = customers?.find((c: any) => c.id === order.customerId);
      
      // Mostramos un toast de carga
      toast({
        title: "Preparando impresión",
        description: "Por favor espere...",
      });
      
      // Crear el contenido del ticket
      const printContent = document.createElement('div');
      printContent.className = 'print-content';
      printContent.style.width = '74mm'; // Ancho interno para impresora térmica (80mm - márgenes)
      printContent.style.boxSizing = 'border-box';
      printContent.style.padding = '0';
      printContent.style.margin = '0';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '10px';
      
      // Información de la empresa (encabezado)
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '10px';
      
      // Utilizar directamente los datos disponibles
      const companyMunicipality = companySettings.municipalityName || "Cotuí";
      const companyProvince = companySettings.provinceName || "Sánchez Ramírez";
      
      header.innerHTML = `
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${companySettings.name}</div>
        <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${companySettings.rnc}</div>
        <div style="font-size: 11px; margin-bottom: 2px;">${companySettings.street} ${companySettings.streetNumber}</div>
        <div style="font-size: 11px; margin-bottom: 2px;">${companyMunicipality}, ${companyProvince}</div>
        <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${companySettings.contactPhone}</div>
        <div style="font-size: 11px; margin-bottom: 2px;">Email: ${companySettings.email}</div>
      `;
      printContent.appendChild(header);
      
      // Separador
      const separator = document.createElement('div');
      separator.style.borderBottom = '1px solid #000';
      separator.style.margin = '10px 0';
      printContent.appendChild(separator);
      
      // Título del pedido
      const title = document.createElement('div');
      title.style.textAlign = 'center';
      title.style.fontSize = '14px';
      title.style.fontWeight = 'bold';
      title.style.margin = '10px 0';
      title.textContent = `PEDIDO #${order.id}`;
      printContent.appendChild(title);
      
      // Información del pedido
      const orderInfo = document.createElement('div');
      orderInfo.style.marginBottom = '10px';
      orderInfo.style.fontSize = '11px';
      orderInfo.innerHTML = `
        <div style="margin-bottom: 5px;"><strong>Fecha:</strong> ${new Date(order.date).toLocaleDateString()}</div>
        <div style="margin-bottom: 5px;"><strong>Cliente:</strong> ${customer?.businessname || "Cliente"}</div>
        <div style="margin-bottom: 5px;"><strong>Teléfono:</strong> ${order.customerPhone || ""}</div>
        <div style="margin-bottom: 5px;"><strong>Dirección:</strong> ${order.customerAddress}</div>
        <div style="margin-bottom: 5px;"><strong>Ubicación:</strong> ${order.municipalityName || ""}, ${order.provinceName || ""}</div>
      `;
      printContent.appendChild(orderInfo);
      
      // Otro separador
      const separator2 = document.createElement('div');
      separator2.style.borderBottom = '1px solid #000';
      separator2.style.margin = '10px 0';
      printContent.appendChild(separator2);
      
      // Tabla de productos
      const productTable = document.createElement('table');
      productTable.style.width = '100%';
      productTable.style.borderCollapse = 'collapse';
      productTable.style.marginBottom = '10px';
      productTable.style.fontSize = '11px';
      
      // Cabecera de la tabla
      productTable.innerHTML = `
        <thead>
          <tr style="border-bottom: 1px solid #000; text-align: left;">
            <th style="padding: 5px; text-align: left;">Producto</th>
            <th style="padding: 5px; text-align: right;">Cant.</th>
            <th style="padding: 5px; text-align: right;">Precio</th>
            <th style="padding: 5px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${orderItems.map((item: any) => {
            const productName = products.find((p: any) => p.id === item.productId)?.name || "Producto";
            const total = parseFloat(item.price) * item.quantity;
            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 5px; text-align: left;">${productName}</td>
                <td style="padding: 5px; text-align: right;">${item.quantity}</td>
                <td style="padding: 5px; text-align: right;">${parseFloat(item.price).toFixed(2)}</td>
                <td style="padding: 5px; text-align: right;">${total.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      `;
      printContent.appendChild(productTable);
      
      // Calcular subtotal e ITBIS
      const subtotal = parseFloat(order.subtotal || order.total);
      const itbis = parseFloat(order.tax || '0');
      const total = parseFloat(order.total);
      
      // Resumen de totales
      const totalsSection = document.createElement('div');
      totalsSection.style.marginTop = '10px';
      totalsSection.style.fontSize = '11px';
      totalsSection.style.textAlign = 'right';
      totalsSection.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Subtotal:</span>
          <span>RD$ ${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>ITBIS:</span>
          <span>RD$ ${itbis.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
          <span>Total:</span>
          <span>RD$ ${total.toFixed(2)}</span>
        </div>
      `;
      printContent.appendChild(totalsSection);
      
      // Notas del pedido
      const notesSection = document.createElement('div');
      notesSection.style.marginTop = '15px';
      notesSection.style.fontSize = '11px';
      notesSection.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Nota del Pedido:</div>
        <div style="font-style: italic;">${order.notes || ""}</div>
      `;
      printContent.appendChild(notesSection);
      
      // Mensaje de agradecimiento
      const thankYouMsg = document.createElement('div');
      thankYouMsg.style.textAlign = 'center';
      thankYouMsg.style.marginTop = '20px';
      thankYouMsg.style.fontSize = '11px';
      thankYouMsg.textContent = '¡Gracias por su compra!';
      printContent.appendChild(thankYouMsg);
      
      // Método con CSS específico para impresoras térmicas de 80mm
      // Crear un elemento de estilo para controlar la impresión
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          /* Resetear todos los elementos */
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          
          /* Ocultar todo el contenido de la página */
          html, body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            max-height: fit-content !important;
          }
          
          /* Esto es importante para evitar páginas en blanco */
          body:after {
            content: "" !important;
            display: block !important;
            height: 0 !important;
            clear: both !important;
            visibility: hidden !important;
          }
          
          body * {
            visibility: hidden !important;
            display: none !important; /* Ocultar completamente para evitar espacio reservado */
          }
          
          /* Mostrar solo el contenedor de impresión */
          #print-container, #print-container * {
            visibility: visible !important;
            display: block !important; /* Asegurar que los elementos son visibles */
          }
          
          /* Posicionar y dimensionar el contenedor */
          #print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 72mm !important; /* 80mm menos los márgenes */
            max-width: 72mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            font-size: 10px !important;
            line-height: 1.1 !important;
          }
          
          /* Configuración específica de @page para impresoras térmicas */
          @page {
            size: 80mm !important; /* Ancho exacto 80mm, sin especificar auto para evitar páginas adicionales */
            margin: 0mm !important;
            padding: 0mm !important;
          }
          
          /* Eliminar páginas extra */
          @page :left {
            margin: 0mm !important;
          }
          
          @page :right {
            margin: 0mm !important;
          }
          
          /* Soporte específico para Chrome/Safari */
          @supports (-webkit-appearance:none) {
            @page {
              size: 80mm !important; /* Sin auto para evitar páginas adicionales */
              margin: 0mm !important;
            }
            #print-container {
              width: 72mm !important;
              height: auto !important;
              overflow: visible !important;
            }
          }
          
          /* Soporte específico para Firefox */
          @-moz-document url-prefix() {
            @page {
              size: 80mm !important; /* Sin auto para evitar páginas adicionales */
              margin: 0mm !important;
            }
            #print-container {
              width: 72mm !important;
              height: auto !important;
              overflow: visible !important;
            }
          }
          
          /* Asegurar que no hay saltos de página dentro de elementos importantes */
          table, tr, td, th {
            page-break-inside: avoid !important;
            font-size: 9px !important;
          }
          
          /* Ajustar otros elementos en el ticket */
          #print-container h1, #print-container h2, #print-container h3 {
            font-size: 12px !important;
            margin-bottom: 2mm !important;
          }
          
          #print-container p, #print-container div {
            font-size: 9px !important;
            line-height: 1.2 !important;
            margin-bottom: 1mm !important;
          }
        }
      `;
      
      // Crear un contenedor para el contenido a imprimir
      const printContainer = document.createElement('div');
      printContainer.id = 'print-container';
      printContainer.style.width = '72mm';
      printContainer.style.maxWidth = '72mm';
      printContainer.style.boxSizing = 'border-box';
      printContainer.style.padding = '2mm';
      printContainer.style.fontFamily = 'Arial, sans-serif';
      printContainer.style.overflow = 'hidden'; // Evita scroll
      printContainer.style.height = 'auto'; // Solo el alto necesario
      printContainer.appendChild(printContent);
      
      // Añadir elementos al DOM
      document.head.appendChild(style);
      document.body.appendChild(printContainer);
      
      // Notificar al usuario
      toast({
        title: "Abriendo diálogo de impresión",
        description: "Se abrirá el diálogo de impresión en unos segundos",
      });
      
      // Esperar un poco para asegurar que el contenido se ha renderizado
      setTimeout(() => {
        try {
          // Imprimir
          window.print();
          
          // Notificar al usuario
          toast({
            title: "Enviando a impresora",
            description: "El documento se está enviando a la impresora",
          });
          
          // Limpiar después de imprimir
          setTimeout(() => {
            document.body.removeChild(printContainer);
            document.head.removeChild(style);
          }, 2000);
        } catch (printError) {
          console.error('Error al imprimir:', printError);
          toast({
            variant: "destructive",
            title: "Error de impresión",
            description: "No se pudo enviar a la impresora. " + (printError instanceof Error ? printError.message : ''),
          });
          // Limpiar en caso de error
          document.body.removeChild(printContainer);
          document.head.removeChild(style);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error en handlePrint:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el ticket",
      });
    }
  };

  // Función para descargar el pedido como PDF
  const handleDownload = async (orderId: number) => {
    // Primero obtener los detalles del pedido
    try {
      // Mostrar toast de carga
      toast({
        title: "Generando PDF",
        description: "Preparando documento...",
      });

      const response = await apiRequest("GET", `/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Error al cargar el pedido');
      }
      const order = await response.json();
      
      // Obtener los items del pedido
      const itemsResponse = await apiRequest("GET", `/api/orders/${orderId}/items`);
      if (!itemsResponse.ok) {
        throw new Error('Error al cargar los items del pedido');
      }
      const orderItems = await itemsResponse.json();
      
      // Verificar que tengamos la configuración de la empresa
      if (!companySettings) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la información de la empresa",
        });
        return;
      }
      
      const customer = customers?.find((c: any) => c.id === order.customerId);
      
      try {
        // Crear un documento PDF (tamaño ticket térmico)
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, 297], // 80mm de ancho (3 pulgadas) x altura automática
          hotfixes: ['px_scaling'], // Fix para escala de píxeles
          compress: false, // Evitar compresión que puede alterar el tamaño
        });
        
        // Agregar logo o nombre de la empresa
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(companySettings.name, 40, 10, { align: 'center' });
        
        // Información de la empresa
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        // Utilizar directamente los datos disponibles
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
        doc.text(`PEDIDO #${order.id}`, 40, 38, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date(order.date).toLocaleDateString()}`, 5, 43);
        doc.text(`Cliente: ${customer?.businessname || "Cliente"}`, 5, 47);
        doc.text(`Teléfono: ${order.customerPhone || ""}`, 5, 51);
        doc.text(`Dirección: ${order.customerAddress}`, 5, 55);
        doc.text(`${order.municipalityName || ""}, ${order.provinceName || ""}`, 5, 59);
        
        const noteYPosition = 63;
        if (order.notes) {
          doc.text(`Notas: ${order.notes}`, 5, noteYPosition);
        }
        
        // Línea separadora
        doc.setDrawColor(200);
        const notesOffset = order.notes ? 4 : 0;
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
        
        orderItems.forEach((item: any) => {
          const productName = products.find((p: any) => p.id === item.productId)?.name || "Producto";
          const total = parseFloat(item.price) * item.quantity;
          
          // Asegurar que el texto del producto no exceda el ancho disponible
          let displayName = productName;
          if (productName.length > 18) {
            displayName = productName.substring(0, 16) + "...";
          }
          
          doc.text(displayName, 5, yPos);
          doc.text(`${item.quantity}`, 35, yPos, { align: 'center' });
          doc.text(`RD$${parseFloat(item.price).toFixed(2)}`, 55, yPos, { align: 'right' });
          doc.text(`RD$${total.toFixed(2)}`, 75, yPos, { align: 'right' });
          
          yPos += 8;
        });
        
        // Línea separadora
        doc.setDrawColor(200);
        doc.line(5, yPos, 75, yPos);
        yPos += 5;
        
        // Calcular subtotal e ITBIS
        const subtotal = parseFloat(order.subtotal || order.total);
        const itbis = parseFloat(order.tax || '0');
        const total = parseFloat(order.total);
        
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
        if (order.notes) {
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.text(order.notes, 5, yPos, { 
            maxWidth: 70 
          });
        }
        
        // Mensaje final
        yPos += 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text("¡Gracias por su compra!", 40, yPos, { align: 'center' });
        
        // Guardar PDF
        doc.save(`Pedido-${order.id}.pdf`);
        
        // Notificar al usuario
        toast({
          title: "PDF generado",
          description: `El archivo "Pedido-${order.id}.pdf" se ha descargado correctamente.`,
        });
      } catch (pdfError) {
        console.error("Error al generar PDF:", pdfError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo generar el archivo PDF. Intente nuevamente.",
        });
      }
    } catch (error: any) {
      console.error("Error en handleDownload:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF",
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Pedidos
        </h1>
        <Button 
          onClick={() => setLocation("/orders/new")}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Pedidos</p>
                <h3 className="font-bold text-lg sm:text-xl">{stats.total}</h3>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pendientes</p>
                <h3 className="font-bold text-lg sm:text-xl">{stats.pending}</h3>
              </div>
              <Clock className="h-8 w-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Entregados</p>
                <h3 className="font-bold text-lg sm:text-xl">{stats.delivered}</h3>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Valor Total</p>
                <h3 className="font-bold text-lg sm:text-xl">
                  RD$ {stats.totalAmount.toFixed(2)}
                </h3>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-primary">$</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador y filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente, ID, monto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center">
                  <ListFilter className="h-4 w-4 mr-2" />
                  <span>Estado</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Pendientes</span>
                  </div>
                </SelectItem>
                <SelectItem value="delivered">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Entregados</span>
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <CircleX className="h-4 w-4 text-red-500" />
                    <span>Cancelados</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vista móvil - Tarjetas */}
          <div className="block md:hidden space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <SearchX className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No se encontraron pedidos</p>
              </div>
            ) : (
              filteredOrders.map((order: any) => {
                const customer = customers?.find((c: any) => c.id === order.customerId);
                return (
                  <Card 
                    key={order.id} 
                    className={`border-l-4 ${getStatusColor(order.status)} shadow-sm`}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-sm flex items-center">
                            <ShoppingCart className="h-3.5 w-3.5 mr-1 text-primary" />
                            Pedido #{order.id}
                          </h3>
                          <p className="text-sm">{customer?.businessname || "Cliente"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">RD$ {parseFloat(order.total.toString()).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>{getStatusBadge(order.status)}</div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setLocation(`/orders/details/${order.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setLocation(`/orders/status/${order.id}`)}
                          >
                            <Tag className="h-3.5 w-3.5 mr-1" />
                            Estado
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handlePrint(order.id)}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" />
                            Imprimir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleDownload(order.id)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <SearchX className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No se encontraron pedidos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order: any) => {
                    const customer = customers?.find((c: any) => c.id === order.customerId);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{customer?.businessname || "Cliente"}</TableCell>
                        <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          RD$ {parseFloat(order.total.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setLocation(`/orders/details/${order.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setLocation(`/orders/status/${order.id}`)}
                            >
                              <Tag className="h-3.5 w-3.5 mr-1" />
                              Estado
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => handlePrint(order.id)}
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" />
                              Imprimir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => handleDownload(order.id)}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}