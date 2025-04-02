import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Invoice } from "@shared/schema";
import { useNavigate } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extender el tipo Invoice para incluir campos adicionales del endpoint
interface InvoiceWithDetails extends Invoice {
  businessName?: string;
  totalPaid?: string;
  pendingAmount?: string;
}

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  CircleDollarSign,
  FileText
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function RegisterPayment() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Fetch invoices with pending payments
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices/pending"],
  });

  // Mutation para crear un nuevo pago
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest("/api/payments", "POST", paymentData);
    },
    onSuccess: () => {
      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/pending"] });
      
      // Redirigir al historial de pagos
      navigate("/payments/history");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar el pago",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Función para manejar la creación de un pago
  const handleCreatePayment = () => {
    if (!selectedInvoice) {
      toast({
        title: "Error al registrar el pago",
        description: "Debes seleccionar una factura",
        variant: "destructive",
      });
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Error al registrar el pago",
        description: "El monto del pago debe ser mayor a cero",
        variant: "destructive",
      });
      return;
    }

    // Verificar que el monto no supere el pendiente
    const pendingAmount = parseFloat(selectedInvoice.pendingAmount || selectedInvoice.total);
    if (parseFloat(paymentAmount) > pendingAmount) {
      toast({
        title: "Error al registrar el pago",
        description: "El monto del pago no puede ser mayor al pendiente",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      invoiceId: selectedInvoice.id,
      customerId: selectedInvoice.customerId,
      amount: paymentAmount,
      paymentMethod: paymentMethod,
      notes: paymentNotes || undefined
    };

    createPaymentMutation.mutate(paymentData);
  };

  // Formatear montos
  const formatCurrency = (amount: number | string) => {
    return `RD$ ${parseFloat(amount.toString()).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto py-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/payments")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-green-500" />
            Registrar Pago
          </h1>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Registrar Nuevo Pago</CardTitle>
            <CardDescription>
              Completa el formulario para registrar un nuevo pago a una factura pendiente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Seleccionar Factura */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Factura pendiente</label>
              <Select
                onValueChange={(value) => {
                  const invoice = invoices.find((inv) => inv.id === parseInt(value));
                  setSelectedInvoice(invoice || null);
                  
                  // Si la factura tiene un monto pendiente, pre-llenamos el campo del monto con ese valor
                  if (invoice && invoice.pendingAmount) {
                    setPaymentAmount(invoice.pendingAmount);
                  } else if (invoice) {
                    setPaymentAmount(invoice.total);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar factura pendiente" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingInvoices ? (
                    <SelectItem value="loading-placeholder" disabled>Cargando facturas...</SelectItem>
                  ) : invoices.length === 0 ? (
                    <SelectItem value="no-invoices-placeholder" disabled>No hay facturas pendientes</SelectItem>
                  ) : (
                    invoices.map((invoice) => (
                      <SelectItem
                        key={invoice.id}
                        value={invoice.id.toString()}
                      >
                        #{invoice.id} - {invoice.businessName || 'Cliente'} - {formatCurrency(invoice.pendingAmount || invoice.total)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Detalles de la Factura Seleccionada */}
            {selectedInvoice && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Detalles de la Factura
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedInvoice.businessName || 'Cliente'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Fecha de Factura</p>
                    <p className="font-medium">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Factura</p>
                    <p className="font-medium">{formatCurrency(selectedInvoice.total)}</p>
                  </div>
                  
                  {selectedInvoice.pendingAmount && (
                    <div className="space-y-1 md:col-span-3">
                      <p className="text-xs text-muted-foreground">Monto Pendiente</p>
                      <p className="font-medium text-primary">{formatCurrency(selectedInvoice.pendingAmount)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Método de Pago */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de Pago</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('cash')}
                  className="flex-1"
                >
                  Efectivo
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('card')}
                  className="flex-1"
                >
                  Tarjeta
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('transfer')}
                  className="flex-1"
                >
                  Transferencia
                </Button>
              </div>
            </div>

            {/* Monto de Pago */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto a Pagar</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  RD$
                </span>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-12"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Añadir notas al pago"
                className="resize-none"
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t py-4">
            <Button
              variant="outline"
              onClick={() => navigate("/payments")}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePayment}
              disabled={createPaymentMutation.isPending || !selectedInvoice}
            >
              {createPaymentMutation.isPending ? "Registrando..." : "Registrar Pago"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}