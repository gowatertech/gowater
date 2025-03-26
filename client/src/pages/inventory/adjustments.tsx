import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Package,
  PackageCheck,
  Search,
  Plus,
  Check,
  X,
  FileText,
  Filter,
  AlertTriangle,
  CircleDollarSign
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Product } from "@shared/schema";

interface AdjustmentItem {
  productId: number;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  notes?: string;
}

interface InventoryAdjustment {
  id: number;
  status: "pending" | "approved" | "rejected";
  reason: "damage" | "count" | "expiration" | "loss" | "error" | "other";
  notes?: string;
  createdAt: string;
  createdBy?: number;
  approvedAt?: string;
  approvedBy?: number;
  items: AdjustmentItem[];
}

export default function InventoryAdjustments() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewAdjustmentOpen, setIsNewAdjustmentOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");

  // Queries
  const { data: adjustments = [], isLoading: isLoadingAdjustments } = useQuery<InventoryAdjustment[]>({
    queryKey: ["/api/inventory/adjustments"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Mutaciones
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/adjustments/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/adjustments"] });
      toast({
        title: "Éxito",
        description: "Estado del ajuste actualizado correctamente",
      });
      setIsDetailsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado del ajuste: " + error.message,
      });
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory/adjustments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/adjustments"] });
      toast({
        title: "Éxito",
        description: "Ajuste de inventario creado correctamente",
      });
      setIsNewAdjustmentOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el ajuste de inventario: " + error.message,
      });
    },
  });

  // Filtramos los ajustes según el término de búsqueda y el filtro seleccionado
  const filteredAdjustments = adjustments.filter(adjustment => {
    const matchesSearch = 
      searchTerm === "" || 
      adjustment.id.toString().includes(searchTerm) ||
      adjustment.reason.includes(searchTerm.toLowerCase()) ||
      (adjustment.notes && adjustment.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filter === "all") return matchesSearch;
    return matchesSearch && adjustment.status === filter;
  });

  const handleStatusUpdate = (id: number, status: "approved" | "rejected") => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleViewDetails = (adjustment: InventoryAdjustment) => {
    setSelectedAdjustment(adjustment);
    setIsDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-500 bg-yellow-100";
      case "approved": return "text-green-500 bg-green-100";
      case "rejected": return "text-red-500 bg-red-100";
      default: return "text-gray-500 bg-gray-100";
    }
  };

  const getReasonDisplay = (reason: string) => {
    const reasonMap: Record<string, string> = {
      "damage": "Daño",
      "count": "Conteo de inventario",
      "expiration": "Vencimiento",
      "loss": "Robo/Pérdida",
      "error": "Error de sistema",
      "other": "Otro"
    };
    return reasonMap[reason] || reason;
  };

  // Componente de formulario para nuevo ajuste
  const NewAdjustmentForm = () => {
    const [reason, setReason] = useState<string>("count");
    const [notes, setNotes] = useState<string>("");
    const [items, setItems] = useState<AdjustmentItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [newQuantity, setNewQuantity] = useState<number>(0);

    const handleAddItem = () => {
      if (!selectedProductId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Por favor selecciona un producto",
        });
        return;
      }

      const product = products.find(p => p.id === selectedProductId);
      if (!product) return;

      const previousQuantity = product.stock;
      const difference = newQuantity - previousQuantity;

      // Verificar si el producto ya está en la lista
      const existingIndex = items.findIndex(item => item.productId === selectedProductId);
      if (existingIndex >= 0) {
        // Actualizar el item existente
        const updatedItems = [...items];
        updatedItems[existingIndex] = {
          productId: selectedProductId,
          previousQuantity,
          newQuantity,
          difference
        };
        setItems(updatedItems);
      } else {
        // Agregar nuevo item
        setItems([
          ...items,
          {
            productId: selectedProductId,
            previousQuantity,
            newQuantity,
            difference
          }
        ]);
      }

      // Resetear selección
      setSelectedProductId(null);
      setNewQuantity(0);
    };

    const handleRemoveItem = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
      if (items.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Por favor agrega al menos un producto al ajuste",
        });
        return;
      }

      const adjustmentData = {
        status: "pending",
        reason,
        notes: notes || undefined,
        items
      };

      createAdjustmentMutation.mutate(adjustmentData);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Razón del ajuste</label>
            <Select
              value={reason}
              onValueChange={setReason}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una razón" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Conteo de inventario</SelectItem>
                <SelectItem value="damage">Daño</SelectItem>
                <SelectItem value="expiration">Vencimiento</SelectItem>
                <SelectItem value="loss">Robo/Pérdida</SelectItem>
                <SelectItem value="error">Error de sistema</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Notas</label>
            <Textarea 
              placeholder="Notas adicionales (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 resize-none"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <label className="text-sm font-medium">Agregar productos</label>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <Select
                value={selectedProductId?.toString() || ""}
                onValueChange={(value) => setSelectedProductId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} (Stock actual: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-32">
              <Input
                type="number"
                placeholder="Nueva cantidad"
                value={newQuantity.toString()}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                min={0}
              />
            </div>
            <Button 
              onClick={handleAddItem}
              variant="outline"
              size="sm"
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" /> Añadir
            </Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Stock Actual</TableHead>
                  <TableHead className="text-center">Nueva Cantidad</TableHead>
                  <TableHead className="text-center">Diferencia</TableHead>
                  <TableHead className="w-12 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <TableRow key={index}>
                      <TableCell>{product?.name || "Producto desconocido"}</TableCell>
                      <TableCell className="text-center">{item.previousQuantity}</TableCell>
                      <TableCell className="text-center">{item.newQuantity}</TableCell>
                      <TableCell className="text-center">
                        <span className={item.difference > 0 ? "text-green-600" : item.difference < 0 ? "text-red-600" : ""}>
                          {item.difference > 0 ? "+" : ""}{item.difference}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsNewAdjustmentOpen(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Crear Ajuste
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            Ajustes de Inventario
          </h1>
          <Button onClick={() => setIsNewAdjustmentOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Ajuste
          </Button>
        </div>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Filtros y Búsqueda</CardTitle>
            <CardDescription>Busca y filtra ajustes de inventario</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, razón o notas..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={filter}
                  onValueChange={setFilter}
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="approved">Aprobados</SelectItem>
                    <SelectItem value="rejected">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Lista de Ajustes</CardTitle>
            <CardDescription>Ajustes de inventario registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-20 py-2">ID</TableHead>
                    <TableHead className="py-2">Razón</TableHead>
                    <TableHead className="py-2 w-32">Estado</TableHead>
                    <TableHead className="py-2 w-40">Fecha</TableHead>
                    <TableHead className="py-2 w-28 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAdjustments ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        Cargando ajustes de inventario...
                      </TableCell>
                    </TableRow>
                  ) : filteredAdjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No se encontraron ajustes de inventario
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell className="py-2 font-medium">{adjustment.id}</TableCell>
                        <TableCell className="py-2 capitalize">
                          {getReasonDisplay(adjustment.reason)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`${getStatusColor(adjustment.status)}`}>
                            {adjustment.status === "pending" ? "Pendiente" : 
                             adjustment.status === "approved" ? "Aprobado" : "Rechazado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          {new Date(adjustment.createdAt).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(adjustment)}
                            className="h-8 px-2 text-xs"
                          >
                            <Search className="h-3.5 w-3.5 mr-1" />
                            Ver detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para crear nuevo ajuste */}
      <Dialog open={isNewAdjustmentOpen} onOpenChange={setIsNewAdjustmentOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nuevo Ajuste de Inventario</DialogTitle>
          </DialogHeader>
          <NewAdjustmentForm />
        </DialogContent>
      </Dialog>

      {/* Diálogo para ver detalles */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalles del Ajuste #{selectedAdjustment?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                  <p>
                    <Badge variant="outline" className={`mt-1 ${getStatusColor(selectedAdjustment.status)}`}>
                      {selectedAdjustment.status === "pending" ? "Pendiente" : 
                       selectedAdjustment.status === "approved" ? "Aprobado" : "Rechazado"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Razón</h3>
                  <p className="text-sm capitalize">{getReasonDisplay(selectedAdjustment.reason)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Fecha de creación</h3>
                  <p className="text-sm">
                    {new Date(selectedAdjustment.createdAt).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {selectedAdjustment.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Notas</h3>
                  <p className="text-sm mt-1 p-2 bg-muted/20 rounded-md">{selectedAdjustment.notes}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Productos ajustados</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Stock Previo</TableHead>
                        <TableHead className="text-center">Nueva Cantidad</TableHead>
                        <TableHead className="text-center">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAdjustment.items.map((item, index) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <TableRow key={index}>
                            <TableCell>{product?.name || "Producto desconocido"}</TableCell>
                            <TableCell className="text-center">{item.previousQuantity}</TableCell>
                            <TableCell className="text-center">{item.newQuantity}</TableCell>
                            <TableCell className="text-center">
                              <span className={item.difference > 0 ? "text-green-600" : item.difference < 0 ? "text-red-600" : ""}>
                                {item.difference > 0 ? "+" : ""}{item.difference}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">
                          Diferencia total:
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {(() => {
                            const total = selectedAdjustment.items.reduce((sum, item) => sum + item.difference, 0);
                            return (
                              <span className={total > 0 ? "text-green-600" : total < 0 ? "text-red-600" : ""}>
                                {total > 0 ? "+" : ""}{total}
                              </span>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedAdjustment.status === "pending" && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => handleStatusUpdate(selectedAdjustment.id, "rejected")}
                    className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button 
                    onClick={() => handleStatusUpdate(selectedAdjustment.id, "approved")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprobar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}