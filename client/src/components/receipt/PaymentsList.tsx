import PaymentItem from "./PaymentItem";

interface PaymentsListProps {
  payments: any[];
}

export default function PaymentsList({ payments }: PaymentsListProps) {
  return (
    <div className="mb-3">
      <div className="font-semibold bg-gray-100 py-1 px-1 text-[9px] flex">
        <span className="w-1/2">Description</span>
        <span className="w-1/4 text-right">Amount</span>
        <span className="w-1/4 text-right">Status</span>
      </div>
      
      <div>
        {payments.map((payment, index) => (
          <PaymentItem key={index} payment={payment} />
        ))}
      </div>
    </div>
  );
}
