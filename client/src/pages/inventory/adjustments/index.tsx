import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Product, InventoryAdjustment, insertInventoryAdjustmentSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Package, 
  Check, 
  Timer, 
  X, 
  RotateCw, 
  ClipboardList, 
  FilePlus, 
  PlusCircle, 
  FileCheck, 
  FileX, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  Trash2,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

// Tipos de ajustes de inventario
const adjustmentTypes = {
  "entrada": { 
    label: "Entrada de Inventario", 
    description: "Registrar producto que entra al almacén",
    icon: <ArrowDownToLine className="h-4 w-4 text-green-500" /> 
  },
  "salida": { 
    label: "Salida de Inventario", 
    description: "Registrar producto que sale del almacén",
    icon: <ArrowUpFromLine className="h-4 w-4 text-red-500" /> 
  },
  "transferencia": { 
    label: "Transferencia", 
    description: "Mover productos entre almacenes",
    icon: <ArrowDownToLine className="h-4 w-4 text-blue-500" /> 
  },
  "conteo_fisico": { 
    label: "Conteo Físico", 
    description: "Ajustar inventario según conteo físico",
    icon: <ClipboardList className="h-4 w-4 text-purple-500" /> 
  },
  "produccion": { 
    label: "Producción", 
    description: "Registrar producción interna",
    icon: <Package className="h-4 w-4 text-teal-500" /> 
  },
  "ajuste": { 
    label: "Ajuste General", 
    description: "Otros ajustes de inventario",
    icon: <Package className="h-4 w-4 text-orange-500" /> 
  }
};

// Estados
const statusMap = {
  "pendiente": { label: "Pendiente", icon: <Timer className="h-3 w-3" />, color: "bg-yellow-100 text-yellow-800" },
  "aprobado": { label: "Aprobado", icon: <Check className="h-3 w-3" />, color: "bg-green-100 text-green-800" },
  "rechazado": { label: "Rechazado", icon: <X className="h-3 w-3" />, color: "bg-red-100 text-red-800" },
  "anulado": { label: "Anulado", icon: <X className="h-3 w-3" />, color: "bg-gray-100 text-gray-800" }
};

