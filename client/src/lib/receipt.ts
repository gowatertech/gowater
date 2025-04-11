import { format } from 'date-fns';

// Helper functions for receipt formatting
export const formatCurrency = (amount: string | number, currency = 'PEN'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  const currencySymbols: Record<string, string> = {
    PEN: 'S/',
    USD: '$',
    EUR: '€',
  };
  
  const symbol = currencySymbols[currency] || '';
  
  return `${symbol} ${numAmount.toFixed(2)}`;
};

export const formatDate = (date: Date | string | null): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy');
};

export const formatTime = (date: Date | string | null): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'HH:mm:ss');
};

export const formatDateTime = (date: Date | string | null): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm:ss');
};

export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    PAGADO: 'text-green-600',
    PARCIAL: 'text-yellow-600',
    PENDIENTE: 'text-red-600',
    ANULADO: 'text-gray-600',
  };
  
  return statusColors[status] || 'text-gray-600';
};

export const generateReceiptData = (
  client: any, 
  payments: any[], 
  companyInfo: any,
  summary: { invoiceCount: number, totalPaid: number }
) => {
  return {
    client,
    payments,
    companyInfo,
    currentDate: new Date(),
    summary
  };
};
