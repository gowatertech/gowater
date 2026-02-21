// Servicio para impresión de tickets de pedidos
// Este servicio implementa la funcionalidad de impresión usando el enfoque iframe
// que funciona consistentemente tanto en móviles como en escritorio

import { formatDateRD } from "@/lib/date-utils";

/**
 * Genera un ticket de pedido e invoca la impresión
 * @param order Datos del pedido
 * @param orderItems Items del pedido
 * @param customer Cliente
 * @param companySettings Configuración de la empresa
 * @param products Lista de productos para obtener nombres
 * @param toast Función para mostrar notificaciones
 */
export const printOrderTicket = (
  order: any,
  orderItems: any[],
  customer: any,
  companySettings: any,
  products: any[],
  toast: any
) => {
  try {
    // Verificar que tengamos los datos necesarios
    if (!order || !orderItems || !companySettings) {
      throw new Error("Datos insuficientes para generar el ticket");
    }

    // Notificar al usuario
    toast({
      title: "Generando ticket",
      description: "Preparando documento para impresión...",
    });
    
    // Generar el contenido HTML del ticket
    const printContent = document.createElement('div');
    printContent.style.width = '80mm'; // Ancho estándar para tickets térmicos (3 pulgadas)
    printContent.style.boxSizing = 'border-box';
    printContent.style.padding = '5mm';
    printContent.style.margin = '0 auto';
    printContent.style.fontFamily = 'Arial, sans-serif';
    printContent.style.fontSize = '10px';
    
    // Encabezado: Información de la empresa
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '10px';
    
    // Asegurarse de que todos los valores existan antes de usarlos
    const companyName = companySettings.name || 'Empresa';
    const rnc = companySettings.rnc || '';
    const street = companySettings.street || '';
    const streetNumber = companySettings.streetNumber || '';
    const municipalityName = companySettings.municipalityName || '';
    const provinceName = companySettings.provinceName || '';
    const contactPhone = companySettings.contactPhone || '';
    const email = companySettings.email || '';
    
    header.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${companyName}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${rnc}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">${street} ${streetNumber}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">${municipalityName}, ${provinceName}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${contactPhone}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">Email: ${email}</div>
    `;
    printContent.appendChild(header);
    
    // Separador
    const separator = document.createElement('div');
    separator.style.borderBottom = '1px dashed #000';
    separator.style.margin = '10px 0';
    printContent.appendChild(separator);
    
    // Título e información del pedido
    const orderInfo = document.createElement('div');
    orderInfo.style.marginBottom = '10px';
    orderInfo.style.fontSize = '11px';
    
    // Asegurarse de que la fecha es válida
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
    
    const businessname = customer?.businessname || "Cliente";
    const customerPhone = order.customerPhone || "";
    const customerAddress = order.customerAddress || "";
    const orderMunicipalityName = order.municipalityName || "";
    const orderProvinceName = order.provinceName || "";
    
    orderInfo.innerHTML = `
      <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">PEDIDO #${order.id || 'N/A'}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Fecha:</strong> ${formattedDate}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Cliente:</strong> ${businessname}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Teléfono:</strong> ${customerPhone}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Dirección:</strong> ${customerAddress}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;">${orderMunicipalityName}, ${orderProvinceName}</div>
    `;
    printContent.appendChild(orderInfo);
    
    // Otro separador
    const separator2 = document.createElement('div');
    separator2.style.borderBottom = '1px dashed #000';
    separator2.style.margin = '10px 0';
    printContent.appendChild(separator2);
    
    // Tabla de productos
    printContent.innerHTML += `
      <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">DETALLE DEL PEDIDO</div>
    `;
    
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '10px';
    
    // Crear tabla HTML con validación de datos
    let tableHtml = `
      <thead>
        <tr style="border-bottom: 1px solid #ddd;">
          <th style="text-align: left; padding: 3px;">Producto</th>
          <th style="text-align: center; padding: 3px;">Cant.</th>
          <th style="text-align: right; padding: 3px;">Precio</th>
          <th style="text-align: right; padding: 3px;">Total</th>
        </tr>
      </thead>
      <tbody>
    `;
    
    // Asegurarse de que orderItems es un array y ordenar por nombre de producto
    if (Array.isArray(orderItems)) {
      const sortedItems = [...orderItems].filter(Boolean).sort((a: any, b: any) => {
        const nameA = products?.find((p: any) => p?.id === a?.productId)?.name || "Producto";
        const nameB = products?.find((p: any) => p?.id === b?.productId)?.name || "Producto";
        return nameA.localeCompare(nameB);
      });
      sortedItems.forEach((item: any) => {
        const product = products?.find((p: any) => p?.id === item?.productId);
        const productName = product?.name || "Producto";
        const quantity = item?.quantity || 0;
        const price = parseFloat(item?.unitPrice || item?.price || 0);
        const total = parseFloat(item?.total || (price * quantity).toString());
        
        tableHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="text-align: left; padding: 3px;">${productName}</td>
            <td style="text-align: center; padding: 3px;">${quantity}</td>
            <td style="text-align: right; padding: 3px;">RD$${price.toFixed(2)}</td>
            <td style="text-align: right; padding: 3px;">RD$${total.toFixed(2)}</td>
          </tr>
        `;
      });
    }
    
    tableHtml += `</tbody>`;
    table.innerHTML = tableHtml;
    printContent.appendChild(table);
    
    // Separador antes de totales
    const separator3 = document.createElement('div');
    separator3.style.borderBottom = '1px dashed #000';
    separator3.style.margin = '10px 0';
    printContent.appendChild(separator3);
    
    // Calcular totales con validación
    let subtotal = 0;
    let itbis = 0;
    let total = 0;
    
    try {
      // Calcular subtotal sumando los totales de todos los items
      if (Array.isArray(orderItems)) {
        subtotal = orderItems.reduce((sum, item) => {
          const itemTotal = parseFloat(item?.total || 0);
          return sum + itemTotal;
        }, 0);
      }
      
      // Calcular ITBIS usando la tasa de impuesto de la configuración
      const taxRate = parseFloat(companySettings?.tax || "0") / 100;
      itbis = subtotal * taxRate;
      
      // El total es subtotal + ITBIS
      total = subtotal + itbis;
    } catch (e) {
      console.error("Error calculando totales:", e);
    }
    
    // Totales
    const totalsDiv = document.createElement('div');
    totalsDiv.style.marginTop = '10px';
    totalsDiv.style.fontSize = '11px';
    totalsDiv.innerHTML = `
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
    `;
    printContent.appendChild(totalsDiv);
    
    // Notas (si hay)
    if (order.notes) {
      const notesDiv = document.createElement('div');
      notesDiv.style.marginTop = '10px';
      notesDiv.style.fontSize = '10px';
      notesDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 3px;">Nota del Pedido:</div>
        <div>${order.notes}</div>
      `;
      printContent.appendChild(notesDiv);
    }
    
    // Separador final
    const separator4 = document.createElement('div');
    separator4.style.borderBottom = '1px dashed #000';
    separator4.style.margin = '10px 0';
    printContent.appendChild(separator4);
    
    // Mensaje de agradecimiento
    const thankYouMsg = document.createElement('div');
    thankYouMsg.style.textAlign = 'center';
    thankYouMsg.style.marginTop = '10px';
    thankYouMsg.style.fontSize = '11px';
    thankYouMsg.textContent = '¡Gracias por su compra!';
    printContent.appendChild(thankYouMsg);
    
    // Crear un iframe para impresión
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    // Asegurarse de que el iframe tiene un document válido
    if (!iframe.contentWindow || !iframe.contentDocument) {
      throw new Error("No se pudo crear el área de impresión");
    }
    
    // Escribir el contenido HTML en el iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${order.id || 'N/A'}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              width: 80mm;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    iframe.contentDocument.close();
    
    // Dar tiempo para que el contenido se renderice antes de imprimir
    setTimeout(() => {
      try {
        if (!iframe.contentWindow) {
          throw new Error("No se pudo acceder al área de impresión");
        }
        
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Notificar al usuario
        toast({
          title: "Imprimiendo ticket",
          description: "El documento se ha enviado a la impresora",
        });
        
        // Limpiar después de imprimir
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      } catch (printError) {
        console.error('Error al imprimir:', printError);
        toast({
          variant: "destructive",
          title: "Error de impresión",
          description: "No se pudo enviar a la impresora: " + (printError instanceof Error ? printError.message : "Error desconocido"),
        });
        document.body.removeChild(iframe);
      }
    }, 500);
    
  } catch (error: any) {
    console.error('Error en printOrderTicket:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Error al generar el ticket",
    });
  }
};

/**
 * Genera un PDF con el formato de ticket y lo descarga
 * @param order Datos del pedido
 * @param orderItems Items del pedido
 * @param customer Cliente
 * @param companySettings Configuración de la empresa
 * @param products Lista de productos para obtener nombres
 * @param toast Función para mostrar notificaciones
 * @param jsPDF Referencia a la librería jsPDF
 */
export const generateOrderPdf = (
  order: any,
  orderItems: any[],
  customer: any,
  companySettings: any,
  products: any[],
  toast: any,
  jsPDF: any
) => {
  try {
    // Verificar datos necesarios
    if (!order || !companySettings || !jsPDF) {
      throw new Error("Faltan datos necesarios para generar el PDF");
    }
    
    // Notificar al usuario
    toast({
      title: "Generando PDF",
      description: "Preparando documento...",
    });

    // Crear un documento PDF (tamaño ticket térmico)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297], // 80mm de ancho x altura automática
      hotfixes: ['px_scaling'], // Fix para escala de píxeles
    });
    
    // Valores seguros para datos que podrían ser null/undefined
    const companyName = companySettings.name || 'Empresa';
    const rnc = companySettings.rnc || '';
    const street = companySettings.street || '';
    const streetNumber = companySettings.streetNumber || '';
    const companyMunicipality = companySettings.municipalityName || '';
    const companyProvince = companySettings.provinceName || '';
    const contactPhone = companySettings.contactPhone || '';
    const email = companySettings.email || '';
    
    // Configuración de fuentes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    
    // Encabezado: Nombre de la empresa
    doc.text(companyName, 40, 10, { align: 'center' });
    
    // Información de la empresa
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Escribir la información de la empresa
    doc.text(`RNC: ${rnc}`, 40, 15, { align: 'center' });
    doc.text(`${street} ${streetNumber}`, 40, 19, { align: 'center' });
    doc.text(`${companyMunicipality}, ${companyProvince}`, 40, 23, { align: 'center' });
    doc.text(`Tel: ${contactPhone}`, 40, 27, { align: 'center' });
    doc.text(`Email: ${email}`, 40, 31, { align: 'center' });
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.line(5, 34, 75, 34);
    
    // Datos seguros del pedido
    const orderId = order.id || 'N/A';
    const businessname = customer?.businessname || "Cliente";
    const customerPhone = order.customerPhone || "";
    const customerAddress = order.customerAddress || "";
    const orderMunicipalityName = order.municipalityName || "";
    const orderProvinceName = order.provinceName || "";
    
    // Detalles del pedido
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`PEDIDO #${orderId}`, 40, 38, { align: 'center' });
    
    // Asegurarse de que la fecha es válida
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
    
    // Información del cliente y pedido
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${formattedDate}`, 15, 43);
    doc.text(`Cliente: ${businessname}`, 15, 47);
    doc.text(`Teléfono: ${customerPhone}`, 15, 51);
    doc.text(`Dirección: ${customerAddress}`, 15, 55);
    doc.text(`${orderMunicipalityName}, ${orderProvinceName}`, 15, 59);
    
    // Notas del pedido si existen
    let yPosition = 63;
    if (order.notes) {
      doc.text(`Notas: ${order.notes}`, 15, yPosition);
      yPosition += 4;
    }
    
    // Otra línea separadora
    doc.setDrawColor(200);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 4;
    
    // Encabezado de productos
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLE DE PRODUCTOS", 40, yPosition, { align: 'center' });
    yPosition += 5;
    
    // Columnas de la tabla
    doc.setFontSize(7);
    doc.text("Producto", 5, yPosition);
    doc.text("Cant.", 35, yPosition, { align: 'center' });
    doc.text("Precio", 55, yPosition, { align: 'right' });
    doc.text("Total", 75, yPosition, { align: 'right' });
    yPosition += 2;
    
    // Línea bajo los encabezados
    doc.setDrawColor(200);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 5;
    
    // Productos
    doc.setFont('helvetica', 'normal');
    
    // Asegurarse de que orderItems es un array válido y ordenar por nombre de producto
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      const sortedItems = [...orderItems].filter(Boolean).sort((a: any, b: any) => {
        const nameA = products?.find((p: any) => p?.id === a?.productId)?.name || "Producto";
        const nameB = products?.find((p: any) => p?.id === b?.productId)?.name || "Producto";
        return nameA.localeCompare(nameB);
      });
      sortedItems.forEach((item: any) => {
        const product = products?.find((p: any) => p?.id === item?.productId);
        const productName = product?.name || "Producto";
        const quantity = item?.quantity || 0;
        const price = parseFloat(item?.unitPrice || item?.price || 0);
        const total = parseFloat(item?.total || (price * quantity).toString());
        
        let displayName = productName;
        if (displayName.length > 18) {
          displayName = displayName.substring(0, 16) + "...";
        }
        
        doc.text(displayName, 5, yPosition);
        doc.text(`${quantity}`, 35, yPosition, { align: 'center' });
        doc.text(`RD$${price.toFixed(2)}`, 55, yPosition, { align: 'right' });
        doc.text(`RD$${total.toFixed(2)}`, 75, yPosition, { align: 'right' });
        
        yPosition += 5;
      });
    } else {
      // Si no hay items o no es un array
      doc.text("No hay productos", 40, yPosition, { align: 'center' });
      yPosition += 5;
    }
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 5;
    
    // Calcular totales con validación
    let subtotal = 0;
    let itbis = 0;
    let total = 0;
    
    try {
      // Calcular subtotal sumando los totales de todos los items
      if (Array.isArray(orderItems)) {
        subtotal = orderItems.reduce((sum, item) => {
          const itemTotal = parseFloat(item?.total || 0);
          return sum + itemTotal;
        }, 0);
      }
      
      // Calcular ITBIS usando la tasa de impuesto de la configuración
      const taxRate = parseFloat(companySettings?.tax || "0") / 100;
      itbis = subtotal * taxRate;
      
      // El total es subtotal + ITBIS
      total = subtotal + itbis;
    } catch (e) {
      console.error("Error calculando totales:", e);
    }
    
    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text(`SUBTOTAL: RD$${subtotal.toFixed(2)}`, 75, yPosition, { align: 'right' });
    yPosition += 5;
    
    // ITBIS
    doc.text(`ITBIS: RD$${itbis.toFixed(2)}`, 75, yPosition, { align: 'right' });
    yPosition += 5;
    
    // Total
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: RD$${total.toFixed(2)}`, 75, yPosition, { align: 'right' });
    yPosition += 10;
    
    // Mensaje final
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("¡Gracias por su compra!", 40, yPosition, { align: 'center' });
    
    try {
      // Guardar PDF
      doc.save(`Pedido-${orderId}.pdf`);
    
      // Notificar al usuario
      toast({
        title: "PDF generado",
        description: `El archivo "Pedido-${orderId}.pdf" se ha descargado correctamente.`,
      });
    } catch (saveError) {
      console.error("Error al guardar el PDF:", saveError);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el archivo PDF."
      });
    }
  } catch (error: any) {
    console.error("Error en generateOrderPdf:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Error al generar el PDF",
    });
  }
};