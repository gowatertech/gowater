import React from 'react';

interface OrderTicketProps {
  order: any;
  orderItems: any[];
  customer: any;
  companySettings: any;
  products: any[];
}

/**
 * Componente que renderiza un ticket de pedido
 * para ser impreso en impresora térmica (80mm)
 */
export const OrderTicket: React.FC<OrderTicketProps> = ({
  order,
  orderItems,
  customer,
  companySettings,
  products
}) => {
  // Calcular totales
  const subtotal = parseFloat(order.subtotal || order.total);
  const itbis = parseFloat(order.tax || '0');
  const total = parseFloat(order.total);

  // Formatear cantidades monetarias
  const formatCurrency = (amount: number) => `RD$${amount.toFixed(2)}`;

  // Obtener la fecha formateada
  const formattedDate = new Date(order.date).toLocaleDateString();

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      padding: '0',
      margin: '0',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Encabezado de la empresa */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
          {companySettings.name}
        </div>
        <div style={{ fontSize: '11px', marginBottom: '2px' }}>
          RNC: {companySettings.rnc}
        </div>
        <div style={{ fontSize: '11px', marginBottom: '2px' }}>
          {companySettings.street} {companySettings.streetNumber}
        </div>
        <div style={{ fontSize: '11px', marginBottom: '2px' }}>
          {companySettings.municipalityName}, {companySettings.provinceName}
        </div>
        <div style={{ fontSize: '11px', marginBottom: '2px' }}>
          Tel: {companySettings.contactPhone}
        </div>
        <div style={{ fontSize: '11px', marginBottom: '2px' }}>
          Email: {companySettings.email}
        </div>
      </div>

      {/* Separador */}
      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      {/* Título e información del pedido */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>
          PEDIDO #{order.id}
        </div>
        <div style={{ marginBottom: '3px', paddingLeft: '15px' }}>
          <strong>Fecha:</strong> {formattedDate}
        </div>
        <div style={{ marginBottom: '3px', paddingLeft: '15px' }}>
          <strong>Cliente:</strong> {customer?.businessname || "Cliente"}
        </div>
        <div style={{ marginBottom: '3px', paddingLeft: '15px' }}>
          <strong>Teléfono:</strong> {order.customerPhone || ""}
        </div>
        <div style={{ marginBottom: '3px', paddingLeft: '15px' }}>
          <strong>Dirección:</strong> {order.customerAddress}
        </div>
        <div style={{ marginBottom: '3px', paddingLeft: '15px' }}>
          {order.municipalityName || ""}, {order.provinceName || ""}
        </div>
      </div>

      {/* Separador */}
      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      {/* Detalle de productos */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '5px' }}>
        DETALLE DEL PEDIDO
      </div>

      {/* Tabla de productos */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <th style={{ textAlign: 'left', padding: '3px' }}>Producto</th>
            <th style={{ textAlign: 'center', padding: '3px' }}>Cant.</th>
            <th style={{ textAlign: 'right', padding: '3px' }}>Precio</th>
            <th style={{ textAlign: 'right', padding: '3px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {orderItems.map((item, index) => {
            const product = products.find(p => p.id === item.productId);
            const itemTotal = parseFloat(item.price) * item.quantity;
            
            return (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ textAlign: 'left', padding: '3px' }}>
                  {product?.name || "Producto"}
                </td>
                <td style={{ textAlign: 'center', padding: '3px' }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: 'right', padding: '3px' }}>
                  {formatCurrency(parseFloat(item.price))}
                </td>
                <td style={{ textAlign: 'right', padding: '3px' }}>
                  {formatCurrency(itemTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Separador */}
      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      {/* Totales */}
      <div style={{ marginTop: '10px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ flex: 1, textAlign: 'left' }}>SUBTOTAL:</span>
          <span style={{ flex: 1, textAlign: 'center' }}>{formatCurrency(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ flex: 1, textAlign: 'left' }}>ITBIS:</span>
          <span style={{ flex: 1, textAlign: 'center' }}>{formatCurrency(itbis)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '5px' }}>
          <span style={{ flex: 1, textAlign: 'left' }}>TOTAL:</span>
          <span style={{ flex: 1, textAlign: 'center' }}>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Notas (si hay) */}
      {order.notes && (
        <div style={{ marginTop: '10px', fontSize: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Nota del Pedido:</div>
          <div>{order.notes}</div>
        </div>
      )}

      {/* Separador */}
      <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

      {/* Mensaje de agradecimiento */}
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px' }}>
        ¡Gracias por su compra!
      </div>
    </div>
  );
};

export default OrderTicket;