import { format } from "date-fns";

interface ReceiptInfoProps {
  receipt: any;
}

export default function ReceiptInfo({ receipt }: ReceiptInfoProps) {
  // Format the date properly from ISO string
  const formattedDate = receipt.date 
    ? format(new Date(receipt.date), "dd/MM/yyyy HH:mm") 
    : "";

  return (
    <div className="mb-3 text-[9px]">
      <div className="flex justify-between">
        <span>Receipt #:</span>
        <span>{receipt.id}</span>
      </div>
      <div className="flex justify-between">
        <span>Date:</span>
        <span>{formattedDate}</span>
      </div>
      <div className="flex justify-between">
        <span>Customer:</span>
        <span>{receipt.customer}</span>
      </div>
    </div>
  );
}
