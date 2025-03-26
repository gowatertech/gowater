import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Product, insertProductSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  PlusCircle, 
  Pencil, 
  Trash, 
  Package,
  RotateCcw,
  Search, 
  X, 
  Box, 
  CircleDollarSign, 
  PackageCheck, 
  PackageX 
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
import { Checkbox } from "@/components/ui/checkbox";

const productTypes = [
  { 
    id: "water5gl", 
    label: "Botellón de Agua 5GL",
    imageSrc: "/images/water-5gl.svg"
  },
  { 
    id: "water24pack", 
    label: "Sixpack de Agua 24 Botellas",
    imageSrc: "/images/water-24pack.svg"
  },
  { 
    id: "water16oz", 
    label: "Botella de Agua 16 oz",
    imageSrc: "/images/water-16oz.svg"
  },
  { 
    id: "water8oz", 
    label: "Botella de Agua 8 oz",
    imageSrc: "/images/water-8oz.svg"
  },
  { 
    id: "waterBag", 
    label: "Funditas de Agua",
    imageSrc: "/images/water-bag.svg"
  },
];

interface ProductStats {
  totalProducts: number;
  totalStock: number;
  averagePrice: number;
  hasStock: number;
  outOfStock: number;
}

export default function Inventory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Filtrar productos por término de búsqueda
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products
      .filter(product => 
        searchTerm === "" || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm]);
  
  // Calcular estadísticas de productos
  const productStats: ProductStats = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        totalProducts: 0,
        totalStock: 0,
        averagePrice: 0,
        hasStock: 0,
        outOfStock: 0
      };
    }
    
    const total = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalPrice = products.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0);
    const hasStock = products.filter(p => p.stock > 0).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    
    return {
      totalProducts: total,
      totalStock,
      averagePrice: totalPrice / total,
      hasStock,
      outOfStock
    };
  }, [products]);

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      price: "0.00",
      stock: 0,
      icon: "",
    },
  });

  const editForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      price: "0.00",
      stock: 0,
      icon: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        price: Number(data.price).toFixed(2),
        stock: Number(data.stock)
      };
      const res = await apiRequest("POST", "/api/products", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Éxito",
        description: "Producto creado exitosamente",
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

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Asegurarnos de que tenemos un objeto formateado correctamente para la API
      const formattedData = {
        ...data,
        price: Number(data.price).toFixed(2),
        stock: Number(data.stock),
        // Asegurarnos de que icon sea una cadena o null, nunca undefined
        icon: data.icon || null
      };
      
      const res = await apiRequest("PATCH", `/api/products/${editingProduct?.id}`, formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Éxito",
        description: "Producto actualizado exitosamente",
      });
      editForm.reset();
      setEditingProduct(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Intentar eliminar el producto con manejo de errores mejorado
      try {
        const res = await apiRequest("DELETE", `/api/products/${id}`);
        if (!res.ok) {
          const errorData = await res.text();
          // Verificar si la respuesta contiene un mensaje sobre clave foránea
          if (errorData.includes("foreign key constraint") || errorData.includes("vehicle_loading_items")) {
            throw new Error(`El producto está siendo utilizado en carga de vehículos y no puede ser eliminado.`);
          }
          throw new Error(`Error al eliminar el producto: ${errorData || res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Error en deleteMutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Éxito",
        description: "Producto eliminado exitosamente",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      // No cerramos el diálogo para mostrar el mensaje de error dentro de él
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el producto",
      });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const onEdit = (data: any) => {
    try {
      updateMutation.mutate(data);
    } catch (error) {
      console.error("Error en onEdit:", error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    
    // Usar un objeto con tipado seguro
    const formValues = {
      name: product.name,
      price: product.price.toString(),
      stock: product.stock,
      // Si icon es null o undefined, usar una cadena vacía
      icon: product.icon || ""
    };
    
    editForm.reset(formValues);
    setActiveTab("form");
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId !== null) {
      try {
        deleteMutation.mutate(deleteId);
      } catch (error) {
        console.error("Error en handleDelete:", error);
      }
    }
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Gestión de Productos
          </h1>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Productos</p>
                <p className="text-lg font-bold">{productStats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Con Existencia</p>
                <p className="text-lg font-bold">{productStats.hasStock}</p>
              </div>
              <PackageCheck className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sin Existencia</p>
                <p className="text-lg font-bold">{productStats.outOfStock}</p>
              </div>
              <PackageX className="h-8 w-8 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Unidades</p>
                <p className="text-lg font-bold">{productStats.totalStock}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-purple-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Precio Promedio</p>
                <p className="text-lg font-bold">RD$ {productStats.averagePrice.toFixed(2)}</p>
              </div>
              <CircleDollarSign className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
        </div>

        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="list" className="text-xs">Lista de Productos</TabsTrigger>
            <TabsTrigger value="form" className="text-xs">
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista */}
          <TabsContent value="list" className="space-y-2">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1">
                    <Package className="h-4 w-4 text-primary" />
                    Lista de Productos
                  </CardTitle>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditingProduct(null);
                      form.reset({
                        name: "",
                        price: "0.00",
                        stock: 0,
                        icon: ""
                      });
                      setActiveTab("form");
                    }}
                  >
                    Nuevo Producto
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Consulta y gestiona los productos disponibles en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre de producto"
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

                {/* Tabla de Productos */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[10px]">
                        <TableHead className="py-1 w-[80px]">Tipo</TableHead>
                        <TableHead className="py-1">Nombre</TableHead>
                        <TableHead className="py-1 w-[100px] text-right">Precio</TableHead>
                        <TableHead className="py-1 w-[80px] text-center">Existencia</TableHead>
                        <TableHead className="py-1 w-[100px] text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-xs text-muted-foreground">
                            Cargando productos...
                          </TableCell>
                        </TableRow>
                      ) : filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-xs text-muted-foreground">
                            No se encontraron productos
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => {
                          const productType = productTypes.find(i => i.id === product.icon);
                          return (
                            <TableRow key={product.id} className="text-xs">
                              <TableCell className="py-2">
                                {productType ? (
                                  <div className="flex justify-center">
                                    <img 
                                      src={productType.imageSrc} 
                                      alt={productType.label}
                                      className="h-10 w-10 object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 bg-gray-100 rounded-md mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="py-2 font-medium">{product.name}</TableCell>
                              <TableCell className="py-2 text-right">RD$ {parseFloat(product.price.toString()).toFixed(2)}</TableCell>
                              <TableCell className="py-2 text-center">
                                <Badge variant={product.stock > 0 ? "default" : "secondary"}>
                                  {product.stock}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex justify-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(product)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(product.id)}
                                    className="h-6 w-6 p-0 text-destructive"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
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
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {editingProduct 
                    ? "Actualiza la información del producto seleccionado" 
                    : "Completa el formulario para crear un nuevo producto"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <Form {...(editingProduct ? editForm : form)}>
                  <form 
                    onSubmit={editingProduct 
                      ? editForm.handleSubmit(onEdit) 
                      : form.handleSubmit(onSubmit)} 
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Tipo de Producto</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Seleccione un tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <div className="grid grid-cols-1 gap-1 p-1">
                                  {productTypes.map((item) => (
                                    <SelectItem
                                      key={item.id}
                                      value={item.id}
                                      className="flex items-center gap-2 h-12 text-xs"
                                    >
                                      <img 
                                        src={item.imageSrc} 
                                        alt={item.label}
                                        className="h-8 w-8 object-contain"
                                      />
                                      <span>{item.label}</span>
                                    </SelectItem>
                                  ))}
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
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
                        control={editingProduct ? editForm.control : form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Precio (RD$)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-8 text-xs"
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Existencia</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-8 text-xs"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                value={field.value}
                              />
                            </FormControl>
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
                          setEditingProduct(null);
                          form.reset();
                          editForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="text-xs h-8"
                        disabled={editingProduct ? updateMutation.isPending : createMutation.isPending}
                      >
                        {editingProduct 
                          ? (updateMutation.isPending ? "Actualizando..." : "Actualizar") 
                          : (createMutation.isPending ? "Guardando..." : "Guardar")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo de eliminación de producto */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm">
              ¿Está seguro de que desea eliminar este producto?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              className="text-xs h-8"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="text-xs h-8"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
          {deleteMutation.isError && (
            <div className="text-destructive text-xs mt-2 text-center">
              Error: No se pudo eliminar el producto.
              <p>El producto puede estar siendo usado en algunas operaciones.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}