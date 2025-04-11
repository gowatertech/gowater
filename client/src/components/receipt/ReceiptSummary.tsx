import { formatCurrency } from "@/lib/receipt";

interface ReceiptSummaryProps {
  invoiceCount: number;
  totalPaid: number;
  currency?: string;
}

export const ReceiptSummary = ({ 
  invoiceCount, 
  totalPaid, 
  currency = "PEN" 
}: ReceiptSummaryProps) => {
  return (
    <div className="p-3 border-t border-gray-300">
      <table className="w-full text-receipt-base">
        <tbody>
          <tr>
            <td className="font-bold">Total Facturas:</td>
            <td className="text-right font-bold">{invoiceCount}</td>
          </tr>
          <tr>
            <td className="font-bold">Total Pagado:</td>
            <td className="text-right font-bold">{formatCurrency(totalPaid, currency)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ReceiptSummary;
