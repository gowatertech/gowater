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
      <div className="w-full max-w-[302px]"> {/* 80mm = 302px */}
        <Card className="bg-white shadow-lg rounded-lg overflow-hidden receipt-container mx-auto">
          {/* Preview Controls - only visible on screen */}
          <div className="bg-gray-800 text-white p-3 no-print">
            <h2 className="text-lg font-semibold text-center">Recibo de Pago (80mm)</h2>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-300">Formato 80mm</div>
              <Button
                onClick={onPrint}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded flex items-center gap-2"
              >
                <Printer size={16} /> Imprimir
              </Button>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="receipt-content p-2 text-xs">
            <ReceiptHeader />
            <ReceiptInfo receipt={receipt} />
            <PaymentsList payments={payments} />
            <ReceiptTotals receipt={receipt} />
            <PaymentMethod receipt={receipt} />
            <ReceiptFooter receipt={receipt} />
          </div>
        </Card>
      </div>
    </div>
  );
}
