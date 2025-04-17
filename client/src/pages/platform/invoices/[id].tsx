import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Loader2, 
  CalendarIcon 
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { PlatformLayout } from "../_components/PlatformLayout";

// Esquema de validación para el formulario
const formSchema = z.object({
  companyId: z.coerce.number().min(1, "Selecciona una empresa"),
  planId: z.coerce.number().min(1, "Selecciona un plan"),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  status: z.enum(["pending", "paid", "cancelled", "overdue"], {
    required_error: "Selecciona un estado",
  }),
  dueDate: z.date({
    required_error: "Se requiere una fecha de vencimiento",
  }),
  paidDate: z.date().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function InvoiceFormPage() {
  const params = useParams();
  const isEditMode = !!params.id && params.id !== "new";
  const invoiceId = isEditMode ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Consulta para obtener la lista de empresas
  const { data: companiesData } = useQuery({
    queryKey: ["/api/platform/companies"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/companies",
        method: "GET"
      }),
  });

  // Consulta para obtener la lista de planes
  const { data: plansData } = useQuery({
    queryKey: ["/api/platform/plans"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/plans",
        method: "GET"
      }),
  });

  // Consulta para obtener detalles de la factura (solo en modo edición)
  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery({
    queryKey: [`/api/platform/membership-invoices/${invoiceId}`],
    queryFn: () => 
      apiRequest({
        url: `/api/platform/membership-invoices/${invoiceId}`,
        method: "GET"
      }),
    enabled: isEditMode && !!invoiceId,
  });

  // Configuración del formulario
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: undefined,
      planId: undefined,
      amount: 0,
      status: "pending",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días en el futuro
      notes: "",
    },
  });

  // Actualizar el formulario cuando se carga la factura
  useEffect(() => {
    if (isEditMode && invoiceData?.data) {
      const invoice = invoiceData.data;
      form.reset({
        companyId: invoice.companyId,
        planId: invoice.planId,
        amount: parseFloat(invoice.amount),
        status: invoice.status,
        dueDate: new Date(invoice.dueDate),
        paidDate: invoice.paidDate ? new Date(invoice.paidDate) : undefined,
        notes: invoice.notes || "",
      });
    }
  }, [invoiceData, form, isEditMode]);

  // Efecto para actualizar el monto cuando se selecciona un plan
  useEffect(() => {
    const selectedPlanId = form.watch("planId");
    if (selectedPlanId && plansData?.data) {
      const selectedPlan = plansData.data.find((plan: any) => plan.id === selectedPlanId);
      if (selectedPlan && !isEditMode) {
        form.setValue("amount", parseFloat(selectedPlan.price));
      }
    }
  }, [form.watch("planId"), plansData, form, isEditMode]);

  // Mutación para crear una factura
  const createInvoiceMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: "/api/platform/membership-invoices",
        method: "POST",
        data: {
          ...data,
          amount: data.amount.toString(), // Asegurarse de que el monto sea una cadena
          dueDate: data.dueDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
          paidDate: data.paidDate ? data.paidDate.toISOString().split('T')[0] : undefined,
        }
      }),
    onSuccess: () => {
      toast({
        title: "Factura creada",
        description: "La factura ha sido creada correctamente",
      });
      // Invalidar consultas para actualizar la lista de facturas
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
      // Redireccionar a la lista de facturas
      setLocation("/platform/invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar una factura
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: `/api/platform/membership-invoices/${invoiceId}`,
        method: "PUT",
        data: {
          ...data,
          amount: data.amount.toString(), // Asegurarse de que el monto sea una cadena
          dueDate: data.dueDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
          paidDate: data.paidDate ? data.paidDate.toISOString().split('T')[0] : undefined,
        }
      }),
    onSuccess: () => {
      toast({
        title: "Factura actualizada",
        description: "La factura ha sido actualizada correctamente",
      });
      // Invalidar consultas para actualizar la lista de facturas y los detalles de esta factura
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
      queryClient.invalidateQueries({ queryKey: [`/api/platform/membership-invoices/${invoiceId}`] });
      // Redireccionar a la lista de facturas
      setLocation("/platform/invoices");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la factura",
        variant: "destructive",
      });
    },
  });

  // Función para manejar el envío del formulario
  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updateInvoiceMutation.mutate(data);
    } else {
      createInvoiceMutation.mutate(data);
    }
  };

  // Verificar si hay alguna mutación en progreso
  const isSubmitting = createInvoiceMutation.isPending || updateInvoiceMutation.isPending;

  // Estado actual seleccionado en el formulario
  const currentStatus = form.watch("status");

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/platform/invoices")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Editar Factura" : "Crear Nueva Factura"}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? "Actualiza la información de la factura de membresía" 
                : "Completa el formulario para crear una nueva factura de membresía"}
            </p>
          </div>
        </div>

        {isEditMode && isLoadingInvoice ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando información...</span>
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>{isEditMode ? "Editar Factura" : "Nueva Factura"}</CardTitle>
              <CardDescription>
                Información de la factura de membresía
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una empresa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companiesData?.data?.map((company: any) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Empresa a la que pertenece esta factura
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="planId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {plansData?.data?.map((plan: any) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.name} - ${plan.price}/mes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Plan de suscripción facturado
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <span className="mr-2">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="99.99"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Monto a facturar en dólares
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="paid">Pagada</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                              <SelectItem value="overdue">Vencida</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Estado actual de la factura
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de vencimiento</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecciona una fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Fecha límite de pago
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Fecha de pago (solo visible si el estado es "pagada") */}
                  {currentStatus === "paid" && (
                    <FormField
                      control={form.control}
                      name="paidDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de pago</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecciona una fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                defaultMonth={field.value}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Fecha en que se realizó el pago
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Información adicional sobre la factura..." 
                            rows={3} 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Observaciones o información adicional (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/platform/invoices")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditMode ? "Actualizar" : "Crear"} Factura
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </PlatformLayout>
  );
}