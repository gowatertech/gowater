import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Product, InventoryAdjustment, insertInventoryAdjustmentSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  PlusCircle, 
  Pencil, 
  FilePlus,
  FileCheck,
  FileX,
  Package,
  Search, 
  X, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  Repeat,
  ClipboardList,
  PackagePlus,
  FileEdit,
  RotateCw,
  Check,
  Ban,
  Timer,
  Calendar,
  Tag
} from "lucide-react";
import { useState, useMemo } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// Tipos de ajustes de inventario
const adjustmentTypes = [
  { 
    id: "entrada", 
    label: "Entrada de Mercancía",
    description: "Registra una entrada de productos al inventario (compras, devoluciones, etc.)",
    icon: <ArrowDownToLine className="h-4 w-4 text-green-500" />
  },
  { 
    id: "salida", 
    label: "Salida de Mercancía",
    description: "Registra una salida de productos del inventario (consumo interno, pérdidas, etc.)",
    icon: <ArrowUpFromLine className="h-4 w-4 text-red-500" />
  },
  { 
    id: "transferencia", 
    label: "Transferencia entre Almacenes",
    description: "Movimiento de productos entre diferentes ubicaciones o almacenes",
    icon: <Repeat className="h-4 w-4 text-blue-500" />
  },
  { 
    id: "conteo_fisico", 
    label: "Ajuste por Conteo Físico",
    description: "Corrección de inventario basada en conteo físico de productos",
    icon: <ClipboardList className="h-4 w-4 text-purple-500" />
  },
  { 
    id: "produccion", 
    label: "Entrada por Producción",
    description: "Entrada de productos fabricados o producidos internamente",
    icon: <PackagePlus className="h-4 w-4 text-teal-500" />
  },
  { 
    id: "ajuste", 
    label: "Ajuste General",
    description: "Corrección o ajuste general del inventario",
    icon: <FileEdit className="h-4 w-4 text-orange-500" />
  }
];

// Mapeo de estados para mostrar badges
const statusMap = {
  pendiente: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: <Timer className="h-3 w-3" /> },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-800", icon: <Check className="h-3 w-3" /> },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-800", icon: <Ban className="h-3 w-3" /> },
  anulado: { label: "Anulado", color: "bg-gray-100 text-gray-800", icon: <X className="h-3 w-3" /> }
};

// Formato para fecha local
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-DO', {
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit'
  }).format(date);
}

// Obtener el icono según el tipo de ajuste
function getAdjustmentTypeIcon(type: string) {
  const adjustmentType = adjustmentTypes.find(t => t.id === type);
  return adjustmentType ? adjustmentType.icon : <Package className="h-4 w-4" />;
}

// Obtener la etiqueta según el tipo de ajuste
function getAdjustmentTypeLabel(type: string) {
  const adjustmentType = adjustmentTypes.find(t => t.id === type);
  return adjustmentType ? adjustmentType.label : type;
}

