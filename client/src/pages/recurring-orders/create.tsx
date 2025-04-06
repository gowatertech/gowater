import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Iconos
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Trash,
} from "lucide-react";

// Tipos para modelos
type Customer = {
  id: number;
  businessname: string;
  phone: string;
  email?: string;
  zoneid?: number;
};

type Product = {
  id: number;
  name: string;
  price: string;
  stock: number;
  icon: string;
  isReturnable: boolean;
};

type Zone = {
  id: number;
  name: string;
  color: string;
};

// Esquema de validación para el formulario
const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  customerId: z.string().min(1, "Debe seleccionar un cliente"),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "custom"]),
  frequencyDays: z.string().optional(),
  weekdays: z.array(z.string()).optional(),
  monthDays: z.array(z.string()).optional(),
  startDate: z.date({
    required_error: "La fecha de inicio es requerida",
  }),
  endDate: z.date().optional(),
  nextDeliveryDate: z.date({
    required_error: "La fecha de primera entrega es requerida",
  }),
  zoneId: z.string().optional(),
  notifyCustomer: z.boolean().default(false),
  notifyBefore: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Debe seleccionar un producto"),
      quantity: z.string().min(1, "La cantidad es requerida"),
      price: z.string().optional()
    })
  ).min(1, "Debe agregar al menos un producto"),
});

// Tipo para el formulario
type FormValues = z.infer<typeof formSchema>;

