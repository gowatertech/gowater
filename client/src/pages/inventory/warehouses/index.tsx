import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
// Aseguramos que estamos usando la implementación correcta de apiRequest
import type { Warehouse, InsertWarehouse } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Pencil, 
  Package, 
  Search, 
  X, 
  Building,
  CheckCircle, 
  BarChart4, 
  Store 
} from "lucide-react";
import { insertWarehouseSchema } from "@shared/schema";

interface WarehouseStats {
  totalActive: number;
  totalInactive: number;
  total: number;
}

export default function WarehousesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const form = useForm<InsertWarehouse>({
    resolver: zodResolver(insertWarehouseSchema),
    defaultValues: {
      name: "",
      status: "active"
    }
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  // Filtrar y ordenar almacenes
  const filteredWarehouses = warehouses
    .filter(warehouse => {
      const matchesSearch = searchTerm === "" || 
        warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (warehouse.code?.toString() || "").includes(searchTerm);
        
      const matchesStatus = statusFilter === "all" || warehouse.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => a.code - b.code);

  // Estadísticas de almacenes
  const warehouseStats: WarehouseStats = {
    totalActive: warehouses.filter(w => w.status === "active").length,
    totalInactive: warehouses.filter(w => w.status === "inactive").length,
    total: warehouses.length
  };

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: async (data: InsertWarehouse) => {
      return await apiRequest({
        method: "POST",
        url: "/api/warehouses",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({
        title: "Éxito",
        description: "Almacén creado correctamente"
      });
      form.reset();
      setActiveTab("list");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: async (data: InsertWarehouse & { id: number }) => {
      const { id, ...updateData } = data;
      return await apiRequest({
        method: "PATCH",
        url: `/api/warehouses/${id}`,
        data: updateData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({
        title: "Éxito",
        description: "Almacén actualizado correctamente"
      });
      setEditingWarehouse(null);
      form.reset();
      setActiveTab("list");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertWarehouse) => {
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ ...data, id: editingWarehouse.id });
    } else {
      createWarehouseMutation.mutate(data);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    form.reset({
      name: warehouse.name,
      status: warehouse.status
    });
    setActiveTab("form");
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Gestión de Almacenes
          </h1>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Almacenes Activos</p>
                <p className="text-lg font-bold">{warehouseStats.totalActive}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Almacenes Inactivos</p>
                <p className="text-lg font-bold">{warehouseStats.totalInactive}</p>
              </div>
              <Building className="h-8 w-8 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Almacenes</p>
                <p className="text-lg font-bold">{warehouseStats.total}</p>
              </div>
              <BarChart4 className="h-8 w-8 text-purple-400" />
            </CardContent>
          </Card>
        </div>

        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="list" className="text-xs">Lista de Almacenes</TabsTrigger>
            <TabsTrigger value="form" className="text-xs">
              {editingWarehouse ? "Editar Almacén" : "Nuevo Almacén"}
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista */}
          <TabsContent value="list" className="space-y-2">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1">
                    <Package className="h-4 w-4 text-primary" />
                    Lista de Almacenes
                  </CardTitle>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditingWarehouse(null);
                      form.reset({
                        name: "",
                        status: "active"
                      });
                      setActiveTab("form");
                    }}
                  >
                    Nuevo Almacén
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Consulta y gestiona todos los almacenes del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o código"
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
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabla de Almacenes */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[10px]">
                        <TableHead className="py-1 w-[80px]">Código</TableHead>
                        <TableHead className="py-1">Nombre</TableHead>
                        <TableHead className="py-1 w-[100px]">Estado</TableHead>
                        <TableHead className="py-1 w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                            Cargando almacenes...
                          </TableCell>
                        </TableRow>
                      ) : filteredWarehouses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                            No se encontraron almacenes
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWarehouses.map((warehouse) => (
                          <TableRow key={warehouse.id} className="text-xs">
                            <TableCell className="py-1.5 font-medium">{warehouse.code}</TableCell>
                            <TableCell className="py-1.5">{warehouse.name}</TableCell>
                            <TableCell className="py-1.5">
                              <Badge variant={warehouse.status === "active" ? "default" : "secondary"}>
                                {warehouse.status === "active" ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(warehouse)}
                                className="h-6 w-6 p-0"
                              >
                                <Pencil className="h-3 w-3" />
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
          </TabsContent>

          {/* Pestaña de Formulario */}
          <TabsContent value="form">
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-base flex items-center gap-1">
                  <Package className="h-4 w-4 text-primary" />
                  {editingWarehouse ? "Editar Almacén" : "Nuevo Almacén"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {editingWarehouse 
                    ? "Actualiza la información del almacén seleccionado" 
                    : "Completa el formulario para crear un nuevo almacén"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Nombre</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Estado</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="inactive">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="text-xs h-8"
                        onClick={() => {
                          setActiveTab("list");
                          setEditingWarehouse(null);
                          form.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="text-xs h-8"
                        disabled={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
                      >
                        {createWarehouseMutation.isPending || updateWarehouseMutation.isPending
                          ? "Guardando..."
                          : editingWarehouse 
                            ? "Actualizar" 
                            : "Guardar"}
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