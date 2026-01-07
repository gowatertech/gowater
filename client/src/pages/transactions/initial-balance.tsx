import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Customer, insertTransactionSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  FileText,
  Check,
  ChevronsUpDown
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Schema para el formulario (sin companyId que se inyecta del servidor)
const formSchema = insertTransactionSchema.omit({ companyId: true }).extend({
  customerId: z.number().int().positive({ message: "Debes seleccionar un cliente" }),
  amount: z.string().regex(/^\d+\.?\d{0,2}$/, "El monto debe ser un número válido"),
  description: z.string().optional(), // Hacerlo opcional ya que se genera automáticamente
});

export default function RegisterInitialBalance() {
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  // Fetch customers
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const getSelectedCustomer = (customerId: number | undefined) => {
    if (!customerId) return null;
    return customers.find(c => c.id === customerId);
  };

  // Form con Zod resolver
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: "CXC",
      type: "debit",
      customerId: undefined,
      amount: "",
      description: "",
      notes: "",
    },
  });

  // Mutation para crear CxC inicial
  const createInitialBalanceMutation = useMutation({
    mutationFn: async (transactionData: z.infer<typeof formSchema>) => {
      // Convertir amount a formato correcto antes de enviar
      const dataToSend = {
        ...transactionData,
        amount: parseFloat(transactionData.amount).toFixed(2),
      };
      
      return await apiRequest({
        url: "/api/transactions",
        method: "POST",
        data: dataToSend
      });
    },
    onSuccess: () => {
      toast({
        title: "CxC Inicial registrada",
        description: "El balance inicial del cliente ha sido registrado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      // Resetear formulario
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar CxC inicial",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const customer = customers.find(c => c.id === values.customerId);
    
    const transactionData = {
      ...values,
      description: `CxC Inicial - ${customer?.businessname || 'Cliente'}`,
    };

    createInitialBalanceMutation.mutate(transactionData);
  };

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
            onClick={() => setLocation("/customers")}
            className="gap-1"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Registrar CxC Inicial
          </h1>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Registrar Balance Inicial</CardTitle>
            <CardDescription>
              Registra el saldo inicial (CxC) que el cliente trae de un sistema anterior o deuda previa
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Seleccionar Cliente con búsqueda */}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => {
                    const selectedCustomer = getSelectedCustomer(field.value);
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Cliente</FormLabel>
                        <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={customerSearchOpen}
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="select-customer"
                              >
                                {selectedCustomer 
                                  ? `${selectedCustomer.businessname} - ${selectedCustomer.phone}`
                                  : "Buscar cliente por nombre, teléfono..."
                                }
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Buscar por nombre, teléfono, RNC..." 
                                data-testid="input-search-customer"
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {isLoadingCustomers 
                                    ? "Cargando clientes..." 
                                    : "No se encontraron clientes"
                                  }
                                </CommandEmpty>
                                <CommandGroup>
                                  {customers.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={`${customer.businessname} ${customer.phone} ${customer.rnc || ''} ${customer.managername}`}
                                      onSelect={() => {
                                        field.onChange(customer.id);
                                        setCustomerSearchOpen(false);
                                      }}
                                      data-testid={`customer-option-${customer.id}`}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{customer.businessname}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {customer.phone} {customer.rnc && `| RNC: ${customer.rnc}`}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Monto */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto del Balance Inicial</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          data-testid="input-amount"
                          {...field}
                        />
                      </FormControl>
                      {field.value && parseFloat(field.value) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(field.value)}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notas */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del balance inicial..."
                          rows={3}
                          data-testid="textarea-notes"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Botones */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createInitialBalanceMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createInitialBalanceMutation.isPending ? "Registrando..." : "Registrar CxC Inicial"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
