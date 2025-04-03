import React from 'react';

interface OrderTicketProps {
  order: any;
  orderItems: any[];
  customer: any;
  companySettings: any;
  products: any[];
}

/**
 * Componente que renderiza un ticket de pedido para impresión
 * Formato específico para impresoras térmicas 80mm
 */
export const OrderTicket: React.FC<OrderTicketProps> = ({
  order,
  orderItems,
  customer,
  companySettings,
  products,
}) => {
  // Calcular totales
  const subtotal = parseFloat(order.subtotal || order.total);
  const itbis = parseFloat(order.tax || '0');
  const total = parseFloat(order.total);
  
  return (
    <div className="ticket-container">
      {/* Encabezado: Información de la empresa */}
      <div className="header">
        <div className="company-name">{companySettings.name}</div>
        <div className="company-info">RNC: {companySettings.rnc}</div>
        <div className="company-info">{companySettings.street} {companySettings.streetNumber}</div>
        <div className="company-info">{companySettings.municipalityName}, {companySettings.provinceName}</div>
        <div className="company-info">Tel: {companySettings.contactPhone}</div>
        <div className="company-info">Email: {companySettings.email}</div>
      </div>
      
      {/* Separador */}
      <div className="separator"></div>
      
      {/* Información del pedido */}
      <div className="order-info">
        <div className="order-title">PEDIDO #{order.id}</div>
        <div className="order-detail"><strong>Fecha:</strong> {new Date(order.date).toLocaleDateString()}</div>
        <div className="order-detail"><strong>Cliente:</strong> {customer?.businessname || "Cliente"}</div>
        <div className="order-detail"><strong>Teléfono:</strong> {order.customerPhone || ""}</div>
        <div className="order-detail"><strong>Dirección:</strong> {order.customerAddress}</div>
        <div className="order-detail">{order.municipalityName || ""}, {order.provinceName || ""}</div>
      </div>
      
      {/* Separador */}
      <div className="separator"></div>
      
      {/* Detalle del pedido */}
      <div className="items-title">DETALLE DEL PEDIDO</div>
      
      {/* Tabla de productos */}
      <table className="items-table">
        <thead>
          <tr>
            <th className="left">Producto</th>
            <th className="center">Cant.</th>
            <th className="right">Precio</th>
            <th className="right">Total</th>
          </tr>
        </thead>
        <tbody>
          {orderItems.map((item, index) => {
            const product = products.find(p => p.id === item.productId);
            const itemTotal = parseFloat(item.price) * item.quantity;
            
            return (
              <tr key={index}>
                <td className="left">{product?.name || "Producto"}</td>
                <td className="center">{item.quantity}</td>
                <td className="right">RD${parseFloat(item.price).toFixed(2)}</td>
                <td className="right">RD${itemTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Separador */}
      <div className="separator"></div>
      
      {/* Totales */}
      <div className="totals">
        <div className="total-row">
          <span className="total-label">SUBTOTAL:</span>
          <span className="total-value">RD$ {subtotal.toFixed(2)}</span>
        </div>
        <div className="total-row">
          <span className="total-label">ITBIS:</span>
          <span className="total-value">RD$ {itbis.toFixed(2)}</span>
        </div>
        <div className="total-row bold">
          <span className="total-label">TOTAL:</span>
          <span className="total-value">RD$ {total.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Notas (si hay) */}
      {order.notes && (
        <div className="notes">
          <div className="notes-title">Nota del Pedido:</div>
          <div className="notes-content">{order.notes}</div>
        </div>
      )}
      
      {/* Separador */}
      <div className="separator"></div>
      
      {/* Mensaje de agradecimiento */}
      <div className="thank-you">¡Gracias por su compra!</div>
      
      {/* Estilos internos */}
      <style>
        {`
          .ticket-container {
            width: 74mm;
            font-family: Arial, sans-serif;
            font-size: 10px;
            padding: 5mm 2mm;
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
            border-bottom: 1px dashed black;
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
          
          .left {
            text-align: left;
          }
          
          .center {
            text-align: center;
          }
          
          .right {
            text-align: right;
          }
          
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
        `}
      </style>
    </div>
  );
};