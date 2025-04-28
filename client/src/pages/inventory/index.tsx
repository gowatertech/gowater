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
      isReturnable: false,
      depositAmount: "0.00",
      hasCommission: true,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      price: "0.00",
      stock: 0,
      icon: "",
      isReturnable: false,
      depositAmount: "0.00",
      hasCommission: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        price: Number(data.price).toFixed(2),
        stock: Number(data.stock),
        isReturnable: !!data.isReturnable,
        depositAmount: data.isReturnable ? Number(data.depositAmount).toFixed(2) : "0.00",
        hasCommission: !!data.hasCommission
      };
      return await apiRequest({
        method: "POST",
        url: "/api/products",
        data: formattedData
      });
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
        icon: data.icon || null,
        isReturnable: !!data.isReturnable,
        depositAmount: data.isReturnable ? Number(data.depositAmount).toFixed(2) : "0.00",
        hasCommission: !!data.hasCommission
      };
      
      return await apiRequest({
        method: "PATCH",
        url: `/api/products/${editingProduct?.id}`,
        data: formattedData
      });
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
        const response = await apiRequest({
          method: "DELETE",
          url: `/api/products/${id}`
        });
        return response;
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
      icon: product.icon || "",
      // Campos para productos retornables
      isReturnable: product.isReturnable ?? false,
      depositAmount: product.depositAmount?.toString() || "0.00",
      hasCommission: product.hasCommission ?? true
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
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-base font-bold flex items-center gap-1">
            <Box className="h-4 w-4 text-primary" />
            Gestión de Productos
          </h1>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-1 mb-1">
          <Card className="bg-muted/20">
            <CardContent className="p-1 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Total Productos</p>
                <p className="text-sm font-bold">{productStats.totalProducts}</p>
              </div>
              <Package className="h-5 w-5 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-1 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Con Existencia</p>
                <p className="text-sm font-bold">{productStats.hasStock}</p>
              </div>
              <PackageCheck className="h-5 w-5 text-green-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-1 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Sin Existencia</p>
                <p className="text-sm font-bold">{productStats.outOfStock}</p>
              </div>
              <PackageX className="h-5 w-5 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-1 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Total Unidades</p>
                <p className="text-sm font-bold">{productStats.totalStock}</p>
              </div>
              <RotateCcw className="h-5 w-5 text-purple-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-1 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Precio Promedio</p>
                <p className="text-sm font-bold">RD$ {productStats.averagePrice.toFixed(2)}</p>
              </div>
              <CircleDollarSign className="h-5 w-5 text-green-400" />
            </CardContent>
          </Card>
        </div>

        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-1">
            <TabsTrigger value="list" className="text-[10px] h-7 py-0 px-2">Lista de Productos</TabsTrigger>
            <TabsTrigger value="form" className="text-[10px] h-7 py-0 px-2">
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista */}
          <TabsContent value="list" className="space-y-1">
            <Card>
              <CardHeader className="p-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Package className="h-3 w-3 text-primary" />
                    Lista de Productos
                  </CardTitle>
                  <Button 
                    size="sm" 
                    className="h-6 text-[10px] py-0 px-2"
                    onClick={() => {
                      setEditingProduct(null);
                      form.reset({
                        name: "",
                        price: "0.00",
                        stock: 0,
                        icon: "",
                        isReturnable: false,
                        depositAmount: "0.00",
                        hasCommission: true
                      });
                      setActiveTab("form");
                    }}
                  >
                    Nuevo Producto
                  </Button>
                </div>
                <CardDescription className="text-[10px]">
                  Consulta y gestiona los productos disponibles en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-1 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre de producto"
                      className="pl-7 h-7 text-[10px] py-0"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tabla de Productos */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[9px]">
                        <TableHead className="py-0.5 px-1 w-[40px]">Tipo</TableHead>
                        <TableHead className="py-0.5 px-1">Nombre</TableHead>
                        <TableHead className="py-0.5 px-1 w-[80px] text-right">Precio</TableHead>
                        <TableHead className="py-0.5 px-1 w-[60px] text-center">Stock</TableHead>
                        <TableHead className="py-0.5 px-1 w-[60px] text-center">Retornable</TableHead>
                        <TableHead className="py-0.5 px-1 w-[80px] text-center">Depósito</TableHead>
                        <TableHead className="py-0.5 px-1 w-[60px] text-center">Comisión</TableHead>
                        <TableHead className="py-0.5 px-1 w-[70px] text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-2 text-[10px] text-muted-foreground">
                            Cargando productos...
                          </TableCell>
                        </TableRow>
                      ) : filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-2 text-[10px] text-muted-foreground">
                            No se encontraron productos
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => {
                          const productType = productTypes.find(i => i.id === product.icon);
                          return (
                            <TableRow key={product.id} className="text-[10px]">
                              <TableCell className="py-1 px-1">
                                {productType ? (
                                  <div className="flex justify-center">
                                    <img 
                                      src={productType.imageSrc} 
                                      alt={productType.label}
                                      className="h-6 w-6 object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-6 w-6 bg-gray-100 rounded-md mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="py-1 px-1 font-medium">{product.name}</TableCell>
                              <TableCell className="py-1 px-1 text-right">RD$ {parseFloat(product.price.toString()).toFixed(2)}</TableCell>
                              <TableCell className="py-1 px-1 text-center">
                                <Badge variant={product.stock > 0 ? "default" : "secondary"} className="px-1.5 py-0 text-[9px]">
                                  {product.stock}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1 px-1 text-center">
                                {product.isReturnable ? '✓' : '✗'}
                              </TableCell>
                              <TableCell className="py-1 px-1 text-center">
                                {product.isReturnable 
                                  ? `RD$ ${parseFloat(product.depositAmount?.toString() || '0').toFixed(2)}` 
                                  : 'N/A'}
                              </TableCell>
                              <TableCell className="py-1 px-1 text-center">
                                {product.hasCommission ? 'S' : 'N'}
                              </TableCell>
                              <TableCell className="py-1 px-1">
                                <div className="flex justify-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(product)}
                                    className="h-5 w-5 p-0"
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(product.id)}
                                    className="h-5 w-5 p-0 text-destructive"
                                  >
                                    <Trash className="h-2.5 w-2.5" />
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
              <CardHeader className="p-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Package className="h-3 w-3 text-primary" />
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  {editingProduct 
                    ? "Actualiza la información del producto seleccionado" 
                    : "Completa el formulario para crear un nuevo producto"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                <Form {...(editingProduct ? editForm : form)}>
                  <form 
                    onSubmit={editingProduct 
                      ? editForm.handleSubmit(onEdit) 
                      : form.handleSubmit(onSubmit)} 
                    className="space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px]">Tipo de Producto</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-7 text-[10px]">
                                  <SelectValue placeholder="Seleccione un tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <div className="grid grid-cols-1 gap-1 p-1">
                                  {productTypes.map((item) => (
                                    <SelectItem
                                      key={item.id}
                                      value={item.id}
                                      className="flex items-center gap-1 h-8 text-[10px] py-0"
                                    >
                                      <img 
                                        src={item.imageSrc} 
                                        alt={item.label}
                                        className="h-5 w-5 object-contain"
                                      />
                                      <span>{item.label}</span>
                                    </SelectItem>
                                  ))}
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px]">Nombre</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-7 text-[10px]" />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px]">Precio (RD$)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-7 text-[10px]"
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px]">Existencia</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-7 text-[10px]"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                value={field.value}
                              />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="isReturnable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 py-1">
                            <FormControl>
                              <Checkbox
                                className="h-3.5 w-3.5"
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  // Si se desmarca, resetear el valor del depósito
                                  if (!checked) {
                                    const setDepositToZero = editingProduct 
                                      ? editForm.setValue 
                                      : form.setValue;
                                    setDepositToZero("depositAmount", "0.00");
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-[10px] cursor-pointer">
                              Producto Retornable (con depósito)
                            </FormLabel>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="depositAmount"
                        render={({ field }) => {
                          // Obtener el valor de isReturnable
                          const isReturnableValue = editingProduct 
                            ? editForm.watch("isReturnable") 
                            : form.watch("isReturnable");
                          
                          return (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px]">Monto del Depósito (RD$)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-7 text-[10px]"
                                  onChange={(e) => field.onChange(e.target.value)}
                                  disabled={!isReturnableValue}
                                />
                              </FormControl>
                              <FormMessage className="text-[9px]" />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={editingProduct ? editForm.control : form.control}
                        name="hasCommission"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 py-1">
                            <FormControl>
                              <Checkbox
                                className="h-3.5 w-3.5"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-[10px] cursor-pointer">
                              Producto con Comisión (S/N)
                            </FormLabel>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between pt-1">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="text-[10px] h-6 py-0 px-2"
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
                        className="text-[10px] h-6 py-0 px-2"
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
        <DialogContent className="max-w-xs p-4">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-sm">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs">
              ¿Está seguro de que desea eliminar este producto?
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter className="flex justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              className="text-[10px] h-6 py-0 px-2"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="text-[10px] h-6 py-0 px-2"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
          {deleteMutation.isError && (
            <div className="text-destructive text-[10px] mt-1 text-center">
              Error: No se pudo eliminar el producto.
              <p>El producto puede estar siendo usado en algunas operaciones.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}