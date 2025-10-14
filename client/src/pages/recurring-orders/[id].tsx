import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Calendar, Save, ArrowLeft, Trash2, Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Define el esquema de validación para el formulario
const formSchema = z.object({
  customerId: z.number({
    required_error: "El cliente es requerido",
  }),
  name: z.string().min(1, "El nombre es requerido"),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"], {
    required_error: "La frecuencia es requerida",
  }),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().optional(),
  totalAmount: z.string().regex(/^\d+\.\d{2}$/, "El total debe tener 2 decimales").optional(),
  paymentMethod: z.enum(["cash", "credit", "card"], {
    required_error: "El método de pago es requerido",
  }),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number({
        required_error: "El producto es requerido",
      }),
      quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
      price: z.string().regex(/^\d+\.\d{2}$/, "El precio debe tener 2 decimales"),
    })
  ),
});

// Define el tipo del formulario
type FormValues = z.infer<typeof formSchema>;

// Tipos para productos, clientes y pedidos recurrentes
interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  isReturnable: boolean;
  depositAmount: string;
}

interface Customer {
  id: number;
  businessname: string;
  phone?: string;
  street?: string;
  coordinates?: string;
}

interface RecurringOrderItem {
  id: number;
  recurringOrderId: number;
  productId: number;
  quantity: number;
  price: string;
  product?: {
    name: string;
  };
}

interface RecurringOrder {
  id: number;
  customerId: number;
  name: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  lastGeneratedDate?: string;
  nextGenerationDate?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  totalAmount: string;
  paymentMethod: "cash" | "credit" | "card";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function RecurringOrderForm() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/recurring-orders/:id");
  const isNew = params?.id === "new";
  const id = isNew ? null : parseInt(params?.id || "0");
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [calculatedTotal, setCalculatedTotal] = useState<string>("0.00");
  
