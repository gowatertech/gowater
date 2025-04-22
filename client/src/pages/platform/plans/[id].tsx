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
  ArrowLeft, 
  Loader2, 
  Plus, 
  X, 
  Trash2 
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

// Esquema de validación para el formulario
const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  price: z.coerce.number().min(0.01, "El precio debe ser mayor a 0"),
  maxUsers: z.coerce.number().min(1, "El número de usuarios debe ser al menos 1"),
  maxTrucks: z.coerce.number().min(1, "El número de unidades debe ser al menos 1"),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Consulta para obtener detalles del plan (solo en modo edición)
  const { data: planResponse, isLoading: isLoadingPlan } = useQuery({
    queryKey: [`/api/platform/plans/${planId}`],
    queryFn: async () => {
      try {
        const result = await apiRequest({
          url: `/api/platform/plans/${planId}`,
          method: "GET"
        });
        console.log("Plan API response:", result);
        return result && result.data ? result : { data: result };
      } catch (error) {
        console.error("Error al obtener detalles del plan:", error);
        return { data: null };
      }
    },
    enabled: isEditMode && !!planId,
  });
  
  // Extraer los datos del plan
  const planData = planResponse?.data;

  // Configuración del formulario
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
    },
  });

  // Actualizar el formulario cuando se carga el plan
  useEffect(() => {
    if (isEditMode && planData) {
      console.log("Cargando datos del plan en el formulario:", planData);
      form.reset({
        name: planData.name,
        description: planData.description,
        price: parseFloat(planData.price),
        maxUsers: planData.maxUsers,
        maxTrucks: planData.maxTrucks,
        features: planData.features || [],
        isActive: planData.isActive,
      });
    }
  }, [planData, form, isEditMode]);

  // Mutación para crear un plan
  const createPlanMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: "/api/platform/plans",
        method: "POST",
        data: {
          ...data,
          price: data.price.toString(), // Asegurarse de que el precio sea una cadena
        }
      }),
    onSuccess: () => {
      toast({
        title: "Plan creado",
        description: "El plan ha sido creado correctamente",
      });
      // Invalidar consultas para actualizar la lista de planes
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      // Redireccionar a la lista de planes
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

  // Mutación para actualizar un plan
  const updatePlanMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: `/api/platform/plans/${planId}`,
        method: "PUT",
        data: {
          ...data,
          price: data.price.toString(), // Asegurarse de que el precio sea una cadena
        }
      }),
    onSuccess: () => {
      toast({
        title: "Plan actualizado",
        description: "El plan ha sido actualizado correctamente",
      });
      // Invalidar consultas para actualizar la lista de planes y los detalles de este plan
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      queryClient.invalidateQueries({ queryKey: [`/api/platform/plans/${planId}`] });
      // Redireccionar a la lista de planes
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

  // Función para agregar una característica
  const addFeature = () => {
    if (newFeature.trim() === "") return;
    
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", [...currentFeatures, newFeature.trim()]);
    setNewFeature("");
  };

  // Función para eliminar una característica
  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue(
      "features",
      currentFeatures.filter((_, i) => i !== index)
    );
  };

  // Función para manejar el envío del formulario
  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updatePlanMutation.mutate(data);
    } else {
      createPlanMutation.mutate(data);
    }
  };

  // Verificar si hay alguna mutación en progreso
  const isSubmitting = createPlanMutation.isPending || updatePlanMutation.isPending;

  // Mutación para eliminar un plan
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
      // Invalidar consultas para actualizar la lista de planes
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      // Redireccionar a la lista de planes
      setLocation("/platform/plans");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el plan",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    },
  });

  // Función para confirmar la eliminación de un plan
  const handleDeletePlan = () => {
    if (planId) {
      deletePlanMutation.mutate();
    }
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/platform/plans")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
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
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>{isEditMode ? "Editar Plan" : "Nuevo Plan"}</CardTitle>
              <CardDescription>
                Define las características y precios del plan de suscripción
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
                          <Input placeholder="Plan Básico" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nombre que identifica el plan
                        </FormDescription>
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
                          />
                        </FormControl>
                        <FormDescription>
                          Descripción detallada de las características del plan
                        </FormDescription>
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
                          <FormLabel>Precio mensual</FormLabel>
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                            />
                            <Button type="button" onClick={addFeature} variant="outline">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <ul className="space-y-2 mt-2">
                            {form.watch("features")?.map((feature, index) => (
                              <li key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
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
                        <FormDescription>
                          Lista de características incluidas en el plan
                        </FormDescription>
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
                            {field.value ? "El plan está activo y disponible para las empresas" : "El plan está desactivado y no disponible para nuevas empresas"}
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

                  <div className="flex justify-between space-x-2">
                    {isEditMode && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Plan
                      </Button>
                    )}

                    <div className="flex justify-end space-x-2 ml-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation("/platform/plans")}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Actualizar" : "Crear"} Plan
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diálogo de confirmación para eliminar plan */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el plan{" "}
              <span className="font-bold">{planData?.name}</span>?
              <p className="mt-2 text-destructive">
                Esta acción no se puede deshacer. Las empresas que ya tengan este plan seguirán teniendo acceso hasta que expire su suscripción.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePlan}
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}