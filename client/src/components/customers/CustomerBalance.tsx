import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const advancePaymentSchema = z.object({
  amount: z.string()
    .min(1, "El monto es requerido")
    .regex(/^\d+(\.\d{1,2})?$/, "Debe ser un monto válido con máximo 2 decimales")
    .refine((val) => parseFloat(val) > 0, "El monto debe ser mayor a 0"),
  paymentMethod: z.enum(["cash", "card", "transfer"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type AdvancePaymentFormData = z.infer<typeof advancePaymentSchema>;

interface CustomerBalanceProps {
  customerId: number;
  customerName: string;
}

export function CustomerBalance({ customerId, customerName }: CustomerBalanceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<AdvancePaymentFormData>({
    resolver: zodResolver(advancePaymentSchema),
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
      reference: "",
      notes: "",
    },
  });

  // Obtener balance del cliente
  const { data: balanceData, isLoading } = useQuery({
    queryKey: ["/api/customers", customerId, "balance"],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}/balance`);
      if (!response.ok) {
        throw new Error("Error al obtener balance del cliente");
      }
      return await response.json();
    },
  });

  // Mutation para registrar anticipo
  const registerAdvanceMutation = useMutation({
    mutationFn: async (formData: AdvancePaymentFormData) => {
      return await apiRequest(`/api/customers/${customerId}/advance-payment`, {
        method: "POST",
        data: {
          amount: parseFloat(formData.amount).toFixed(2),
          paymentMethod: formData.paymentMethod,
          reference: formData.reference || undefined,
          notes: formData.notes || `Anticipo registrado para ${customerName}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "balance"] });
      toast({
        title: "Anticipo registrado",
        description: "El anticipo se ha registrado correctamente",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: String(error),
      });
    },
  });

  const onSubmit = (data: AdvancePaymentFormData) => {
    registerAdvanceMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Balance del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  const balance = balanceData?.balance;
  const availableAdvances = balanceData?.availableAdvances || [];
  const customerBalance = parseFloat(balance?.customerBalance || "0");
  const creditLimit = parseFloat(balance?.creditLimit || "0");
  const netBalance = parseFloat(balance?.netBalance || "0");
  const pendingInvoices = parseFloat(balance?.totalPendingInvoices || "0");
  const totalAdvances = parseFloat(balance?.totalAvailableAdvances || "0");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Balance del Cliente
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Seguimiento de anticipos y facturas pendientes
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" data-testid="button-register-advance">
                <Plus className="h-3.5 w-3.5" />
                Registrar Anticipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Anticipo</DialogTitle>
                <DialogDescription>
                  Registrar un pago adelantado de {customerName}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-advance-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Pago</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Seleccione método" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="card">Tarjeta</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referencia (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Número de confirmación"
                            {...field}
                            data-testid="input-reference"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Anticipo para próximo pedido"
                            {...field}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={registerAdvanceMutation.isPending}
                      data-testid="button-submit-advance"
                    >
                      {registerAdvanceMutation.isPending ? "Registrando..." : "Registrar Anticipo"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Principal y Límite de Crédito */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Balance del Cliente (CXC)</p>
            <p className="text-2xl font-bold text-red-600 flex items-center gap-1" data-testid="text-customer-balance">
              <DollarSign className="h-5 w-5" />
              {customerBalance.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Límite de Crédito</p>
            <p className="text-2xl font-bold text-blue-600 flex items-center gap-1" data-testid="text-credit-limit">
              <Wallet className="h-5 w-5" />
              {creditLimit.toFixed(2)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Desglose del Balance */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Facturas Pendientes</p>
            <p className="text-lg font-semibold flex items-center gap-1" data-testid="text-pending-invoices">
              <TrendingUp className="h-4 w-4 text-red-500" />
              ${pendingInvoices.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Anticipos Disponibles</p>
            <p className="text-lg font-semibold flex items-center gap-1 text-green-600" data-testid="text-available-advances">
              <TrendingDown className="h-4 w-4" />
              ${totalAdvances.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Balance Total</p>
            <p className={`text-xl font-bold flex items-center gap-1 ${netBalance > 0 ? 'text-red-600' : netBalance < 0 ? 'text-green-600' : ''}`} data-testid="text-net-balance">
              <DollarSign className="h-5 w-5" />
              ${netBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {availableAdvances.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Anticipos Disponibles</p>
              <div className="space-y-2">
                {availableAdvances.map((advance: any) => (
                  <div
                    key={advance.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                    data-testid={`advance-item-${advance.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {advance.paymentMethod === "cash" && "Efectivo"}
                        {advance.paymentMethod === "card" && "Tarjeta"}
                        {advance.paymentMethod === "transfer" && "Transferencia"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(advance.date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="font-semibold text-green-600">
                      ${parseFloat(advance.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
