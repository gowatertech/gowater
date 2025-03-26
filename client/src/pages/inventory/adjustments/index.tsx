import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Product, InventoryAdjustment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, Check, Timer, X, RotateCw, ClipboardList, FilePlus, PlusCircle, FileCheck, FileX, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Tipos de ajustes de inventario simplificados
const adjustmentTypes = {
  "entrada": { label: "Entrada", icon: <ArrowDownToLine className="h-4 w-4 text-green-500" /> },
  "salida": { label: "Salida", icon: <ArrowUpFromLine className="h-4 w-4 text-red-500" /> },
  "transferencia": { label: "Transferencia", icon: <ArrowDownToLine className="h-4 w-4 text-blue-500" /> },
  "conteo_fisico": { label: "Conteo Físico", icon: <ClipboardList className="h-4 w-4 text-purple-500" /> },
  "produccion": { label: "Producción", icon: <Package className="h-4 w-4 text-teal-500" /> },
  "ajuste": { label: "Ajuste", icon: <Package className="h-4 w-4 text-orange-500" /> }
};

// Estados simplificados
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
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

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

  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-col space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Ajustes de Inventario
        </h1>

        {/* Estadísticas simplificadas */}
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

        {/* Pestañas simplificadas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">Lista de Ajustes</TabsTrigger>
            <TabsTrigger value="form">Nuevo Ajuste</TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista simplificada */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Lista de Ajustes de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Buscador simple */}
                <div className="mb-4">
                  <Input
                    placeholder="Buscar ajustes..."
                    className="max-w-sm"
                  />
                </div>
                
                {/* Tabla de Ajustes simplificada */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            <div className="flex justify-center items-center space-x-2">
                              <RotateCw className="h-4 w-4 animate-spin" />
                              <span>Cargando ajustes...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : adjustments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No hay ajustes de inventario registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        adjustments.map(adjustment => (
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
                            <TableCell>{adjustment.reference || "-"}</TableCell>
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

          {/* Pestaña de Formulario simplificada */}
          <TabsContent value="form">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FilePlus className="h-5 w-5 text-primary" />
                  Nuevo Ajuste de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Button 
                    onClick={() => setActiveTab("list")}
                    className="gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Crear un nuevo ajuste de inventario
                  </Button>
                  <p className="mt-4 text-muted-foreground">
                    Para crear un ajuste completo, usa la API o ve a la versión completa.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}