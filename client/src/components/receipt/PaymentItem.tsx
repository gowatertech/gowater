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
  const formattedAmount = typeof payment.amount === 'string' 
    ? `$${payment.amount}` 
    : `$${payment.amount.toString()}`;

  return (
    <div className="payment-item border-b text-[9px] py-1 px-1 flex">
      <div className="w-1/2">
        <div>{payment.description}</div>
        <div className="text-gray-500 text-[8px]">{payment.reference}</div>
      </div>
      <div className="w-1/4 text-right">{formattedAmount}</div>
      <div className="w-1/4 text-right text-green-600">{payment.status}</div>
    </div>
  );
}
