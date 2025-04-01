import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type BottleReturn } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, XCircle, RefreshCw, Search, Package, Filter } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipo para la devolución de envases enriquecido
interface EnrichedBottleReturn extends BottleReturn {
  customerName: string;
  customerAddress: string;
  productName: string;
}

export default function DevolucionEnvases() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedReturn, setSelectedReturn] = useState<EnrichedBottleReturn | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState(0);

  // Consulta para obtener las devoluciones
  const { data: bottleReturns = [], isLoading, refetch } = useQuery<EnrichedBottleReturn[]>({
    queryKey: ["/api/bottle-returns"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bottle-returns");
      return response.json();
    },
  });

  // Mutación para actualizar una devolución de envases
  const updateReturnMutation = useMutation({
    mutationFn: async (data: { id: number; returnedQuantity: number }) => {
      // Obtener información del envase para registrar la devolución en el formato correcto
      const bottleReturn = bottleReturns.find(br => br.id === data.id);
      if (!bottleReturn) throw new Error("No se encontró el registro de devolución");

      const response = await apiRequest(
        "POST", 
        `/api/orders/${bottleReturn.orderId}/bottle-returns`, 
        {
          productId: bottleReturn.productId,
          returnedQuantity: data.returnedQuantity,
          expectedQuantity: bottleReturn.expectedQuantity
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bottle-returns"] });
      toast({
        title: "Devolución registrada",
        description: "La devolución de envases se ha registrado correctamente.",
      });
      setSelectedReturn(null);
      setRegisterDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al registrar la devolución: ${error.message}`,
      });
    },
  });

  // Filtrar los envases por estado y término de búsqueda
  const filteredBottleReturns = bottleReturns.filter((bottleReturn) => {
    // Filtrar por pestaña
    const tabFilter = 
      activeTab === "pending" ? 
        bottleReturn.status === "pending" || bottleReturn.status === "incomplete" :
      activeTab === "complete" ?
        bottleReturn.status === "complete" :
        true; // "all"
    
    // Filtrar por término de búsqueda
    const searchFilter = 
      searchTerm === "" ||
      bottleReturn.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bottleReturn.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return tabFilter && searchFilter;
  });

  // Total de envases pendientes y devueltos
  const totalPending = bottleReturns.reduce(
    (sum, br) => sum + (br.pendingQuantity || 0), 
    0
  );
  const totalReturned = bottleReturns.reduce(
    (sum, br) => sum + (br.returnedQuantity || 0), 
    0
  );
  const totalExpected = bottleReturns.reduce(
    (sum, br) => sum + (br.expectedQuantity || 0), 
    0
  );
  
  // Recuperación porcentual
  const recoveryRate = totalExpected > 0 
    ? Math.round((totalReturned / totalExpected) * 100) 
    : 0;

  // Manejar la apertura del diálogo de registro
  const handleRegisterOpen = (bottleReturn: EnrichedBottleReturn) => {
    setSelectedReturn(bottleReturn);
    setReturnQuantity(bottleReturn.pendingQuantity);
    setRegisterDialogOpen(true);
  };

  // Manejar el envío del formulario de registro
  const handleRegisterSubmit = () => {
    if (!selectedReturn) return;
    
    updateReturnMutation.mutate({
      id: selectedReturn.id,
      returnedQuantity: returnQuantity
    });
  };

  // Traducir el estado
  const translateStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'incomplete': return 'Incompleto';
      case 'complete': return 'Completado';
      default: return status;
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy, HH:mm', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold">{t("Devolución de Envases")}</h1>
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t("Actualizar")}
        </Button>
      </div>

      {/* Resumen */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-1 sm:mr-2" />
            <h2 className="text-sm sm:text-base font-medium">Resumen de Envases</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-3">
          <div className="bg-primary/10 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Esperados</div>
            <div className="text-base sm:text-xl font-bold">{totalExpected}</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Devueltos</div>
            <div className="text-base sm:text-xl font-bold">{totalReturned}</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Pendientes</div>
            <div className="text-base sm:text-xl font-bold">{totalPending}</div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Tasa de recuperación: 
          <span className="font-medium ml-1">
            {recoveryRate}%
          </span>
        </div>
        
        <Progress 
          value={recoveryRate} 
          className="h-2 mt-2" 
        />
      </Card>

      {/* Buscador y filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por cliente o producto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <span>
                  {activeTab === "pending" ? "Pendientes" : 
                   activeTab === "complete" ? "Completados" : "Todos"}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Estado</SelectLabel>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="complete">Completados</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-3 sm:p-4">
        <ScrollArea className="h-[calc(100vh-410px)]">
          {/* Vista para móviles (tabla en forma de tarjetas) */}
          <div className="block md:hidden space-y-3">
            {filteredBottleReturns.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {searchTerm 
                  ? "No se encontraron resultados para la búsqueda" 
                  : activeTab === "pending" 
                    ? "No hay envases pendientes de devolución" 
                    : activeTab === "complete" 
                      ? "No hay envases completados"
                      : "No hay envases registrados"}
              </div>
            ) : (
              filteredBottleReturns.map((bottleReturn) => (
                <Card key={bottleReturn.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">#{bottleReturn.orderId} - {bottleReturn.customerName}</div>
                    <Badge 
                      variant={
                        bottleReturn.status === "complete" ? "success" : 
                        bottleReturn.status === "pending" ? "default" : 
                        "destructive"
                      }
                    >
                      {translateStatus(bottleReturn.status)}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-2">{bottleReturn.customerAddress}</div>
                  
                  <div className="text-sm mb-1">Producto: {bottleReturn.productName}</div>
                  
                  <div className="grid grid-cols-3 gap-1 text-xs mb-3">
                    <div>
                      <span className="text-muted-foreground">Esperados:</span> {bottleReturn.expectedQuantity}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Devueltos:</span> {bottleReturn.returnedQuantity}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pendientes:</span> {bottleReturn.pendingQuantity}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    disabled={bottleReturn.status === "complete"}
                    onClick={() => handleRegisterOpen(bottleReturn)}
                  >
                    {t("Registrar Devolución")}
                  </Button>
                </Card>
              ))
            )}
          </div>

          {/* Vista para tablets y desktop (tabla tradicional) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t("Orden")}</TableHead>
                  <TableHead>{t("Cliente")}</TableHead>
                  <TableHead>{t("Producto")}</TableHead>
                  <TableHead className="text-center">{t("Esperados")}</TableHead>
                  <TableHead className="text-center">{t("Devueltos")}</TableHead>
                  <TableHead className="text-center">{t("Pendientes")}</TableHead>
                  <TableHead className="text-center">{t("Estado")}</TableHead>
                  <TableHead className="text-center">{t("Acciones")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBottleReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      {searchTerm 
                        ? "No se encontraron resultados para la búsqueda" 
                        : activeTab === "pending" 
                          ? "No hay envases pendientes de devolución" 
                          : activeTab === "complete" 
                            ? "No hay envases completados"
                            : "No hay envases registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBottleReturns.map((bottleReturn) => (
                    <TableRow key={bottleReturn.id}>
                      <TableCell>#{bottleReturn.orderId}</TableCell>
                      <TableCell>
                        <div className="font-medium">{bottleReturn.customerName}</div>
                        <div className="text-xs text-muted-foreground">{bottleReturn.customerAddress}</div>
                      </TableCell>
                      <TableCell>{bottleReturn.productName}</TableCell>
                      <TableCell className="text-center">{bottleReturn.expectedQuantity}</TableCell>
                      <TableCell className="text-center">{bottleReturn.returnedQuantity}</TableCell>
                      <TableCell className="text-center">{bottleReturn.pendingQuantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={
                            bottleReturn.status === "complete" ? "success" : 
                            bottleReturn.status === "pending" ? "default" : 
                            "destructive"
                          }
                        >
                          {translateStatus(bottleReturn.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={bottleReturn.status === "complete"}
                          onClick={() => handleRegisterOpen(bottleReturn)}
                        >
                          {t("Registrar Devolución")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </Card>

      {/* Diálogo para registrar devolución */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Devolución de Envases</DialogTitle>
            <DialogDescription>
              Ingrese la cantidad de envases devueltos por el cliente.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReturn && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <div className="text-sm font-medium">Cliente</div>
                  <div className="text-base sm:text-lg">{selectedReturn.customerName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Producto</div>
                  <div className="text-base sm:text-lg">{selectedReturn.productName}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <div className="text-sm font-medium">Cantidad Esperada</div>
                  <div className="text-base sm:text-lg">{selectedReturn.expectedQuantity}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Cantidad Devuelta Actual</div>
                  <div className="text-base sm:text-lg">{selectedReturn.returnedQuantity}</div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Cantidad a Registrar</label>
                <Input
                  type="number"
                  min={0}
                  max={selectedReturn.expectedQuantity}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setRegisterDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRegisterSubmit}
              disabled={updateReturnMutation.isPending || returnQuantity <= 0}
              className="w-full sm:w-auto"
            >
              {updateReturnMutation.isPending ? "Procesando..." : "Registrar Devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
