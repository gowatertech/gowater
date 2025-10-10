import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LocationSelector from "@/components/map/LocationSelector";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LocationCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
  currentCoordinates?: string;
  onSuccess?: () => void;
}

export default function LocationCaptureDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentCoordinates,
  onSuccess,
}: LocationCaptureDialogProps) {
  const [coordinates, setCoordinates] = useState(currentCoordinates || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!coordinates) {
      toast({
        title: "Error",
        description: "Por favor selecciona una ubicación en el mapa",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("PATCH", `/api/customers/${customerId}`, {
        coordinates,
      });

      toast({
        title: "Ubicación guardada",
        description: "Las coordenadas del cliente se han actualizado correctamente",
      });

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error al guardar ubicación:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la ubicación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Seleccionar Ubicación en Mapa
          </DialogTitle>
          <DialogDescription>
            Cliente: {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="h-[400px] border rounded-md overflow-hidden">
            <LocationSelector
              value={coordinates}
              onChange={setCoordinates}
            />
          </div>

          {coordinates && (
            <div className="text-sm text-muted-foreground">
              <p>Coordenadas seleccionadas:</p>
              <p className="font-mono">{coordinates}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!coordinates || isSubmitting}
              data-testid="button-save-location"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Guardar Ubicación
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
