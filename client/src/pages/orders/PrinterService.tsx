// Servicio para impresión de tickets de pedidos
// Usa React para renderizar tickets dinámicamente y un portal para aislar la impresión

import React from 'react';
import ReactDOM from 'react-dom';
import { PrintContent } from '@/components/printer/PrintContent';
import { OrderTicket } from '@/components/printer/OrderTicket';

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
    console.log('[PrintService] Iniciando generación de ticket');
    
    // Notificar al usuario
    toast({
      title: "Generando ticket",
      description: "Preparando documento para impresión...",
    });
    
    // Crear un div temporal para el portal de React
    const printContainer = document.createElement('div');
    printContainer.id = 'print-portal-container';
    document.body.appendChild(printContainer);
    
    console.log('[PrintService] Container de impresión creado');
    
    // Renderizar el componente de ticket dentro del portal
    ReactDOM.render(
      <PrintContent
        onAfterPrint={() => {
          console.log('[PrintService] Finalizando impresión, limpiando...');
          
          // Desmontar componente y eliminar contenedor
          ReactDOM.unmountComponentAtNode(printContainer);
          if (document.body.contains(printContainer)) {
            document.body.removeChild(printContainer);
          }
          
          // Notificar al usuario
          toast({
            title: "Impresión completada",
            description: "El documento se ha enviado a la impresora",
          });
        }}
      >
        <OrderTicket
          order={order}
          orderItems={orderItems}
          customer={customer}
          companySettings={companySettings}
          products={products}
        />
      </PrintContent>,
      printContainer
    );
    
    console.log('[PrintService] Componente de ticket renderizado');
    
  } catch (error: any) {
    console.error('[PrintService] Error en printOrderTicket:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Error al generar el ticket",
    });
    
    // Limpiar en caso de error
    const printContainer = document.getElementById('print-portal-container');
    if (printContainer && document.body.contains(printContainer)) {
      ReactDOM.unmountComponentAtNode(printContainer);
      document.body.removeChild(printContainer);
    }
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