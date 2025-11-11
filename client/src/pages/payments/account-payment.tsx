import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateRD } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Search, DollarSign, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Customer {
  id: number;
  businessname: string;
  managername: string;
  phone: string;
}

interface PendingInvoice {
  id: number;
  invoiceNumber: string;
  total: string;
  date: string;
  status: string;
  paid: string;
  pending: string;
}

interface PendingInvoicesResponse {
  customerBalance: string;
  pendingInvoices: PendingInvoice[];
}

export default function AccountPaymentPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const hasPreselectedFromUrl = useRef(false);

  // Cargar clientes
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Efecto para preseleccionar el cliente desde la URL (solo una vez)
  useEffect(() => {
    if (hasPreselectedFromUrl.current) return;
    
    const params = new URLSearchParams(searchString);
    const customerIdParam = params.get('customerId');
    
    if (customerIdParam && customers.length > 0) {
      const customerId = parseInt(customerIdParam, 10);
      if (!isNaN(customerId)) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          setSelectedCustomerId(customerId);
          hasPreselectedFromUrl.current = true;
        }
      }
    }
  }, [searchString, customers]);

  // Cargar facturas pendientes y balance del cliente seleccionado
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery<PendingInvoicesResponse>({
    queryKey: [`/api/customers/${selectedCustomerId}/pending-invoices`],
    enabled: !!selectedCustomerId,
  });
  
  const pendingInvoices = invoicesData?.pendingInvoices || [];
  const customerBalance = invoicesData?.customerBalance || "0.00";

  // Filtrar clientes por búsqueda
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const term = customerSearch.toLowerCase();
    return customers.filter((c) =>
      c.businessname.toLowerCase().includes(term) ||
      c.managername.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
  }, [customers, customerSearch]);

  // Obtener cliente seleccionado
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Calcular el total de deuda pendiente
  const totalDebt = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.pending), 0);
  }, [pendingInvoices]);

  // Calcular la distribución del pago (preview)
  const paymentPreview = useMemo(() => {
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0 || pendingInvoices.length === 0) {
      return { invoices: [], remaining: 0 };
    }

    let remainingAmount = paymentAmount;
    const invoices = [];

    for (const invoice of pendingInvoices) {
      if (remainingAmount <= 0.01) break;

      const pendingAmount = parseFloat(invoice.pending);
      if (pendingAmount <= 0.01) continue;

      const amountToApply = Math.min(remainingAmount, pendingAmount);
      
      invoices.push({
        ...invoice,
        amountToApply: amountToApply.toFixed(2),
        willBePaid: amountToApply >= pendingAmount - 0.01,
      });

      remainingAmount -= amountToApply;
    }

    return {
      invoices,
      remaining: remainingAmount,
    };
  }, [amount, pendingInvoices]);

  // Mutación para aplicar el pago
  const applyPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest({
        method: "POST",
        url: "/api/payments/account-payment",
        data: {
          customerId: selectedCustomerId,
          amount: parseFloat(amount).toFixed(2),
          paymentMethod,
          reference: reference || undefined,
          notes: notes || undefined,
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Pago aplicado exitosamente",
        description: `Se aplicaron $${data.totalApplied} a ${data.paymentsCreated.length} factura(s)${data.advancePayment ? ` y se creó un anticipo de $${data.remainingAsAdvance}` : ''}`,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${selectedCustomerId}/pending-invoices`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      // Resetear el formulario y volver a la página de pagos
      handleReset();
      navigate("/payments");
    },
    onError: (error: any) => {
      toast({
        title: "Error al aplicar pago",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Debe ingresar un monto válido",
        variant: "destructive",
      });
      return;
    }

    applyPaymentMutation.mutate();
  };

  const handleReset = () => {
    setCustomerSearch("");
    setSelectedCustomerId(null);
    setAmount("");
    setPaymentMethod("cash");
    setReference("");
    setNotes("");
  };

  const handleSelectCustomer = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setCustomerSearch("");
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/payments")}
          data-testid="button-back"
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 shrink-0" />
            <span>Abono a Cuenta</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Aplicar un pago que se distribuirá automáticamente a las facturas pendientes del cliente desde la más antigua
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Cliente</CardTitle>
            <CardDescription>Busca por nombre, encargado o teléfono</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedCustomerId ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    data-testid="input-customer-search"
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 min-h-[44px]"
                  />
                </div>

                {/* Lista de resultados */}
                {filteredCustomers.length > 0 && (
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {filteredCustomers.slice(0, 10).map((customer) => (
                      <div
                        key={customer.id}
                        className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => handleSelectCustomer(customer.id)}
                        data-testid={`customer-result-${customer.id}`}
                      >
                        <div className="font-medium">{customer.businessname}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.managername} • {customer.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card className="bg-accent/50">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{selectedCustomer?.businessname}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {selectedCustomer?.managername} • {selectedCustomer?.phone}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setCustomerSearch("");
                      }}
                      data-testid="button-change-customer"
                      className="w-full sm:w-auto shrink-0 min-h-[44px]"
                    >
                      Cambiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Balance y Facturas Pendientes */}
        {selectedCustomerId && (
          <Card>
            <CardHeader>
              <CardTitle>Información Financiera</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando información del cliente...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Balance del Cliente - PROMINENTE */}
                  <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-4 sm:p-6 rounded-lg border-2 border-red-200 dark:border-red-800">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                          Balance del Cliente
                        </p>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400 break-all">
                          {formatCurrency(customerBalance)}
                        </p>
                      </div>
                      <DollarSign className="h-12 w-12 sm:h-16 sm:w-16 text-red-300 dark:text-red-700 shrink-0" />
                    </div>
                  </div>

                  {pendingInvoices.length === 0 ? (
                    parseFloat(customerBalance) > 0 ? (
                      <div className="text-center py-8 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                        <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">Cliente con balance CXC inicial</p>
                        <p className="text-sm text-muted-foreground">
                          Este cliente tiene un balance pendiente pero no tiene facturas registradas.
                          Puede aplicar un pago directamente al balance.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-medium">Este cliente no tiene facturas pendientes</p>
                      </div>
                    )
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-sm sm:text-base">
                          Facturas Pendientes ({pendingInvoices.length})
                        </h4>
                      </div>
                      <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                        {pendingInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-3 sm:p-4 hover:bg-accent/50"
                            data-testid={`invoice-${inv.id}`}
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="font-semibold text-base sm:text-lg">
                                  Factura #{inv.invoiceNumber}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  Fecha: {formatDateRD(new Date(inv.date))}
                                </div>
                                <div className="text-xs sm:text-sm">
                                  Total: <span className="font-medium">{formatCurrency(inv.total)}</span>
                                </div>
                                <div className="text-xs sm:text-sm">
                                  Pagado: <span className="font-medium">{formatCurrency(inv.paid)}</span>
                                </div>
                              </div>
                              <div className="text-left sm:text-right w-full sm:w-auto">
                                <div className="text-xl sm:text-2xl font-bold text-red-600">
                                  {formatCurrency(inv.pending)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Pendiente
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Detalles del Pago */}
        {selectedCustomerId && (pendingInvoices.length > 0 || parseFloat(customerBalance) > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto a Pagar *</Label>
                  <Input
                    id="amount"
                    data-testid="input-payment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Método de Pago *</Label>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger id="payment-method" data-testid="select-payment-method" className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Referencia (Opcional)</Label>
                <Input
                  id="reference"
                  data-testid="input-reference"
                  placeholder="Número de transacción, cheque, etc."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                  id="notes"
                  data-testid="textarea-notes"
                  placeholder="Observaciones adicionales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="min-h-[44px]"
                />
              </div>

              {/* Preview de distribución */}
              {paymentPreview.invoices.length > 0 && (
                <div className="mt-4">
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Distribución del Pago
                    </h4>
                    <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                      {paymentPreview.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Factura #{inv.invoiceNumber}</span>
                            {inv.willBePaid && (
                              <Badge variant="default" className="text-xs">Pagada</Badge>
                            )}
                          </div>
                          <span className="font-semibold">{formatCurrency(inv.amountToApply)}</span>
                        </div>
                      ))}
                      {paymentPreview.remaining > 0.01 && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">Sobrante (Anticipo)</span>
                            </div>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(paymentPreview.remaining)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/payments")}
            disabled={applyPaymentMutation.isPending}
            data-testid="button-cancel"
            className="w-full sm:w-auto order-2 sm:order-1 min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!selectedCustomerId || !amount || parseFloat(amount) <= 0 || applyPaymentMutation.isPending}
            data-testid="button-apply-payment"
            className="w-full sm:w-auto order-1 sm:order-2 min-h-[44px]"
          >
            {applyPaymentMutation.isPending ? "Procesando..." : "Aplicar Pago"}
          </Button>
        </div>
      </form>
    </div>
  );
}
