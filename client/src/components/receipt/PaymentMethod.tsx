interface PaymentMethodProps {
  receipt: {
    paymentMethod: string;
    paymentReference: string;
  };
}

export default function PaymentMethod({ receipt }: PaymentMethodProps) {
  return (
    <div className="mb-3 text-[9px]">
      <div className="font-semibold">Payment Method</div>
      <div className="flex justify-between">
        <span>{receipt.paymentMethod}</span>
        <span>{receipt.paymentReference}</span>
      </div>
    </div>
  );
}
