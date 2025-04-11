import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReceiptHeader from "./ReceiptHeader";
import ReceiptInfo from "./ReceiptInfo";
import PaymentsList from "./PaymentsList";
import ReceiptTotals from "./ReceiptTotals";
import PaymentMethod from "./PaymentMethod";
import ReceiptFooter from "./ReceiptFooter";
import { Printer } from "lucide-react";

interface ReceiptPrintPreviewProps {
  receipt: any;
  payments: any[];
  onPrint: () => void;
}

export default function ReceiptPrintPreview({ receipt, payments, onPrint }: ReceiptPrintPreviewProps) {
  return (
    <div className="flex justify-center">
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden w-80mm mx-auto receipt-container">
        {/* Preview Controls - only visible on screen */}
        <div className="bg-gray-800 text-white p-3 no-print">
          <h2 className="text-lg font-semibold text-center">Payment Receipt Preview (80mm)</h2>
          <div className="mt-2 flex justify-center">
            <Button
              onClick={onPrint}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded flex items-center gap-2"
            >
              <Printer size={16} /> Print Receipt
            </Button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="receipt-container p-2 text-xs">
          <ReceiptHeader />
          <ReceiptInfo receipt={receipt} />
          <PaymentsList payments={payments} />
          <ReceiptTotals receipt={receipt} />
          <PaymentMethod receipt={receipt} />
          <ReceiptFooter receipt={receipt} />
        </div>
      </Card>
    </div>
  );
}
