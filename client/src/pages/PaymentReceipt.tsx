import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReceiptPrintPreview from "../components/receipt/ReceiptPrintPreview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import "@/styles/receipt-print.css";
import { useState } from "react";

type ReceiptParams = {
  id?: string;
};

export default function PaymentReceipt() {
  const { id } = useParams<ReceiptParams>();
  const { toast } = useToast();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | undefined>(id);

  // Fetch all receipts
  const { data: receipts, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["/api/receipts"],
  });

  // Fetch the specific receipt with payments if id is available
  const { data: receiptData, isLoading: isLoadingReceiptData } = useQuery({
    queryKey: [selectedReceiptId ? `/api/receipts/${selectedReceiptId}/full` : null],
    enabled: !!selectedReceiptId,
  });

  const handlePrint = () => {
    if (!receiptData) {
      toast({
        title: "Error",
        description: "No receipt data to print",
        variant: "destructive",
      });
      return;
    }
    window.print();
  };

  const handleReceiptChange = (receiptId: string) => {
    setSelectedReceiptId(receiptId);
  };

  if (isLoadingReceipts) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Payment Receipts</h1>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 no-print">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">Receipt Selection</h2>
              <div className="space-y-2">
                {receipts?.map((receipt: any) => (
                  <Button
                    key={receipt.id}
                    variant={selectedReceiptId === receipt.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleReceiptChange(receipt.id)}
                  >
                    {receipt.id} - {receipt.customer}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {isLoadingReceiptData ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <>
              {receiptData ? (
                <ReceiptPrintPreview 
                  receipt={receiptData.receipt} 
                  payments={receiptData.payments} 
                  onPrint={handlePrint} 
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p>Please select a receipt to view</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
