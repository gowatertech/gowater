import { Link, useLocation } from "wouter";
import { useState, useMemo, useRef, createRef, RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from 'jspdf';
import { PrinterService, DocumentType } from "@/services/PrinterService";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
  ClipboardList,
  FileText,
  HistoryIcon,
  Plus,
  Search,
  Wallet,
  X,
  RefreshCw,
  Calendar,
  FileStack,
  ArrowUpDown,
  Filter,
  Printer,
  FileDown,
  DollarSign
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toRD, formatDateTimeRD, getTodayStringRD } from "@/lib/date-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WhatsAppDialog } from "@/components/WhatsAppDialog";
import { MessageCircle } from "lucide-react";

interface Invoice {
  id: number;
  businessName?: string;
  customerId: number;
  date: string;
  total: number;
  status: string;
  pendingAmount?: string;
}

type Payment = {
  id: number;
  invoiceId: number;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: number;
  invoiceNumber?: string;
  method?: string;
};

interface PaymentsStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  pendingAmount: number;
}

export default function PaymentDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    method: "all" as "all" | "cash" | "card" | "transfer"
  });
  const printContentRef = useRef<HTMLDivElement>(null);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappPayment, setWhatsappPayment] = useState<Payment | null>(null);

  const openWhatsAppDialog = (payment: Payment) => {
    setWhatsappPayment(payment);
    setWhatsappDialogOpen(true);
  };

  console.log("Fetching data from /api/payments");
  // Consulta para obtener pagos
  const { data: payments = [], isLoading: isLoadingPayments, refetch, error: paymentsError } = useQuery<any[]>({
    queryKey: ["/api/payments"],
    queryFn: async ({ queryKey }) => {
      try {
        console.log("Iniciando solicitud GET a /api/payments");
        const response = await fetch("/api/payments", {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Data received from /api/payments:", data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error en solicitud GET a /api/payments:", error);
        throw error;
      }
    },
  });

  // Estadísticas de pagos
  const paymentsStats: PaymentsStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    ).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return payments.reduce(
      (stats: PaymentsStats, payment: any) => {
        const paymentDate = new Date(payment.date).getTime();
        const amount = parseFloat(payment.amount) || 0;

        if (paymentDate >= today) {
          stats.totalToday += amount;
        }
        if (paymentDate >= weekStart) {
          stats.totalWeek += amount;
        }
        if (paymentDate >= monthStart) {
          stats.totalMonth += amount;
        }

        return stats;
      },
      { totalToday: 0, totalWeek: 0, totalMonth: 0, pendingAmount: 10000 }
    );
  }, [payments]);

  // Filtrar pagos por término de búsqueda y otros filtros
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    let result = [...payments];
    
    // Filtrar por método de pago
    if (filters.method && filters.method !== "all") {
      result = result.filter(payment => 
        (payment.method || payment.paymentMethod) === filters.method
      );
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(
        (payment) =>
          (payment.customerName && payment.customerName.toLowerCase().includes(searchLower)) ||
          (payment.invoiceNumber && payment.invoiceNumber.toString().includes(searchLower)) ||
          (payment.notes && payment.notes.toLowerCase().includes(searchLower))
      );
    }
    
    // Filtrar por pestaña activa
    if (activeTab === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= today;
      });
    } else if (activeTab === "week") {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= weekStart;
      });
    } else if (activeTab === "month") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= monthStart;
      });
    }
    
    // Ordenar por fecha (más recientes primero)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, filters, activeTab]);

  // Función para formatear montos en formato RD$
  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Componente para mostrar el método de pago con un badge
  const PaymentMethodBadge = ({ method }: { method?: string }) => {
    let variant: "default" | "outline" | "secondary" | "destructive" = "default";
    let label = method || "Desconocido";

    if (method === "cash" || method === "efectivo") {
      variant = "default";
      label = "Efectivo";
    } else if (method === "card" || method === "tarjeta") {
      variant = "secondary";
      label = "Tarjeta";
    } else if (method === "transfer" || method === "transferencia") {
      variant = "outline";
      label = "Transferencia";
    }

    return <Badge variant={variant}>{label}</Badge>;
  };
  
  // Función para imprimir la lista de pagos
  const handlePrint = async () => {
    try {
      // Verificar que tenemos datos para imprimir
      if (!filteredPayments || filteredPayments.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay datos de pagos para imprimir",
        });
        return;
      }
      
      // Verificar que existe la referencia al contenido imprimible
      if (!printContentRef.current) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se puede generar la impresión",
        });
        return;
      }
      
      // Usar PrinterService para imprimir el contenido referenciado
      await PrinterService.printDocument(printContentRef.current, {
        title: "Pagos Recientes",
        size: [210, 297], // A4 - tamaño en mm
        margins: [10, 10, 10, 10] // márgenes en mm [top, right, bottom, left]
      });
      
    } catch (error: any) {
      console.error('Error en handlePrint:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo imprimir el documento",
      });
    }
  };
  
  // Función para generar PDF de pagos
  const handleGeneratePDF = async () => {
    try {
      // Verificar que tenemos los datos necesarios
      if (!filteredPayments || filteredPayments.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay datos para generar el PDF",
        });
        return;
      }
      
      // Usar el servicio para generar PDF
      const paymentData = {
        title: "Pagos Recientes",
        date: new Date().toISOString(),
        totalAmount: paymentsStats.totalMonth,
        totalCount: filteredPayments.length
      };
      
      const fileName = `pagos_${getTodayStringRD()}.pdf`;
      
      // Generar PDF usando el servicio centralizado
      await PrinterService.generatePDFDirect(
        paymentData,
        DocumentType.PAYMENT,
        {
          title: "Pagos Recientes",
          fileName,
          size: [210, 297] // A4
        },
        {
          items: filteredPayments.slice(0, 15) // Limitamos a 15 elementos para no sobrecargar el PDF
        }
      );
      
    } catch (error: any) {
      console.error('Error en handleGeneratePDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
      });
    }
  };
  
  // Función para imprimir un pago individual (formato 80mm)
  const handleSinglePaymentPrint = async (payment: Payment) => {
    try {
      if (!payment) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se puede imprimir el pago",
        });
        return;
      }
      
      // Crear contenido para impresión de recibo
      const printContent = document.createElement('div');
      printContent.innerHTML = `
        <div style="width: 80mm; padding: 5mm; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="font-size: 14px; margin: 0;">AGUA HARRIS</h2>
            <p style="font-size: 10px; margin: 5px 0;">Calle Duarte #112, Villa Altagracia</p>
            <p style="font-size: 10px; margin: 5px 0;">RNC: 999999999</p>
          </div>
          
          <div style="margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
            <h3 style="font-size: 12px; margin: 0; text-align: center;">RECIBO DE PAGO</h3>
          </div>
          
          <div style="font-size: 10px; margin-bottom: 10px;">
            <p style="margin: 4px 0;"><strong>Fecha:</strong> ${format(new Date(payment.date), 'dd/MM/yyyy hh:mm a')}</p>
            <p style="margin: 4px 0;"><strong>Cliente:</strong> ${payment.customerName || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Factura #:</strong> ${payment.invoiceNumber || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Método:</strong> ${
              (payment.method || payment.paymentMethod) === 'cash' ? 'Efectivo' :
              (payment.method || payment.paymentMethod) === 'card' ? 'Tarjeta' :
              (payment.method || payment.paymentMethod) === 'credit' ? 'Crédito' :
              (payment.method || payment.paymentMethod) === 'transfer' ? 'Transferencia' : 'Otro'
            }</p>
          </div>
          
          <div style="margin-bottom: 10px; border-top: 1px dashed #000; padding-top: 5px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-size: 12px;"><strong>TOTAL PAGADO:</strong></td>
                <td style="font-size: 12px; text-align: right;"><strong>${formatCurrency(payment.amount)}</strong></td>
              </tr>
            </table>
          </div>
          
          ${payment.notes ? `
          <div style="margin-bottom: 10px; font-size: 9px;">
            <p><strong>Notas:</strong> ${payment.notes}</p>
          </div>` : ''}
          
          <div style="text-align: center; margin-top: 15px; font-size: 9px;">
            <p style="margin: 0;">Gracias por su pago</p>
            <p style="margin: 5px 0;">www.aguaharris.com</p>
            <p style="margin: 5px 0;">Tel: 809-873-8333</p>
          </div>
        </div>
      `;
      
      // Obtener los datos de factura desde la API
      // (Por ahora solo usamos el objeto payment directamente)
      const printOptions = {
        title: `Recibo Pago #${payment.id}`,
        fileName: `recibo_pago_${payment.id}.pdf`
      };
      
      // Imprimir usando el método para recibos de 80mm
      if (PrinterService.isMobileDevice()) {
        // En móviles usamos un método más directo
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, 150], // Papel térmico estándar: 80mm de ancho
          hotfixes: ['px_scaling']
        });
        
        // Añadir contenido
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('AGUA HARRIS', 40, 10, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Calle Duarte #112, Villa Altagracia', 40, 15, { align: 'center' });
        doc.text('RNC: 999999999', 40, 19, { align: 'center' });
        
        // Línea separadora
        doc.setDrawColor(150);
        doc.line(5, 22, 75, 22);
        
        // Título
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIBO DE PAGO', 40, 27, { align: 'center' });
        
        // Datos del pago
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${format(new Date(payment.date), 'dd/MM/yyyy hh:mm a')}`, 5, 35);
        doc.text(`Cliente: ${payment.customerName || 'N/A'}`, 5, 40);
        doc.text(`Factura #: ${payment.invoiceNumber || 'N/A'}`, 5, 45);
        
        // Método de pago
        const metodoPago = 
          (payment.method || payment.paymentMethod) === 'cash' ? 'Efectivo' :
          (payment.method || payment.paymentMethod) === 'card' ? 'Tarjeta' :
          (payment.method || payment.paymentMethod) === 'credit' ? 'Crédito' :
          (payment.method || payment.paymentMethod) === 'transfer' ? 'Transferencia' : 'Otro';
        
        doc.text(`Método: ${metodoPago}`, 5, 50);
        
        // Segunda línea separadora
        doc.line(5, 55, 75, 55);
        
        // Total
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL PAGADO:', 5, 62);
        doc.text(`${formatCurrency(payment.amount)}`, 75, 62, { align: 'right' });
        
        // Notas (si hay)
        if (payment.notes) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('Notas:', 5, 70);
          
          // Dividir notas largas
          const splitNotes = doc.splitTextToSize(payment.notes, 70);
          doc.text(splitNotes, 5, 75);
        }
        
        // Pie de página
        doc.setFontSize(8);
        doc.text('Gracias por su pago', 40, 100, { align: 'center' });
        doc.text('www.aguaharris.com', 40, 105, { align: 'center' });
        doc.text('Tel: 809-873-8333', 40, 110, { align: 'center' });
        
        // Imprimir
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        // En escritorio usamos el método normal con soporte para estilos CSS
        await PrinterService.printDocument(printContent, {
          title: printOptions.title,
          size: [80, 0], // 80mm de ancho, altura automática
          margins: [5, 5, 5, 5] // márgenes reducidos
        });
      }
      
    } catch (error: any) {
      console.error('Error al imprimir pago individual:', error);
      toast({
        variant: "destructive",
        title: "Error de impresión",
        description: error.message || "No se pudo imprimir el recibo",
      });
    }
  };
  
  // Función para generar un pago individual (formato 80mm) con previsualización HTML
  const handleSinglePaymentPDF = async (payment: Payment) => {
    try {
      if (!payment) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se puede generar el recibo del pago",
        });
        return;
      }
      
      // Método de pago
      const metodoPago = 
        (payment.method || payment.paymentMethod) === 'cash' ? 'Efectivo' :
        (payment.method || payment.paymentMethod) === 'card' ? 'Tarjeta' :
        (payment.method || payment.paymentMethod) === 'credit' ? 'Crédito' :
        (payment.method || payment.paymentMethod) === 'transfer' ? 'Transferencia' : 'Otro';
      
      // Crear ventana de previsualización
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo abrir la ventana de previsualización. Verifica que no estén bloqueados los popups.",
        });
        return;
      }
      
      // Establecer el contenido HTML con un formato fijo de 80mm
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recibo de Pago #${payment.id || 'N/A'}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Estilos generales */
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f0f0f0;
              display: flex;
              justify-content: center;
              padding: 20px;
            }
            
            /* Contenedor del recibo con ancho fijo de 80mm */
            .receipt {
              width: 80mm;
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
              padding: 5mm;
              box-sizing: border-box;
            }
            
            /* Cabecera */
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            
            .header h1 {
              font-size: 14px;
              margin: 0;
              padding: 0;
            }
            
            .header p {
              font-size: 10px;
              margin: 5px 0;
              padding: 0;
            }
            
            /* Título */
            .title {
              text-align: center;
              margin: 10px 0;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
            }
            
            .title h2 {
              font-size: 12px;
              margin: 0;
            }
            
            /* Contenido */
            .content {
              font-size: 10px;
              margin-bottom: 10px;
            }
            
            .content p {
              margin: 4px 0;
            }
            
            /* Total */
            .total {
              border-top: 1px dashed #000;
              padding-top: 5px;
              margin-bottom: 10px;
            }
            
            .total table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .total td {
              font-size: 12px;
              font-weight: bold;
            }
            
            .total td:last-child {
              text-align: right;
            }
            
            /* Notas */
            .notes {
              font-size: 9px;
              margin-bottom: 10px;
            }
            
            /* Pie de página */
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 9px;
            }
            
            .footer p {
              margin: 5px 0;
            }
            
            /* Estilos específicos para impresión */
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              body {
                background-color: white;
                padding: 0;
              }
              
              .receipt {
                width: 80mm;
                box-shadow: none;
                padding: 0 5mm;
              }
              
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>AGUA HARRIS</h1>
              <p>Calle Duarte #112, Villa Altagracia</p>
              <p>RNC: 999999999</p>
            </div>
            
            <div class="title">
              <h2>RECIBO DE PAGO</h2>
            </div>
            
            <div class="content">
              <p><strong>Fecha:</strong> ${format(new Date(payment.date), 'dd/MM/yyyy hh:mm a')}</p>
              <p><strong>Cliente:</strong> ${payment.customerName || 'N/A'}</p>
              <p><strong>Factura #:</strong> ${payment.invoiceNumber || 'N/A'}</p>
              <p><strong>Método:</strong> ${metodoPago}</p>
            </div>
            
            <div class="total">
              <table>
                <tr>
                  <td>TOTAL PAGADO:</td>
                  <td>${formatCurrency(payment.amount)}</td>
                </tr>
              </table>
            </div>
            
            ${payment.notes ? `
            <div class="notes">
              <p><strong>Notas:</strong> ${payment.notes}</p>
            </div>` : ''}
            
            <div class="footer">
              <p>Gracias por su pago</p>
              <p>www.aguaharris.com</p>
              <p>Tel: 809-873-8333</p>
            </div>
            
            <div class="print-button" style="text-align: center; margin-top: 20px;">
              <button onclick="window.print();" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Imprimir Recibo
              </button>
            </div>
          </div>
          
          <script>
            // Imprimir automáticamente después de cargar
            window.onload = function() {
              // Dar tiempo para que los estilos se apliquen correctamente
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      
      // Cerrar el documento
      printWindow.document.close();
      
      toast({
        title: "Recibo generado",
        description: "Se ha abierto una nueva ventana con el recibo",
      });
      
    } catch (error: any) {
      console.error('Error al generar recibo de pago individual:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el recibo",
      });
    }
  };

  return (
    <div className="container mx-auto p-2 md:p-4">
      {/* Contenido imprimible (oculto) */}
      <div ref={printContentRef} className="hidden">
        <div style={{padding: "20px"}}>
          <h1 style={{textAlign: "center", fontSize: "18px", marginBottom: "10px"}}>Pagos Recientes</h1>
          <p style={{textAlign: "center", marginBottom: "20px"}}>Total: {formatCurrency(paymentsStats.totalMonth)} (este mes)</p>
          
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{backgroundColor: "#f3f4f6"}}>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Fecha</th>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Cliente</th>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Factura</th>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Método</th>
                <th style={{textAlign: "right", padding: "8px", borderBottom: "1px solid #ddd"}}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.slice(0, 15).map(payment => (
                <tr key={payment.id} style={{borderBottom: "1px solid #eee"}}>
                  <td style={{padding: "8px"}}>{format(new Date(payment.date), 'dd/MM/yyyy hh:mm a')}</td>
                  <td style={{padding: "8px"}}>{payment.customerName || '-'}</td>
                  <td style={{padding: "8px"}}>{payment.invoiceNumber || '-'}</td>
                  <td style={{padding: "8px"}}>
                    {(payment.method || payment.paymentMethod) === 'cash' ? 'Efectivo' :
                    (payment.method || payment.paymentMethod) === 'card' ? 'Tarjeta' :
                    (payment.method || payment.paymentMethod) === 'credit' ? 'Crédito' :
                    (payment.method || payment.paymentMethod) === 'transfer' ? 'Transferencia' : 'Otro'}
                  </td>
                  <td style={{padding: "8px", textAlign: "right"}}>{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-col space-y-4">
        {/* Encabezado */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Gestión de Pagos
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        {/* Resumen de estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Hoy</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalToday)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 sm:h-7 sm:w-7 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Esta Semana</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalWeek)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Este Mes</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalMonth)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <CircleDollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Pendientes</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.pendingAmount)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tarjetas para Navegación */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card 
            className="hover:bg-muted/10 transition-colors cursor-pointer" 
            onClick={() => setLocation("/payments/register")}
          >
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="bg-primary/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">Registrar Pago</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Añadir un nuevo pago al sistema</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:bg-muted/10 transition-colors cursor-pointer" 
            onClick={() => setLocation("/payments/account-payment")}
            data-testid="button-account-payment"
          >
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">Abono a Cuenta</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Aplicar pago automático a facturas</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:bg-muted/10 transition-colors cursor-pointer" 
            onClick={() => setLocation("/payments/history")}
          >
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="bg-primary/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <HistoryIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">Historial de Pagos</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Ver todos los pagos realizados</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Panel de historial de pagos recientes */}
        <Card>
          <CardHeader className="p-3 sm:p-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileStack className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Pagos Recientes</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={handlePrint}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={handleGeneratePDF}
                >
                  <FileDown className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs w-full sm:w-auto"
                  onClick={() => setLocation("/payments/history")}
                >
                  Ver Historial Completo
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Últimos pagos registrados en el sistema
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3">
            {/* Filtros y opciones */}
            <div className="flex flex-col gap-2 mb-3">
              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-4 h-9">
                  <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                  <TabsTrigger value="today" className="text-xs">Hoy</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">Mes</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pagos..."
                    className="pl-8 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <Select
                  value={filters.method}
                  onValueChange={(value) => setFilters({...filters, method: value as any})}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{filters.method ? `Método: ${filters.method}` : "Método de Pago"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vista de escritorio: Tabla de Pagos (solo visible en MD y superior) */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="text-[10px]">
                    <TableHead className="py-1 w-[180px]">Cliente</TableHead>
                    <TableHead className="py-1 w-[100px]">Fecha</TableHead>
                    <TableHead className="py-1 w-[100px]">Factura</TableHead>
                    <TableHead className="py-1 w-[80px]">Método</TableHead>
                    <TableHead className="py-1">Notas</TableHead>
                    <TableHead className="py-1 w-[100px] text-right">Monto</TableHead>
                    <TableHead className="py-1 w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPayments ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                        Cargando pagos...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                        No hay pagos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.slice(0, 5).map((payment) => (
                      <TableRow key={payment.id} className="text-xs">
                        <TableCell className="py-1.5 font-medium">{payment.customerName || '-'}</TableCell>
                        <TableCell className="py-1.5">
                          {formatDateTimeRD(payment.date, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </TableCell>
                        <TableCell className="py-1.5">#{payment.invoiceNumber}</TableCell>
                        <TableCell className="py-1.5">
                          <PaymentMethodBadge method={payment.method || payment.paymentMethod} />
                        </TableCell>
                        <TableCell className="py-1.5 truncate max-w-[150px]">{payment.notes || "-"}</TableCell>
                        <TableCell className="py-1.5 text-right font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSinglePaymentPrint(payment);
                              }}
                              title="Imprimir"
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSinglePaymentPDF(payment);
                              }}
                              title="Generar PDF"
                            >
                              <FileDown className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsAppDialog(payment);
                              }}
                              title="Enviar por WhatsApp"
                              data-testid={`button-whatsapp-payment-${payment.id}`}
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <FileText className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Detalles del Pago</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 text-sm">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Factura No.</p>
                                      <p className="font-medium">#{payment.invoiceNumber}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Cliente</p>
                                      <p className="font-medium">{payment.customerName}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Monto</p>
                                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Método de Pago</p>
                                      <p className="font-medium">
                                        <PaymentMethodBadge method={payment.method || payment.paymentMethod} />
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-muted/30 rounded p-2">
                                    <p className="text-xs text-muted-foreground">Fecha</p>
                                    <p className="font-medium">{format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                  </div>
                                  
                                  {payment.notes && (
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Notas</p>
                                      <p>{payment.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Vista móvil: Tarjetas de pagos (solo visible en tamaños small y medium) */}
            <div className="md:hidden">
              {isLoadingPayments ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Cargando pagos...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchTerm 
                    ? "No se encontraron resultados para la búsqueda" 
                    : "No hay pagos que coincidan con los filtros"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPayments.slice(0, 6).map((payment) => (
                    <Card 
                      key={payment.id} 
                      className="overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-wrap justify-between items-center mb-2">
                          <div className="font-medium text-sm">{payment.customerName}</div>
                          <PaymentMethodBadge method={payment.method || payment.paymentMethod} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs mb-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            Factura #{payment.invoiceNumber}
                          </div>
                        </div>
                        
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground mb-2 truncate border-t pt-2 border-muted/10">
                            {payment.notes}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <div className="text-base font-bold">{formatCurrency(payment.amount)}</div>
                          <div className="flex items-center gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSinglePaymentPrint(payment);
                              }}
                              title="Imprimir"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSinglePaymentPDF(payment);
                              }}
                              title="Generar PDF"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsAppDialog(payment);
                              }}
                              title="Enviar por WhatsApp"
                              data-testid={`button-whatsapp-payment-mobile-${payment.id}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-xs px-2"
                                >
                                  Ver detalles
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Detalles del Pago</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 text-sm">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Factura No.</p>
                                      <p className="font-medium">#{payment.invoiceNumber}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Cliente</p>
                                      <p className="font-medium">{payment.customerName}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Monto</p>
                                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Método de Pago</p>
                                      <p className="font-medium">
                                        <PaymentMethodBadge method={payment.method || payment.paymentMethod} />
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-muted/30 rounded p-2">
                                    <p className="text-xs text-muted-foreground">Fecha</p>
                                    <p className="font-medium">{format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                  </div>
                                  
                                  {payment.notes && (
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Notas</p>
                                      <p>{payment.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de WhatsApp */}
      <WhatsAppDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        type="payment"
        customerPhone={whatsappPayment?.customerPhone || ""}
      />
    </div>
  );
}