interface ReceiptFooterProps {
  receipt: {
    termsAndConditions: string;
  };
}

export default function ReceiptFooter({ receipt }: ReceiptFooterProps) {
  return (
    <div className="text-center text-[8px] mt-4 pt-1 border-t">
      <p>Thank you for your business!</p>
      <p>{receipt.termsAndConditions}</p>
      <p className="mt-1">www.companywebsite.com</p>
    </div>
  );
}
