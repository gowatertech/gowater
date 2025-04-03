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
    
    // Crear un iframe para la impresión (funciona tanto en móvil como en escritorio)
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);
    
    // Escribir el contenido directamente al iframe
    printFrame.contentDocument?.open();
    printFrame.contentDocument?.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido #${order.id}</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
            padding: 0;
          }
          
          body {
            margin: 0;
            padding: 5mm;
            width: 70mm;
            font-family: 'Arial', sans-serif;
            font-size: 10px;
            line-height: 1.2;
            background-color: white;
          }
          
          .ticket-header {
            text-align: center;
            margin-bottom: 5mm;
          }
          
          .ticket-header h1 {
            font-size: 14px;
            margin: 0 0 2mm 0;
          }
          
          .ticket-header p {
            margin: 0 0 1mm 0;
            font-size: 9px;
          }
          
          .separator {
            border-top: 1px dashed #000;
            margin: 3mm 0;
          }
          
          .order-info {
            margin-bottom: 3mm;
          }
          
          .order-info h2 {
            font-size: 12px;
            text-align: center;
            margin: 0 0 2mm 0;
          }
          
          .order-info p {
            margin: 0 0 1mm 0;
            font-size: 9px;
          }
          
          .products-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          
          .products-table th {
            text-align: left;
            border-bottom: 1px solid #ddd;
            padding: 1mm;
          }
          
          .products-table td {
            padding: 1mm;
          }
          
          .totals {
            margin-top: 3mm;
            text-align: right;
          }
          
          .totals div {
            margin-bottom: 1mm;
          }
          
          .notes {
            margin-top: 3mm;
            font-size: 9px;
          }
          
          .thank-you {
            text-align: center;
            margin-top: 5mm;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="ticket-header">
          <h1>${companySettings.name}</h1>
          <p>RNC: ${companySettings.rnc}</p>
          <p>${companySettings.street} ${companySettings.streetNumber}</p>
          <p>${companySettings.municipalityName}, ${companySettings.provinceName}</p>
          <p>Tel: ${companySettings.contactPhone}</p>
          <p>Email: ${companySettings.email}</p>
        </div>
        
        <div class="separator"></div>
        
        <div class="order-info">
          <h2>PEDIDO #${order.id}</h2>
          <p><strong>Fecha:</strong> ${new Date(order.date).toLocaleDateString()}</p>
          <p><strong>Cliente:</strong> ${customer?.businessname || "Cliente"}</p>
          <p><strong>Teléfono:</strong> ${order.customerPhone || ""}</p>
          <p><strong>Dirección:</strong> ${order.customerAddress}</p>
          <p>${order.municipalityName || ""}, ${order.provinceName || ""}</p>
        </div>
        
        <div class="separator"></div>
        
        <h3 style="text-align: center; margin: 2mm 0;">DETALLE DEL PEDIDO</h3>
        
        <table class="products-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Precio</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map((item: any) => {
              const product = products.find((p: any) => p.id === item.productId);
              const total = parseFloat(item.price) * item.quantity;
              return `
                <tr>
                  <td>${product?.name || "Producto"}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">RD$${parseFloat(item.price).toFixed(2)}</td>
                  <td style="text-align: right;">RD$${total.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="separator"></div>
        
        <div class="totals">
          <div>
            <span style="float: left;"><strong>SUBTOTAL:</strong></span>
            <span><strong>RD$${parseFloat(order.subtotal || order.total).toFixed(2)}</strong></span>
          </div>
          <div>
            <span style="float: left;"><strong>ITBIS:</strong></span>
            <span><strong>RD$${parseFloat(order.tax || '0').toFixed(2)}</strong></span>
          </div>
          <div>
            <span style="float: left;"><strong>TOTAL:</strong></span>
            <span><strong>RD$${parseFloat(order.total).toFixed(2)}</strong></span>
          </div>
        </div>
        
        ${order.notes ? `
          <div class="notes">
            <p><strong>Nota del Pedido:</strong></p>
            <p>${order.notes}</p>
          </div>
        ` : ''}
        
        <div class="separator"></div>
        
        <div class="thank-you">
          <p>¡Gracias por su compra!</p>
        </div>
      </body>
      </html>
    `);
    printFrame.contentDocument?.close();
    
    // Esperar a que el contenido se cargue y luego imprimir
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        
        // Notificar al usuario
        toast({
          title: "Imprimiendo ticket",
          description: "El documento se ha enviado a la impresora",
        });
        
        // Limpiar después de imprimir
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      } catch (printError) {
        console.error('Error al imprimir:', printError);
        toast({
          variant: "destructive",
          title: "Error de impresión",
          description: "No se pudo enviar a la impresora",
        });
        document.body.removeChild(printFrame);
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
    doc.text(`Fecha: ${new Date(order.date).toLocaleDateString()}`, 5, 43);
    doc.text(`Cliente: ${customer?.businessname || "Cliente"}`, 5, 47);
    doc.text(`Teléfono: ${order.customerPhone || ""}`, 5, 51);
    doc.text(`Dirección: ${order.customerAddress}`, 5, 55);
    doc.text(`${order.municipalityName || ""}, ${order.provinceName || ""}`, 5, 59);
    
    // Notas del pedido si existen
    let yPosition = 63;
    if (order.notes) {
      doc.text(`Notas: ${order.notes}`, 5, yPosition);
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
    doc.text("SUBTOTAL:", 60, yPosition, { align: 'right' });
    doc.text(`RD$${subtotal.toFixed(2)}`, 75, yPosition, { align: 'right' });
    yPosition += 5;
    
    // ITBIS
    doc.text("ITBIS:", 60, yPosition, { align: 'right' });
    doc.text(`RD$${itbis.toFixed(2)}`, 75, yPosition, { align: 'right' });
    yPosition += 5;
    
    // Total
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL:", 60, yPosition, { align: 'right' });
    doc.text(`RD$${total.toFixed(2)}`, 75, yPosition, { align: 'right' });
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