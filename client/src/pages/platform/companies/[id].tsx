import React, { useEffect, useState } from "react";
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
  CardFooter, 
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
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, CheckIcon, Loader2, ArrowLeft } from "lucide-react";
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
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  subdomain: z
    .string()
    .min(3, "El subdominio debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "El subdominio solo puede contener letras minúsculas, números y guiones")
    .transform(val => val.toLowerCase()),
  active: z.boolean().default(true),
  planId: z.coerce.number().min(1, "Debes seleccionar un plan"),
  expirationDate: z.date({
    required_error: "Se requiere una fecha de expiración",
  }),
  logo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CompanyFormPage() {
  const params = useParams();
  const isEditMode = !!params.id && params.id !== "new";
  const companyId = isEditMode ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Consulta para obtener la lista de planes
  const { data: plansResponse } = useQuery({
    queryKey: ["/api/platform/plans"],
    queryFn: async () => {
      try {
        console.log("Solicitando lista de planes");
        const response = await apiRequest({
          url: "/api/platform/plans",
          method: "GET"
        });
        console.log("Respuesta de planes:", response);
        
        // Manejar respuesta con formato { data: [] } o array directo
        return response && response.data ? response : { data: response || [] };
      } catch (error) {
        console.error("Error al obtener planes:", error);
        return { data: [] };
      }
    },
  });
  
  // Extraer los planes del resultado de la consulta
  const plansData = plansResponse?.data || [];

  // Consulta para obtener detalles de la empresa (solo en modo edición)
  const { data: companyResponse, isLoading: isLoadingCompany } = useQuery({
    queryKey: [`/api/platform/companies/${companyId}`],
    queryFn: async () => {
      try {
        console.log(`Solicitando detalles de empresa ID: ${companyId}`);
        const response = await apiRequest({
          url: `/api/platform/companies/${companyId}`,
          method: "GET"
        });
        console.log("Respuesta detalle de empresa:", response);
        
        // Manejar respuesta con formato { data: {} } o objeto directo
        return response && response.data ? response : { data: response };
      } catch (error) {
        console.error("Error al obtener detalles de empresa:", error);
        return { data: null };
      }
    },
    enabled: isEditMode && !!companyId,
  });
  
  // Extraer los datos de la empresa
  const companyData = companyResponse?.data;

  // Configuración del formulario
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      active: true,
      planId: undefined,
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Un año en el futuro
      logo: "",
    },
  });

  // Actualizar el formulario cuando se carga la empresa
  useEffect(() => {
    if (isEditMode && companyData) {
      const company = companyData;
      form.reset({
        name: company.name,
        subdomain: company.subdomain,
        active: company.active,
        planId: company.planId,
        expirationDate: new Date(company.expirationDate),
        logo: company.logo || "",
      });
    }
  }, [companyData, form, isEditMode]);

  // Mutación para crear una empresa
  const createCompanyMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: "/api/platform/companies",
        method: "POST",
        data: {
          ...data,
          expirationDate: data.expirationDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
        }
      }),
    onSuccess: () => {
      toast({
        title: "Empresa creada",
        description: "La empresa ha sido creada correctamente.",
      });
      // Invalidar consultas para actualizar la lista de empresas
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      // Redireccionar a la lista de empresas
      setLocation("/platform/companies");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la empresa.",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar una empresa
  const updateCompanyMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: `/api/platform/companies/${companyId}`,
        method: "PUT",
        data: {
          ...data,
          expirationDate: data.expirationDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
        }
      }),
    onSuccess: () => {
      toast({
        title: "Empresa actualizada",
        description: "La empresa ha sido actualizada correctamente.",
      });
      // Invalidar consultas para actualizar la lista de empresas y los detalles de esta empresa
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      queryClient.invalidateQueries({ queryKey: [`/api/platform/companies/${companyId}`] });
      // Redireccionar a la lista de empresas
      setLocation("/platform/companies");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la empresa.",
        variant: "destructive",
      });
    },
  });

  // Función para manejar el envío del formulario
  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  // Verificar si hay alguna mutación en progreso
  const isSubmitting = createCompanyMutation.isPending || updateCompanyMutation.isPending;

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/platform/companies")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Editar Empresa" : "Crear Nueva Empresa"}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? "Actualiza la información de la empresa" 
                : "Completa el formulario para registrar una nueva empresa"}
            </p>
          </div>
        </div>

        {isEditMode && isLoadingCompany ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando información...</span>
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>{isEditMode ? "Editar Empresa" : "Nueva Empresa"}</CardTitle>
              <CardDescription>
                Proporciona los datos básicos para {isEditMode ? "actualizar la" : "crear una nueva"} empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Mi Empresa" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nombre comercial de la empresa
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subdominio</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <Input placeholder="miempresa" {...field} />
                            <span className="ml-2 text-muted-foreground">.dominio.com</span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Identificador único para acceder a la empresa. Solo letras minúsculas, números y guiones.
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
                            {plansData?.map((plan: any) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.name} - ${plan.price}/mes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Plan de suscripción de la empresa
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de expiración</FormLabel>
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
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Fecha en que expira la suscripción de la empresa
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Estado de la empresa</FormLabel>
                          <FormDescription>
                            {field.value ? "La empresa está activa y puede operar normalmente" : "La empresa está desactivada y no puede operar"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo (URL)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://ejemplo.com/logo.png" {...field} />
                        </FormControl>
                        <FormDescription>
                          URL de la imagen del logo de la empresa (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/platform/companies")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditMode ? "Actualizar" : "Crear"} Empresa
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