  // Consulta de clientes
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
    refetchOnWindowFocus: false,
  });
  
  // Consulta de productos
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
    refetchOnWindowFocus: false,
  });
  
  // Consulta del pedido recurrente (si no es nuevo)
  const { data: recurringOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['/api/recurring-orders', id],
    enabled: !!id && !isNew,
    refetchOnWindowFocus: false,
  });
  
  // Consulta de los items del pedido recurrente (si no es nuevo)
  const { data: orderItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/recurring-orders', id, 'items'],
    enabled: !!id && !isNew,
    refetchOnWindowFocus: false,
  });
  
  // Inicialización del formulario
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: 0,
      name: "",
      frequency: "monthly",
      startDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "cash",
      status: "active",
      notes: "",
      items: [],
    },
  });
  
  // Configuración del array de items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // Valores del formulario
  const watchedItems = form.watch("items");
  const watchedFrequency = form.watch("frequency");
  
  // Mutación para crear/actualizar pedido recurrente
  const saveMutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (isNew) {
        return apiRequest('/api/recurring-orders', {
          method: 'POST',
          data,
        });
      } else {
        return apiRequest(`/api/recurring-orders/${id}`, {
          method: 'PUT',
          data,
        });
      }
    },
    onSuccess: async (data) => {
      toast({
        title: isNew ? t("Pedido recurrente creado") : t("Pedido recurrente actualizado"),
        description: isNew 
          ? t("El pedido recurrente ha sido creado correctamente.")
          : t("El pedido recurrente ha sido actualizado correctamente."),
      });
      
      if (isNew && data?.id) {
        // Si es un nuevo pedido, guardamos ahora los items
        await saveItems(data.id);
        queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
        setTimeout(() => {
          setLocation("/recurring-orders");
        }, 500);
      } else {
        // Si es actualización, también guardamos los items
        if (id) {
          await saveItems(id);
        }
        queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders', id] });
        queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders', id, 'items'] });
      }
    },
    onError: (error) => {
      console.error("Error al guardar:", error);
      toast({
        title: t("Error"),
        description: t("No se pudo guardar el pedido recurrente. Inténtalo de nuevo."),
        variant: "destructive",
      });
    },
  });
  
  // Función para guardar los items
  const saveItems = async (orderId: number) => {
    // Primero eliminamos los items existentes si es una actualización
    if (!isNew) {
      try {
        // Esto es solo para asegurarnos de que eliminaremos correctamente
        // los items antiguos y agregaremos los nuevos
        await apiRequest(`/api/recurring-orders/${orderId}/items`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error("Error al eliminar items antiguos:", error);
      }
    }
    
    // Ahora guardamos los nuevos items
    try {
      for (const item of watchedItems) {
        await apiRequest('/api/recurring-orders/items', {
          method: 'POST',
          data: {
            ...item,
            recurringOrderId: orderId,
          },
        });
      }
      return true;
    } catch (error) {
      console.error("Error al guardar items:", error);
      toast({
        title: t("Error en items"),
        description: t("Se guardó el pedido pero hubo problemas con algunos productos."),
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Efecto para cargar datos del pedido si no es nuevo
  useEffect(() => {
    if (!isNew && recurringOrder && orderItems) {
      const startDate = recurringOrder.startDate 
        ? format(new Date(recurringOrder.startDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");
        
      const endDate = recurringOrder.endDate
        ? format(new Date(recurringOrder.endDate), "yyyy-MM-dd")
        : undefined;
      
      form.reset({
        customerId: recurringOrder.customerId,
        name: recurringOrder.name,
        frequency: recurringOrder.frequency,
        dayOfWeek: recurringOrder.dayOfWeek,
        dayOfMonth: recurringOrder.dayOfMonth,
        startDate,
        endDate,
        totalAmount: recurringOrder.totalAmount,
        paymentMethod: recurringOrder.paymentMethod,
        status: recurringOrder.status,
        notes: recurringOrder.notes || "",
        items: orderItems.map((item: RecurringOrderItem) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      
      setCalculatedTotal(recurringOrder.totalAmount);
      
      // Buscar el cliente seleccionado
      if (customers) {
        const customer = customers.find((c: Customer) => c.id === recurringOrder.customerId);
        if (customer) {
          setSelectedCustomer(customer);
        }
      }
    }
  }, [isNew, recurringOrder, orderItems, customers, form]);
  
  // Efecto para calcular el total
  useEffect(() => {
    if (watchedItems && watchedItems.length > 0) {
      const total = watchedItems.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = item.quantity || 0;
        return sum + (price * quantity);
      }, 0);
      
      setCalculatedTotal(total.toFixed(2));
      form.setValue("totalAmount", total.toFixed(2));
    } else {
      setCalculatedTotal("0.00");
      form.setValue("totalAmount", "0.00");
    }
  }, [watchedItems, form]);
  
  // Manejador para agregar un producto
  const handleAddProduct = () => {
    if (products && products.length > 0) {
      const firstProduct = products[0];
      append({
        productId: firstProduct.id,
        quantity: 1,
        price: firstProduct.price,
      });
    }
  };
  
  // Manejador para seleccionar un producto
  const handleProductSelect = (index: number, productId: number) => {
    if (products) {
      const product = products.find((p: Product) => p.id === productId);
      if (product) {
        form.setValue(`items.${index}.price`, product.price);
      }
    }
  };
  
  // Manejador para enviar el formulario
  const onSubmit = (data: FormValues) => {
    saveMutation.mutate(data);
  };
  
  // Verificar si hay carga en curso
  const isLoading = isLoadingCustomers || isLoadingProducts || 
                    (!isNew && (isLoadingOrder || isLoadingItems));
  
  // Traducción de los días de la semana
  const weekdays = [
    { value: 0, label: t("Domingo") },
    { value: 1, label: t("Lunes") },
    { value: 2, label: t("Martes") },
    { value: 3, label: t("Miércoles") },
    { value: 4, label: t("Jueves") },
    { value: 5, label: t("Viernes") },
    { value: 6, label: t("Sábado") },
  ];
  
  // Generar opciones para los días del mes (1-31)
  const daysOfMonth = Array.from({ length: 31 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`,
  }));
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" onClick={() => setLocation("/recurring-orders")} className="mr-4">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? t("Nuevo Pedido Recurrente") : t("Editar Pedido Recurrente")}
          </h1>
          <p className="text-muted-foreground">
            {isNew 
              ? t("Crea un nuevo pedido que se generará automáticamente según la frecuencia seleccionada.")
              : t("Modifica los detalles del pedido recurrente.")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("Información Principal")}</CardTitle>
                    <CardDescription>
                      {t("Configura los detalles básicos del pedido recurrente.")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Cliente")}</FormLabel>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              const customer = customers?.find((c: Customer) => c.id === parseInt(value));
                              setSelectedCustomer(customer || null);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("Selecciona un cliente")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers?.map((customer: Customer) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.businessname}
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
                          <FormLabel>{t("Nombre del pedido")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("Ej: Entrega semanal cliente ABC")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Frecuencia")}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("Selecciona frecuencia")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">{t("Diario")}</SelectItem>
                                <SelectItem value="weekly">{t("Semanal")}</SelectItem>
                                <SelectItem value="biweekly">{t("Quincenal")}</SelectItem>
                                <SelectItem value="monthly">{t("Mensual")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Campo condicional para día de la semana */}
                      {(watchedFrequency === "weekly" || watchedFrequency === "biweekly") && (
                        <FormField
                          control={form.control}
                          name="dayOfWeek"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Día de la semana")}</FormLabel>
                              <Select
                                value={field.value?.toString() || ""}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("Selecciona día")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {weekdays.map((day) => (
                                    <SelectItem key={day.value} value={day.value.toString()}>
                                      {day.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Campo condicional para día del mes */}
                      {watchedFrequency === "monthly" && (
                        <FormField
                          control={form.control}
                          name="dayOfMonth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Día del mes")}</FormLabel>
                              <Select
                                value={field.value?.toString() || ""}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("Selecciona día")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {daysOfMonth.map((day) => (
                                    <SelectItem key={day.value} value={day.value.toString()}>
                                      {day.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>{t("Fecha de inicio")}</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP", { locale: es })
                                    ) : (
                                      <span>{t("Selecciona una fecha")}</span>
                                    )}
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>{t("Fecha de fin (opcional)")}</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP", { locale: es })
                                    ) : (
                                      <span>{t("Sin fecha de fin")}</span>
                                    )}
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                  initialFocus
                                  fromDate={new Date(form.getValues("startDate"))}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Método de pago")}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("Selecciona método de pago")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">{t("Efectivo")}</SelectItem>
                              <SelectItem value="credit">{t("Crédito")}</SelectItem>
                              <SelectItem value="card">{t("Tarjeta")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Estado")}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("Selecciona estado")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">{t("Activo")}</SelectItem>
                              <SelectItem value="paused">{t("Pausado")}</SelectItem>
                              <SelectItem value="completed">{t("Completado")}</SelectItem>
                              <SelectItem value="cancelled">{t("Cancelado")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Notas (opcional)")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("Añade notas o instrucciones especiales")}
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{t("Productos")}</CardTitle>
                      <CardDescription>
                        {t("Añade los productos que formarán parte del pedido recurrente.")}
                      </CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddProduct}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("Añadir Producto")}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {fields.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        {t("No hay productos añadidos al pedido.")}
                        <div className="mt-2">
                          <Button type="button" variant="outline" size="sm" onClick={handleAddProduct}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Añadir Producto")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("Producto")}</TableHead>
                              <TableHead>{t("Cantidad")}</TableHead>
                              <TableHead>{t("Precio")}</TableHead>
                              <TableHead>{t("Subtotal")}</TableHead>
                              <TableHead>{t("Acciones")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fields.map((field, index) => {
                              const productPrice = parseFloat(form.watch(`items.${index}.price`) || "0");
                              const quantity = form.watch(`items.${index}.quantity`) || 0;
                              const subtotal = productPrice * quantity;
                              
                              return (
                                <TableRow key={field.id}>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.productId`}
                                      render={({ field: productField }) => (
                                        <FormItem>
                                          <Select
                                            value={productField.value.toString()}
                                            onValueChange={(value) => {
                                              productField.onChange(parseInt(value));
                                              handleProductSelect(index, parseInt(value));
                                            }}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder={t("Selecciona un producto")} />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {products?.map((product: Product) => (
                                                <SelectItem key={product.id} value={product.id.toString()}>
                                                  {product.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field: quantityField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min="1"
                                              className="w-20"
                                              {...quantityField}
                                              onChange={(e) => {
                                                const value = parseInt(e.target.value);
                                                quantityField.onChange(value < 1 ? 1 : value);
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.price`}
                                      render={({ field: priceField }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              className="w-28"
                                              {...priceField}
                                              onChange={(e) => {
                                                // Asegurar formato de dos decimales
                                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                                const parts = value.split('.');
                                                if (parts.length > 1) {
                                                  parts[1] = parts[1].slice(0, 2);
                                                  parts[1] = parts[1].padEnd(2, '0');
                                                }
                                                const formatted = parts.join('.');
                                                priceField.onChange(formatted);
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {new Intl.NumberFormat('es', {
                                      style: 'currency',
                                      currency: 'DOP'
                                    }).format(subtotal)}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => remove(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Panel lateral */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("Resumen")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCustomer && (
                      <div>
                        <h3 className="font-medium mb-2">{t("Cliente Seleccionado")}</h3>
                        <div className="bg-muted p-3 rounded-md">
                          <div className="font-semibold">{selectedCustomer.businessname}</div>
                          {selectedCustomer.phone && (
                            <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                          )}
                          {selectedCustomer.street && (
                            <div className="text-sm text-muted-foreground">{selectedCustomer.street}</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-medium mb-2">{t("Total del Pedido")}</h3>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('es', {
                          style: 'currency',
                          currency: 'DOP'
                        }).format(parseFloat(calculatedTotal))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-2">{t("Configuración de Repetición")}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("Frecuencia")}:</span>
                          <span className="font-medium">
                            {watchedFrequency === "daily" && t("Diario")}
                            {watchedFrequency === "weekly" && t("Semanal")}
                            {watchedFrequency === "biweekly" && t("Quincenal")}
                            {watchedFrequency === "monthly" && t("Mensual")}
                          </span>
                        </div>
                        
                        {watchedFrequency === "weekly" || watchedFrequency === "biweekly" ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("Día")}:</span>
                            <span className="font-medium">
                              {form.watch("dayOfWeek") !== undefined 
                                ? weekdays.find(d => d.value === form.watch("dayOfWeek"))?.label 
                                : t("No seleccionado")}
                            </span>
                          </div>
                        ) : watchedFrequency === "monthly" ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("Día del mes")}:</span>
                            <span className="font-medium">
                              {form.watch("dayOfMonth") !== undefined 
                                ? form.watch("dayOfMonth")
                                : t("No seleccionado")}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {isNew ? t("Crear Pedido Recurrente") : t("Guardar Cambios")}
                    </Button>
                  </CardFooter>
                </Card>

                {!isNew && (
                  <Card className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900">
                    <CardHeader>
                      <CardTitle className="text-red-600 dark:text-red-400">{t("Zona de Peligro")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">
                        {t("Esta acción eliminará permanentemente este pedido recurrente y no podrá recuperarse.")}
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          // Esta acción la manejaremos desde el componente principal
                          setLocation("/recurring-orders");
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("Eliminar Pedido Recurrente")}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}