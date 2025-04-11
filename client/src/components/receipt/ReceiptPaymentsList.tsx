import { Payment } from "@shared/schema";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/receipt";
import { cn } from "@/lib/utils";

interface ReceiptPaymentsListProps {
  payments: Payment[];
}

export const ReceiptPaymentsList = ({ payments }: ReceiptPaymentsListProps) => {
  return (
    <div className="p-3">
      <h3 className="text-receipt-base font-bold mb-2">DETALLE DE PAGOS</h3>
      
      {payments.map((payment, index) => (
        <div 
          key={payment.id} 
          className={cn("pb-2 mb-2", 
            index < payments.length - 1 ? "border-b border-gray-100" : ""
          )}
        >
          <div className="flex justify-between text-receipt-base">
            <span className="font-semibold">Factura:</span>
            <span>{payment.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-receipt-base">
            <span className="font-semibold">Fecha Emisión:</span>
            <span>{formatDate(payment.issueDate)}</span>
          </div>
          <div className="flex justify-between text-receipt-base">
            <span className="font-semibold">Fecha Vencimiento:</span>
            <span>{formatDate(payment.dueDate)}</span>
          </div>
          <div className="flex justify-between text-receipt-base">
            <span className="font-semibold">Moneda:</span>
            <span>{payment.currency}</span>
          </div>
          <div className="flex justify-between text-receipt-base">
            <span className="font-semibold">Monto:</span>
            <span>{formatCurrency(payment.amount, payment.currency)}</span>
          </div>
          <div className="flex justify-between text-receipt-base">
            <span className="font-semibold">Estado:</span>
            <span className={cn("font-semibold", getStatusColor(payment.status))}>
              {payment.status}
            </span>
          </div>
          <div className="flex justify-between text-receipt-base">
            <span className="font-semibold">Método de pago:</span>
            <span>{payment.method}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReceiptPaymentsList;
