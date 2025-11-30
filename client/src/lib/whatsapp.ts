export type WhatsAppMessageType = 'invoice' | 'payment';

interface WhatsAppInvoiceParams {
  type: 'invoice';
  customerName: string;
  customerPhone: string;
  companyName: string;
  amount: string | number;
}

interface WhatsAppPaymentParams {
  type: 'payment';
  customerPhone: string;
}

type WhatsAppParams = WhatsAppInvoiceParams | WhatsAppPaymentParams;

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned;
  }
  
  if (cleaned.length === 10 && !cleaned.startsWith('1')) {
    return '1' + cleaned;
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    return cleaned;
  }
  
  return cleaned;
}

function formatAmount(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toLocaleString('es-DO', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export function generateWhatsAppMessage(params: WhatsAppParams): string {
  if (params.type === 'invoice') {
    return `Hola ${params.customerName}, le enviamos su factura correspondiente a su pedido de ${params.companyName}.
Total: RD$ ${formatAmount(params.amount)}.
Gracias por preferirnos.`;
  }
  
  if (params.type === 'payment') {
    return `Estimado cliente, su pago quedó registrado en nuestro sistema.
Gracias por su preferencia.`;
  }
  
  return '';
}

export function generateWhatsAppLink(params: WhatsAppParams): string {
  const message = generateWhatsAppMessage(params);
  const encodedMessage = encodeURIComponent(message);
  const phone = formatPhoneNumber(params.customerPhone);
  
  return `https://wa.me/${phone}?text=${encodedMessage}`;
}

export function openWhatsApp(params: WhatsAppParams): void {
  const link = generateWhatsAppLink(params);
  window.open(link, '_blank');
}
