import React, { useState, useEffect } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReturnableProduct {
  id: number;
  name: string;
  quantity: number;
  bottleDeposit: string;
  isReturnable: boolean;
}

interface ExistingReturn {
  productId: number;
  returnedQuantity: number;
}

interface BottleReturnDialogProps {
  open: boolean;
  orderId: number | null;
  returnableProducts: ReturnableProduct[];
  existingReturns: ExistingReturn[];
  onOpenChange: (open: boolean) => void;
  darkMode?: boolean;
  onComplete?: () => void;
}

const BottleReturnDialog: React.FC<BottleReturnDialogProps> = ({
  open,
  orderId,
  returnableProducts = [],
  existingReturns = [],
  onOpenChange,
  darkMode = false,
  onComplete
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [returnedQuantity, setReturnedQuantity] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Resetear el formulario cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setSelectedProductId("");
      setReturnedQuantity(0);
    }
  }, [open]);

  // Calcular la cantidad máxima que se puede retornar para el producto seleccionado
  const getMaxReturnQuantity = (productId: number): number => {
    const product = returnableProducts.find(p => p.id === productId);
    if (!product) return 0;

    // Cantidad esperada (cantidad pedida)
    const expectedQuantity = product.quantity;

    // Cantidad ya retornada previamente
    const alreadyReturned = existingReturns
      .filter(r => r.productId === productId)
      .reduce((sum, r) => sum + r.returnedQuantity, 0);

    // Cantidad máxima que se puede retornar = esperada - ya retornada
    return Math.max(0, expectedQuantity - alreadyReturned);
  };

  const selectedProduct = returnableProducts.find(
    p => p.id === parseInt(selectedProductId)
  );
  const maxReturnQuantity = selectedProduct 
    ? getMaxReturnQuantity(selectedProduct.id) 
    : 0;

  const handleBottleReturn = async () => {
    if (!orderId || !selectedProductId || returnedQuantity <= 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar un producto y cantidad válida",
        variant: "destructive"
      });
      return;
    }

    if (returnedQuantity > maxReturnQuantity) {
      toast({
        title: "Error",
        description: `Solo puedes retornar hasta ${maxReturnQuantity} envases de este producto`,
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const product = returnableProducts.find(p => p.id === parseInt(selectedProductId));
      if (!product) {
        throw new Error("Producto no encontrado");
      }

      // Calcular las cantidades
      const expectedQuantity = product.quantity;
      const alreadyReturned = existingReturns
        .filter(r => r.productId === product.id)
        .reduce((sum, r) => sum + r.returnedQuantity, 0);
      const pendingQuantity = Math.max(0, expectedQuantity - alreadyReturned - returnedQuantity);

      await apiRequest({
        url: `/api/orders/${orderId}/bottle-returns`,
        method: "POST",
        data: {
          productId: product.id,
          expectedQuantity: expectedQuantity,
          returnedQuantity: returnedQuantity,
          pendingQuantity: pendingQuantity,
          status: pendingQuantity === 0 ? "complete" : "incomplete"
        }
      });
      
      toast({
        title: "Retorno registrado",
        description: `Se registraron ${returnedQuantity} envase(s) de ${product.name}`,
      });
      
      if (onComplete) {
        onComplete();
      }
      
      onOpenChange(false);
      setReturnedQuantity(0);
      setSelectedProductId("");
    } catch (error) {
      console.error("Error al registrar retorno:", error);
      toast({
        title: "Error al registrar",
        description: error instanceof Error ? error.message : "No se pudo registrar el retorno de envases",
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
            Registrar retorno de envases
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-1">
          <div className="space-y-4">
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <p className="text-sm text-green-600 dark:text-green-400">
                Selecciona el producto y la cantidad de envases que el cliente está devolviendo.
              </p>
            </div>

            {returnableProducts.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No hay productos retornables en este pedido
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="product" className="text-sm font-medium mb-2 block">
                    Producto
                  </Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={setSelectedProductId}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {returnableProducts.map((product) => {
                        const maxQty = getMaxReturnQuantity(product.id);
                        return (
                          <SelectItem 
                            key={product.id} 
                            value={product.id.toString()}
                            disabled={maxQty === 0}
                          >
                            {product.name} (disponibles: {maxQty})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProductId && (
                  <div>
                    <Label htmlFor="returnedBottles" className="text-sm font-medium mb-2 block">
                      Cantidad de envases devueltos
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnedQuantity(Math.max(0, returnedQuantity - 1))}
                          disabled={returnedQuantity <= 0 || loading}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <Input
                          id="returnedBottles"
                          type="number"
                          className="text-center"
                          value={returnedQuantity}
                          min="0"
                          max={maxReturnQuantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setReturnedQuantity(Math.min(value, maxReturnQuantity));
                          }}
                          disabled={loading}
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnedQuantity(Math.min(returnedQuantity + 1, maxReturnQuantity))}
                          disabled={returnedQuantity >= maxReturnQuantity || loading}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Máximo disponible: {maxReturnQuantity} envase(s)
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
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
            disabled={!selectedProductId || returnedQuantity <= 0 || loading}
          >
            Confirmar retorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BottleReturnDialog;
