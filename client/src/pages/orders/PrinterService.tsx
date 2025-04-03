// Servicio para impresión de tickets de pedidos
// Solución directa que no necesita React para renderizar

import React from 'react';

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
    
    // Generar el HTML del ticket directamente
    let ticketHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket Pedido #${order.id}</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 0;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 5mm 2mm; 
            width: 76mm;
            font-size: 10px;
          }
          .ticket-container {
            width: 100%;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .company-info {
            font-size: 11px;
            margin-bottom: 2px;
          }
          .separator {
            border-bottom: 1px dashed #000;
            margin: 10px 0;
          }
          .order-info {
            margin-bottom: 10px;
            font-size: 11px;
          }
          .order-title {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
          }
          .order-detail {
            margin-bottom: 3px;
            padding-left: 15px;
          }
          .items-title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .items-table th, .items-table td {
            padding: 3px;
          }
          .left { text-align: left; }
          .center { text-align: center; }
          .right { text-align: right; }
          .totals {
            margin-top: 10px;
            font-size: 11px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .total-label {
            flex: 1;
            text-align: left;
          }
          .total-value {
            flex: 1;
            text-align: center;
          }
          .bold {
            font-weight: bold;
          }
          .notes {
            margin-top: 10px;
            font-size: 10px;
          }
          .notes-title {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .thank-you {
            text-align: center;
            margin-top: 10px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <!-- Encabezado: Información de la empresa -->
          <div class="header">
            <div class="company-name">${companySettings.name}</div>
            <div class="company-info">RNC: ${companySettings.rnc}</div>
            <div class="company-info">${companySettings.street} ${companySettings.streetNumber}</div>
            <div class="company-info">${companySettings.municipalityName}, ${companySettings.provinceName}</div>
            <div class="company-info">Tel: ${companySettings.contactPhone}</div>
            <div class="company-info">Email: ${companySettings.email}</div>
          </div>
          
          <!-- Separador -->
          <div class="separator"></div>
          
          <!-- Información del pedido -->
          <div class="order-info">
            <div class="order-title">PEDIDO #${order.id}</div>
            <div class="order-detail"><strong>Fecha:</strong> ${new Date(order.date).toLocaleDateString()}</div>
            <div class="order-detail"><strong>Cliente:</strong> ${customer?.businessname || "Cliente"}</div>
            <div class="order-detail"><strong>Teléfono:</strong> ${order.customerPhone || ""}</div>
            <div class="order-detail"><strong>Dirección:</strong> ${order.customerAddress}</div>
            <div class="order-detail">${order.municipalityName || ""}, ${order.provinceName || ""}</div>
          </div>
          
          <!-- Separador -->
          <div class="separator"></div>
          
          <!-- Detalle del pedido -->
          <div class="items-title">DETALLE DEL PEDIDO</div>
          
          <!-- Tabla de productos -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="left">Producto</th>
                <th class="center">Cant.</th>
                <th class="right">Precio</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    // Generar filas de productos
    orderItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const itemTotal = parseFloat(item.price) * item.quantity;
      
      ticketHtml += `
        <tr>
          <td class="left">${product?.name || "Producto"}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">RD$${parseFloat(item.price).toFixed(2)}</td>
          <td class="right">RD$${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });
    
    // Calcular totales
    const subtotal = parseFloat(order.subtotal || order.total);
    const itbis = parseFloat(order.tax || '0');
    const total = parseFloat(order.total);
    
    // Completar el HTML con los totales y el pie de página
    ticketHtml += `
            </tbody>
          </table>
          
          <!-- Separador -->
          <div class="separator"></div>
          
          <!-- Totales -->
          <div class="totals">
            <div class="total-row">
              <span class="total-label">SUBTOTAL:</span>
              <span class="total-value">RD$ ${subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span class="total-label">ITBIS:</span>
              <span class="total-value">RD$ ${itbis.toFixed(2)}</span>
            </div>
            <div class="total-row bold">
              <span class="total-label">TOTAL:</span>
              <span class="total-value">RD$ ${total.toFixed(2)}</span>
            </div>
          </div>
    `;
    
    // Añadir notas si existen
    if (order.notes) {
      ticketHtml += `
        <!-- Notas -->
        <div class="notes">
          <div class="notes-title">Nota del Pedido:</div>
          <div class="notes-content">${order.notes}</div>
        </div>
      `;
    }
    
    // Finalizar el HTML
    ticketHtml += `
          <!-- Separador -->
          <div class="separator"></div>
          
          <!-- Mensaje de agradecimiento -->
          <div class="thank-you">¡Gracias por su compra!</div>
        </div>
      </body>
      </html>
    `;
    
    // Crear una ventana de impresión oculta
    const printWindow = window.open('', '_blank', 'width=400,height=600,left=200,top=200');
    
    if (!printWindow) {
      throw new Error('No se pudo crear la ventana de impresión. Por favor, verifica que los popups estén permitidos.');
    }
    
    // Escribir el contenido HTML en la ventana
    printWindow.document.open();
    printWindow.document.write(ticketHtml);
    printWindow.document.close();
    
    // Esperar a que se carguen los estilos y el contenido
    printWindow.onload = function() {
      // Imprimir
      printWindow.print();
      
      // Cerrar la ventana después de imprimir (o después de un tiempo si el usuario cancela)
      setTimeout(() => {
        printWindow.close();
        
        // Notificar al usuario
        toast({
          title: "Impresión completada",
          description: "El documento se ha enviado a la impresora",
        });
      }, 1000);
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