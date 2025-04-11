interface ReceiptTotalsProps {
  receipt: {
    subtotal: string;
    tax: string;
    taxRate: string;
    total: string;
  };
}

export default function ReceiptTotals({ receipt }: ReceiptTotalsProps) {
  // Format values to display as currency with RD$ prefix
  const formattedSubtotal = `RD$${receipt.subtotal}`;
  const formattedTax = `RD$${receipt.tax}`;
  const formattedTotal = `RD$${receipt.total}`;
  
  return (
    <div className="mb-3 border-t pt-1">
      <div className="flex justify-between text-[9px]">
        <span>Subtotal:</span>
        <span>{formattedSubtotal}</span>
      </div>
      <div className="flex justify-between text-[9px]">
        <span>ITBIS ({receipt.taxRate}%):</span>
        <span>{formattedTax}</span>
      </div>
      <div className="flex justify-between font-bold text-[10px] pt-1 border-t mt-1">
        <span>TOTAL:</span>
        <span>{formattedTotal}</span>
      </div>
    </div>
  );
}
