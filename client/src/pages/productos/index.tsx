import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Product, insertProductSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Pencil, Trash, RefreshCw } from "lucide-react";
import { z } from "zod";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const productTypes = [
  { 
    id: "water5gl", 
    label: "Botellón de Agua 5GL",
    imageSrc: "/images/water-5gl.svg"
  },
  { 
    id: "water24pack", 
    label: "Agua en funda 24 pack",
    imageSrc: "/images/water-24pack.svg"
  },
  { 
    id: "water16oz", 
    label: "Botella de Agua 16oz",
    imageSrc: "/images/water-16oz.svg"
  },
];

export default function ProductsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const form = useForm({
    resolver: zodResolver(
      insertProductSchema.extend({
        price: insertProductSchema.shape.price,
        stock: insertProductSchema.shape.stock.or(z.string()),
        minStock: insertProductSchema.shape.minStock.or(z.string()),
        depositAmount: insertProductSchema.shape.depositAmount.or(z.string()),
      })
    ),
    defaultValues: {
      name: "",
      price: "0.00",
      stock: 0,
      minStock: 5,
      icon: undefined,
      isReturnable: false,
      depositAmount: "0.00",
      hasCommission: true,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(
      insertProductSchema.extend({
        price: insertProductSchema.shape.price,
        stock: insertProductSchema.shape.stock.or(z.string()),
        minStock: insertProductSchema.shape.minStock.or(z.string()),
        depositAmount: insertProductSchema.shape.depositAmount.or(z.string()),
      })
    ),
    defaultValues: {
      name: "",
      price: "0.00",
      stock: 0,
      minStock: 5,
      icon: undefined,
      isReturnable: false,
      depositAmount: "0.00",
      hasCommission: true,
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form.getValues) =>
      apiRequest("/api/products", { method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: t("productCreated"),
        description: t("productCreatedDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number;
      updates: Partial<typeof editForm.getValues>;
    }) =>
      apiRequest(`/api/products/${data.id}`, {
        method: "PATCH",
        data: data.updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      editForm.reset();
      toast({
        title: t("productUpdated"),
        description: t("productUpdatedDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: t("productDeleted"),
        description: t("productDeletedDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para actualizar todas las comisiones
  const updateAllCommissionsMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/products/update-all-commission', { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Comisiones actualizadas",
        description: "Todos los productos ahora tienen comisión activada (S)",
      });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: typeof form.getValues) => {
    // Formatear precio y cantidad para que tengan dos decimales
    const formattedData = {
      ...data,
      price: parseFloat(data.price).toFixed(2),
      depositAmount: parseFloat(data.depositAmount).toFixed(2),
    };
    createMutation.mutate(formattedData as unknown as typeof form.getValues);
  };

  const onEdit = (data: typeof editForm.getValues) => {
    if (!editingProduct) return;

    // Formatear precio y cantidad para que tengan dos decimales
    const formattedData = {
      ...data,
      price: parseFloat(data.price).toFixed(2),
      depositAmount: parseFloat(data.depositAmount).toFixed(2),
    };

    updateMutation.mutate({
      id: editingProduct.id,
      updates: formattedData as unknown as Partial<typeof editForm.getValues>,
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    editForm.reset({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock,
      minStock: product.minStock ?? 5,
      icon: product.icon || undefined,
      isReturnable: product.isReturnable ?? false,
      depositAmount: product.depositAmount?.toString() || "0.00",
      hasCommission: product.hasCommission ?? true
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t("confirmDelete"))) {
      deleteMutation.mutate(id);
    }
  };
  
  // Función para actualizar comisiones en todos los productos
  const handleUpdateAllCommissions = () => {
    if (window.confirm("¿Estás seguro de que deseas actualizar todos los productos para que tengan comisión? Esta acción establecerá 'Comisión = S' para todos los productos.")) {
      updateAllCommissionsMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("products")}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleUpdateAllCommissions}
            disabled={updateAllCommissionsMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {updateAllCommissionsMutation.isPending ? "Actualizando..." : "Actualizar Comisiones"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                {t("newProduct")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("newProduct")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("productType")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectProductType")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productTypes.map((item) => (
                              <SelectItem
                                key={item.id}
                                value={item.id}
                                className="flex items-center gap-2"
                              >
                                <img 
                                  src={item.imageSrc} 
                                  alt={item.label}
                                  className="h-24 w-24 object-contain"
                                />
                                <span>{item.label}</span>
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("name")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("price")} (RD$)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("stock")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Mínimo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Alerta cuando el inventario sea igual o menor a este valor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isReturnable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Es Retornable</FormLabel>
                          <FormDescription className="text-xs">
                            Indica si este producto tiene envases que pueden ser devueltos
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto de Depósito (RD$)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={!form.watch("isReturnable")}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Monto del depósito para los envases retornables
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hasCommission"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Comisión (S/N)</FormLabel>
                          <FormDescription className="text-xs">
                            Indica si este producto genera comisión para el vendedor
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? t("saving") : t("save")}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("type")}</TableHead>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("price")}</TableHead>
            <TableHead>{t("stock")}</TableHead>
            <TableHead>Retornable</TableHead>
            <TableHead>Depósito</TableHead>
            <TableHead>Comisión</TableHead>
            <TableHead>{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products?.map((product) => {
            const productType = productTypes.find(i => i.id === product.icon);
            return (
              <TableRow key={product.id}>
                <TableCell className="p-4 w-32">
                  {productType ? (
                    <img 
                      src={productType.imageSrc} 
                      alt={productType.label}
                      className="h-30 w-30 object-contain mx-auto"
                    />
                  ) : (
                    <div className="h-30 w-30 bg-gray-100 rounded-md mx-auto" />
                  )}
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>RD$ {parseFloat(product.price.toString()).toFixed(2)}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>{product.isReturnable ? '✓' : '✗'}</TableCell>
                <TableCell>
                  {product.isReturnable 
                    ? `RD$ ${parseFloat(product.depositAmount?.toString() || '0').toFixed(2)}` 
                    : 'N/A'}
                </TableCell>
                <TableCell>{product.hasCommission !== false ? 'S' : 'N'}</TableCell>
                <TableCell className="space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editProduct")}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("productType")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectProductType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productTypes.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id}
                            className="flex items-center gap-2"
                          >
                            <img 
                              src={item.imageSrc} 
                              alt={item.label}
                              className="h-24 w-24 object-contain"
                            />
                            <span>{item.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("price")} (RD$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("stock")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Alerta cuando el inventario sea igual o menor a este valor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isReturnable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Es Retornable</FormLabel>
                      <FormDescription className="text-xs">
                        Indica si este producto tiene envases que pueden ser devueltos
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto de Depósito (RD$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={!editForm.watch("isReturnable")}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Monto del depósito para los envases retornables
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="hasCommission"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Comisión (S/N)</FormLabel>
                      <FormDescription className="text-xs">
                        Indica si este producto genera comisión para el vendedor
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? t("saving") : t("save")}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}