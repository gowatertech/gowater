import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Product, insertProductSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Pencil, Trash } from "lucide-react";

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

export default function Productos() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      price: "0.00",
      stock: 0,
      icon: "",
      isReturnable: false,
      depositAmount: "0.00",
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
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        price: Number(data.price).toFixed(2),
        stock: Number(data.stock),
        depositAmount: Number(data.depositAmount).toFixed(2)
      };
      const res = await apiRequest("POST", "/api/products", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: t("success"),
        description: t("productCreated"),
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        price: Number(data.price).toFixed(2),
        stock: Number(data.stock),
        depositAmount: Number(data.depositAmount).toFixed(2)
      };
      const res = await apiRequest("PATCH", `/api/products/${editingProduct?.id}`, formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: t("success"),
        description: t("productUpdated"),
      });
      editForm.reset();
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/products/${id}`);
      if (!res.ok) throw new Error(t("deleteError"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: t("success"),
        description: t("productDeleted"),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const onEdit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    editForm.reset({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock,
      icon: product.icon || undefined, // Handle null case
      isReturnable: product.isReturnable ?? false,
      depositAmount: product.depositAmount?.toString() || "0.00"
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t("confirmDelete"))) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("products")}</h1>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("type")}</TableHead>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("price")}</TableHead>
            <TableHead>{t("stock")}</TableHead>
            <TableHead>Retornable</TableHead>
            <TableHead>Depósito</TableHead>
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