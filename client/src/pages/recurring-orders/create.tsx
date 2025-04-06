import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addMonths, addYears, isBefore, isValid } from "date-fns";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Iconos
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Info,
  Loader2,
  Plus,
  Repeat,
  Trash,
  X,
} from "lucide-react";

// Tipos
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
  description?: string;
  price: string;
  type: string;
  category: string;
  utype: string;
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
  zoneId: z.string().optional(),
  notifyCustomer: z.boolean().default(false),
  notifyBefore: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Debe seleccionar un producto"),
      quantity: z.string().min(1, "La cantidad es requerida")
    })
  ).min(1, "Debe agregar al menos un producto"),
});

// Esquema personalizado para control de errores en el frontend
type FormValues = z.infer<typeof formSchema>;

// Componente principal
export default function CreateRecurringOrderPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Configuración del formulario con React Hook Form
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
      notifyCustomer: false,
      notifyBefore: "1",
      items: [{ productId: "", quantity: "1" }],
    },
  });

  // Mutación para crear un pedido recurrente
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSubmitting(true);
      const response = await apiRequest("POST", "/api/recurring-orders", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear pedido recurrente");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pedido recurrente creado",
        description: "El pedido recurrente se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
      setIsSubmitting(false);
      window.location.href = "/recurring-orders";
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setIsSubmitting(false);
    }
  });

  // Función para manejar el envío del formulario
  const onSubmit = (values: FormValues) => {
    // Preparar los datos para el API
    const formattedItems = values.items.map(item => ({
      productId: parseInt(item.productId),
      quantity: parseInt(item.quantity),
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
      endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : undefined,
      zoneId: values.zoneId ? parseInt(values.zoneId) : undefined,
      notifyCustomer: values.notifyCustomer,
      notifyBefore: values.notifyBefore ? parseInt(values.notifyBefore) : undefined,
      items: formattedItems,
    };

    // Enviar a la API
    createOrderMutation.mutate(recurringOrderData);
  };

  // Manejar añadir/eliminar productos
  const addItem = () => {
    const items = form.getValues("items");
    form.setValue("items", [...items, { productId: "", quantity: "1" }]);
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
    }
    
    setStep(step + 1);
  };

  const goToPreviousStep = () => {
    setStep(step - 1);
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
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.value?.includes(index.toString())}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...(field.value || []), index.toString()]);
                          } else {
                            field.onChange(
                              field.value?.filter((value) => value !== index.toString())
                            );
                          }
                        }}
                        id={`day-${index}`}
                      />
                      <label
                        htmlFor={`day-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {day}
                      </label>
                    </div>
                  ))}
                </div>
                <FormDescription>
                  Seleccione los días de la semana en los que se realizará la entrega.
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
                <div className="grid grid-cols-8 gap-2">
                  {monthDaysOptions.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.value?.includes(day)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...(field.value || []), day]);
                          } else {
                            field.onChange(
                              field.value?.filter((value) => value !== day)
                            );
                          }
                        }}
                        id={`month-day-${day}`}
                      />
                      <label
                        htmlFor={`month-day-${day}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {day}
                      </label>
                    </div>
                  ))}
                </div>
                <FormDescription>
                  Seleccione los días del mes en los que se realizará la entrega.
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
                    max="90" 
                    {...field} 
                    placeholder="Ej. 10" 
                  />
                </FormControl>
                <FormDescription>
                  Especifique cada cuántos días se repetirá este pedido.
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
                    onChange={field.onChange} 
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
                  Fecha hasta la cual estará activo el pedido recurrente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notifyCustomer"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Notificar al cliente</FormLabel>
                <FormDescription>
                  Enviar una notificación al cliente antes de cada entrega.
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
                      <SelectValue placeholder="Seleccione los días de anticipación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 día antes</SelectItem>
                    <SelectItem value="2">2 días antes</SelectItem>
                    <SelectItem value="3">3 días antes</SelectItem>
                    <SelectItem value="5">5 días antes</SelectItem>
                    <SelectItem value="7">1 semana antes</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Cuántos días antes de la entrega se notificará al cliente.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    );
  };

  // Renderizado del paso 3: Productos
  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Productos</h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar Producto
            </Button>
          </div>

          <div className="space-y-4">
            {form.watch("items").map((_, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end border p-3 rounded-md">
                <div className="md:col-span-5">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Producto</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un producto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingProducts ? (
                              <div className="flex justify-center p-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            ) : products.length === 0 ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                No hay productos disponibles
                              </div>
                            ) : (
                              products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  <div className="flex flex-col">
                                    <span>{product.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ${product.price} - {product.category}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-2">
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
                </div>

                <div className="flex justify-end md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={form.watch("items").length <= 1}
                  >
                    <Trash className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            {form.formState.errors.items && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.items.message}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Renderizado del paso de revisión
  const renderReviewStep = () => {
    const values = form.getValues();
    const selectedCustomer = customers.find(c => c.id.toString() === values.customerId);
    const selectedZone = zones.find(z => z.id.toString() === values.zoneId);
    const selectedItems = values.items.map(item => {
      const product = products.find(p => p.id.toString() === item.productId);
      return {
        ...item,
        productName: product?.name || "Producto desconocido",
        price: product?.price || "0",
      };
    });

    // Formatear detalles de frecuencia
    let frequencyDetails = "";
    switch (values.frequency) {
      case "daily":
        frequencyDetails = "Todos los días";
        break;
      case "weekly":
        if (values.weekdays && values.weekdays.length > 0) {
          const days = values.weekdays.map(day => ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][parseInt(day)]);
          frequencyDetails = `Semanal (${days.join(", ")})`;
        } else {
          frequencyDetails = "Semanal";
        }
        break;
      case "biweekly":
        frequencyDetails = "Cada dos semanas";
        break;
      case "monthly":
        if (values.monthDays && values.monthDays.length > 0) {
          const days = values.monthDays.map(day => `día ${day}`);
          frequencyDetails = `Mensual (${days.join(", ")})`;
        } else {
          frequencyDetails = "Mensual";
        }
        break;
      case "custom":
        frequencyDetails = `Cada ${values.frequencyDays} días`;
        break;
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="font-medium">Nombre</Label>
                <p>{values.name}</p>
              </div>
              <div>
                <Label className="font-medium">Cliente</Label>
                <p>{selectedCustomer?.businessname || "Cliente no encontrado"}</p>
              </div>
              {values.description && (
                <div>
                  <Label className="font-medium">Descripción</Label>
                  <p>{values.description}</p>
                </div>
              )}
              {selectedZone && (
                <div className="flex items-center">
                  <Label className="font-medium mr-2">Zona</Label>
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-1"
                      style={{ backgroundColor: selectedZone.color }}
                    />
                    <span>{selectedZone.name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Programación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="font-medium">Frecuencia</Label>
                <p>{frequencyDetails}</p>
              </div>
              <div>
                <Label className="font-medium">Inicio</Label>
                <p>{format(values.startDate, "PPP", { locale: es })}</p>
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
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left font-medium py-2">Producto</th>
                    <th className="text-center font-medium py-2">Cantidad</th>
                    <th className="text-right font-medium py-2">Precio</th>
                    <th className="text-right font-medium py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, index) => {
                    const subtotal = parseFloat(item.price) * parseInt(item.quantity);
                    return (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.productName}</td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">${item.price}</td>
                        <td className="text-right py-2">${subtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right font-medium py-2">Total:</td>
                    <td className="text-right font-medium py-2">
                      ${selectedItems.reduce((total, item) => {
                        return total + parseFloat(item.price) * parseInt(item.quantity);
                      }, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizado principal
  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-2" 
            onClick={() => { window.location.href = "/recurring-orders" }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Crear Pedido Recurrente</h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Barra de progreso */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col sm:flex-row w-full">
              {[
                "Información",
                "Programación",
                "Productos",
                "Revisar"
              ].map((label, index) => (
                <div 
                  key={index} 
                  className="flex items-center"
                  style={{ width: `${100 / 4}%` }}
                >
                  <div 
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      step > index + 1 
                        ? "bg-primary text-primary-foreground" 
                        : step === index + 1 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > index + 1 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div 
                    className={`h-1 ${
                      index < 3 ? "block" : "hidden"
                    } ${
                      step > index + 1 ? "bg-primary" : "bg-muted"
                    } flex-1 mx-2`}
                  />
                  <span className="text-sm hidden sm:block">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {step === 1 && "Información Básica"}
                    {step === 2 && "Programación"}
                    {step === 3 && "Selección de Productos"}
                    {step === 4 && "Revisar y Confirmar"}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && "Complete la información general del pedido recurrente."}
                    {step === 2 && "Configure la frecuencia y programación del pedido."}
                    {step === 3 && "Seleccione los productos que se incluirán en cada entrega."}
                    {step === 4 && "Revise toda la información antes de crear el pedido recurrente."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {step === 1 && renderStep1()}
                  {step === 2 && renderStep2()}
                  {step === 3 && renderStep3()}
                  {step === 4 && renderReviewStep()}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={step === 1}
                  >
                    Anterior
                  </Button>
                  <div>
                    {step < 4 ? (
                      <Button
                        type="button"
                        onClick={goToNextStep}
                      >
                        Siguiente
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          "Crear Pedido Recurrente"
                        )}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}