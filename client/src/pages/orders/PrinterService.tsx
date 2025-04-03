// Servicio para impresión de tickets de pedidos
// Este servicio implementa la funcionalidad de impresión usando el enfoque iframe
// que funciona consistentemente tanto en móviles como en escritorio

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
    // Notificar al usuario
    toast({
      title: "Generando ticket",
      description: "Preparando documento para impresión...",
    });
    
    // Generar el contenido HTML del ticket
    const printContent = document.createElement('div');
    printContent.style.width = '74mm';
    printContent.style.boxSizing = 'border-box';
    printContent.style.padding = '0';
    printContent.style.margin = '0';
    printContent.style.fontFamily = 'Arial, sans-serif';
    printContent.style.fontSize = '10px';
    
    // Encabezado: Información de la empresa
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '10px';
    
    header.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${companySettings.name}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">RNC: ${companySettings.rnc}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">${companySettings.street} ${companySettings.streetNumber}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">${companySettings.municipalityName}, ${companySettings.provinceName}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">Tel: ${companySettings.contactPhone}</div>
      <div style="font-size: 11px; margin-bottom: 2px;">Email: ${companySettings.email}</div>
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
    
    orderInfo.innerHTML = `
      <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px;">PEDIDO #${order.id}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Fecha:</strong> ${new Date(order.date).toLocaleDateString()}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Cliente:</strong> ${customer?.businessname || "Cliente"}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Teléfono:</strong> ${order.customerPhone || ""}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;"><strong>Dirección:</strong> ${order.customerAddress}</div>
      <div style="margin-bottom: 3px; padding-left: 15px;">${order.municipalityName || ""}, ${order.provinceName || ""}</div>
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
    
    table.innerHTML = `
      <thead>
        <tr style="border-bottom: 1px solid #ddd;">
          <th style="text-align: left; padding: 3px;">Producto</th>
          <th style="text-align: center; padding: 3px;">Cant.</th>
          <th style="text-align: right; padding: 3px;">Precio</th>
          <th style="text-align: right; padding: 3px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${orderItems.map((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          const total = parseFloat(item.price) * item.quantity;
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="text-align: left; padding: 3px;">${product?.name || "Producto"}</td>
              <td style="text-align: center; padding: 3px;">${item.quantity}</td>
              <td style="text-align: right; padding: 3px;">RD$${parseFloat(item.price).toFixed(2)}</td>
              <td style="text-align: right; padding: 3px;">RD$${total.toFixed(2)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;
    printContent.appendChild(table);
    
    // Separador antes de totales
    const separator3 = document.createElement('div');
    separator3.style.borderBottom = '1px dashed #000';
    separator3.style.margin = '10px 0';
    printContent.appendChild(separator3);
    
    // Calcular totales
    const subtotal = parseFloat(order.subtotal || order.total);
    const itbis = parseFloat(order.tax || '0');
    const total = parseFloat(order.total);
    
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
    
    // Usar iframe para todos los dispositivos (desktop y móvil)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(`
    <html>
      <head>
        <title>Pedido #${order.id}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            @page { size: 80mm 297mm; margin: 0; }
          }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
      </body>
    </html>
    `);
    iframe.contentDocument?.close();
    
    // Imprimir después de que el iframe cargue
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
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
          description: "No se pudo enviar a la impresora",
        });
        document.body.removeChild(iframe);
      }
    };
    
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
      compress: false, // Evitar compresión que puede alterar el tamaño
    });
    
    // Configuración de fuentes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    
    // Encabezado: Nombre de la empresa
    doc.text(companySettings.name, 40, 10, { align: 'center' });
    
    // Información de la empresa
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const companyMunicipality = companySettings.municipalityName || "Cotuí";
    const companyProvince = companySettings.provinceName || "Sánchez Ramírez";
    
    // Escribir la información de la empresa
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
    
    // Información del cliente y pedido
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date(order.date).toLocaleDateString()}`, 15, 43);
    doc.text(`Cliente: ${customer?.businessname || "Cliente"}`, 15, 47);
    doc.text(`Teléfono: ${order.customerPhone || ""}`, 15, 51);
    doc.text(`Dirección: ${order.customerAddress}`, 15, 55);
    doc.text(`${order.municipalityName || ""}, ${order.provinceName || ""}`, 15, 59);
    
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
    
    orderItems.forEach((item: any) => {
      const productName = products.find((p: any) => p.id === item.productId)?.name || "Producto";
      const total = parseFloat(item.price) * item.quantity;
      
      // Asegurar que el texto del producto no exceda el ancho disponible
      let displayName = productName;
      if (productName.length > 18) {
        displayName = productName.substring(0, 16) + "...";
      }
      
      doc.text(displayName, 5, yPosition);
      doc.text(`${item.quantity}`, 35, yPosition, { align: 'center' });
      doc.text(`RD$${parseFloat(item.price).toFixed(2)}`, 55, yPosition, { align: 'right' });
      doc.text(`RD$${total.toFixed(2)}`, 75, yPosition, { align: 'right' });
      
      yPosition += 5;
    });
    
    // Línea separadora
    doc.setDrawColor(200);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 5;
    
    // Calcular subtotal e ITBIS
    const subtotal = parseFloat(order.subtotal || order.total);
    const itbis = parseFloat(order.tax || '0');
    const total = parseFloat(order.total);
    
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
    
    // Guardar PDF
    doc.save(`Pedido-${order.id}.pdf`);
    
    // Notificar al usuario
    toast({
      title: "PDF generado",
      description: `El archivo "Pedido-${order.id}.pdf" se ha descargado correctamente.`,
    });
  } catch (error: any) {
    console.error("Error en generateOrderPdf:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Error al generar el PDF",
    });
  }
};