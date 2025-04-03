import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Recycle, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

interface BottleReturnDialogProps {
  open: boolean;
  orderId: number | null;
  onOpenChange: (open: boolean) => void;
  darkMode?: boolean;
  onComplete?: () => void;
}

const BottleReturnDialog: React.FC<BottleReturnDialogProps> = ({
  open,
  orderId,
  onOpenChange,
  darkMode = false,
  onComplete
}) => {
  const [returnedBottlesCount, setReturnedBottlesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleBottleReturn = async () => {
    if (!orderId || returnedBottlesCount <= 0) return;

    try {
      setLoading(true);
      
      // Aquí iría la llamada a la API para registrar la devolución
      await apiRequest(`/api/orders/${orderId}/bottle-returns`, {
        method: "POST",
        body: JSON.stringify({
          returnedQuantity: returnedBottlesCount
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      toast({
        title: "Devolución registrada",
        description: `Se han registrado ${returnedBottlesCount} envases devueltos.`,
      });
      
      if (onComplete) {
        onComplete();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error al registrar devolución:", error);
      toast({
        title: "Error al registrar",
        description: "No se pudo registrar la devolución de envases.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md ${darkMode ? 'dark bg-gray-900 text-white border-gray-700' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Recycle className="h-5 w-5 text-green-500" />
            Registrar devolución de envases
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-1">
          <div className="space-y-4">
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <p className="text-sm text-green-600 dark:text-green-400">
                Registra la cantidad de envases que el cliente está devolviendo en este momento.
              </p>
            </div>
            
            <div>
              <Label htmlFor="returnedBottles" className="text-sm font-medium mb-2 block">
                Cantidad de envases devueltos
              </Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReturnedBottlesCount(Math.max(0, returnedBottlesCount - 1))}
                  disabled={returnedBottlesCount <= 0 || loading}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <Input
                  id="returnedBottles"
                  type="number"
                  className="text-center"
                  value={returnedBottlesCount}
                  min="0"
                  onChange={(e) => setReturnedBottlesCount(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReturnedBottlesCount(returnedBottlesCount + 1)}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleBottleReturn}
            className="w-full sm:w-auto"
            disabled={returnedBottlesCount <= 0 || loading}
          >
            Confirmar devolución
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BottleReturnDialog;