// Función para formatear fechas
function formatDate(dateString: string | Date) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function InventoryAdjustments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Consulta para obtener ajustes de inventario
  const { data: adjustments = [], isLoading } = useQuery<InventoryAdjustment[]>({
    queryKey: ["/api/inventory/adjustments"],
  });
  
  // Consulta para obtener productos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Consulta para obtener almacenes
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ["/api/warehouses"],
  });
  
  // Filtrado de ajustes
  const filteredAdjustments = useMemo(() => {
    if (!adjustments) return [];
    
    return adjustments
      .filter(adjustment => {
        const matchesTerm = searchTerm === "" || 
                adjustment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                adjustment.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                adjustment.id.toString().includes(searchTerm);
        
        return matchesTerm;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Más recientes primero
  }, [adjustments, searchTerm]);
  
  // Estadísticas de ajustes
  const adjustmentsStats = useMemo(() => {
    if (!adjustments || adjustments.length === 0) {
      return { total: 0, pending: 0, approved: 0 };
    }
    
    const total = adjustments.length;
    const pending = adjustments.filter(a => a.status === 'pendiente').length;
    const approved = adjustments.filter(a => a.status === 'aprobado').length;
    
    return { total, pending, approved };
  }, [adjustments]);

  // Obtener la fecha actual en formato ISO completo con zona horaria Z (UTC)
  const today = new Date().toISOString();
  
  // Configuración del formulario para crear ajuste
  const form = useForm({
    resolver: zodResolver(insertInventoryAdjustmentSchema),
    defaultValues: {
      date: today,
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
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ocurrió un error al crear el ajuste",
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
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Éxito",
        description: "Estado del ajuste actualizado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ocurrió un error al actualizar el estado",
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
    
    // Formatear la fecha según lo que espera el esquema Zod
    // La fecha debe ser en formato ISO-8601 con información de zona horaria
    let formattedDate = data.date;
    if (formattedDate && !formattedDate.endsWith('Z')) {
      // Asegurémonos de que la fecha tiene formato ISO correcto con 'Z' al final
      formattedDate = new Date(formattedDate).toISOString();
    }
    
    // Preparar datos para envío
    const submitData = {
      ...data,
      date: formattedDate,
      items: processedItems,
      warehouseId: data.warehouseId ? Number(data.warehouseId) : undefined,
      targetWarehouseId: data.targetWarehouseId ? Number(data.targetWarehouseId) : undefined,
    };
    
    console.log("Enviando datos:", JSON.stringify(submitData, null, 2));
    
    // Enviar los datos
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
      <div className="flex flex-col space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Ajustes de Inventario
        </h1>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ajustes</p>
                <p className="text-xl font-bold">{adjustmentsStats.total}</p>
              </div>
              <ClipboardList className="h-10 w-10 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-xl font-bold">{adjustmentsStats.pending}</p>
              </div>
              <Timer className="h-10 w-10 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprobados</p>
                <p className="text-xl font-bold">{adjustmentsStats.approved}</p>
              </div>
              <Check className="h-10 w-10 text-green-400" />
            </CardContent>
          </Card>
        </div>

        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">Lista de Ajustes</TabsTrigger>
            <TabsTrigger value="form">Nuevo Ajuste</TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Lista de Ajustes de Inventario
                </CardTitle>
                <CardDescription>
                  Registros de ajustes de inventario realizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Buscador */}
                <div className="mb-4">
                  <Input
                    placeholder="Buscar por referencia, documento o ID..."
                    className="max-w-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Tabla de Ajustes */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Almacén</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            <div className="flex justify-center items-center space-x-2">
                              <RotateCw className="h-4 w-4 animate-spin" />
                              <span>Cargando ajustes...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredAdjustments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            No hay ajustes de inventario que coincidan con la búsqueda
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdjustments.map(adjustment => (
                          <TableRow key={adjustment.id}>
                            <TableCell className="font-medium">#{adjustment.id}</TableCell>
                            <TableCell>{formatDate(adjustment.date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {adjustmentTypes[adjustment.adjustmentType as keyof typeof adjustmentTypes]?.icon || <Package className="h-4 w-4" />}
                                <span>
                                  {adjustmentTypes[adjustment.adjustmentType as keyof typeof adjustmentTypes]?.label || adjustment.adjustmentType}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {adjustment.reference || "-"}
                              {adjustment.documentNumber && (
                                <div className="text-xs text-muted-foreground">
                                  Doc: {adjustment.documentNumber}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {warehouses.find(w => w.id === adjustment.warehouseId)?.name || `Almacén ${adjustment.warehouseId}`}
                            </TableCell>
                            <TableCell>
                              {adjustment.status && statusMap[adjustment.status as keyof typeof statusMap] ? (
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${statusMap[adjustment.status as keyof typeof statusMap].color}`}>
                                  {statusMap[adjustment.status as keyof typeof statusMap].icon}
                                  <span>{statusMap[adjustment.status as keyof typeof statusMap].label}</span>
                                </div>
                              ) : (
                                <span>{adjustment.status}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {adjustment.status === "pendiente" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApprove(adjustment.id)}
                                      title="Aprobar"
                                    >
                                      <FileCheck className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleReject(adjustment.id)}
                                      title="Rechazar"
                                    >
                                      <FileX className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </>
                                )}
                                {adjustment.status !== "anulado" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancel(adjustment.id)}
                                    title="Anular"
                                  >
                                    <X className="h-4 w-4 text-gray-500" />
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
          <TabsContent value="form">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FilePlus className="h-5 w-5 text-primary" />
                  Nuevo Ajuste de Inventario
                </CardTitle>
                <CardDescription>
                  Registra un nuevo ajuste para modificar el inventario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        {/* Tipo de Ajuste */}
                        <FormField
                          control={form.control}
                          name="adjustmentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Ajuste</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el tipo de ajuste" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(adjustmentTypes).map(([key, value]) => (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center gap-2">
                                        {value.icon}
                                        <div>
                                          <div>{value.label}</div>
                                          <div className="text-xs text-muted-foreground">{value.description}</div>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Fecha */}
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="datetime-local"
                                    className="pl-8"
                                    value={field.value?.slice(0, 16) || ""}
                                    onChange={(e) => {
                                      // Convertir la fecha a formato ISO
                                      const date = new Date(e.target.value);
                                      field.onChange(date.toISOString());
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription className="text-xs text-muted-foreground">
                                Formato ISO: {field.value}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Almacén Origen */}
                        <FormField
                          control={form.control}
                          name="warehouseId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Almacén</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value ? field.value.toString() : "1"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el almacén" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {warehouses.map(warehouse => (
                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                      {warehouse.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Almacén Destino (solo para transferencias) */}
                        {adjustmentType === "transferencia" && (
                          <FormField
                            control={form.control}
                            name="targetWarehouseId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Almacén Destino</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  defaultValue={field.value ? field.value.toString() : undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona el almacén destino" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {warehouses
                                      .filter(w => w.id !== form.getValues("warehouseId"))
                                      .map(warehouse => (
                                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                          {warehouse.name}
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Referencia */}
                        <FormField
                          control={form.control}
                          name="reference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referencia</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Número de orden, factura, etc."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Documento */}
                        <FormField
                          control={form.control}
                          name="documentNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Documento</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Documento relacionado"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Notas */}
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notas</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Detalles adicionales sobre el ajuste"
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Sección de Productos */}
                    <div className="border rounded-md p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-medium">Productos a ajustar</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addItem}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" /> 
                          Agregar Producto
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {form.watch("items")?.map((_, index) => (
                          <div key={index} className="border p-3 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">Producto #{index + 1}</h4>
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                                  Eliminar
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.productId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Producto</FormLabel>
                                    <Select
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                      defaultValue={field.value ? field.value.toString() : undefined}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecciona el producto" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {products.map(product => (
                                          <SelectItem key={product.id} value={product.id.toString()}>
                                            {product.name} ({product.stock} en stock)
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cantidad</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`items.${index}.reason`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Motivo</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Motivo específico"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
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
                        onClick={() => setActiveTab("list")}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? (
                          <RotateCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <FilePlus className="h-4 w-4 mr-2" />
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