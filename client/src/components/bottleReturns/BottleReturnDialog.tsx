import { useState, useEffect } from "react";
import { PillBottle, MinusCircle, PlusCircle, Check, Ban, Search, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Interfaces
interface Product {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  price: number;
}

interface BottleReturn {
  id?: number;
  orderId: number;
  productId: number;
  productName: string;
  expectedQuantity: number;
  returnedQuantity: number;
  pendingQuantity: number;
  status: "complete" | "incomplete";
}

interface BottleReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number | null;
  darkMode?: boolean;
  products: Product[];
}

export default function BottleReturnDialog({
  open,
  onOpenChange,
  orderId,
  darkMode = false,
  products
}: BottleReturnDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [returnedQuantity, setReturnedQuantity] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Filtrar productos que sean retornables (en un sistema real, tendríamos un atributo para esto)
  // Por ahora, asumimos que son retornables productos con nombres específicos
  const returnableProducts = products.filter(product => 
    product.name.toLowerCase().includes("botellón") || 
    product.name.toLowerCase().includes("envase") ||
    product.name.toLowerCase().includes("garrafón")
  );

  // Obtener los retornos de botellas existentes para esta orden
  const { data: bottleReturns, isLoading: isLoadingReturns } = useQuery({
    queryKey: ['/api/orders', orderId, 'bottle-returns'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/bottle-returns`);
      return await response.json();
    },
    enabled: open && !!orderId
  });

  // Registrar un retorno de botellas
  const { mutate: registerReturn, isPending: isRegistering } = useMutation({
    mutationFn: async (data: { 
      productId: number; 
      returnedQuantity: number; 
      expectedQuantity: number;
    }) => {
      const response = await fetch(`/api/orders/${orderId}/bottle-returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al registrar el retorno de envases');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Retorno registrado",
        description: "El retorno de envases se ha registrado correctamente",
        variant: "default",
      });
      // Invalidar consultas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'bottle-returns'] });
      setSelectedProduct(null);
      setReturnedQuantity(0);
      setSearchTerm("");
    },
    onError: (error) => {
      toast({
        title: "Error al registrar retorno",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Actualizar los productos filtrados cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(returnableProducts);
    } else {
      setFilteredProducts(
        returnableProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, returnableProducts]);

  // Restablecer el formulario cuando se cierra el diálogo
  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setReturnedQuantity(0);
      setSearchTerm("");
    } else {
      setFilteredProducts(returnableProducts);
    }
  }, [open, returnableProducts]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    
    // Si ya existe un retorno para este producto, establecer la cantidad
    const existingReturn = bottleReturns?.find(ret => ret.productId === product.productId);
    if (existingReturn) {
      setReturnedQuantity(existingReturn.returnedQuantity);
    } else {
      // De lo contrario, establecer la cantidad esperada igual a la cantidad pedida
      setReturnedQuantity(product.quantity);
    }
  };

  const handleSubmit = () => {
    if (!selectedProduct || !orderId) return;
    
    registerReturn({
      productId: selectedProduct.productId,
      returnedQuantity: returnedQuantity,
      expectedQuantity: selectedProduct.quantity
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md ${darkMode ? 'dark bg-gray-900 text-white border-gray-700' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PillBottle className="h-5 w-5 text-primary" />
            Registrar Devolución de Envases
          </DialogTitle>
          <DialogDescription>
            Selecciona los productos retornables y la cantidad devuelta por el cliente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Lista de retornos existentes */}
          {isLoadingReturns ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Cargando retornos...</span>
            </div>
          ) : bottleReturns && bottleReturns.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium mb-2">Retornos registrados</h3>
              <div className="bg-muted/40 rounded-lg p-2 space-y-2 max-h-32 overflow-y-auto">
                {bottleReturns.map((ret) => (
                  <div key={ret.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <PillBottle className="h-4 w-4 mr-2 text-primary/70" />
                      <span>{ret.productName}</span>
                    </div>
                    <div className="flex items-center">
                      <Badge variant={ret.status === "complete" ? "success" : "outline"}>
                        {ret.returnedQuantity} / {ret.expectedQuantity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          
          {/* Selección de producto */}
          {!selectedProduct ? (
            <div>
              <div className="relative mb-3">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No se encontraron productos retornables
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    // Verificar si ya existe un retorno para este producto
                    const existingReturn = bottleReturns?.find(ret => ret.productId === product.productId);
                    return (
                      <Card 
                        key={product.productId} 
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${existingReturn ? 'border-primary/30' : ''}`}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <CardContent className="p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Cantidad pedida: {product.quantity}
                            </div>
                          </div>
                          {existingReturn && (
                            <Badge className="ml-2" variant={existingReturn.status === "complete" ? "success" : "outline"}>
                              {existingReturn.returnedQuantity} / {existingReturn.expectedQuantity}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-primary/10 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{selectedProduct.name}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedProduct(null)}
                    className="h-8 w-8 p-0"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Cantidad pedida: {selectedProduct.quantity}
                </div>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="returnedQuantity" className="text-sm font-medium mb-2 block">
                  Cantidad devuelta
                </Label>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setReturnedQuantity(Math.max(0, returnedQuantity - 1))}
                    disabled={returnedQuantity <= 0}
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <Input
                    id="returnedQuantity"
                    type="number"
                    value={returnedQuantity}
                    onChange={(e) => setReturnedQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setReturnedQuantity(returnedQuantity + 1)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div 
                className={`p-3 rounded-lg text-lg font-bold mb-4 flex justify-between items-center ${
                  returnedQuantity < selectedProduct.quantity 
                    ? 'bg-amber-100 text-amber-600' 
                    : returnedQuantity === selectedProduct.quantity 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                }`}
              >
                <span className="text-sm">Estado:</span>
                <div className="flex items-center">
                  {returnedQuantity < selectedProduct.quantity ? (
                    <>
                      <PillBottle className="mr-2 h-4 w-4" />
                      <span>Devolución Parcial</span>
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      <span>Devolución Completa</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          
          {selectedProduct && (
            <Button
              onClick={handleSubmit}
              disabled={isRegistering || returnedQuantity <= 0}
              className="w-full sm:w-auto"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Devolución
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}