export default function InventoryAdjustments() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  // Consulta para obtener ajustes de inventario
  const { data: adjustments = [], isLoading } = useQuery<InventoryAdjustment[]>({
    queryKey: ["/api/inventory/adjustments"],
  });
  
  // Consulta para obtener productos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Consulta para obtener almacenes
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
  });
  
  // Filtrar ajustes por término de búsqueda, tipo y estado
  const filteredAdjustments = useMemo(() => {
    if (!adjustments) return [];
    
    return adjustments
      .filter(adjustment => {
        const matchesTerm = searchTerm === "" || 
                adjustment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                adjustment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                adjustment.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = selectedType === "" || adjustment.adjustmentType === selectedType;
        const matchesStatus = selectedStatus === "" || adjustment.status === selectedStatus;
        
        return matchesTerm && matchesType && matchesStatus;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Más recientes primero
  }, [adjustments, searchTerm, selectedType, selectedStatus]);

  // Estadísticas de ajustes
  const adjustmentsStats = useMemo(() => {
    if (!adjustments || adjustments.length === 0) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        canceled: 0,
        entries: 0,
        exits: 0
      };
    }
    
    const total = adjustments.length;
    const pending = adjustments.filter(a => a.status === 'pendiente').length;
    const approved = adjustments.filter(a => a.status === 'aprobado').length;
    const rejected = adjustments.filter(a => a.status === 'rechazado').length;
    const canceled = adjustments.filter(a => a.status === 'anulado').length;
    const entries = adjustments.filter(a => a.adjustmentType === 'entrada' || a.adjustmentType === 'produccion').length;
    const exits = adjustments.filter(a => a.adjustmentType === 'salida').length;
    
    return {
      total,
      pending,
      approved,
      rejected,
      canceled,
      entries,
      exits
    };
  }, [adjustments]);

  // Configuración del formulario para crear ajuste
  const form = useForm({
    resolver: zodResolver(insertInventoryAdjustmentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      adjustmentType: "entrada",
      notes: "",
      reference: "",
      warehouseId: 1, // Valor por defecto
      targetWarehouseId: undefined,
      createdBy: 1, // Valor temporal, idealmente debería venir del usuario logueado
      status: "pendiente",
      documentNumber: "",
      items: [{ // Al menos un ítem inicial
        productId: 0,
        quantity: 1,
        currentStock: 0,
        newStock: 0,
        reason: "",
        cost: "0.00",
        value: "0.00"
      }]
    },
  });

  // Observar cambios en el tipo de ajuste
  const adjustmentType = form.watch("adjustmentType");
  
  // Mutación para crear ajuste
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory/adjustments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Actualizar productos también
      toast({
        title: "Éxito",
        description: "Ajuste de inventario creado exitosamente",
      });
      form.reset();
      setActiveTab("list");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Mutación para cambiar estado
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/adjustments/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Actualizar productos también
      toast({
        title: "Éxito",
        description: "Estado del ajuste actualizado correctamente",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Manejar envío del formulario
  const onSubmit = (data: any) => {
    // Asegurarse de que hay al menos un ítem
    if (!data.items || data.items.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe agregar al menos un producto al ajuste",
      });
      return;
    }
    
    // Validar items
    for (const item of data.items) {
      if (!item.productId || item.productId === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debe seleccionar un producto para cada ítem",
        });
        return;
      }
      
      if (item.quantity <= 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La cantidad debe ser mayor a cero",
        });
        return;
      }
    }
    
    // Para transferencias, validar que se hayan seleccionado almacenes diferentes
    if (data.adjustmentType === "transferencia") {
      if (!data.warehouseId || !data.targetWarehouseId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debe seleccionar almacén origen y destino para una transferencia",
        });
        return;
      }
      
      if (data.warehouseId === data.targetWarehouseId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El almacén origen y destino no pueden ser el mismo",
        });
        return;
      }
    }
    
    // Procesar los ítems para asegurarse que tienen los valores correctos
    const processedItems = data.items.map((item: any) => {
      const product = products.find(p => p.id === Number(item.productId));
      const currentStock = product ? product.stock : 0;
      
      let newStock = currentStock;
      
      // Calcular nuevo stock según tipo de ajuste
      if (data.adjustmentType === "entrada" || data.adjustmentType === "produccion") {
        newStock = currentStock + Number(item.quantity);
      } else if (data.adjustmentType === "salida") {
        newStock = currentStock - Number(item.quantity);
      }
      
      return {
        ...item,
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        currentStock,
        newStock,
        cost: item.cost || "0.00",
        value: item.value || "0.00"
      };
    });
    
    // Preparar datos para envío
    const submitData = {
      ...data,
      items: processedItems,
      warehouseId: data.warehouseId ? Number(data.warehouseId) : undefined,
      targetWarehouseId: data.targetWarehouseId ? Number(data.targetWarehouseId) : undefined,
    };
    
    createMutation.mutate(submitData);
  };

  // Función para aprobar un ajuste
  const handleApprove = (id: number) => {
    updateStatusMutation.mutate({ id, status: "aprobado" });
  };

  // Función para rechazar un ajuste
  const handleReject = (id: number) => {
    updateStatusMutation.mutate({ id, status: "rechazado" });
  };

  // Función para anular un ajuste
  const handleCancel = (id: number) => {
    updateStatusMutation.mutate({ id, status: "anulado" });
  };

  // Función para agregar un nuevo ítem al formulario
  const addItem = () => {
    const items = form.getValues("items") || [];
    form.setValue("items", [
      ...items, 
      {
        productId: 0,
        quantity: 1,
        currentStock: 0,
        newStock: 0,
        reason: "",
        cost: "0.00",
        value: "0.00"
      }
    ]);
  };

  // Función para eliminar un ítem del formulario
  const removeItem = (index: number) => {
    const items = form.getValues("items") || [];
    if (items.length > 1) { // Siempre dejar al menos un ítem
      form.setValue("items", items.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Ajustes de Inventario
          </h1>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Ajustes</p>
                <p className="text-lg font-bold">{adjustmentsStats.total}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold">{adjustmentsStats.pending}</p>
              </div>
              <Timer className="h-8 w-8 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-lg font-bold">{adjustmentsStats.entries}</p>
              </div>
              <ArrowDownToLine className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Salidas</p>
                <p className="text-lg font-bold">{adjustmentsStats.exits}</p>
              </div>
              <ArrowUpFromLine className="h-8 w-8 text-red-400" />
            </CardContent>
          </Card>
        </div>

        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="list" className="text-xs">Lista de Ajustes</TabsTrigger>
            <TabsTrigger value="form" className="text-xs">
              Nuevo Ajuste
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista */}
          <TabsContent value="list" className="space-y-2">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Lista de Ajustes de Inventario
                  </CardTitle>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => {
                      form.reset();
                      setActiveTab("form");
                    }}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Nuevo Ajuste
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Consulta y gestiona los ajustes de inventario
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por referencia, notas o documento"
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
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los tipos</SelectItem>
                      {adjustmentTypes.map(type => (
                        <SelectItem key={type.id} value={type.id} className="text-xs">
                          <div className="flex items-center gap-1">
                            {type.icon}
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los estados</SelectItem>
                      {Object.entries(statusMap).map(([key, value]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          <div className="flex items-center gap-1">
                            {value.icon}
                            <span>{value.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabla de Ajustes */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[10px]">
                        <TableHead className="py-1 w-[100px]">Fecha</TableHead>
                        <TableHead className="py-1 w-[120px]">Tipo</TableHead>
                        <TableHead className="py-1">Referencia/Notas</TableHead>
                        <TableHead className="py-1 w-[100px] text-center">Estado</TableHead>
                        <TableHead className="py-1 w-[150px] text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-xs text-muted-foreground">
                            Cargando ajustes...
                          </TableCell>
                        </TableRow>
                      ) : filteredAdjustments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-xs text-muted-foreground">
                            No se encontraron ajustes de inventario
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdjustments.map((adjustment) => (
                          <TableRow key={adjustment.id} className="text-xs">
                            <TableCell className="py-2">
                              {formatDate(adjustment.date)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getAdjustmentTypeIcon(adjustment.adjustmentType)}
                                <span>{getAdjustmentTypeLabel(adjustment.adjustmentType)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {adjustment.reference && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Tag className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{adjustment.reference}</span>
                                </div>
                              )}
                              {adjustment.notes && (
                                <p className="text-muted-foreground text-[10px] truncate">
                                  {adjustment.notes}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                className={`${statusMap[adjustment.status as keyof typeof statusMap]?.color} flex items-center gap-1 justify-center`}
                                variant="outline"
                              >
                                {statusMap[adjustment.status as keyof typeof statusMap]?.icon}
                                {statusMap[adjustment.status as keyof typeof statusMap]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                {adjustment.status === "pendiente" && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-7 w-7" 
                                      title="Aprobar"
                                      onClick={() => handleApprove(adjustment.id)}
                                    >
                                      <FileCheck className="h-3 w-3 text-green-500" />
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-7 w-7" 
                                      title="Rechazar"
                                      onClick={() => handleReject(adjustment.id)}
                                    >
                                      <FileX className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </>
                                )}
                                {(adjustment.status === "pendiente" || adjustment.status === "aprobado") && (
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7" 
                                    title="Anular"
                                    onClick={() => handleCancel(adjustment.id)}
                                  >
                                    <Ban className="h-3 w-3 text-gray-500" />
                                  </Button>
                                )}
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
          <TabsContent value="form" className="space-y-2">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1">
                    <FilePlus className="h-4 w-4 text-primary" />
                    Nuevo Ajuste de Inventario
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Registra un nuevo ajuste de inventario
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Tipo de ajuste */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <FormField
                          control={form.control}
                          name="adjustmentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Tipo de Ajuste</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Seleccione un tipo de ajuste" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {adjustmentTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id} className="text-xs">
                                      <div className="flex items-center gap-2">
                                        {type.icon}
                                        <div>
                                          <p>{type.label}</p>
                                          <p className="text-[10px] text-muted-foreground">{type.description}</p>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Fecha</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date"
                                  className="h-8 text-xs"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* Almacenes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <FormField
                          control={form.control}
                          name="warehouseId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {adjustmentType === "transferencia" ? "Almacén Origen" : "Almacén"}
                              </FormLabel>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(val) => field.onChange(Number(val))}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Seleccione un almacén" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {warehouses.map(warehouse => (
                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()} className="text-xs">
                                      {warehouse.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {adjustmentType === "transferencia" && (
                        <div>
                          <FormField
                            control={form.control}
                            name="targetWarehouseId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Almacén Destino</FormLabel>
                                <Select
                                  value={field.value?.toString() || ""}
                                  onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Seleccione almacén destino" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {warehouses.map(warehouse => (
                                      <SelectItem key={warehouse.id} value={warehouse.id.toString()} className="text-xs">
                                        {warehouse.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px]" />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Referencia y Documento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <FormField
                          control={form.control}
                          name="reference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Referencia</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Número de orden, factura, etc."
                                  className="h-8 text-xs"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="documentNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Número de Documento</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Número de documento interno"
                                  className="h-8 text-xs"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* Notas */}
                    <div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Notas</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Observaciones adicionales"
                                className="h-20 text-xs"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Ítems del ajuste */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Productos</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={addItem}
                        >
                          <PlusCircle className="h-3 w-3 mr-1" />
                          Agregar Producto
                        </Button>
                      </div>
                      
                      <div className="border rounded-lg p-2 space-y-3">
                        {form.watch("items")?.map((_, index) => (
                          <div key={index} className="p-2 border rounded-md bg-muted/20">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-xs font-medium">Item #{index + 1}</h4>
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeItem(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.productId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Producto</FormLabel>
                                    <Select
                                      value={field.value?.toString() || "0"}
                                      onValueChange={(val) => field.onChange(Number(val))}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Seleccione un producto" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="max-h-52">
                                        {products.map(product => (
                                          <SelectItem key={product.id} value={product.id.toString()} className="text-xs">
                                            {product.name} - Stock: {product.stock}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[10px]" />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Cantidad</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min="1"
                                        className="h-8 text-xs"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`items.${index}.reason`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Motivo</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Motivo específico"
                                        className="h-8 text-xs"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setActiveTab("list")}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="h-8 text-xs"
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? (
                          <RotateCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <FilePlus className="h-3 w-3 mr-1" />
                        )}
                        Crear Ajuste
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}