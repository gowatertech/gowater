import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertProductionBatch, Product } from "@shared/schema";
import { insertProductionBatchSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Trash, 
  Search, 
  X, 
  PackageOpen, 
  ClipboardCheck, 
  Factory, 
  WarehouseIcon,
  Package, 
  Calendar,
  CircleDollarSign
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BatchItem {
  productId: number;
  quantity: number;
  cost: string;
  total: string;
}

interface ProductionStats {
  totalBatches: number;
  totalCompleted: number;
  totalPending: number;
  totalCost: number;
}

export default function ProductionRegistration() {
  // Estados
  const [activeTab, setActiveTab] = useState("list");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Queries
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      return await apiRequest({
        method: "GET",
        url: "/api/products"
      });
    }
  });

  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: async () => {
      return await apiRequest({
        method: "GET",
        url: "/api/warehouses"
      });
    }
  });

  const { data: productionBatches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["/api/production-batches"],
    queryFn: async () => {
      return await apiRequest({
        method: "GET",
        url: "/api/production-batches"
      });
    }
  });

  // Forms
  const itemForm = useForm({
    defaultValues: {
      productId: 0,
      quantity: 0,
      cost: "0.00"
    }
  });

  const mainForm = useForm({
    resolver: zodResolver(insertProductionBatchSchema),
    defaultValues: {
      warehouseId: 0,
      notes: "",
      status: "completed" as const,
      items: []
    }
  });

  // Mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: InsertProductionBatch) => {
      return await apiRequest({
        method: "POST",
        url: "/api/production-batches",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-batches"] });
      toast({
        title: "Éxito",
        description: "Lote de producción creado exitosamente"
      });
      setBatchItems([]);
      mainForm.reset();
      setActiveTab("list");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  // Filtrar lotes según término de búsqueda
  const filteredBatches = useMemo(() => {
    if (!searchTerm.trim()) return productionBatches;
    
    return productionBatches.filter((batch: any) => 
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.warehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.items.some((item: any) => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [productionBatches, searchTerm]);

  // Calcular estadísticas
  const productionStats: ProductionStats = useMemo(() => {
    if (!productionBatches.length) {
      return {
        totalBatches: 0,
        totalCompleted: 0,
        totalPending: 0,
        totalCost: 0
      };
    }

    return {
      totalBatches: productionBatches.length,
      totalCompleted: productionBatches.filter((batch: any) => batch.status === "completed").length,
      totalPending: productionBatches.filter((batch: any) => batch.status === "pending").length,
      totalCost: productionBatches.reduce((sum: number, batch: any) => sum + parseFloat(batch.totalCost), 0)
    };
  }, [productionBatches]);

  // Handlers
  const onSubmit = (data: InsertProductionBatch) => {
    if (!data.warehouseId) {
      toast({
        title: "Error",
        description: "Por favor seleccione un almacén",
        variant: "destructive"
      });
      return;
    }

    if (batchItems.length === 0) {
      toast({
        title: "Error",
        description: "Por favor agregue al menos un producto al lote",
        variant: "destructive"
      });
      return;
    }

    const batchData: InsertProductionBatch = {
      warehouseId: data.warehouseId,
      notes: data.notes || "",
      status: "completed",
      items: batchItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: Number(item.cost).toFixed(2) // Asegurar 2 decimales
      }))
    };

    createBatchMutation.mutate(batchData);
  };

  const formatCost = (value: string): string => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');

    // Ensure only one decimal point
    const parts = numericValue.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '00';

    // Format to exactly 2 decimal places
    return `${integerPart}.${decimalPart.slice(0, 2).padEnd(2, '0')}`;
  };

  const handleAddItem = (data: any) => {
    if (!data.productId) {
      toast({
        title: "Error",
        description: "Por favor seleccione un producto",
        variant: "destructive"
      });
      return;
    }

    if (!data.quantity || data.quantity <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    const formattedCost = formatCost(data.cost);
    if (parseFloat(formattedCost) <= 0) {
      toast({
        title: "Error",
        description: "El costo debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    const total = (parseFloat(formattedCost) * data.quantity).toFixed(2);
    setBatchItems(prev => [...prev, { 
      ...data, 
      cost: formattedCost,
      total 
    }]);
    itemForm.reset({
      productId: 0,
      quantity: 0,
      cost: "0.00"
    });
  };

  const handleRemoveItem = (index: number) => {
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewDetails = (batch: any) => {
    setSelectedBatch(batch);
    setIsDetailsDialogOpen(true);
  };

  if (isLoadingProducts || isLoadingWarehouses) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-muted-foreground">Cargando información...</p>
        </div>
      </div>
    );
  }

  const totalCost = batchItems.reduce((sum, item) => sum + parseFloat(item.total), 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Registro de Producción</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona los lotes de producción y el inventario
        </p>
      </div>

      <div className="space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Lotes</p>
                <p className="text-lg font-bold">{productionStats.totalBatches}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completados</p>
                <p className="text-lg font-bold">{productionStats.totalCompleted}</p>
              </div>
              <PackageOpen className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold">{productionStats.totalPending}</p>
              </div>
              <Factory className="h-8 w-8 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Costo Total</p>
                <p className="text-lg font-bold">RD$ {productionStats.totalCost.toFixed(2)}</p>
              </div>
              <CircleDollarSign className="h-8 w-8 text-purple-400" />
            </CardContent>
          </Card>
        </div>
      
        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="list" className="text-xs">Lista de Lotes</TabsTrigger>
            <TabsTrigger value="form" className="text-xs">Nuevo Lote de Producción</TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista */}
          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Lotes de Producción
                  </CardTitle>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => {
                      setActiveTab("form");
                      mainForm.reset();
                      setBatchItems([]);
                    }}
                  >
                    Nuevo Lote
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Consulta y gestiona los lotes de producción registrados
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número de lote, almacén o producto"
                      className="pl-8 h-8 text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tabla de Lotes */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[10px]">
                        <TableHead className="py-1 w-[100px]">Lote #</TableHead>
                        <TableHead className="py-1 w-[100px]">Fecha</TableHead>
                        <TableHead className="py-1">Almacén</TableHead>
                        <TableHead className="py-1 w-[120px] text-right">Costo Total</TableHead>
                        <TableHead className="py-1 w-[120px] text-center">Estado</TableHead>
                        <TableHead className="py-1 w-[80px] text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingBatches ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                            Cargando lotes de producción...
                          </TableCell>
                        </TableRow>
                      ) : filteredBatches.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                            No se encontraron lotes de producción
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBatches.map((batch: any) => (
                          <TableRow key={batch.id} className="text-xs">
                            <TableCell className="py-2">{batch.batchNumber}</TableCell>
                            <TableCell className="py-2">{new Date(batch.date).toLocaleDateString()}</TableCell>
                            <TableCell className="py-2 font-medium">{batch.warehouseName}</TableCell>
                            <TableCell className="py-2 text-right">RD$ {parseFloat(batch.totalCost).toFixed(2)}</TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge variant={batch.status === "completed" ? "default" : "secondary"}>
                                {batch.status === "completed" ? "Completado" : "Pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(batch)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Search className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Formulario */}
          <TabsContent value="form">
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-base flex items-center gap-1">
                  <Factory className="h-4 w-4 text-primary" />
                  Nuevo Lote de Producción
                </CardTitle>
                <CardDescription className="text-xs">
                  Registra un nuevo lote de producción en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <Form {...mainForm}>
                  <form className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={mainForm.control}
                        name="warehouseId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Almacén</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Seleccionar Almacén" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {warehouses.map((warehouse: any) => (
                                  <SelectItem
                                    key={warehouse.id}
                                    value={warehouse.id.toString()}
                                    className="text-xs"
                                  >
                                    {warehouse.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={mainForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Notas</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Observaciones del lote" className="h-8 text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>

                <Separator className="my-3" />

                <div className="space-y-3">
                  <div className="text-sm font-medium">Agregar Productos al Lote</div>
                  
                  <Form {...itemForm}>
                    <form onSubmit={itemForm.handleSubmit(handleAddItem)} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <FormField
                          control={itemForm.control}
                          name="productId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Producto</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(Number(value))}
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Seleccionar Producto" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products.map((product: any) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id.toString()}
                                      className="text-xs"
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Cantidad</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  className="h-8 text-xs"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Costo por Unidad</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  className="h-8 text-xs"
                                  {...field}
                                  onChange={(e) => {
                                    const formattedValue = formatCost(e.target.value);
                                    field.onChange(formattedValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end">
                          <Button type="submit" size="sm" className="h-8 text-xs w-full">Agregar Producto</Button>
                        </div>
                      </div>
                    </form>
                  </Form>

                  {/* Lista de productos agregados */}
                  {batchItems.length > 0 ? (
                    <div className="mt-3 border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="text-[10px]">
                            <TableHead className="py-1">Producto</TableHead>
                            <TableHead className="py-1 text-right">Cantidad</TableHead>
                            <TableHead className="py-1 text-right">Costo Unit.</TableHead>
                            <TableHead className="py-1 text-right">Total</TableHead>
                            <TableHead className="py-1 w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchItems.map((item, index) => {
                            const product = products.find((p: Product) => p.id === item.productId);
                            return (
                              <TableRow key={index} className="text-xs">
                                <TableCell className="py-1.5">{product?.name}</TableCell>
                                <TableCell className="py-1.5 text-right">{item.quantity}</TableCell>
                                <TableCell className="py-1.5 text-right">RD$ {parseFloat(item.cost).toFixed(2)}</TableCell>
                                <TableCell className="py-1.5 text-right">RD$ {parseFloat(item.total).toFixed(2)}</TableCell>
                                <TableCell className="py-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(index)}
                                    className="h-6 w-6 p-0 text-destructive"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="text-xs font-medium">
                            <TableCell colSpan={3} className="text-right py-1.5">Costo Total:</TableCell>
                            <TableCell className="text-right py-1.5">RD$ {totalCost.toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center p-3 border rounded-lg">
                      No hay productos agregados al lote
                    </div>
                  )}

                  <div className="flex justify-between pt-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="text-xs h-8"
                      onClick={() => {
                        setActiveTab("list");
                        setBatchItems([]);
                        mainForm.reset();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={mainForm.handleSubmit(onSubmit)}
                      className="text-xs h-8"
                      disabled={batchItems.length === 0 || createBatchMutation.isPending}
                    >
                      {createBatchMutation.isPending ? "Guardando..." : "Crear Lote de Producción"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo de Detalles */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Detalle de Lote #{selectedBatch?.batchNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Información detallada del lote de producción
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Fecha: </span>
                      <span className="font-medium">{new Date(selectedBatch.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Almacén: </span>
                      <span className="font-medium">{selectedBatch.warehouseName}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Costo Total: </span>
                      <span className="font-medium">RD$ {parseFloat(selectedBatch.totalCost).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Estado: </span>
                      <Badge variant={selectedBatch.status === "completed" ? "default" : "secondary"}>
                        {selectedBatch.status === "completed" ? "Completado" : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBatch.notes && (
                <div className="border rounded-lg p-2 text-xs bg-muted/20">
                  <p className="text-muted-foreground mb-1">Notas:</p>
                  <p>{selectedBatch.notes}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2">Detalle de Productos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[10px]">
                        <TableHead className="py-1">Producto</TableHead>
                        <TableHead className="py-1 text-right">Cantidad</TableHead>
                        <TableHead className="py-1 text-right">Costo Unit.</TableHead>
                        <TableHead className="py-1 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                            No hay productos en este lote
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedBatch.items.map((item: any) => {
                          const totalItem = parseFloat(item.cost) * item.quantity;
                          return (
                            <TableRow key={item.id} className="text-xs">
                              <TableCell className="py-1.5">{item.productName}</TableCell>
                              <TableCell className="py-1.5 text-right">{item.quantity}</TableCell>
                              <TableCell className="py-1.5 text-right">RD$ {parseFloat(item.cost).toFixed(2)}</TableCell>
                              <TableCell className="py-1.5 text-right">RD$ {totalItem.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                      <TableRow className="text-xs font-medium">
                        <TableCell colSpan={3} className="text-right py-1.5">Costo Total:</TableCell>
                        <TableCell className="text-right py-1.5">RD$ {parseFloat(selectedBatch.totalCost).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDetailsDialogOpen(false)}
              className="text-xs h-8"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}