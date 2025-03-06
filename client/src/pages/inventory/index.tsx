import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Product, insertProductSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Pencil, Trash } from "lucide-react";
import { useState } from "react";

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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { InventoryLoad } from "./load";

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

export default function Inventory() {
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
        stock: Number(data.stock)
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
      icon: product.icon,
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
        <h1 className="text-3xl font-bold">{t("inventory")}</h1>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">{t("products")}</TabsTrigger>
          <TabsTrigger value="load">{t("inventoryLoad")}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t("newProduct")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md md:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-center text-xl">{t("newProduct")}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 py-2">
                      <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-base">{t("productType")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full h-12">
                                  <SelectValue placeholder={t("selectProductType")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <div className="grid grid-cols-1 gap-2 p-2">
                                  {productTypes.map((item) => (
                                    <SelectItem
                                      key={item.id}
                                      value={item.id}
                                      className="flex items-center gap-2 h-16"
                                    >
                                      <img 
                                        src={item.imageSrc} 
                                        alt={item.label}
                                        className="h-10 w-10 object-contain"
                                      />
                                      <span>{item.label}</span>
                                    </SelectItem>
                                  ))}
                                </div>
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
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-base">{t("name")}</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-base">{t("price")} (RD$)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-12"
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
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-base">{t("stock")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="h-12"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                value={field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 mt-6"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? t("saving") : t("save")}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] md:w-[150px]">{t("type")}</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead className="w-[100px] text-center">{t("price")}</TableHead>
                  <TableHead className="w-[80px] text-center">{t("stock")}</TableHead>
                  <TableHead className="w-[100px] text-center">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((product) => {
                  const productType = productTypes.find(i => i.id === product.icon);
                  return (
                    <TableRow key={product.id} className="h-20">
                      <TableCell className="p-4">
                        {productType ? (
                          <div className="flex justify-center">
                            <img 
                              src={productType.imageSrc} 
                              alt={productType.label}
                              className="h-16 w-16 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 bg-gray-100 rounded-md mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-center">RD$ {parseFloat(product.price.toString()).toFixed(2)}</TableCell>
                      <TableCell className="text-center">{product.stock}</TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="h-8 w-8 p-0 text-destructive focus:ring-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="load">
          <InventoryLoad />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">{t("editProduct")}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
              <div className="grid gap-4 py-2">
                <FormField
                  control={editForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base">{t("productType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full h-12">
                            <SelectValue placeholder={t("selectProductType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="grid grid-cols-1 gap-2 p-2">
                            {productTypes.map((item) => (
                              <SelectItem
                                key={item.id}
                                value={item.id}
                                className="flex items-center gap-2 h-16"
                              >
                                <img 
                                  src={item.imageSrc} 
                                  alt={item.label}
                                  className="h-10 w-10 object-contain"
                                />
                                <span>{item.label}</span>
                              </SelectItem>
                            ))}
                          </div>
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
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base">{t("name")}</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base">{t("price")} (RD$)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12"
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
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base">{t("stock")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 mt-6"
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