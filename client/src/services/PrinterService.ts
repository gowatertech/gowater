import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';

/**
 * Opciones de impresión y generación de PDF
 */
export type PrintOptions = {
  title: string;
  size?: [number, number]; // [width, height] en mm
  margins?: [number, number, number, number]; // [top, right, bottom, left] en mm
  fileName?: string;
};

/**
 * Tipos de documentos soportados
 */
export enum DocumentType {
  INVOICE = 'invoice',
  ORDER = 'order',
  PAYMENT = 'payment',
  PAYMENT_RECEIPT = 'payment_receipt'
}

/**
 * Servicio centralizado para impresión y generación de PDFs
 * Unifica la funcionalidad a través de diferentes partes de la aplicación
 * con soporte para móvil y escritorio
 */
export class PrinterService {
  /**
   * Detecta si el dispositivo es móvil
   */
  static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Método genérico para imprimir cualquier documento basado en un elemento HTML
   */
  static async printDocument(content: HTMLElement, options: PrintOptions): Promise<void> {
    try {
      // Notificar al usuario
      toast({
        title: "Preparando impresión",
        description: "Por favor espere...",
      });
      
      // Crear un iframe para la impresión (método que funciona en escritorio y móvil)
      const printFrame = document.createElement('iframe');
      printFrame.style.display = 'none';
      document.body.appendChild(printFrame);
      
      // Asegurarse de que el iframe es válido
      if (!printFrame.contentWindow || !printFrame.contentDocument) {
        throw new Error("No se pudo crear el área de impresión");
      }
      
      // Escribir el contenido en el iframe con estilos adecuados
      printFrame.contentDocument.open();
      printFrame.contentDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${options.title || 'Documento'}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @page {
                size: ${options.size ? `${options.size[0]}mm ${options.size[1]}mm` : '80mm auto'};
                margin: ${options.margins ? 
                  `${options.margins[0]}mm ${options.margins[1]}mm ${options.margins[2]}mm ${options.margins[3]}mm` 
                  : '0'};
              }
              body {
                margin: 0;
                padding: 5mm;
                width: ${options.size ? `${options.size[0]}mm` : '80mm'};
                font-family: Arial, sans-serif;
              }
              * { box-sizing: border-box; }
            </style>
          </head>
          <body>
            ${content.outerHTML}
          </body>
        </html>
      `);
      printFrame.contentDocument.close();
      
      // Dar más tiempo de renderizado en móviles
      const renderDelay = this.isMobileDevice() ? 800 : 300;
      
      // Imprimir después de asegurarnos que el iframe está cargado
      setTimeout(() => {
        if (!printFrame.contentWindow) {
          throw new Error("No se pudo acceder al área de impresión");
        }
        
        // Enfocar e imprimir
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        
        // Notificar al usuario
        toast({
          title: "Imprimiendo",
          description: "El documento se ha enviado a la impresora",
        });
        
        // Limpiar después de imprimir
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, renderDelay);
    } catch (error: any) {
      console.error('Error en printDocument:', error);
      toast({
        variant: "destructive",
        title: "Error de impresión",
        description: error.message || "No se pudo imprimir el documento",
      });
    }
  }

  /**
   * Genera un PDF a partir de un elemento HTML usando html2canvas
   */
  static async generatePDFFromHTML(content: HTMLElement, options: PrintOptions): Promise<string> {
    try {
      toast({
        title: "Generando PDF",
        description: "Preparando documento...",
      });
      
      // Convertir HTML a imagen con html2canvas
      const canvas = await html2canvas(content);
      const imgData = canvas.toDataURL('image/png');
      
      // Configurar documento PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: options.size || [80, 200] // Por defecto 80mm de ancho
      });
      
      // Dimensiones
      const imgWidth = options.size ? options.size[0] : 80; // Ancho en mm
      const pageHeight = options.size ? options.size[1] : 200; // Alto en mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      // Añadir imagen al PDF
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Si el contenido es más largo que una página, añadir páginas adicionales
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Guardar el PDF
      const fileName = options.fileName || 'documento.pdf';
      pdf.save(fileName);
      
      // Notificar al usuario
      toast({
        title: "PDF generado",
        description: `El archivo "${fileName}" se ha descargado correctamente.`,
      });
      
      return fileName;
    } catch (error: any) {
      console.error('Error en generatePDFFromHTML:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
      });
      throw error;
    }
  }

  /**
   * Genera un PDF directamente usando jsPDF sin HTML
   * (mejor para móviles y mayor consistencia)
   */
  static async generatePDFDirect(
    data: any, 
    type: DocumentType, 
    options: PrintOptions, 
    extraData: {
      settings?: any,
      customer?: any,
      items?: any[],
      products?: any[]
    }
  ): Promise<string> {
    try {
      toast({
        title: "Generando PDF",
        description: "Preparando documento...",
      });
      
      // Crear documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: options.size || [80, 297], // 80mm ancho, altura auto
        hotfixes: ['px_scaling'], // Fix para escala de píxeles
      });
      
      // Configuración básica para todos los documentos
      if (extraData.settings) {
        const settings = extraData.settings;
        const companyName = settings.name || 'Empresa';
        const rnc = settings.rnc || '';
        const street = settings.street || '';
        const streetNumber = settings.streetNumber || '';
        const companyMunicipality = settings.municipalityName || '';
        const companyProvince = settings.provinceName || '';
        const contactPhone = settings.contactPhone || '';
        const email = settings.email || '';
        
        // Encabezado: Nombre de la empresa
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(companyName, 40, 10, { align: 'center' });
        
        // Información de la empresa
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`RNC: ${rnc}`, 40, 15, { align: 'center' });
        doc.text(`${street} ${streetNumber}`, 40, 19, { align: 'center' });
        doc.text(`${companyMunicipality}, ${companyProvince}`, 40, 23, { align: 'center' });
        doc.text(`Tel: ${contactPhone}`, 40, 27, { align: 'center' });
        doc.text(`Email: ${email}`, 40, 31, { align: 'center' });
        
        // Línea separadora
        doc.setDrawColor(200);
        doc.line(5, 34, 75, 34);
      }
      
      // Contenido específico según el tipo de documento
      let yPos = 38;
      
      switch (type) {
        case DocumentType.INVOICE:
          yPos = this.addInvoiceContent(doc, data, extraData, yPos);
          break;
        case DocumentType.ORDER:
          yPos = this.addOrderContent(doc, data, extraData, yPos);
          break;
        case DocumentType.PAYMENT:
          yPos = this.addPaymentContent(doc, data, extraData, yPos);
          break;
        case DocumentType.PAYMENT_RECEIPT:
          // Para recibos de pagos individuales, formato 80mm
          yPos = this.addPaymentReceiptContent(doc, data, extraData, yPos);
          break;
        default:
          console.warn(`Tipo de documento no soportado: ${type}`);
          break;
      }
      
      // Mensaje final (para todos los tipos)
      yPos += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("¡Gracias por su compra!", 40, yPos, { align: 'center' });
      
      // Guardar PDF
      const fileName = options.fileName || `documento-${Date.now()}.pdf`;
      doc.save(fileName);
      
      // Notificar al usuario
      toast({
        title: "PDF generado",
        description: `El archivo "${fileName}" se ha descargado correctamente.`,
      });
      
      return fileName;
    } catch (error: any) {
      console.error(`Error en generatePDFDirect (${type}):`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
      });
      throw error;
    }
  }

  /**
   * Añade contenido específico de factura al PDF
   */
  private static addInvoiceContent(
    doc: jsPDF, 
    invoice: any, 
    extraData: { 
      settings?: any, 
      customer?: any, 
      items?: any[], 
      products?: any[] 
    }, 
    startY: number
  ): number {
    // Título
    let yPos = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`FACTURA #${invoice.id || 'N/A'}`, 40, yPos, { align: 'center' });
    yPos += 5;
    
    // Datos del cliente y factura
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Fecha
    let formattedDate = '';
    try {
      formattedDate = new Date(invoice.date).toLocaleDateString();
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Cliente
    const customer = extraData.customer;
    const businessName = customer?.businessname || "Cliente";
    const address = customer?.address || "";
    const municipality = customer?.municipality || "Cotuí";
    const province = customer?.province || "Sánchez Ramírez";
    const phone = customer?.phone || "";
    
    // Método de pago
    const paymentMethod = 
      invoice.paymentMethod === 'cash' ? 'Efectivo' : 
      invoice.paymentMethod === 'credit' ? 'Crédito' : 
      invoice.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado';
    
    // Añadir información del cliente
    doc.text(`Fecha: ${formattedDate}`, 10, yPos); yPos += 4;
    doc.text(`Cliente: ${businessName}`, 10, yPos); yPos += 4;
    doc.text(`Dirección: ${address}, ${municipality}`, 10, yPos); yPos += 4;
    doc.text(`Provincia: ${province}`, 10, yPos); yPos += 4;
    doc.text(`Teléfono: ${phone}`, 10, yPos); yPos += 4;
    doc.text(`Método de pago: ${paymentMethod}`, 10, yPos); yPos += 4;
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Encabezado de productos
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLE DE PRODUCTOS", 40, yPos, { align: 'center' });
    yPos += 5;
    
    // Columnas de la tabla
    doc.setFontSize(7);
    doc.text("Producto", 5, yPos);
    doc.text("Cant.", 35, yPos, { align: 'center' });
    doc.text("Precio", 55, yPos, { align: 'right' });
    doc.text("Total", 75, yPos, { align: 'right' });
    yPos += 2;
    
    // Línea bajo encabezados
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Productos
    doc.setFont('helvetica', 'normal');
    
    const items = extraData.items || [];
    const products = extraData.products || [];
    
    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item) => {
        if (!item) return; // Saltar items nulos
        
        const product = products.find((p) => p?.id === item?.productId);
        const productName = product?.name || "Producto";
        const quantity = item?.quantity || 0;
        const price = parseFloat(item?.price || 0);
        const total = price * quantity;
        
        // Acortar nombre si es muy largo
        let displayName = productName;
        if (displayName.length > 18) {
          displayName = displayName.substring(0, 16) + "...";
        }
        
        doc.text(displayName, 5, yPos);
        doc.text(`${quantity}`, 35, yPos, { align: 'center' });
        doc.text(`RD$${price.toFixed(2)}`, 55, yPos, { align: 'right' });
        doc.text(`RD$${total.toFixed(2)}`, 75, yPos, { align: 'right' });
        
        yPos += 5;
      });
    } else {
      doc.text("No hay productos", 40, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Calcular totales con validación
    let subtotal = 0;
    let itbis = 0;
    let total = 0;
    
    try {
      subtotal = parseFloat(invoice.subtotal || "0");
      if (isNaN(subtotal)) subtotal = 0;
      
      itbis = parseFloat(invoice.tax || "0");
      if (isNaN(itbis)) itbis = 0;
      
      total = parseFloat(invoice.total || "0");
      if (isNaN(total)) total = 0;
    } catch (e) {
      console.error("Error calculando totales:", e);
    }
    
    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text(`SUBTOTAL: RD$${subtotal.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 5;
    
    // ITBIS
    doc.text(`ITBIS: RD$${itbis.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 5;
    
    // Total
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: RD$${total.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 10;
    
    // Notas (si hay)
    if (invoice.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Nota:", 5, yPos);
      yPos += 4;
      
      // Dividir notas en líneas si son muy largas
      const maxWidth = 70; // Ancho máximo en mm para notas
      const splitNotes = doc.splitTextToSize(invoice.notes, maxWidth);
      
      doc.text(splitNotes, 5, yPos);
      yPos += splitNotes.length * 4;
    }
    
    return yPos;
  }

  /**
   * Añade contenido específico de pedido al PDF
   */
  private static addOrderContent(
    doc: jsPDF, 
    order: any, 
    extraData: { 
      settings?: any, 
      customer?: any, 
      items?: any[], 
      products?: any[] 
    }, 
    startY: number
  ): number {
    // Título
    let yPos = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`PEDIDO #${String(order.id || 'N/A')}`, 40, yPos, { align: 'center' });
    yPos += 5;
    
    // Datos del cliente y pedido
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Fecha
    let formattedDate = '';
    try {
      formattedDate = new Date(order.date).toLocaleDateString();
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Cliente - convertimos todos los valores a String para prevenir errores
    const customer = extraData.customer || {};
    const businessName = String(customer?.businessname || order.customerName || "Cliente");
    const address = String(customer?.address || order.customerAddress || "");
    const municipality = String(customer?.municipality || order.municipalityName || "Cotuí");
    const province = String(customer?.province || order.provinceName || "Sánchez Ramírez");
    const phone = String(customer?.phone || order.customerPhone || "");
    
    // Añadir información del cliente - aseguramos que todo sea string
    doc.text(`Fecha: ${formattedDate}`, 10, yPos); yPos += 4;
    doc.text(`Cliente: ${businessName}`, 10, yPos); yPos += 4;
    doc.text(`Dirección: ${address}, ${municipality}`, 10, yPos); yPos += 4;
    doc.text(`Provincia: ${province}`, 10, yPos); yPos += 4;
    doc.text(`Teléfono: ${phone}`, 10, yPos); yPos += 4;
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Encabezado de productos
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLE DE PRODUCTOS", 40, yPos, { align: 'center' });
    yPos += 5;
    
    // Columnas de la tabla
    doc.setFontSize(7);
    doc.text("Producto", 5, yPos);
    doc.text("Cant.", 35, yPos, { align: 'center' });
    doc.text("Precio", 55, yPos, { align: 'right' });
    doc.text("Total", 75, yPos, { align: 'right' });
    yPos += 2;
    
    // Línea bajo encabezados
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Productos
    doc.setFont('helvetica', 'normal');
    
    const items = extraData.items || [];
    const products = extraData.products || [];
    
    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item) => {
        if (!item) return; // Saltar items nulos
        
        const product = products.find((p) => p?.id === item?.productId);
        const productName = product?.name || "Producto";
        const quantity = item?.quantity || 0;
        const price = parseFloat(item?.price || 0);
        const total = price * quantity;
        
        // Acortar nombre si es muy largo
        let displayName = productName;
        if (displayName.length > 18) {
          displayName = displayName.substring(0, 16) + "...";
        }
        
        doc.text(displayName, 5, yPos);
        doc.text(`${quantity}`, 35, yPos, { align: 'center' });
        doc.text(`RD$${price.toFixed(2)}`, 55, yPos, { align: 'right' });
        doc.text(`RD$${total.toFixed(2)}`, 75, yPos, { align: 'right' });
        
        yPos += 5;
      });
    } else {
      doc.text("No hay productos", 40, yPos, { align: 'center' });
      yPos += 5;
    }
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Calcular totales con validación
    let subtotal = 0;
    let itbis = 0;
    let total = 0;
    
    try {
      subtotal = parseFloat(order.subtotal || "0");
      if (isNaN(subtotal)) subtotal = 0;
      
      itbis = parseFloat(order.tax || "0");
      if (isNaN(itbis)) itbis = 0;
      
      total = parseFloat(order.total || "0");
      if (isNaN(total)) total = 0;
    } catch (e) {
      console.error("Error calculando totales:", e);
    }
    
    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text(`SUBTOTAL: RD$${subtotal.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 5;
    
    // ITBIS
    doc.text(`ITBIS: RD$${itbis.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 5;
    
    // Total
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: RD$${total.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 10;
    
    // Notas (si hay)
    if (order.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Nota:", 5, yPos);
      yPos += 4;
      
      // Dividir notas en líneas si son muy largas
      const maxWidth = 70; // Ancho máximo en mm para notas
      const splitNotes = doc.splitTextToSize(order.notes, maxWidth);
      
      doc.text(splitNotes, 5, yPos);
      yPos += splitNotes.length * 4;
    }
    
    return yPos;
  }

  /**
   * Añade contenido específico de pago al PDF
   */
  private static addPaymentContent(
    doc: jsPDF, 
    payment: any, 
    extraData: { 
      settings?: any, 
      customer?: any
    }, 
    startY: number
  ): number {
    // Título
    let yPos = startY;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECIBO DE PAGO #${payment.id || 'N/A'}`, 105, yPos, { align: 'center' });
    yPos += 8;
    
    // Datos del cliente y pago
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Fecha
    let formattedDate = '';
    try {
      formattedDate = new Date(payment.date).toLocaleDateString();
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Cliente
    const customer = extraData.customer;
    const businessName = customer?.businessname || payment.customerName || "Cliente";
    const address = customer?.address || "";
    const municipality = customer?.municipality || "Cotuí";
    const province = customer?.province || "Sánchez Ramírez";
    const phone = customer?.phone || "";
    
    // Método de pago
    const paymentMethod = 
      payment.method === 'cash' ? 'Efectivo' : 
      payment.method === 'bank_transfer' ? 'Transferencia' : 
      payment.method === 'check' ? 'Cheque' : 
      payment.method === 'card' ? 'Tarjeta' : 'No especificado';
    
    // Diseño de dos columnas para información
    const col1X = 20;
    const col2X = 120;
    
    // Columna izquierda - Información del cliente
    doc.setFont('helvetica', 'bold');
    doc.text("INFORMACIÓN DEL CLIENTE", col1X, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${businessName}`, col1X, yPos); yPos += 5;
    doc.text(`Dirección: ${address}`, col1X, yPos); yPos += 5;
    doc.text(`${municipality}, ${province}`, col1X, yPos); yPos += 5;
    doc.text(`Teléfono: ${phone}`, col1X, yPos); yPos += 5;
    
    // Regresa a la posición inicial para la columna derecha
    let rightColY = yPos - 21;
    
    // Columna derecha - Información del pago
    doc.setFont('helvetica', 'bold');
    doc.text("INFORMACIÓN DEL PAGO", col2X, rightColY);
    rightColY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${formattedDate}`, col2X, rightColY); rightColY += 5;
    doc.text(`Método: ${paymentMethod}`, col2X, rightColY); rightColY += 5;
    
    if (payment.invoiceNumber) {
      doc.text(`Factura #: ${payment.invoiceNumber}`, col2X, rightColY);
      rightColY += 5;
    }
    
    // Avanzamos a la posición más baja entre ambas columnas
    yPos = Math.max(yPos, rightColY) + 5;
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    
    // Encabezado de detalles
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLES DEL PAGO", 40, yPos, { align: 'center' });
    yPos += 8;
    
    // Detalles del pago
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Datos de factura/s
    if (payment.invoiceId) {
      doc.text(`Factura: #${payment.invoiceId}`, 10, yPos);
      yPos += 4;
    }
    
    // Monto y método
    doc.text(`Método de pago: ${paymentMethod}`, 10, yPos);
    yPos += 4;
    
    if (payment.reference) {
      doc.text(`Referencia: ${payment.reference}`, 10, yPos);
      yPos += 4;
    }
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Monto total en formato destacado
    const amount = parseFloat(payment.amount || 0);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLE DE PAGO", 105, yPos, { align: 'center' });
    yPos += 8;
    
    // Usar una tabla para mejor visualización
    doc.setFontSize(12);
    doc.text("MONTO PAGADO:", 60, yPos, { align: 'right' });
    doc.text(`RD$${amount.toFixed(2)}`, 150, yPos, { align: 'right' });
    yPos += 10;
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    
    // Notas (si hay)
    if (payment.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text("NOTAS:", 20, yPos);
      yPos += 6;
      
      // Dividir notas en líneas si son muy largas
      const maxWidth = 170; // Ancho máximo en mm para notas en tamaño carta
      const splitNotes = doc.splitTextToSize(payment.notes, maxWidth);
      
      doc.text(splitNotes, 20, yPos);
      yPos += splitNotes.length * 6;
    }
    
    // Línea para firma
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("RECIBIDO POR:", 55, yPos, { align: 'right' });
    doc.text("___________________________", 130, yPos, { align: 'center' });
    yPos += 15;
    doc.text("FIRMA Y SELLO:", 55, yPos, { align: 'right' });
    doc.text("___________________________", 130, yPos, { align: 'center' });
    
    return yPos;
  }

  /**
   * Añade contenido específico para recibos de pago individual (formato 80mm)
   */
  private static addPaymentReceiptContent(
    doc: jsPDF, 
    payment: any, 
    extraData: { 
      settings?: any, 
      customer?: any,
      items?: any[]
    }, 
    startY: number
  ): number {
    // Título
    let yPos = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECIBO DE PAGO`, 40, yPos, { align: 'center' });
    yPos += 5;
    
    // Datos del pago
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Fecha
    let formattedDate = '';
    try {
      formattedDate = new Date(payment.date).toLocaleDateString();
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Método de pago
    const paymentMethod = 
      payment.paymentMethod === 'cash' ? 'Efectivo' : 
      payment.paymentMethod === 'transfer' ? 'Transferencia' : 
      payment.paymentMethod === 'check' ? 'Cheque' : 
      payment.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado';
    
    // Información básica del pago
    doc.text(`Fecha: ${formattedDate}`, 10, yPos); yPos += 4;
    
    if (payment.customerName) {
      doc.text(`Cliente: ${payment.customerName}`, 10, yPos);
      yPos += 4;
    }
    
    if (payment.invoiceNumber) {
      doc.text(`Factura #: ${payment.invoiceNumber}`, 10, yPos);
      yPos += 4;
    }
    
    doc.text(`Método de pago: ${paymentMethod}`, 10, yPos);
    yPos += 4;
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Monto total en grande y destacado
    const amount = parseFloat(payment.amount || 0);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`MONTO PAGADO:`, 10, yPos);
    doc.text(`RD$${amount.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 8;
    
    // Notas (si hay)
    if (payment.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Nota:", 10, yPos);
      yPos += 4;
      
      // Dividir notas en líneas si son muy largas
      const maxWidth = 65; // Ancho máximo en mm para notas
      const splitNotes = doc.splitTextToSize(payment.notes, maxWidth);
      
      doc.text(splitNotes, 10, yPos);
      yPos += splitNotes.length * 4;
    }
    
    return yPos;
  }
  
  // ----- MÉTODOS ESPECÍFICOS PARA CADA TIPO DE DOCUMENTO -----

  /**
   * Imprimir factura
   */
  static async printInvoice(invoice: any, settings: any, customers: any = [], items: any = []): Promise<void> {
    try {
      // Buscar el cliente correspondiente
      const customer = customers.find((c: any) => c.id === invoice.customerId);
      
      // Crear contenido HTML para impresión
      const printContent = document.createElement('div');
      printContent.className = 'invoice-print-content';
      printContent.style.width = '80mm';
      printContent.style.padding = '10px';
      printContent.style.fontFamily = 'Arial, sans-serif';
      
      // Encabezado con datos de la empresa
      printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${settings?.name || ''}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${settings?.rnc || ''}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">${settings?.street || ''} ${settings?.streetNumber || ''}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">${settings?.municipalityName || ''}, ${settings?.provinceName || ''}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${settings?.contactPhone || ''}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">Email: ${settings?.email || ''}</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px;">FACTURA #${invoice.id}</div>
      `;
      
      // Información del cliente y factura
      printContent.innerHTML += `
        <div style="margin-bottom: 10px; font-size: 12px;">
          <div><strong>Fecha:</strong> ${new Date(invoice.date).toLocaleDateString()}</div>
          <div><strong>Cliente:</strong> ${customer?.businessname || 'Cliente'}</div>
          <div><strong>Dirección:</strong> ${customer?.address || ''}, ${customer?.municipality || ''}</div>
          <div><strong>Provincia:</strong> ${customer?.province || ''}</div>
          <div><strong>Teléfono:</strong> ${customer?.phone || ''}</div>
          <div><strong>Método de pago:</strong> ${
            invoice.paymentMethod === 'cash' ? 'Efectivo' : 
            invoice.paymentMethod === 'credit' ? 'Crédito' : 
            invoice.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado'
          }</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      `;
      
      // Tabla de productos
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">DETALLE DE PRODUCTOS</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 3px;">Producto</th>
            <th style="text-align: center; padding: 3px;">Cant.</th>
            <th style="text-align: right; padding: 3px;">Precio</th>
            <th style="text-align: right; padding: 3px;">Total</th>
          </tr>
      `;
      
      // Calcular totales
      let subtotal = 0;
      
      // Agregar filas de productos
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item: any) => {
          const product = item?.product?.name || "Producto";
          const quantity = item?.quantity || 0;
          const price = parseFloat(item?.price || 0);
          const total = price * quantity;
          subtotal += total;
          
          printContent.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="text-align: left; padding: 3px;">${product}</td>
              <td style="text-align: center; padding: 3px;">${quantity}</td>
              <td style="text-align: right; padding: 3px;">${price.toFixed(2)}</td>
              <td style="text-align: right; padding: 3px;">${total.toFixed(2)}</td>
            </tr>
          `;
        });
      } else {
        printContent.innerHTML += `
          <tr><td colspan="4" style="text-align: center; padding: 5px;">No hay productos</td></tr>
        `;
      }
      
      // Cerrar tabla
      printContent.innerHTML += `</table>`;
      
      // Separador
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 10px 0;"></div>`;
      
      // Calcular impuestos
      const itbis = subtotal * 0.18;
      const total = subtotal + itbis;
      
      // Totales
      printContent.innerHTML += `
        <div style="margin-top: 5px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="flex: 1; text-align: left;">SUBTOTAL:</span>
            <span style="flex: 1; text-align: right;">RD$ ${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="flex: 1; text-align: left;">ITBIS:</span>
            <span style="flex: 1; text-align: right;">RD$ ${itbis.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
            <span style="flex: 1; text-align: left;">TOTAL:</span>
            <span style="flex: 1; text-align: right;">RD$ ${total.toFixed(2)}</span>
          </div>
        </div>
      `;
      
      // Notas (si hay)
      if (invoice.notes) {
        printContent.innerHTML += `
          <div style="margin-top: 10px; font-size: 11px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Nota de la Factura:</div>
            <div>${invoice.notes}</div>
          </div>
        `;
      }
      
      // Mensaje final y pie de página
      printContent.innerHTML += `
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 10px; font-size: 11px;">
          ¡Gracias por su compra!
        </div>
      `;
      
      // Imprimir usando el método genérico
      await this.printDocument(printContent, {
        title: `Factura #${invoice.id}`,
        size: [80, 200],
      });
    } catch (error: any) {
      console.error('Error en printInvoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al imprimir la factura",
      });
    }
  }

  /**
   * Generar PDF de factura
   */
  static async generateInvoicePDF(invoice: any, settings: any, customers: any = [], items: any = []): Promise<void> {
    try {
      const customer = customers.find((c: any) => c.id === invoice.customerId);
      
      // Elegir el método según el dispositivo
      if (this.isMobileDevice()) {
        // En móviles, usar generación directa (mejor rendimiento)
        await this.generatePDFDirect(
          invoice,
          DocumentType.INVOICE,
          {
            title: `Factura #${invoice.id}`,
            size: [80, 200],
            fileName: `Factura-${invoice.id}.pdf`
          },
          {
            settings,
            customer,
            items
          }
        );
      } else {
        // En escritorio, usar HTML2Canvas (más visual)
        const pdfContent = document.createElement('div');
        pdfContent.id = 'invoice-pdf-content';
        pdfContent.style.width = '80mm';
        pdfContent.style.padding = '10px';
        pdfContent.style.fontFamily = 'Arial, sans-serif';
        pdfContent.style.position = 'absolute';
        pdfContent.style.left = '-9999px';
        document.body.appendChild(pdfContent);
        
        // Encabezado con datos de la empresa
        pdfContent.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${settings?.name || ''}</div>
            <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${settings?.rnc || ''}</div>
            <div style="font-size: 11px; margin-bottom: 2px;">${settings?.street || ''} ${settings?.streetNumber || ''}</div>
            <div style="font-size: 11px; margin-bottom: 2px;">${settings?.municipalityName || ''}, ${settings?.provinceName || ''}</div>
            <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${settings?.contactPhone || ''}</div>
            <div style="font-size: 11px; margin-bottom: 2px;">Email: ${settings?.email || ''}</div>
          </div>
          <div style="border-bottom: 1px solid #000; margin: 10px 0 20px;"></div>
          <div style="text-align: center; font-weight: bold; font-size: 18px; margin: 20px 0;">FACTURA</div>
        `;
        
        // Información del cliente y factura
        pdfContent.innerHTML += `
          <div style="margin-bottom: 20px; font-size: 14px;">
            <div style="margin-bottom: 8px;"><strong>Factura #:</strong> ${invoice.id}</div>
            <div style="margin-bottom: 8px;"><strong>Fecha:</strong> ${new Date(invoice.date).toLocaleDateString()}</div>
            <div style="margin-bottom: 8px;"><strong>Cliente:</strong> ${customer?.businessname || 'Cliente'}</div>
            <div style="margin-bottom: 8px;"><strong>Dirección:</strong> ${customer?.address || ''}, ${customer?.municipality || ''}</div>
            <div style="margin-bottom: 8px;"><strong>Provincia:</strong> ${customer?.province || ''}</div>
            <div style="margin-bottom: 8px;"><strong>Teléfono:</strong> ${customer?.phone || ''}</div>
            <div style="margin-bottom: 8px;"><strong>Método de pago:</strong> ${
              invoice.paymentMethod === 'cash' ? 'Efectivo' : 
              invoice.paymentMethod === 'credit' ? 'Crédito' : 
              invoice.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado'
            }</div>
          </div>
          <div style="border-bottom: 1px solid #000; margin: 10px 0 20px;"></div>
        `;
        
        // Tabla de productos
        const productTable = document.createElement('table');
        productTable.style.width = '100%';
        productTable.style.borderCollapse = 'collapse';
        productTable.style.marginBottom = '20px';
        productTable.style.fontSize = '14px';
        
        // Cabecera de la tabla
        productTable.innerHTML = `
          <thead>
            <tr style="border-bottom: 2px solid #ddd; text-align: left;">
              <th style="padding: 8px; text-align: left;">Producto</th>
              <th style="padding: 8px; text-align: right;">Cant.</th>
              <th style="padding: 8px; text-align: right;">Precio</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
        `;
        
        // Filas de productos
        let subtotal = 0;
        
        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item: any) => {
            const product = item?.product?.name || "Producto";
            const quantity = item?.quantity || 0;
            const price = parseFloat(item?.price || 0);
            const total = price * quantity;
            subtotal += total;
            
            productTable.innerHTML += `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; text-align: left;">${product}</td>
                <td style="padding: 8px; text-align: right;">${quantity}</td>
                <td style="padding: 8px; text-align: right;">${price.toFixed(2)}</td>
                <td style="padding: 8px; text-align: right;">${total.toFixed(2)}</td>
              </tr>
            `;
          });
        } else {
          productTable.innerHTML += `
            <tr><td colspan="4" style="text-align: center; padding: 15px;">No hay productos</td></tr>
          `;
        }
        
        productTable.innerHTML += `</tbody>`;
        pdfContent.appendChild(productTable);
        
        // Cálculo de totales
        const itbis = subtotal * 0.18;
        const total = subtotal + itbis;
        
        // Resumen de totales
        pdfContent.innerHTML += `
          <div style="margin-top: 20px; font-size: 14px; text-align: right;">
            <div style="display: flex; justify-content: flex-end; margin-bottom: 5px;">
              <div style="width: 150px; text-align: left; padding-right: 20px;">Subtotal:</div>
              <div style="width: 100px; text-align: right;">RD$ ${subtotal.toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-bottom: 5px;">
              <div style="width: 150px; text-align: left; padding-right: 20px;">ITBIS (18%):</div>
              <div style="width: 100px; text-align: right;">RD$ ${itbis.toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-bottom: 5px; font-weight: bold;">
              <div style="width: 150px; text-align: left; padding-right: 20px;">Total:</div>
              <div style="width: 100px; text-align: right;">RD$ ${total.toFixed(2)}</div>
            </div>
          </div>
        `;
        
        // Notas (si hay)
        if (invoice.notes) {
          pdfContent.innerHTML += `
            <div style="margin-top: 30px; font-size: 14px;">
              <div style="font-weight: bold; margin-bottom: 8px;">Nota de la Factura:</div>
              <div style="font-style: italic;">${invoice.notes}</div>
            </div>
          `;
        }
        
        // Mensaje de agradecimiento
        pdfContent.innerHTML += `
          <div style="text-align: center; margin-top: 40px; font-size: 14px;">
            Gracias por su compra
          </div>
        `;
        
        // Generar PDF
        await this.generatePDFFromHTML(pdfContent, {
          title: `Factura #${invoice.id}`,
          size: [80, 200],
          fileName: `Factura-${invoice.id}.pdf`
        });
        
        // Eliminar el div temporal
        document.body.removeChild(pdfContent);
      }
    } catch (error: any) {
      console.error('Error en generateInvoicePDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF de la factura",
      });
    }
  }

  /**
   * Imprimir pedido
   */
  static async printOrder(order: any, items: any[], customer: any, settings: any, products: any[]): Promise<void> {
    try {
      // Crear contenido HTML para impresión
      const printContent = document.createElement('div');
      printContent.className = 'order-print-content';
      printContent.style.width = '80mm';
      printContent.style.boxSizing = 'border-box';
      printContent.style.padding = '5mm';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '10px';
      
      // Encabezado con datos de la empresa
      const companyName = settings?.name || 'Empresa';
      const rnc = settings?.rnc || '';
      const street = settings?.street || '';
      const streetNumber = settings?.streetNumber || '';
      const municipalityName = settings?.municipalityName || '';
      const provinceName = settings?.provinceName || '';
      const contactPhone = settings?.contactPhone || '';
      const email = settings?.email || '';
      
      printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${companyName}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${rnc}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">${street} ${streetNumber}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">${municipalityName}, ${provinceName}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${contactPhone}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">Email: ${email}</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      `;
      
      // Información del pedido
      let formattedDate = '';
      try {
        formattedDate = new Date(order.date).toLocaleDateString();
      } catch (e) {
        formattedDate = 'Fecha no disponible';
      }
      
      const businessname = customer?.businessname || "Cliente";
      const customerPhone = order?.customerPhone || "";
      const customerAddress = order?.customerAddress || "";
      const orderMunicipalityName = order?.municipalityName || "";
      const orderProvinceName = order?.provinceName || "";
      
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">PEDIDO #${order?.id || 'N/A'}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Fecha:</strong> ${formattedDate}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Cliente:</strong> ${businessname}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Teléfono:</strong> ${customerPhone}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Dirección:</strong> ${customerAddress}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;">${orderMunicipalityName}, ${orderProvinceName}</div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      `;
      
      // Tabla de productos
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">DETALLE DEL PEDIDO</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 3px;">Producto</th>
            <th style="text-align: center; padding: 3px;">Cant.</th>
            <th style="text-align: right; padding: 3px;">Precio</th>
            <th style="text-align: right; padding: 3px;">Total</th>
          </tr>
      `;
      
      // Productos
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item: any) => {
          if (!item) return; // Saltar items nulos
          
          const product = products?.find((p: any) => p?.id === item?.productId);
          const productName = product?.name || "Producto";
          const quantity = item?.quantity || 0;
          const price = parseFloat(item?.price || 0);
          const total = price * quantity;
          
          printContent.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="text-align: left; padding: 3px;">${productName}</td>
              <td style="text-align: center; padding: 3px;">${quantity}</td>
              <td style="text-align: right; padding: 3px;">RD$${price.toFixed(2)}</td>
              <td style="text-align: right; padding: 3px;">RD$${total.toFixed(2)}</td>
            </tr>
          `;
        });
      } else {
        printContent.innerHTML += `
          <tr><td colspan="4" style="text-align: center; padding: 5px;">No hay productos</td></tr>
        `;
      }
      
      printContent.innerHTML += `</table>`;
      
      // Separador
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 10px 0;"></div>`;
      
      // Calcular totales
      let subtotal = 0;
      let itbis = 0;
      let total = 0;
      
      try {
        subtotal = parseFloat(order.subtotal || "0");
        if (isNaN(subtotal)) subtotal = 0;
        
        itbis = parseFloat(order.tax || "0");
        if (isNaN(itbis)) itbis = 0;
        
        total = parseFloat(order.total || "0");
        if (isNaN(total)) total = 0;
      } catch (e) {
        console.error("Error calculando totales:", e);
      }
      
      // Totales
      printContent.innerHTML += `
        <div style="margin-top: 10px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="flex: 1; text-align: left;">SUBTOTAL:</span>
            <span style="flex: 1; text-align: center;">RD$ ${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="flex: 1; text-align: left;">ITBIS:</span>
            <span style="flex: 1; text-align: center;">RD$ ${itbis.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
            <span style="flex: 1; text-align: left;">TOTAL:</span>
            <span style="flex: 1; text-align: center;">RD$ ${total.toFixed(2)}</span>
          </div>
        </div>
      `;
      
      // Notas (si hay)
      if (order.notes) {
        printContent.innerHTML += `
          <div style="margin-top: 10px; font-size: 10px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Nota del Pedido:</div>
            <div>${order.notes}</div>
          </div>
        `;
      }
      
      // Separador final
      printContent.innerHTML += `
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 10px; font-size: 11px;">
          ¡Gracias por su compra!
        </div>
      `;
      
      // Imprimir usando el método genérico
      await this.printDocument(printContent, {
        title: `Pedido #${order.id || 'N/A'}`,
        size: [80, 200],
      });
    } catch (error: any) {
      console.error('Error en printOrder:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al imprimir el pedido",
      });
    }
  }

  /**
   * Generar PDF de pedido
   */
  static async generateOrderPDF(order: any, items: any[], customer: any, settings: any, products: any[]): Promise<void> {
    try {
      // Crear copias seguras de los datos para evitar problemas de mutación y tipo
      const orderCopy = {
        ...order,
        id: String(order?.id || 'N/A'),
        date: order?.date,
        total: String(order?.total || '0'),
        subtotal: String(order?.subtotal || '0'),
        tax: String(order?.tax || '0'),
        notes: order?.notes || ''
      };
      
      const safeItems = items?.map(item => ({
        ...item,
        productId: Number(item?.productId || 0),
        quantity: Number(item?.quantity || 0),
        price: String(item?.price || '0')
      })) || [];
      
      const safeCustomer = customer ? {
        ...customer,
        id: Number(customer?.id || 0),
        businessname: String(customer?.businessname || 'Cliente'),
        phone: String(customer?.phone || ''),
        address: String(customer?.address || '')
      } : null;
      
      const safeSettings = settings ? { ...settings } : {};
      
      const safeProducts = products?.map(product => ({
        ...product,
        id: Number(product?.id || 0),
        name: String(product?.name || 'Producto'),
        price: String(product?.price || '0')
      })) || [];
      
      // Usar generación directa para consistencia en móvil y escritorio
      await this.generatePDFDirect(
        orderCopy,
        DocumentType.ORDER,
        {
          title: `Pedido #${orderCopy.id}`,
          size: [80, 297],
          fileName: `Pedido-${orderCopy.id}.pdf`
        },
        {
          settings: safeSettings,
          customer: safeCustomer,
          items: safeItems,
          products: safeProducts
        }
      );
      
      toast({
        title: "PDF generado",
        description: "El PDF se ha generado correctamente",
      });
    } catch (error: any) {
      console.error('Error en generateOrderPDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF del pedido",
      });
    }
  }

  /**
   * Imprimir recibo de pago
   */
  static async printPayment(payment: any, customer: any, settings: any): Promise<void> {
    try {
      // Crear contenido HTML para impresión
      const printContent = document.createElement('div');
      printContent.className = 'payment-print-content';
      // Usamos un formato de página carta estándar en lugar de 80mm
      printContent.style.width = '210mm';
      printContent.style.boxSizing = 'border-box';
      printContent.style.padding = '10mm';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '12px';
      
      // Encabezado con datos de la empresa
      const companyName = settings?.name || 'Empresa';
      const rnc = settings?.rnc || '';
      const street = settings?.street || '';
      const streetNumber = settings?.streetNumber || '';
      const municipalityName = settings?.municipalityName || '';
      const provinceName = settings?.provinceName || '';
      const contactPhone = settings?.contactPhone || '';
      const email = settings?.email || '';
      
      printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${companyName}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">RNC: ${rnc}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">${street} ${streetNumber}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">${municipalityName}, ${provinceName}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">Tel: ${contactPhone}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">Email: ${email}</div>
        </div>
        <div style="border-top: 1px solid #000; margin: 10px 0;"></div>
      `;
      
      // Información del pago
      let formattedDate = '';
      try {
        formattedDate = new Date(payment.date).toLocaleDateString();
      } catch (e) {
        formattedDate = 'Fecha no disponible';
      }
      
      const businessname = customer?.businessname || "Cliente";
      const customerPhone = customer?.phone || "";
      const customerAddress = customer?.address || "";
      const customerMunicipality = customer?.municipality || "";
      const customerProvince = customer?.province || "";
      
      // Método de pago
      const paymentMethod = 
        payment.paymentMethod === 'cash' ? 'Efectivo' : 
        payment.paymentMethod === 'bank_transfer' ? 'Transferencia' : 
        payment.paymentMethod === 'check' ? 'Cheque' : 
        payment.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado';
      
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">RECIBO DE PAGO #${payment.id || 'N/A'}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Fecha:</strong> ${formattedDate}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Cliente:</strong> ${businessname}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Teléfono:</strong> ${customerPhone}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Dirección:</strong> ${customerAddress}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;">${customerMunicipality}, ${customerProvince}</div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      `;
      
      // Detalles del pago
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">DETALLES DEL PAGO</div>
      `;
      
      // Datos de factura/s
      if (payment.invoiceId) {
        printContent.innerHTML += `
          <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Factura:</strong> #${payment.invoiceId}</div>
        `;
      }
      
      // Método y referencia
      printContent.innerHTML += `
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Método:</strong> ${paymentMethod}</div>
      `;
      
      if (payment.reference) {
        printContent.innerHTML += `
          <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Referencia:</strong> ${payment.reference}</div>
        `;
      }
      
      // Separador
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 10px 0;"></div>`;
      
      // Monto
      const amount = parseFloat(payment.amount || 0);
      
      printContent.innerHTML += `
        <div style="text-align: center; font-size: 14px; font-weight: bold; margin: 10px 0;">
          MONTO PAGADO: RD$ ${amount.toFixed(2)}
        </div>
      `;
      
      // Notas (si hay)
      if (payment.notes) {
        printContent.innerHTML += `
          <div style="margin-top: 10px; font-size: 10px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Nota:</div>
            <div>${payment.notes}</div>
          </div>
        `;
      }
      
      // Espacio para firma
      printContent.innerHTML += `
        <div style="margin-top: 20px; text-align: center;">
          <div style="margin-bottom: 15px;">____________________________</div>
          <div>Firma</div>
        </div>
      `;
      
      // Separador final
      printContent.innerHTML += `
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 10px; font-size: 11px;">
          ¡Gracias por su compra!
        </div>
      `;
      
      // Imprimir usando el método genérico
      await this.printDocument(printContent, {
        title: `Recibo de Pago #${payment.id || 'N/A'}`,
        size: [210, 297], // Tamaño carta estándar (A4)
      });
    } catch (error: any) {
      console.error('Error en printPayment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al imprimir el recibo de pago",
      });
    }
  }

  /**
   * Generar PDF de recibo de pago
   */
  static async generatePaymentPDF(payment: any, customer: any, settings: any): Promise<void> {
    try {
      // Usar generación directa para consistencia
      await this.generatePDFDirect(
        payment,
        DocumentType.PAYMENT,
        {
          title: `Recibo de Pago #${payment.id || 'N/A'}`,
          size: [210, 297], // Tamaño carta estándar (A4)
          fileName: `ReciboPago-${payment.id || 'N/A'}.pdf`
        },
        {
          settings,
          customer
        }
      );
    } catch (error: any) {
      console.error('Error en generatePaymentPDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF del recibo de pago",
      });
    }
  }
}