import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Loader2, 
  Plus, 
  X, 
  Trash2,
  Calendar,
  Percent,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { PlatformLayout } from "../_components/PlatformLayout";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  price: z.coerce.number().min(0.01, "El precio debe ser mayor a 0"),
  maxUsers: z.coerce.number().min(1, "El número de usuarios debe ser al menos 1"),
  maxTrucks: z.coerce.number().min(1, "El número de unidades debe ser al menos 1"),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  trialDays: z.coerce.number().min(0).default(0),
  quarterlyDiscount: z.coerce.number().min(0).max(100).default(0),
  yearlyDiscount: z.coerce.number().min(0).max(100).default(0),
  gracePeriodDays: z.coerce.number().min(0).default(7),
});

type FormData = z.infer<typeof formSchema>;

export default function PlanFormPage() {
  const params = useParams();
  const isEditMode = !!params.id && params.id !== "new";
  const planId = isEditMode ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [newFeature, setNewFeature] = useState("");

  const { data: planResponse, isLoading: isLoadingPlan } = useQuery({
    queryKey: [`/api/platform/plans/${planId}`],
    queryFn: async () => {
      try {
        const result = await apiRequest({
          url: `/api/platform/plans/${planId}`,
          method: "GET"
        });
        return result && result.data ? result : { data: result };
      } catch (error) {
        console.error("Error al obtener detalles del plan:", error);
        return { data: null };
      }
    },
    enabled: isEditMode && !!planId,
  });
  
  const planData = planResponse?.data;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      maxUsers: 1,
      maxTrucks: 1,
      features: [],
      isActive: true,
      billingCycle: "monthly",
      trialDays: 0,
      quarterlyDiscount: 0,
      yearlyDiscount: 0,
      gracePeriodDays: 7,
    },
  });

  useEffect(() => {
    if (isEditMode && planData) {
      form.reset({
        name: planData.name,
        description: planData.description,
        price: parseFloat(planData.price),
        maxUsers: planData.maxUsers,
        maxTrucks: planData.maxTrucks,
        features: planData.features || [],
        isActive: planData.isActive,
        billingCycle: planData.billingCycle || "monthly",
        trialDays: planData.trialDays || 0,
        quarterlyDiscount: parseFloat(planData.quarterlyDiscount || "0"),
        yearlyDiscount: parseFloat(planData.yearlyDiscount || "0"),
        gracePeriodDays: planData.gracePeriodDays || 7,
      });
    }
  }, [planData, form, isEditMode]);

  const createPlanMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: "/api/platform/plans",
        method: "POST",
        data: {
          ...data,
          price: data.price.toString(),
          quarterlyDiscount: data.quarterlyDiscount.toString(),
          yearlyDiscount: data.yearlyDiscount.toString(),
        }
      }),
    onSuccess: () => {
      toast({
        title: "Plan creado",
        description: "El plan ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      setLocation("/platform/plans");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el plan",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: `/api/platform/plans/${planId}`,
        method: "PUT",
        data: {
          ...data,
          price: data.price.toString(),
          quarterlyDiscount: data.quarterlyDiscount.toString(),
          yearlyDiscount: data.yearlyDiscount.toString(),
        }
      }),
    onSuccess: () => {
      toast({
        title: "Plan actualizado",
        description: "El plan ha sido actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      queryClient.invalidateQueries({ queryKey: [`/api/platform/plans/${planId}`] });
      setLocation("/platform/plans");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el plan",
        variant: "destructive",
      });
    },
  });

  const addFeature = () => {
    if (newFeature.trim() === "") return;
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", [...currentFeatures, newFeature.trim()]);
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", currentFeatures.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updatePlanMutation.mutate(data);
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const isSubmitting = createPlanMutation.isPending || updatePlanMutation.isPending;

  const deletePlanMutation = useMutation({
    mutationFn: () => 
      apiRequest({
        url: `/api/platform/plans/${planId}`,
        method: "DELETE"
      }),
    onSuccess: () => {
      toast({
        title: "Plan eliminado",
        description: "El plan ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      setLocation("/platform/plans");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el plan",
        variant: "destructive",
      });
    },
  });

  const billingCycleLabels = {
    monthly: "Mensual",
    quarterly: "Trimestral",
    yearly: "Anual"
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/platform/plans")}
            className="mr-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              {isEditMode ? "Editar Plan" : "Crear Nuevo Plan"}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? "Actualiza la información del plan de suscripción" 
                : "Completa el formulario para crear un nuevo plan de suscripción"}
            </p>
          </div>
        </div>

        {isEditMode && isLoadingPlan ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando información...</span>
          </div>
        ) : (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>{isEditMode ? "Editar Plan" : "Nuevo Plan"}</CardTitle>
              <CardDescription>
                Define las características, precios y ciclos de facturación del plan
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
                        <FormLabel>Nombre del plan</FormLabel>
                        <FormControl>
                          <Input placeholder="Plan Básico" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormDescription>Nombre que identifica el plan</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Plan básico con características esenciales..." 
                            rows={3} 
                            {...field} 
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormDescription>Descripción detallada de las características</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio base</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <span className="mr-2">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="99.99"
                                {...field}
                                data-testid="input-price"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxUsers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máximo de usuarios</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              placeholder="5" 
                              {...field} 
                              data-testid="input-max-users"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxTrucks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máximo de unidades</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              placeholder="3" 
                              {...field} 
                              data-testid="input-max-trucks"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Configuración de Membresía
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="billingCycle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciclo de facturación</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-billing-cycle">
                                    <SelectValue placeholder="Seleccionar ciclo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly">Mensual</SelectItem>
                                  <SelectItem value="quarterly">Trimestral</SelectItem>
                                  <SelectItem value="yearly">Anual</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>Frecuencia de cobro del plan</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="trialDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Días de prueba
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="14" 
                                  {...field} 
                                  data-testid="input-trial-days"
                                />
                              </FormControl>
                              <FormDescription>Período de prueba gratuita (0 = sin prueba)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="quarterlyDiscount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Descuento trimestral
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    step="0.1"
                                    placeholder="5" 
                                    {...field} 
                                    data-testid="input-quarterly-discount"
                                  />
                                  <span className="ml-2">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="yearlyDiscount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Descuento anual
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    step="0.1"
                                    placeholder="15" 
                                    {...field} 
                                    data-testid="input-yearly-discount"
                                  />
                                  <span className="ml-2">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="gracePeriodDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Días de gracia</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="7" 
                                  {...field} 
                                  data-testid="input-grace-period"
                                />
                              </FormControl>
                              <FormDescription>Antes de suspensión</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <FormField
                    control={form.control}
                    name="features"
                    render={() => (
                      <FormItem>
                        <FormLabel>Características</FormLabel>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Añadir característica"
                              value={newFeature}
                              onChange={(e) => setNewFeature(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                              data-testid="input-new-feature"
                            />
                            <Button type="button" onClick={addFeature} variant="outline" data-testid="button-add-feature">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <ul className="space-y-2 mt-2">
                            {form.watch("features")?.map((feature, index) => (
                              <li key={index} className="flex items-center justify-between p-2 bg-muted rounded-md" data-testid={`feature-item-${index}`}>
                                <span>{feature}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFeature(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                          {form.watch("features")?.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              No se han agregado características
                            </p>
                          )}
                        </div>
                        <FormDescription>Lista de características incluidas en el plan</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Estado del plan</FormLabel>
                          <FormDescription>
                            {field.value ? "Activo y disponible para las empresas" : "Desactivado y no disponible para nuevas empresas"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setLocation("/platform/plans")}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditMode ? "Actualizar" : "Crear"} Plan
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