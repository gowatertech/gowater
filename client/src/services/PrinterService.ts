import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';
import { formatDateRD } from '@/lib/date-utils';

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
  private static buildCompanyAddress(street: string, streetNumber: string): string {
    if (!street && !streetNumber) return '';
    if (!streetNumber) return street;
    if (street.toLowerCase().includes(streetNumber.toLowerCase())) return street;
    return `${street} ${streetNumber}`;
  }

  private static buildLocationLine(municipality: string, province: string): string {
    return [municipality, province].filter(Boolean).join(', ');
  }

  private static buildCustomerAddress(customer: any): string {
    const street = customer?.street || '';
    const streetNumber = customer?.streetnumber || '';
    const sector = customer?.sector || '';
    return [street, streetNumber, sector].filter(Boolean).join(' ');
  }

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
        const companyAddr = PrinterService.buildCompanyAddress(settings.street || '', settings.streetNumber || '');
        const companyLocation = PrinterService.buildLocationLine(settings.municipalityName || '', settings.provinceName || '');
        const contactPhone = settings.contactPhone || '';
        const email = settings.email || '';
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(companyName, 40, 10, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let hY = 15;
        doc.text(`RNC: ${rnc}`, 40, hY, { align: 'center' }); hY += 4;
        if (companyAddr) { doc.text(companyAddr, 40, hY, { align: 'center' }); hY += 4; }
        if (companyLocation) { doc.text(companyLocation, 40, hY, { align: 'center' }); hY += 4; }
        doc.text(`Tel: ${contactPhone}`, 40, hY, { align: 'center' }); hY += 4;
        doc.text(`Email: ${email}`, 40, hY, { align: 'center' });
        
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
      formattedDate = formatDateRD(invoice.date, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Cliente
    const customer = extraData.customer;
    const businessName = customer?.businessname || "Cliente";
    const custAddr = PrinterService.buildCustomerAddress(customer);
    const custLocation = PrinterService.buildLocationLine(
      customer?.municipalityName || customer?.municipality || "",
      customer?.provinceName || customer?.province || ""
    );
    const phone = customer?.phone || "";
    
    // Método de pago
    const paymentMethod = 
      invoice.paymentMethod === 'cash' ? 'Efectivo' : 
      invoice.paymentMethod === 'credit' ? 'Crédito' : 
      invoice.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado';
    
    doc.text(`Fecha: ${formattedDate}`, 10, yPos); yPos += 4;
    doc.text(`Cliente: ${businessName}`, 10, yPos); yPos += 4;
    doc.text(`Teléfono: ${phone}`, 10, yPos); yPos += 4;
    if (custAddr) { doc.text(`Dirección: ${custAddr}`, 10, yPos); yPos += 4; }
    if (custLocation) { doc.text(custLocation, 10, yPos); yPos += 4; }
    doc.text(`Método de pago: ${paymentMethod}`, 10, yPos); yPos += 4;
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Encabezado de productos
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLE DE LA FACTURA", 40, yPos, { align: 'center' });
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
      const sortedItems = [...items].filter(Boolean).sort((a, b) => {
        const nameA = a?.product?.name || products.find((p) => p?.id === a?.productId)?.name || "Producto";
        const nameB = b?.product?.name || products.find((p) => p?.id === b?.productId)?.name || "Producto";
        return nameA.localeCompare(nameB);
      });
      sortedItems.forEach((item) => {
        const productName = item?.product?.name || products.find((p: any) => p?.id === item?.productId)?.name || "Producto";
        const quantity = item?.quantity || 0;
        const price = parseFloat(item?.price || 0);
        const total = price * quantity;
        
        doc.text(productName, 5, yPos);
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
      doc.text("Nota de la Factura:", 5, yPos);
      yPos += 4;
      
      const maxWidth = 70;
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
      formattedDate = formatDateRD(order.date, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Cliente - convertimos todos los valores a String para prevenir errores
    const customer = extraData.customer || {};
    const businessName = String(customer?.businessname || order.customerName || "Cliente");
    const customerStreet = String(customer?.street || order.customerAddress || "");
    const customerStreetNumber = String(customer?.streetnumber || order.customerAddressNumber || "");
    const customerSector = String(customer?.sector || "");
    const fullAddress = [customerStreet, customerStreetNumber, customerSector].filter(Boolean).join(" ");
    const municipality = String(customer?.municipalityName || customer?.municipality || order.municipalityName || "");
    const province = String(customer?.provinceName || customer?.province || order.provinceName || "");
    const phone = String(customer?.phone || order.customerPhone || "");
    
    // Añadir información del cliente - mismo orden que la impresión
    doc.text(`Fecha: ${formattedDate}`, 10, yPos); yPos += 4;
    doc.text(`Cliente: ${businessName}`, 10, yPos); yPos += 4;
    doc.text(`Teléfono: ${phone}`, 10, yPos); yPos += 4;
    if (fullAddress) { doc.text(`Dirección: ${fullAddress}`, 10, yPos); yPos += 4; }
    const locationLine = PrinterService.buildLocationLine(municipality, province);
    if (locationLine) { doc.text(locationLine, 10, yPos); yPos += 4; }
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Encabezado de productos
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLE DEL PEDIDO", 40, yPos, { align: 'center' });
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
      const sortedItems = [...items].filter(Boolean).sort((a, b) => {
        const nameA = products.find((p) => p?.id === a?.productId)?.name || "Producto";
        const nameB = products.find((p) => p?.id === b?.productId)?.name || "Producto";
        return nameA.localeCompare(nameB);
      });
      sortedItems.forEach((item) => {
        const product = products.find((p) => p?.id === item?.productId);
        const productName = product?.name || "Producto";
        const quantity = item?.quantity || 0;
        const price = parseFloat(item?.unitPrice || item?.price || 0);
        const total = price * quantity;
        
        doc.text(productName, 5, yPos);
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
      // Calcular subtotal sumando los totales de todos los items
      if (Array.isArray(items) && items.length > 0) {
        subtotal = items.reduce((sum, item) => {
          const itemTotal = parseFloat(item?.total || 0);
          return sum + itemTotal;
        }, 0);
      }
      
      // Calcular ITBIS usando la tasa de impuesto de la configuración
      const settings = extraData.settings || {};
      const taxRate = parseFloat(settings?.tax || "0") / 100;
      itbis = subtotal * taxRate;
      
      // El total es subtotal + ITBIS
      total = subtotal + itbis;
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
      doc.text("Nota del Pedido:", 5, yPos);
      yPos += 4;
      
      const maxWidth = 70;
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
    // Sanitizamos los datos para prevenir errores
    const safePayment = {
      id: String(payment?.id || 'N/A'),
      date: payment?.date || new Date().toISOString(),
      amount: String(payment?.amount || '0'),
      method: String(payment?.method || 'cash'),
      paymentMethod: String(payment?.paymentMethod || payment?.method || 'cash'),
      customerName: String(payment?.customerName || 'Cliente'),
      invoiceId: payment?.invoiceId ? String(payment.invoiceId) : '',
      reference: String(payment?.reference || ''),
      notes: String(payment?.notes || '')
    };
    
    // Título
    let yPos = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECIBO DE PAGO #${safePayment.id}`, 40, yPos, { align: 'center' });
    yPos += 5;
    
    // Datos del cliente y pago
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Fecha
    let formattedDate = '';
    try {
      formattedDate = formatDateRD(safePayment.date, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Cliente - convertimos todos los valores a String para prevenir errores
    const customer = extraData.customer || {};
    const businessName = String(customer?.businessname || safePayment.customerName);
    const paymentCustAddr = PrinterService.buildCustomerAddress(customer);
    const paymentCustLocation = PrinterService.buildLocationLine(
      String(customer?.municipalityName || customer?.municipality || ""),
      String(customer?.provinceName || customer?.province || "")
    );
    const phone = String(customer?.phone || "");
    
    // Método de pago
    const paymentMethod = 
      safePayment.paymentMethod === 'cash' ? 'Efectivo' : 
      safePayment.paymentMethod === 'bank_transfer' ? 'Transferencia' : 
      safePayment.paymentMethod === 'check' ? 'Cheque' : 
      safePayment.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado';
    
    doc.text(`Fecha: ${formattedDate}`, 10, yPos); yPos += 4;
    doc.text(`Cliente: ${businessName}`, 10, yPos); yPos += 4;
    if (paymentCustAddr) { doc.text(`Dirección: ${paymentCustAddr}`, 10, yPos); yPos += 4; }
    if (paymentCustLocation) { doc.text(paymentCustLocation, 10, yPos); yPos += 4; }
    if (phone) {
      doc.text(`Teléfono: ${phone}`, 10, yPos); yPos += 4;
    }
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Encabezado de detalles
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLES DEL PAGO", 40, yPos, { align: 'center' });
    yPos += 8;
    
    // Detalles del pago
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Datos de factura/s
    if (safePayment.invoiceId) {
      doc.text(`Factura: #${safePayment.invoiceId}`, 10, yPos);
      yPos += 4;
    }
    
    // Monto y método
    doc.text(`Método de pago: ${paymentMethod}`, 10, yPos);
    yPos += 4;
    
    if (safePayment.reference) {
      doc.text(`Referencia: ${safePayment.reference}`, 10, yPos);
      yPos += 4;
    }
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Monto total
    const amount = parseFloat(safePayment.amount || "0");
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`MONTO PAGADO: RD$${amount.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 10;
    
    // Notas (si hay)
    if (safePayment.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Nota:", 5, yPos);
      yPos += 4;
      
      // Dividir notas en líneas si son muy largas
      const maxWidth = 70; // Ancho máximo en mm para notas
      const splitNotes = doc.splitTextToSize(safePayment.notes, maxWidth);
      
      doc.text(splitNotes, 5, yPos);
      yPos += splitNotes.length * 4;
    }
    
    // Línea para firma
    yPos += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("Firma: _______________________", 40, yPos, { align: 'center' });
    
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
    // Detectar si es un anticipo
    const isAdvance = payment.isAdvance || (payment.documentNumber && payment.documentNumber.startsWith('ANT-'));
    
    // Título
    let yPos = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(isAdvance ? `RECIBO DE ANTICIPO` : `RECIBO DE PAGO`, 40, yPos, { align: 'center' });
    yPos += 5;
    
    // Badge de anticipo
    if (isAdvance) {
      doc.setFillColor(220, 252, 231); // Verde claro
      doc.rect(25, yPos, 30, 5, 'F');
      doc.setTextColor(22, 163, 74); // Verde oscuro
      doc.setFontSize(8);
      doc.text('PAGO ANTICIPADO', 40, yPos + 3.5, { align: 'center' });
      doc.setTextColor(0, 0, 0); // Resetear a negro
      yPos += 8;
    }
    
    // Datos del pago
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Fecha
    let formattedDate = '';
    try {
      formattedDate = formatDateRD(payment.date, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      formattedDate = 'Fecha no disponible';
    }
    
    // Método de pago
    const paymentMethod = 
      payment.paymentMethod === 'cash' || payment.method === 'cash' ? 'Efectivo' : 
      payment.paymentMethod === 'transfer' || payment.method === 'transfer' ? 'Transferencia' : 
      payment.paymentMethod === 'check' || payment.method === 'check' ? 'Cheque' : 
      payment.paymentMethod === 'card' || payment.method === 'card' ? 'Tarjeta' : 
      payment.paymentMethod === 'credit' || payment.method === 'credit' ? 'Crédito' : 'No especificado';
    
    // Información básica del pago
    doc.text(`Fecha: ${formattedDate}`, 10, yPos); yPos += 4;
    
    if (payment.customerName) {
      doc.text(`Cliente: ${payment.customerName}`, 10, yPos);
      yPos += 4;
    }
    
    // Mostrar documentNumber para anticipos o invoiceNumber para pagos regulares
    if (isAdvance && payment.documentNumber) {
      doc.text(`Documento: ${payment.documentNumber}`, 10, yPos);
      yPos += 4;
    } else if (payment.invoiceNumber) {
      doc.text(`Factura #: ${payment.invoiceNumber}`, 10, yPos);
      yPos += 4;
    }
    
    doc.text(`Método de pago: ${paymentMethod}`, 10, yPos);
    yPos += 4;
    
    // Referencia si existe
    if (payment.reference) {
      doc.text(`Referencia: ${payment.reference}`, 10, yPos);
      yPos += 4;
    }
    
    // Línea separadora
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(5, yPos, 75, yPos);
    yPos += 5;
    
    // Monto total en grande y destacado
    const amount = parseFloat(payment.amount || 0);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(isAdvance ? `MONTO ANTICIPO:` : `MONTO PAGADO:`, 10, yPos);
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
    
    // Nota especial para anticipos
    if (isAdvance) {
      yPos += 5;
      doc.setFillColor(219, 234, 254); // Azul claro
      doc.rect(5, yPos - 2, 70, 10, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Nota:', 7, yPos + 1);
      doc.setFont('helvetica', 'normal');
      const advanceNote = 'Este anticipo será aplicado a futuras compras del cliente.';
      const splitAdvanceNote = doc.splitTextToSize(advanceNote, 60);
      doc.text(splitAdvanceNote, 7, yPos + 4.5);
      yPos += 12;
    }
    
    return yPos;
  }
  
  // ----- MÉTODOS ESPECÍFICOS PARA CADA TIPO DE DOCUMENTO -----

  /**
   * Imprimir factura
   */
  static async printInvoice(invoice: any, settings: any, customers: any = [], items: any = []): Promise<void> {
    try {
      const customer = customers.find((c: any) => c.id === invoice.customerId);

      const printContent = document.createElement('div');
      printContent.className = 'invoice-print-content';
      printContent.style.width = '80mm';
      printContent.style.boxSizing = 'border-box';
      printContent.style.padding = '5mm';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '10px';

      const companyName = settings?.name || 'Empresa';
      const rnc = settings?.rnc || '';
      const companyAddr = PrinterService.buildCompanyAddress(settings?.street || '', settings?.streetNumber || '');
      const companyLocation = PrinterService.buildLocationLine(settings?.municipalityName || '', settings?.provinceName || '');
      const contactPhone = settings?.contactPhone || '';
      const email = settings?.email || '';

      let formattedDate = '';
      try {
        formattedDate = formatDateRD(invoice.date, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (e) {
        formattedDate = 'Fecha no disponible';
      }

      const businessname = customer?.businessname || 'Cliente';
      const customerPhone = customer?.phone || '';
      const invoiceCustomerAddr = PrinterService.buildCustomerAddress(customer);
      const invoiceCustomerLocation = PrinterService.buildLocationLine(
        customer?.municipalityName || customer?.municipality || '',
        customer?.provinceName || customer?.province || ''
      );
      const paymentMethod =
        invoice.paymentMethod === 'cash' ? 'Efectivo' :
        invoice.paymentMethod === 'credit' ? 'Crédito' :
        invoice.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado';

      let productRows = '';
      let subtotal = 0;

      if (Array.isArray(items) && items.length > 0) {
        const sortedPrintItems = [...items].filter(Boolean).sort((a: any, b: any) => {
          const nameA = a?.product?.name || "Producto";
          const nameB = b?.product?.name || "Producto";
          return nameA.localeCompare(nameB);
        });
        sortedPrintItems.forEach((item: any) => {
          const product = item?.product?.name || "Producto";
          const quantity = item?.quantity || 0;
          const price = parseFloat(item?.price || 0);
          const total = price * quantity;
          subtotal += total;

          productRows += `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="text-align: left; padding: 3px;">${product}</td>
              <td style="text-align: center; padding: 3px;">${quantity}</td>
              <td style="text-align: right; padding: 3px;">RD$${price.toFixed(2)}</td>
              <td style="text-align: right; padding: 3px;">RD$${total.toFixed(2)}</td>
            </tr>
          `;
        });
      } else {
        productRows = `<tr><td colspan="4" style="text-align: center; padding: 5px;">No hay productos</td></tr>`;
      }

      const itbis = subtotal * 0.18;
      const total = subtotal + itbis;

      let notesHtml = '';
      if (invoice.notes) {
        notesHtml = `
          <div style="margin-top: 10px; font-size: 10px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Nota de la Factura:</div>
            <div>${invoice.notes}</div>
          </div>
        `;
      }

      printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${companyName}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${rnc}</div>
          ${companyAddr ? `<div style="font-size: 11px; margin-bottom: 2px;">${companyAddr}</div>` : ''}
          ${companyLocation ? `<div style="font-size: 11px; margin-bottom: 2px;">${companyLocation}</div>` : ''}
          <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${contactPhone}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">Email: ${email}</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">FACTURA #${invoice.id || 'N/A'}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Fecha:</strong> ${formattedDate}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Cliente:</strong> ${businessname}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Teléfono:</strong> ${customerPhone}</div>
        ${invoiceCustomerAddr ? `<div style="margin-bottom: 3px; padding-left: 15px;"><strong>Dirección:</strong> ${invoiceCustomerAddr}</div>` : ''}
        ${invoiceCustomerLocation ? `<div style="margin-bottom: 3px; padding-left: 15px;">${invoiceCustomerLocation}</div>` : ''}
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Método de pago:</strong> ${paymentMethod}</div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">DETALLE DE LA FACTURA</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 3px;">Producto</th>
            <th style="text-align: center; padding: 3px;">Cant.</th>
            <th style="text-align: right; padding: 3px;">Precio</th>
            <th style="text-align: right; padding: 3px;">Total</th>
          </tr>
          ${productRows}
        </table>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="margin-top: 10px; font-size: 11px;">
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
        ${notesHtml}
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 10px; font-size: 11px;">
          ¡Gracias por su compra!
        </div>
      `;

      await this.printDocument(printContent, {
        title: `Factura #${invoice.id || 'N/A'}`,
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
      const printContent = document.createElement('div');
      printContent.className = 'order-print-content';
      printContent.style.width = '80mm';
      printContent.style.boxSizing = 'border-box';
      printContent.style.padding = '5mm';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '10px';

      const companyName = settings?.name || 'Empresa';
      const rnc = settings?.rnc || '';
      const companyAddr = PrinterService.buildCompanyAddress(settings?.street || '', settings?.streetNumber || '');
      const companyLocation = PrinterService.buildLocationLine(settings?.municipalityName || '', settings?.provinceName || '');
      const contactPhone = settings?.contactPhone || '';
      const email = settings?.email || '';

      let formattedDate = '';
      try {
        formattedDate = formatDateRD(order.date, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (e) {
        formattedDate = 'Fecha no disponible';
      }

      const businessname = customer?.businessname || order?.customerName || "Cliente";
      const customerPhone = customer?.phone || order?.customerPhone || "";
      const customerStreet = customer?.street || order?.customerAddress || "";
      const customerStreetNumber = customer?.streetnumber || order?.customerAddressNumber || "";
      const customerSector = customer?.sector || "";
      const fullAddress = [customerStreet, customerStreetNumber, customerSector].filter(Boolean).join(" ");
      const orderMunicipalityName = customer?.municipalityName || order?.municipalityName || "";
      const orderProvinceName = customer?.provinceName || order?.provinceName || "";
      const locationLine = PrinterService.buildLocationLine(orderMunicipalityName, orderProvinceName);

      let productRows = '';
      let subtotal = 0;
      let itbis = 0;
      let total = 0;

      if (Array.isArray(items) && items.length > 0) {
        const sortedItems = [...items].filter(Boolean).sort((a: any, b: any) => {
          const nameA = products?.find((p: any) => p?.id === a?.productId)?.name || "Producto";
          const nameB = products?.find((p: any) => p?.id === b?.productId)?.name || "Producto";
          return nameA.localeCompare(nameB);
        });
        sortedItems.forEach((item: any) => {
          const product = products?.find((p: any) => p?.id === item?.productId);
          const productName = product?.name || "Producto";
          const quantity = item?.quantity || 0;
          const price = parseFloat(item?.unitPrice || item?.price || 0);
          const itemTotal = price * quantity;

          productRows += `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="text-align: left; padding: 3px;">${productName}</td>
              <td style="text-align: center; padding: 3px;">${quantity}</td>
              <td style="text-align: right; padding: 3px;">RD$${price.toFixed(2)}</td>
              <td style="text-align: right; padding: 3px;">RD$${itemTotal.toFixed(2)}</td>
            </tr>
          `;
        });
      } else {
        productRows = `<tr><td colspan="4" style="text-align: center; padding: 5px;">No hay productos</td></tr>`;
      }

      try {
        if (Array.isArray(items) && items.length > 0) {
          subtotal = items.reduce((sum, item) => {
            const itemTotal = parseFloat(item?.total || 0);
            return sum + itemTotal;
          }, 0);
        }
        const taxRate = parseFloat(settings?.tax || "0") / 100;
        itbis = subtotal * taxRate;
        total = subtotal + itbis;
      } catch (e) {
        console.error("Error calculando totales:", e);
      }

      let notesHtml = '';
      if (order.notes) {
        notesHtml = `
          <div style="margin-top: 10px; font-size: 10px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Nota del Pedido:</div>
            <div>${order.notes}</div>
          </div>
        `;
      }

      printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${companyName}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${rnc}</div>
          ${companyAddr ? `<div style="font-size: 11px; margin-bottom: 2px;">${companyAddr}</div>` : ''}
          ${companyLocation ? `<div style="font-size: 11px; margin-bottom: 2px;">${companyLocation}</div>` : ''}
          <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${contactPhone}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">Email: ${email}</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">PEDIDO #${order?.id || 'N/A'}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Fecha:</strong> ${formattedDate}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Cliente:</strong> ${businessname}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Teléfono:</strong> ${customerPhone}</div>
        <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Dirección:</strong> ${fullAddress}</div>
        ${locationLine ? `<div style="margin-bottom: 3px; padding-left: 15px;">${locationLine}</div>` : ''}
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">DETALLE DEL PEDIDO</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 3px;">Producto</th>
            <th style="text-align: center; padding: 3px;">Cant.</th>
            <th style="text-align: right; padding: 3px;">Precio</th>
            <th style="text-align: right; padding: 3px;">Total</th>
          </tr>
          ${productRows}
        </table>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="margin-top: 10px; font-size: 11px;">
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
        ${notesHtml}
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 10px; font-size: 11px;">
          ¡Gracias por su compra!
        </div>
      `;

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
      // Sanitizar datos del pago para evitar errores
      const paymentData = {
        id: payment?.id || 'N/A',
        date: payment?.date || new Date().toISOString(),
        amount: payment?.amount || '0',
        method: payment?.method || 'cash',
        paymentMethod: payment?.paymentMethod || payment?.method || 'cash',
        customerName: payment?.customerName || 'Cliente',
        invoiceId: payment?.invoiceId || '',
        reference: payment?.reference || '',
        notes: payment?.notes || ''
      };

      // Sanitizar datos del cliente
      const customerData = customer ? {
        businessname: customer?.businessname || 'Cliente',
        phone: customer?.phone || '',
        address: customer?.address || '',
        municipality: customer?.municipality || '',
        province: customer?.province || ''
      } : {
        businessname: 'Cliente',
        phone: '',
        address: '',
        municipality: '',
        province: ''
      };

      // Crear contenido HTML para impresión
      const printContent = document.createElement('div');
      printContent.className = 'payment-print-content';
      // Usamos un formato de ticket 80mm
      printContent.style.width = '80mm';
      printContent.style.boxSizing = 'border-box';
      printContent.style.padding = '5mm';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '10px';
      
      // Encabezado con datos de la empresa
      const companyName = settings?.name || 'Empresa';
      const rnc = settings?.rnc || '';
      const companyAddr = PrinterService.buildCompanyAddress(settings?.street || '', settings?.streetNumber || '');
      const companyLocation = PrinterService.buildLocationLine(settings?.municipalityName || '', settings?.provinceName || '');
      const contactPhone = settings?.contactPhone || '';
      const email = settings?.email || '';
      
      printContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 3px;">${companyName}</div>
          <div style="font-size: 10px; margin-bottom: 1px;">RNC: ${rnc}</div>
          ${companyAddr ? `<div style="font-size: 10px; margin-bottom: 1px;">${companyAddr}</div>` : ''}
          ${companyLocation ? `<div style="font-size: 10px; margin-bottom: 1px;">${companyLocation}</div>` : ''}
          <div style="font-size: 10px; margin-bottom: 1px;">Tel: ${contactPhone}</div>
          <div style="font-size: 10px; margin-bottom: 1px;">Email: ${email}</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      `;
      
      // Información del pago
      let formattedDate = '';
      try {
        formattedDate = formatDateRD(paymentData.date, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (e) {
        formattedDate = 'Fecha no disponible';
      }
      
      const businessname = customerData.businessname;
      const customerPhone = customerData.phone;
      const rcptCustAddr = PrinterService.buildCustomerAddress(customer);
      const rcptCustLocation = PrinterService.buildLocationLine(
        customer?.municipalityName || customer?.municipality || '',
        customer?.provinceName || customer?.province || ''
      );
      
      const paymentMethod = 
        paymentData.paymentMethod === 'cash' ? 'Efectivo' : 
        paymentData.paymentMethod === 'bank_transfer' ? 'Transferencia' : 
        paymentData.paymentMethod === 'check' ? 'Cheque' : 
        paymentData.paymentMethod === 'card' ? 'Tarjeta' : 'No especificado';
      
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 5px;">RECIBO DE PAGO #${paymentData.id}</div>
        <div style="margin-bottom: 2px; font-size: 9px;"><strong>Fecha:</strong> ${formattedDate}</div>
        <div style="margin-bottom: 2px; font-size: 9px;"><strong>Cliente:</strong> ${businessname}</div>
        <div style="margin-bottom: 2px; font-size: 9px;"><strong>Teléfono:</strong> ${customerPhone}</div>
        ${rcptCustAddr ? `<div style="margin-bottom: 2px; font-size: 9px;"><strong>Dirección:</strong> ${rcptCustAddr}</div>` : ''}
        ${rcptCustLocation ? `<div style="margin-bottom: 2px; font-size: 9px;">${rcptCustLocation}</div>` : ''}
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      `;
      
      // Detalles del pago
      printContent.innerHTML += `
        <div style="text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 4px;">DETALLES DEL PAGO</div>
      `;
      
      // Datos de factura/s
      if (paymentData.invoiceId) {
        printContent.innerHTML += `
          <div style="margin-bottom: 2px; font-size: 9px;"><strong>Factura:</strong> #${paymentData.invoiceId}</div>
        `;
      }
      
      // Método y referencia
      printContent.innerHTML += `
        <div style="margin-bottom: 2px; font-size: 9px;"><strong>Método:</strong> ${paymentMethod}</div>
      `;
      
      if (paymentData.reference) {
        printContent.innerHTML += `
          <div style="margin-bottom: 2px; font-size: 9px;"><strong>Referencia:</strong> ${paymentData.reference}</div>
        `;
      }
      
      // Separador
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 5px 0;"></div>`;
      
      // Monto
      const amount = parseFloat(paymentData.amount || 0);
      
      printContent.innerHTML += `
        <div style="text-align: center; font-size: 12px; font-weight: bold; margin: 5px 0;">
          MONTO PAGADO: RD$ ${amount.toFixed(2)}
        </div>
      `;
      
      // Notas (si hay)
      if (paymentData.notes) {
        printContent.innerHTML += `
          <div style="margin-top: 5px; font-size: 8px;">
            <div style="font-weight: bold; margin-bottom: 2px;">Nota:</div>
            <div>${paymentData.notes}</div>
          </div>
        `;
      }
      
      // Espacio para firma
      printContent.innerHTML += `
        <div style="margin-top: 15px; text-align: center;">
          <div style="margin-bottom: 10px;">____________________________</div>
          <div style="font-size: 9px;">Firma</div>
        </div>
      `;
      
      // Separador final
      printContent.innerHTML += `
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        <div style="text-align: center; margin-top: 5px; font-size: 9px;">
          ¡Gracias por su compra!
        </div>
      `;
      
      // Imprimir usando el método genérico
      await this.printDocument(printContent, {
        title: `Recibo de Pago #${paymentData.id}`,
        size: [80, 200], // Tamaño ticket 80mm
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
      // Copiar y sanitizar el pago para evitar errores con valores nulos o undefined
      const paymentCopy = {
        id: Number(payment?.id || 0),
        date: payment?.date || new Date().toISOString(),
        amount: String(payment?.amount || '0'),
        method: String(payment?.method || 'cash'),
        customerName: String(payment?.customerName || 'Cliente'),
        invoiceNumber: String(payment?.invoiceNumber || ''),
        invoiceId: payment?.invoiceId ? Number(payment.invoiceId) : undefined,
        reference: String(payment?.reference || ''),
        notes: String(payment?.notes || '')
      };

      // Sanitizar datos del cliente
      const customerCopy = customer ? {
        id: Number(customer?.id || 0),
        businessname: String(customer?.businessname || 'Cliente'),
        phone: String(customer?.phone || ''),
        address: String(customer?.address || ''),
        municipality: String(customer?.municipality || ''),
        province: String(customer?.province || '')
      } : null;
      
      // Sanitizar configuración
      const safeSettings = settings ? { ...settings } : {};
      
      // Usar generación directa para consistencia en todos los dispositivos
      await this.generatePDFDirect(
        paymentCopy,
        DocumentType.PAYMENT,
        {
          title: `Recibo de Pago #${paymentCopy.id || 'N/A'}`,
          size: [80, 200], // Formato 80mm (formato de ticket)
          fileName: `ReciboPago-${paymentCopy.id || 'N/A'}.pdf`
        },
        {
          settings: safeSettings,
          customer: customerCopy
        }
      );
      
      toast({
        title: "PDF generado",
        description: "El PDF se ha generado correctamente",
      });
    } catch (error: any) {
      console.error('Error en generatePaymentPDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF del recibo de pago",
      });
    }
  }

  /**
   * Imprimir cuadre de caja diario
   */
  static async printCashReconciliation(reconciliation: any, settings: any): Promise<void> {
    try {
      const printContent = document.createElement('div');
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.fontSize = '10px';
      printContent.style.lineHeight = '1.4';
      printContent.style.padding = '5mm';
      printContent.style.width = '80mm';

      // Encabezado de la empresa (igual que en facturas)
      if (settings) {
        const companyName = settings.name || 'Empresa';
        const rnc = settings.rnc || '';
        const companyAddr = PrinterService.buildCompanyAddress(settings.street || '', settings.streetNumber || '');
        const companyLocation = PrinterService.buildLocationLine(settings.municipalityName || '', settings.provinceName || '');
        const contactPhone = settings.contactPhone || '';
        const email = settings.email || '';
        
        printContent.innerHTML += `
          <div style="text-align: center; margin-bottom: 10px;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 3px;">${companyName}</div>
            <div style="font-size: 9px;">RNC: ${rnc}</div>
            ${companyAddr ? `<div style="font-size: 9px;">${companyAddr}</div>` : ''}
            ${companyLocation ? `<div style="font-size: 9px;">${companyLocation}</div>` : ''}
            <div style="font-size: 9px;">Tel: ${contactPhone}</div>
            <div style="font-size: 9px;">Email: ${email}</div>
          </div>
        `;
      }
      
      // Separador
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 5px 0;"></div>`;
      
      // Título
      printContent.innerHTML += `
        <div style="text-align: center; font-size: 12px; font-weight: bold; margin: 10px 0;">
          CUADRE DE CAJA
        </div>
      `;
      
      // Fecha y usuario
      const formattedDate = formatDateRD(reconciliation.reconciliationDate, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      printContent.innerHTML += `
        <div style="margin-bottom: 10px;">
          <div style="font-size: 10px;"><strong>Fecha:</strong> ${formattedDate}</div>
          <div style="font-size: 10px;"><strong>Usuario:</strong> ${reconciliation.userName || 'N/A'}</div>
        </div>
      `;
      
      // Separador
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 5px 0;"></div>`;
      
      // RESULTADO DESTACADO AL INICIO
      const surplus = parseFloat(reconciliation.surplus);
      const shortage = parseFloat(reconciliation.shortage);
      const isBalanced = surplus === 0 && shortage === 0;
      
      let resultText = '';
      let resultStyle = '';
      if (isBalanced) {
        resultText = 'CUADRE PERFECTO';
        resultStyle = 'background: #10b981; color: white;';
      } else if (surplus > 0) {
        resultText = `SOBRANTE: RD$ ${surplus.toFixed(2)}`;
        resultStyle = 'background: #22c55e; color: white;';
      } else {
        resultText = `FALTANTE: RD$ ${shortage.toFixed(2)}`;
        resultStyle = 'background: #ef4444; color: white;';
      }
      
      printContent.innerHTML += `
        <div style="text-align: center; font-size: 14px; font-weight: bold; margin: 10px 0; padding: 10px; border-radius: 5px; ${resultStyle}">
          ${resultText}
        </div>
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
      `;
      
      // Resumen de Ventas
      printContent.innerHTML += `
        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; margin-bottom: 5px;">RESUMEN DE VENTAS</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Total Ventas:</span>
            <span style="font-weight: bold;">RD$ ${parseFloat(reconciliation.totalSales).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>FT a Crédito:</span>
            <span>RD$ ${parseFloat(reconciliation.creditInvoicesTotal).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>FT Efectivo:</span>
            <span>RD$ ${parseFloat(reconciliation.cashInvoicesTotal).toFixed(2)}</span>
          </div>
        </div>
      `;
      
      // Pagos Recibidos
      printContent.innerHTML += `
        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; margin-bottom: 5px;">PAGOS RECIBIDOS</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Total Pagos:</span>
            <span style="font-weight: bold;">RD$ ${parseFloat(reconciliation.totalPayments).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Recibos (RI):</span>
            <span>RD$ ${parseFloat(reconciliation.receiptsTotal).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Anticipos (ANT):</span>
            <span>RD$ ${parseFloat(reconciliation.advancesTotal).toFixed(2)}</span>
          </div>
        </div>
      `;
      
      // Separador
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 5px 0;"></div>`;
      
      // Cuadre de Efectivo
      printContent.innerHTML += `
        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; margin-bottom: 5px;">CUADRE DE EFECTIVO</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Efectivo Inicial:</span>
            <span>RD$ ${parseFloat(reconciliation.initialCash).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Efectivo Esperado:</span>
            <span style="font-weight: bold;">RD$ ${parseFloat(reconciliation.expectedCash).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Efectivo Real:</span>
            <span style="font-weight: bold;">RD$ ${parseFloat(reconciliation.actualCash).toFixed(2)}</span>
          </div>
        </div>
      `;
      
      // Información de agua (siempre mostrar)
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 5px 0;"></div>`;
      
      printContent.innerHTML += `
        <div style="margin-bottom: 5px;">
          <div style="font-weight: bold; margin-bottom: 3px;">AGUA PERDIDA</div>
          <div style="display: flex; justify-content: space-between;">
            <span>${parseInt(reconciliation.lostWaterGallons || '0')} galones</span>
            <span>RD$ ${parseFloat(reconciliation.lostWaterValue || '0').toFixed(2)}</span>
          </div>
        </div>
      `;
      
      printContent.innerHTML += `
        <div style="margin-bottom: 5px;">
          <div style="font-weight: bold; margin-bottom: 3px;">AGUA DONADA</div>
          <div style="display: flex; justify-content: space-between;">
            <span>${parseInt(reconciliation.donatedWaterGallons || '0')} galones</span>
            <span>RD$ ${parseFloat(reconciliation.donatedWaterValue || '0').toFixed(2)}</span>
          </div>
        </div>
      `;
      
      // Productos Vendidos (siempre mostrar)
      const productsSoldPrint = reconciliation.productsSold ? 
        (() => { try { return JSON.parse(reconciliation.productsSold); } catch { return {}; } })() : {};
      
      printContent.innerHTML += `<div style="border-top: 1px dashed #000; margin: 5px 0;"></div>`;
      printContent.innerHTML += `
        <div style="margin-bottom: 5px;">
          <div style="font-weight: bold; margin-bottom: 3px;">PRODUCTOS VENDIDOS</div>
          ${Object.keys(productsSoldPrint).length === 0 
            ? '<div style="font-size: 9px; color: #666;">No hay productos vendidos</div>'
            : Object.entries(productsSoldPrint).map(([productName, quantity]) => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>${productName}:</span>
                <span style="font-weight: bold;">${quantity}</span>
              </div>
            `).join('')}
        </div>
      `;
      
      // Notas
      if (reconciliation.notes) {
        printContent.innerHTML += `
          <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
          <div style="margin-top: 5px;">
            <div style="font-weight: bold; margin-bottom: 3px;">NOTAS:</div>
            <div style="font-size: 9px;">${reconciliation.notes}</div>
          </div>
        `;
      }
      
      // Separador final
      printContent.innerHTML += `
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 10px; font-size: 9px;">
          Cuadre generado el ${formatDateRD(new Date())}
        </div>
      `;
      
      // Imprimir
      await this.printDocument(printContent, {
        title: `Cuadre de Caja - ${formattedDate}`,
        size: [80, 200],
      });
    } catch (error: any) {
      console.error('Error en printCashReconciliation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al imprimir el cuadre de caja",
      });
    }
  }

  /**
   * Generar PDF de cuadre de caja
   */
  static async generateCashReconciliationPDF(reconciliation: any, settings: any): Promise<void> {
    try {
      toast({
        title: "Generando PDF",
        description: "Preparando documento...",
      });

      // Crear documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297],
        hotfixes: ['px_scaling'],
      });

      let yPos = 10;

      // Encabezado de la empresa (igual que en facturas)
      if (settings) {
        const companyName = settings.name || 'Empresa';
        const rnc = settings.rnc || '';
        const companyAddr = PrinterService.buildCompanyAddress(settings.street || '', settings.streetNumber || '');
        const companyLocation = PrinterService.buildLocationLine(settings.municipalityName || '', settings.provinceName || '');
        const contactPhone = settings.contactPhone || '';
        const email = settings.email || '';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(companyName, 40, yPos, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let cY = yPos + 5;
        doc.text(`RNC: ${rnc}`, 40, cY, { align: 'center' }); cY += 4;
        if (companyAddr) { doc.text(companyAddr, 40, cY, { align: 'center' }); cY += 4; }
        if (companyLocation) { doc.text(companyLocation, 40, cY, { align: 'center' }); cY += 4; }
        doc.text(`Tel: ${contactPhone}`, 40, cY, { align: 'center' }); cY += 4;
        doc.text(`Email: ${email}`, 40, cY, { align: 'center' }); cY += 3;

        doc.setDrawColor(200);
        doc.line(5, cY, 75, cY);
        yPos = cY + 4;
      }

      // Título
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CUADRE DE CAJA', 40, yPos, { align: 'center' });
      yPos += 7;

      // Fecha y usuario
      const formattedDate = formatDateRD(reconciliation.reconciliationDate, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${formattedDate}`, 10, yPos);
      yPos += 4;
      doc.text(`Usuario: ${reconciliation.userName || 'N/A'}`, 10, yPos);
      yPos += 6;

      // Línea
      doc.setDrawColor(200);
      doc.line(5, yPos, 75, yPos);
      yPos += 5;

      // RESULTADO DESTACADO AL INICIO
      const surplus = parseFloat(reconciliation.surplus);
      const shortage = parseFloat(reconciliation.shortage);
      const isBalanced = surplus === 0 && shortage === 0;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');

      // Rectángulo de fondo para el resultado
      if (isBalanced) {
        doc.setFillColor(16, 185, 129); // Verde esmeralda
      } else if (surplus > 0) {
        doc.setFillColor(34, 197, 94); // Verde
      } else {
        doc.setFillColor(239, 68, 68); // Rojo
      }
      doc.rect(5, yPos - 3, 70, 10, 'F'); // Rectángulo relleno

      doc.setTextColor(255, 255, 255); // Texto blanco
      if (isBalanced) {
        doc.text('CUADRE PERFECTO', 40, yPos + 3, { align: 'center' });
      } else if (surplus > 0) {
        doc.text(`SOBRANTE: RD$ ${surplus.toFixed(2)}`, 40, yPos + 3, { align: 'center' });
      } else {
        doc.text(`FALTANTE: RD$ ${shortage.toFixed(2)}`, 40, yPos + 3, { align: 'center' });
      }
      
      doc.setTextColor(0, 0, 0); // Volver a texto negro
      yPos += 12;

      // Línea separadora
      doc.setDrawColor(200);
      doc.line(5, yPos, 75, yPos);
      yPos += 5;

      // Resumen de Ventas
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN DE VENTAS', 10, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.text('Total Ventas:', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.totalSales).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 4;

      doc.text('FT a Crédito:', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.creditInvoicesTotal).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 4;

      doc.text('FT Efectivo:', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.cashInvoicesTotal).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 6;

      // Pagos Recibidos
      doc.setFont('helvetica', 'bold');
      doc.text('PAGOS RECIBIDOS', 10, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.text('Total Pagos:', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.totalPayments).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 4;

      doc.text('Recibos (RI):', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.receiptsTotal).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 4;

      doc.text('Anticipos (ANT):', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.advancesTotal).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 6;

      // Línea
      doc.setDrawColor(200);
      doc.line(5, yPos, 75, yPos);
      yPos += 5;

      // Cuadre de Efectivo
      doc.setFont('helvetica', 'bold');
      doc.text('CUADRE DE EFECTIVO', 10, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.text('Efectivo Inicial:', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.initialCash).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 4;

      doc.text('Efectivo Esperado:', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.expectedCash).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 4;

      doc.text('Efectivo Real:', 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.actualCash).toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 6;

      // Información de agua (siempre mostrar)
      doc.setDrawColor(200);
      doc.line(5, yPos, 75, yPos);
      yPos += 5;
      doc.setFontSize(8);

      doc.setFont('helvetica', 'bold');
      doc.text('AGUA PERDIDA', 10, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.text(`${parseInt(reconciliation.lostWaterGallons || '0')} galones`, 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.lostWaterValue || '0').toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 5;

      doc.setFont('helvetica', 'bold');
      doc.text('AGUA DONADA', 10, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.text(`${parseInt(reconciliation.donatedWaterGallons || '0')} galones`, 10, yPos);
      doc.text(`RD$ ${parseFloat(reconciliation.donatedWaterValue || '0').toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += 5;

      // Productos Vendidos (siempre mostrar)
      const productsSoldPdf = reconciliation.productsSold ? 
        (() => { try { return JSON.parse(reconciliation.productsSold); } catch { return {}; } })() : {};

      doc.setDrawColor(200);
      doc.line(5, yPos, 75, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'bold');
      doc.text('PRODUCTOS VENDIDOS', 10, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      const productEntries = Object.entries(productsSoldPdf);
      if (productEntries.length === 0) {
        doc.text('No hay productos vendidos', 10, yPos);
        yPos += 4;
      } else {
        productEntries.forEach(([productName, quantity]) => {
          doc.text(`${productName}:`, 10, yPos);
          doc.text(`${quantity}`, 75, yPos, { align: 'right' });
          yPos += 4;
        });
      }

      // Notas
      if (reconciliation.notes) {
        doc.setDrawColor(200);
        doc.line(5, yPos, 75, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('NOTAS:', 10, yPos);
        yPos += 4;

        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(reconciliation.notes, 70);
        doc.text(splitNotes, 10, yPos);
        yPos += splitNotes.length * 4;
      }

      // Pie de página
      yPos += 5;
      doc.setDrawColor(200);
      doc.line(5, yPos, 75, yPos);
      yPos += 5;

      doc.setFontSize(8);
      doc.text(`Cuadre generado el ${formatDateRD(new Date())}`, 40, yPos, { align: 'center' });

      // Guardar PDF
      const fileName = `CuadreCaja-${formattedDate.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF generado",
        description: `El archivo "${fileName}" se ha descargado correctamente.`,
      });
    } catch (error: any) {
      console.error('Error en generateCashReconciliationPDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al generar el PDF del cuadre de caja",
      });
    }
  }
}