// Componente principal
export default function CreateRecurringOrderPage() {
  const [step, setStep] = useState(1);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consultas para cargar datos necesarios
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: zones = [], isLoading: isLoadingZones } = useQuery<Zone[]>({
    queryKey: ['/api/zones'],
  });

  // Configuración del formulario con valores por defecto
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      customerId: "",
      frequency: "weekly",
      frequencyDays: "",
      weekdays: ["1", "3", "5"], // Lunes, Miércoles, Viernes por defecto
      monthDays: ["1", "15"], // Días 1 y 15 por defecto
      startDate: new Date(),
      nextDeliveryDate: new Date(),
      notifyCustomer: false,
      notifyBefore: "1",
      items: [{ productId: "", quantity: "1", price: "" }],
    },
  });

  // Mutación para crear un pedido recurrente
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/recurring-orders", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear pedido recurrente");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pedido recurrente creado",
        description: "El pedido recurrente se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
      navigate("/recurring-orders");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  // Función para manejar el envío del formulario
  const onSubmit = (values: FormValues) => {
    // Preparar los datos para el API
    const formattedItems = values.items.map(item => ({
      productId: parseInt(item.productId),
      quantity: parseInt(item.quantity),
      price: item.price || getProductPrice(parseInt(item.productId)),
    }));

    // Formatear los días de la semana o del mes según la frecuencia
    let weekdaysString = null;
    let monthDaysString = null;
    
    if (values.frequency === "weekly" && values.weekdays && values.weekdays.length > 0) {
      weekdaysString = values.weekdays.join(',');
    }
    
    if (values.frequency === "monthly" && values.monthDays && values.monthDays.length > 0) {
      monthDaysString = values.monthDays.join(',');
    }

    // Preparar los datos para la API
    const recurringOrderData = {
      name: values.name,
      description: values.description,
      customerId: parseInt(values.customerId),
      frequency: values.frequency,
      frequencyDays: values.frequency === 'custom' ? parseInt(values.frequencyDays || "0") : undefined,
      weekdays: weekdaysString,
      monthDays: monthDaysString,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      nextDeliveryDate: format(values.nextDeliveryDate, "yyyy-MM-dd"),
      endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : undefined,
      zoneId: values.zoneId ? parseInt(values.zoneId) : undefined,
      notifyCustomer: values.notifyCustomer,
      notifyBefore: values.notifyBefore ? parseInt(values.notifyBefore) : undefined,
      items: formattedItems,
    };

    // Enviar a la API
    createOrderMutation.mutate(recurringOrderData);
  };

  // Función para obtener el precio de un producto por su ID
  const getProductPrice = (productId: number): string => {
    const product = products.find(p => p.id === productId);
    return product ? product.price : "0.00";
  };

  // Manejar añadir/eliminar productos
  const addItem = () => {
    const items = form.getValues("items");
    form.setValue("items", [...items, { productId: "", quantity: "1", price: "" }]);
  };

  const removeItem = (index: number) => {
    const items = form.getValues("items");
    if (items.length === 1) {
      return; // Mantener al menos un producto
    }
    form.setValue("items", items.filter((_, i) => i !== index));
  };

  // Navegación entre pasos
  const goToNextStep = () => {
    // Validar el paso actual antes de avanzar
    if (step === 1) {
      const currentValues = form.getValues();
      const isValid = 
        currentValues.name.length >= 3 && 
        currentValues.customerId !== "";
      
      if (!isValid) {
        // Activar validación para mostrar errores
        form.trigger(["name", "customerId"]);
        return;
      }
    } else if (step === 2) {
      // Validar fechas y configuración de frecuencia
      form.trigger(["startDate", "nextDeliveryDate", "frequency"]);
      if (form.formState.errors.startDate || form.formState.errors.nextDeliveryDate || form.formState.errors.frequency) {
        return;
      }
    }
    
    setStep(prev => prev + 1);
  };

  const goToPreviousStep = () => {
    setStep(prev => prev - 1);
  };

  // Componente para el selector de fecha
  const DatePicker = ({ value, onChange, label }: { value?: Date, onChange: (date: Date) => void, label: string }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange as any}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  };

  // Renderizado del paso 1: Información básica
  const renderStep1 = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Pedido Recurrente</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej. Entrega semanal Oficina Central" />
                </FormControl>
                <FormDescription>
                  Un nombre descriptivo que identifique este pedido recurrente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Información adicional sobre este pedido"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingCustomers ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay clientes disponibles
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.businessname}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona (Opcional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una zona" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin zona específica</SelectItem>
                    {isLoadingZones ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : zones.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay zonas disponibles
                      </div>
                    ) : (
                      zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id.toString()}>
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: zone.color }} 
                            />
                            {zone.name}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Asignar a una zona facilita la planificación de rutas.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    );
  };

  // Renderizado del paso 2: Programación
  const renderStep2 = () => {
    const watchFrequency = form.watch("frequency");
    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const monthDaysOptions = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

    return (
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // Resetear valores de días específicos al cambiar frecuencia
                  if (value !== "weekly") form.setValue("weekdays", []);
                  if (value !== "monthly") form.setValue("monthDays", []);
                  if (value !== "custom") form.setValue("frequencyDays", "");
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione la frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quincenal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchFrequency === "weekly" && (
          <FormField
            control={form.control}
            name="weekdays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días de la semana</FormLabel>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {daysOfWeek.map((day, index) => (
                    <div key={index} className="flex items-center">
                      <Checkbox
                        id={`weekday-${index}`}
                        checked={field.value?.includes(index.toString())}
                        onCheckedChange={(checked) => {
                          const currentValues = field.value || [];
                          if (checked) {
                            field.onChange([...currentValues, index.toString()]);
                          } else {
                            field.onChange(currentValues.filter(v => v !== index.toString()));
                          }
                        }}
                      />
                      <Label htmlFor={`weekday-${index}`} className="ml-2">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormDescription>
                  Seleccione los días de la semana para las entregas.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchFrequency === "monthly" && (
          <FormField
            control={form.control}
            name="monthDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días del mes</FormLabel>
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {monthDaysOptions.map((day) => (
                    <div key={day} className="flex items-center">
                      <Checkbox
                        id={`monthday-${day}`}
                        checked={field.value?.includes(day)}
                        onCheckedChange={(checked) => {
                          const currentValues = field.value || [];
                          if (checked) {
                            field.onChange([...currentValues, day]);
                          } else {
                            field.onChange(currentValues.filter(v => v !== day));
                          }
                        }}
                      />
                      <Label htmlFor={`monthday-${day}`} className="ml-1 text-sm">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
                <FormDescription>
                  Seleccione los días del mes para las entregas.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchFrequency === "custom" && (
          <FormField
            control={form.control}
            name="frequencyDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cada cuántos días</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  Especifique cada cuántos días se debe realizar la entrega.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio</FormLabel>
                <FormControl>
                  <DatePicker 
                    value={field.value} 
                    onChange={(date) => {
                      field.onChange(date);
                      // Actualizar también la fecha de primera entrega si no ha sido modificada manualmente
                      const currentNextDate = form.getValues("nextDeliveryDate");
                      const currentStartDate = form.getValues("startDate");
                      if (currentNextDate && currentNextDate.getTime() === currentStartDate.getTime()) {
                        form.setValue("nextDeliveryDate", date);
                      }
                    }} 
                    label="Fecha de inicio" 
                  />
                </FormControl>
                <FormDescription>
                  Fecha a partir de la cual comenzará el pedido recurrente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nextDeliveryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primera fecha de entrega</FormLabel>
                <FormControl>
                  <DatePicker 
                    value={field.value} 
                    onChange={field.onChange} 
                    label="Primera fecha de entrega" 
                  />
                </FormControl>
                <FormDescription>
                  Fecha para la primera entrega (por defecto igual a la fecha de inicio).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de finalización (Opcional)</FormLabel>
                <FormControl>
                  <DatePicker 
                    value={field.value} 
                    onChange={field.onChange} 
                    label="Fecha de finalización" 
                  />
                </FormControl>
                <FormDescription>
                  Fecha en la que terminará el pedido recurrente. Si no se especifica, continuará indefinidamente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="notifyCustomer"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Notificar al cliente</FormLabel>
                  <FormDescription>
                    Enviar notificaciones al cliente antes de cada entrega.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("notifyCustomer") && (
            <FormField
              control={form.control}
              name="notifyBefore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días de anticipación</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione los días" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 día antes</SelectItem>
                      <SelectItem value="2">2 días antes</SelectItem>
                      <SelectItem value="3">3 días antes</SelectItem>
                      <SelectItem value="5">5 días antes</SelectItem>
                      <SelectItem value="7">7 días antes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Con cuántos días de anticipación se notificará al cliente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </div>
    );
  };

  // Renderizado del paso 3: Productos
  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Productos a incluir</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Agregar Producto
          </Button>
        </div>

        <div className="space-y-4">
          {form.watch("items").map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Producto</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Autocompletar el precio si está disponible
                            const product = products.find(p => p.id === parseInt(value));
                            if (product) {
                              form.setValue(`items.${index}.price`, product.price);
                            }
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione producto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingProducts ? (
                              <div className="flex justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            ) : products.length === 0 ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                No hay productos disponibles
                              </div>
                            ) : (
                              products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name} - ${product.price}
                                </SelectItem>
                              ))
                            )}
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
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Unitario</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="Precio del producto"
                          />
                        </FormControl>
                        <FormDescription>
                          Dejar vacío para usar el precio por defecto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="flex items-center gap-1 text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Renderizado del paso 4: Confirmación
  const renderStep4 = () => {
    const values = form.getValues();
    let frequencyText = "";
    
    switch (values.frequency) {
      case "daily":
        frequencyText = "Diario";
        break;
      case "weekly":
        frequencyText = "Semanal";
        break;
      case "biweekly":
        frequencyText = "Quincenal";
        break;
      case "monthly":
        frequencyText = "Mensual";
        break;
      case "custom":
        frequencyText = `Cada ${values.frequencyDays} días`;
        break;
    }

    // Calcular el total aproximado
    let totalAmount = 0;
    values.items.forEach(item => {
      const product = products.find(p => p.id === parseInt(item.productId));
      const price = item.price ? parseFloat(item.price) : (product ? parseFloat(product.price) : 0);
      const quantity = parseInt(item.quantity) || 0;
      totalAmount += price * quantity;
    });

    const getCustomerName = (id: string) => {
      const customer = customers.find(c => c.id === parseInt(id));
      return customer ? customer.businessname : "Cliente no encontrado";
    };

    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-medium">Nombre</Label>
                <p>{values.name}</p>
              </div>
              <div>
                <Label className="font-medium">Cliente</Label>
                <p>{getCustomerName(values.customerId)}</p>
              </div>
              <div>
                <Label className="font-medium">Frecuencia</Label>
                <p>{frequencyText}</p>
              </div>
              <div>
                <Label className="font-medium">Inicio</Label>
                <p>{format(values.startDate, "PPP", { locale: es })}</p>
              </div>
              <div>
                <Label className="font-medium">Primera entrega</Label>
                <p>{format(values.nextDeliveryDate, "PPP", { locale: es })}</p>
              </div>
              {values.endDate && (
                <div>
                  <Label className="font-medium">Finalización</Label>
                  <p>{format(values.endDate, "PPP", { locale: es })}</p>
                </div>
              )}
              <div>
                <Label className="font-medium">Notificaciones</Label>
                <p>
                  {values.notifyCustomer
                    ? `Notificar al cliente ${values.notifyBefore} días antes`
                    : "Sin notificaciones"}
                </p>
              </div>
            </div>

            <div>
              <Label className="font-medium">Descripción</Label>
              <p className="text-sm text-muted-foreground">{values.description || "No se proporcionó descripción"}</p>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3">Productos</h4>
              <div className="space-y-2">
                {values.items.map((item, index) => {
                  const product = products.find(p => p.id === parseInt(item.productId));
                  const productName = product ? product.name : "Producto no encontrado";
                  const price = item.price ? parseFloat(item.price) : (product ? parseFloat(product.price) : 0);
                  const quantity = parseInt(item.quantity) || 0;
                  
                  return (
                    <div key={index} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{productName}</span>
                        <Badge variant="outline">{quantity} unidad{quantity !== 1 ? 'es' : ''}</Badge>
                      </div>
                      <div className="text-right">
                        <div>${price.toFixed(2)} x {quantity}</div>
                        <div className="font-medium">${(price * quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-2 border-t">
                <span className="font-medium">Total aproximado por entrega</span>
                <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar el contenido según el paso actual
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  // Renderizar botones de navegación
  const renderNavigation = () => {
    return (
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={goToPreviousStep}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
        ) : (
          <Link href="/recurring-orders">
            <Button type="button" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </Link>
        )}

        {step < 4 ? (
          <Button type="button" onClick={goToNextStep}>
            Siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="submit"
            disabled={createOrderMutation.isPending}
            className="flex items-center"
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Crear Pedido Recurrente
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  // Renderizar indicador de pasos
  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center space-x-2 mb-8">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div
            key={stepNumber}
            className={`w-2 h-2 rounded-full ${
              stepNumber === step ? "bg-primary" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  // Renderizar el título del paso actual
  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Información Básica";
      case 2:
        return "Programación";
      case 3:
        return "Productos";
      case 4:
        return "Confirmación";
      default:
        return "";
    }
  };

  return (
    <div className="container py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Link href="/recurring-orders">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <CardTitle>Crear Pedido Recurrente</CardTitle>
              <CardDescription>Configura un nuevo pedido con entregas programadas</CardDescription>
            </div>
          </div>
          {renderStepIndicator()}
          <h3 className="text-lg font-medium text-center">{getStepTitle()}</h3>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {renderStepContent()}
              {renderNavigation()}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}