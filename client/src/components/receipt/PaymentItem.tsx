interface PaymentItemProps {
  payment: {
    description: string;
    reference: string;
    amount: string;
    status: string;
  };
}

export default function PaymentItem({ payment }: PaymentItemProps) {
  // Format the amount to display as currency
  const formattedAmount = `RD$${payment.amount}`;

  // Translate status text for display
  const statusText = payment.status === 'PAID' ? 'PAGADO' : payment.status;
  const statusClass = payment.status === 'PAID' ? 'text-green-600' : 'text-yellow-600';

  return (
    <div className="payment-item border-b text-[9px] py-1 px-1 flex">
      <div className="w-1/2">
        <div>{payment.description}</div>
        <div className="text-gray-500 text-[8px]">{payment.reference}</div>
      </div>
      <div className="w-1/4 text-right">{formattedAmount}</div>
      <div className={`w-1/4 text-right ${statusClass}`}>{statusText}</div>
    </div>
  );
}
