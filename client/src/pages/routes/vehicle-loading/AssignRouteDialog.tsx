import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import type { Route } from "@shared/schema";

interface AssignRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingId: number | null;
  onAssign: (routeId: number) => void;
  isAssigning: boolean;
}

export function AssignRouteDialog({ 
  open, 
  onOpenChange, 
  loadingId,
  onAssign,
  isAssigning
}: AssignRouteDialogProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");

  // Cargar las rutas disponibles (solo pendientes)
  const { data: routes = [], isLoading: isLoadingRoutes } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
    select: (data) => data.filter(route => route.status === "pending"),
    enabled: open
  });

  // Reset selección cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setSelectedRouteId("");
    }
  }, [open]);

  const handleAssign = () => {
    if (selectedRouteId && loadingId) {
      onAssign(parseInt(selectedRouteId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asignar Ruta a Carga</DialogTitle>
          <DialogDescription>
            Selecciona una ruta pendiente para asignar a esta carga.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoadingRoutes ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-sm text-gray-700">No hay rutas pendientes disponibles</p>
              <p className="text-xs text-gray-500 mt-1">Crea una nueva ruta pendiente primero</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="route-select" className="text-sm font-medium">
                  Ruta
                </label>
                <Select
                  value={selectedRouteId}
                  onValueChange={setSelectedRouteId}
                >
                  <SelectTrigger id="route-select">
                    <SelectValue placeholder="Selecciona una ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id.toString()}>
                        <div className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          <span>Ruta #{route.id} - {format(new Date(route.date), "dd/MM/yyyy")}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedRouteId || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : (
              "Asignar Ruta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}