import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { PlatformLayout } from "../_components/PlatformLayout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  RefreshCw, 
  Package,
  Check,
  X
} from "lucide-react";

// Interfaz para los planes
interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  maxUsers: number;
  maxTrucks: number;
  features: string[];
  isActive: boolean;
}

export default function PlansPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  // Consulta para obtener todos los planes
  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform/plans"],
    queryFn: async () => {
      const result = await apiRequest({
        url: "/api/platform/plans",
        method: "GET"
      });
      console.log("Plans API response:", result);
      return result;
    },
  });

  // Mutación para eliminar un plan
  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest({
        url: `/api/platform/plans/${id}`,
        method: "DELETE"
      }),
    onSuccess: () => {
      toast({
        title: "Plan eliminado",
        description: "El plan ha sido eliminado correctamente",
      });
      setPlanToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el plan",
        variant: "destructive",
      });
    },
  });

  // Manejar la eliminación de un plan
  const handleDeletePlan = (plan: Plan) => {
    setPlanToDelete(plan);
  };

  // Confirmar la eliminación de un plan
  const confirmDelete = () => {
    if (planToDelete) {
      deletePlanMutation.mutate(planToDelete.id);
    }
  };

  // Formatear el precio
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(parseFloat(price));
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Planes</h1>
            <p className="text-muted-foreground">
              Administra los planes de suscripción disponibles para las empresas
            </p>
          </div>
          <Button onClick={() => setLocation("/platform/plans/new")}>
            <PlusIcon className="mr-2 h-4 w-4" /> Nuevo Plan
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Planes</CardTitle>
            <CardDescription>
              Lista de planes de suscripción disponibles
            </CardDescription>
            <div className="flex justify-end mt-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin">
                  <RefreshCw className="h-8 w-8 text-primary" />
                </div>
              </div>
            ) : !plans?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-lg font-medium">No hay planes</h3>
                <p className="mt-1">Aún no hay planes de suscripción registrados</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setLocation("/platform/plans/new")}
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> Crear Plan
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Usuarios</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan: Plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {plan.description}
                        </TableCell>
                        <TableCell>{formatPrice(plan.price)}/mes</TableCell>
                        <TableCell>{plan.maxUsers}</TableCell>
                        <TableCell>{plan.maxTrucks}</TableCell>
                        <TableCell>
                          {plan.isActive ? (
                            <Badge className="bg-green-500">
                              <Check className="mr-1 h-3 w-3" /> Activo
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="mr-1 h-3 w-3" /> Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setLocation(`/platform/plans/${plan.id}`)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeletePlan(plan)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación para eliminar plan */}
      <Dialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el plan{" "}
              <span className="font-bold">{planToDelete?.name}</span>?
              <p className="mt-2 text-destructive">
                Esta acción no se puede deshacer. Las empresas que ya tengan este plan seguirán teniendo acceso hasta que expire su suscripción.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}