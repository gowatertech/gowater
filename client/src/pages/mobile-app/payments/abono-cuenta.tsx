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
import { Search, DollarSign, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MobileHeader } from "@/pages/mobile-app/components/MobileHeader";
import { MobileFooter } from "@/pages/mobile-app/components/MobileFooter";

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

export default function MobileAbonoACuentaPage() {
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
    queryKey: ["/api/mobile/customers"],
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
    queryKey: [`/api/mobile/customers/${selectedCustomerId}/pending-invoices`],
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
      (c.managername ?? "").toLowerCase().includes(term) ||
      (c.phone ?? "").includes(term)
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
    if (paymentAmount <= 0) {
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
        url: "/api/mobile/payments/account-payment",
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
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/payments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/mobile/customers/${selectedCustomerId}/pending-invoices`] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/customers"] });
      
      // Resetear el formulario y volver a clientes móvil
      handleReset();
      navigate("/mobile-app/clientes");
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
    <div className="flex flex-col min-h-screen bg-background">
      <MobileHeader 
        title="Abono a Cuenta" 
        darkMode={false} 
        onToggleDarkMode={() => {}}
        showBackButton={true}
        onBackButtonClick={() => navigate("/mobile-app/clientes")}
      />

      <main className="flex-1 p-3 pt-2 pb-20 overflow-auto">
        {/* Descripción */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground">
            Aplicar un pago que se distribuirá automáticamente a las facturas pendientes del cliente desde la más antigua
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Buscar Cliente</CardTitle>
              <CardDescription className="text-xs">Busca por nombre, encargado o teléfono</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                          className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 active:bg-accent/80"
                          onClick={() => handleSelectCustomer(customer.id)}
                          data-testid={`customer-result-${customer.id}`}
                        >
                          <div className="font-medium text-sm">{customer.businessname}</div>
                          <div className="text-xs text-muted-foreground">
                            {customer.managername} • {customer.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Card className="bg-accent/50 border-primary/20">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{selectedCustomer?.businessname}</h3>
                        <p className="text-xs text-muted-foreground truncate">
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
                        className="shrink-0 h-8 text-xs"
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Información Financiera</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingInvoices ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Cargando información del cliente...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Balance del Cliente */}
                    <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-4 rounded-lg border-2 border-red-200 dark:border-red-800">
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                            Balance del Cliente
                          </p>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400 break-all">
                            {formatCurrency(customerBalance)}
                          </p>
                        </div>
                        <DollarSign className="h-10 w-10 text-red-300 dark:text-red-700 shrink-0" />
                      </div>
                    </div>

                    {pendingInvoices.length === 0 ? (
                      parseFloat(customerBalance) > 0 ? (
                        <div className="text-center py-6 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                          <FileText className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                          <p className="text-sm font-medium mb-1">Cliente con balance CXC inicial</p>
                          <p className="text-xs text-muted-foreground px-4">
                            Este cliente tiene un balance pendiente pero no tiene facturas registradas.
                            Puede aplicar un pago directamente al balance o crear un anticipo.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                          <CheckCircle2 className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                          <p className="text-sm font-medium mb-1">Cliente al día</p>
                          <p className="text-xs text-muted-foreground px-4">
                            Este cliente no tiene facturas pendientes. 
                            Puede crear un anticipo para futuras facturas.
                          </p>
                        </div>
                      )
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-sm">
                            Facturas Pendientes ({pendingInvoices.length})
                          </h4>
                        </div>
                        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                          {pendingInvoices.map((inv) => (
                            <div
                              key={inv.id}
                              className="p-3"
                              data-testid={`invoice-${inv.id}`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="font-semibold text-sm">
                                    Factura #{inv.invoiceNumber}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDateRD(new Date(inv.date))}
                                  </div>
                                  <div className="text-xs">
                                    Total: <span className="font-medium">{formatCurrency(inv.total)}</span>
                                  </div>
                                  <div className="text-xs">
                                    Pagado: <span className="font-medium">{formatCurrency(inv.paid)}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-red-600">
                                    {formatCurrency(inv.pending)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
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
          {selectedCustomerId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalles del Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm">Monto a Pagar *</Label>
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
                    className="min-h-[44px] text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method" className="text-sm">Método de Pago *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="reference" className="text-sm">Referencia (Opcional)</Label>
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
                  <Label htmlFor="notes" className="text-sm">Notas (Opcional)</Label>
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
                  <div className="mt-3">
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Distribución del Pago
                      </h4>
                      <div className="bg-accent/50 rounded-lg p-3 space-y-2">
                        {paymentPreview.invoices.map((inv: any) => (
                          <div key={inv.id} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Factura #{inv.invoiceNumber}</span>
                              {inv.willBePaid && (
                                <Badge variant="default" className="text-[10px] h-4">Pagada</Badge>
                              )}
                            </div>
                            <span className="font-semibold">{formatCurrency(inv.amountToApply)}</span>
                          </div>
                        ))}
                        {paymentPreview.remaining > 0.01 && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3 text-blue-500" />
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
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={!selectedCustomerId || !amount || parseFloat(amount) <= 0 || applyPaymentMutation.isPending}
              data-testid="button-apply-payment"
              className="w-full min-h-[48px] text-base"
              size="lg"
            >
              {applyPaymentMutation.isPending ? "Procesando..." : "Aplicar Pago"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/mobile-app/clientes")}
              disabled={applyPaymentMutation.isPending}
              data-testid="button-cancel"
              className="w-full min-h-[48px]"
              size="lg"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </main>

      <MobileFooter />
    </div>
  );
}
