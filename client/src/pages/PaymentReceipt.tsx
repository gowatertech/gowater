import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import ReceiptLayout from "@/components/receipt/ReceiptLayout";
import { useToast } from "@/hooks/use-toast";

// In a real app, this would come from URL or state
const DEFAULT_CLIENT_ID = 1;

export default function PaymentReceipt() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState<number>(DEFAULT_CLIENT_ID);
  
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/receipt/${clientId}`],
    retry: 1,
  });
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error al cargar datos del recibo",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Error al cargar el recibo</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              No se pudo obtener la información del recibo. Por favor, intente nuevamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { client, payments, companyInfo, summary } = data;
  
  return (
    <ReceiptLayout 
      client={client}
      payments={payments}
      companyInfo={companyInfo}
      summary={summary}
    />
  );
}
