import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, ChevronLeft, Save, XCircle, Plus, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { insertRecurringOrderSchema } from '@shared/schema';

// Este es un schema extendido que usaremos para el formulario
const formSchema = z.object({
  customerId: z.number(),
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  dayOfWeek: z.number().nullable().optional(),
  dayOfMonth: z.number().nullable().optional(),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  paymentMethod: z.enum(['cash', 'credit', 'card']),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).default('active'),
  totalAmount: z.string(),
  items: z.array(
    z.object({
      id: z.number().optional(),
      productId: z.number(),
      quantity: z.number().min(1, { message: 'La cantidad debe ser al menos 1' }),
      price: z.string(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const RecurringOrderForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log("ID ACTUAL:", id, "Tipo:", typeof id);
  const isNew = id === 'new';
  console.log("Es nuevo pedido?", isNew);
  const orderId = isNew ? null : parseInt(id);

  // Consultar datos del pedido si estamos editando
  const { data: recurringOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['/api/recurring-orders', orderId],
    enabled: !!orderId && !isNew,
    retry: 1,
  });

  // Consultar datos de los items si estamos editando
  const { data: orderItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/recurring-orders', orderId, 'items'],
    enabled: !!orderId && !isNew,
    retry: 1,
  });

  // Consultar la lista de clientes
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
    retry: 1,
  });

  // Consultar la lista de productos
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
    retry: 1,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: 0,
      name: '',
      frequency: 'weekly',
      dayOfWeek: 1, // Lunes por defecto
      dayOfMonth: 1,
      startDate: new Date(),
      endDate: null,
      paymentMethod: 'cash',
      status: 'active',
      totalAmount: '0.00',
      items: [{ productId: 0, quantity: 1, price: '0.00' }],
    },
  });
  
  console.log("Form initialized with isNew:", isNew, "id:", id);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Efecto para cargar los datos del pedido en el formulario cuando se carga
  useEffect(() => {
    if (!isNew && recurringOrder && orderItems) {
      form.reset({
        ...recurringOrder,
        startDate: new Date(recurringOrder.startDate),
        endDate: recurringOrder.endDate ? new Date(recurringOrder.endDate) : null,
        items: orderItems.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    }
  }, [recurringOrder, orderItems, isNew, form]);

  // Función para calcular el total
  const calculateTotal = () => {
    const formValues = form.getValues();
    const total = formValues.items.reduce((sum, item) => {
      const price = parseFloat(item.price || '0');
      const quantity = item.quantity || 0;
      return sum + price * quantity;
    }, 0);
    form.setValue('totalAmount', total.toFixed(2));
  };

  // Actualizar el precio automáticamente cuando se selecciona un producto
  const handleProductChange = (index: number, productId: number) => {
    const selectedProduct = products?.find((p: any) => p.id === productId);
    if (selectedProduct) {
      const price = selectedProduct.price;
      form.setValue(`items.${index}.price`, price);
      calculateTotal();
    }
  };

  // Actualizar el total cuando cambia la cantidad
  const handleQuantityChange = () => {
    calculateTotal();
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Si el cliente o producto no está seleccionado, no continuar
      if (data.customerId === 0) {
        toast({
          title: "Error",
          description: "Por favor seleccione un cliente",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (data.items.some(item => item.productId === 0)) {
        toast({
          title: "Error",
          description: "Por favor seleccione productos para todos los ítems",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Verificar el nombre del pedido
      if (!data.name || data.name.trim() === '') {
        toast({
          title: "Error",
          description: "Por favor ingrese un nombre para el pedido recurrente",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Preparar los datos para enviar al servidor
      const submitData = {
        ...data,
        customerId: Number(data.customerId),
        dayOfWeek: data.dayOfWeek ? Number(data.dayOfWeek) : 1,
        dayOfMonth: data.dayOfMonth ? Number(data.dayOfMonth) : 1,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate ? data.endDate.toISOString() : null,
        totalAmount: parseFloat(data.totalAmount).toFixed(2),
      };

      let response;
      
      console.log("Guardando pedido recurrente:", { isNew, id, submitData });
      
      if (id === 'new') {
        // Crear nuevo pedido recurrente
        console.log("Creando nuevo pedido recurrente");
        response = await fetch('/api/recurring-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });

        console.log("Respuesta al crear:", response.status, response.statusText);

        if (response.status === 400) {
          const errorData = await response.json();
          console.error("Error de validación:", errorData);
          toast({
            title: "Error de validación",
            description: JSON.stringify(errorData),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Actualizar pedido recurrente existente
        console.log("Actualizando pedido recurrente existente:", id);
        const { items, ...orderData } = submitData; // No actualizamos items en la entidad principal
        
        // Asegurar que el id sea un número válido para la actualización
        const numericId = parseInt(id);
        if (isNaN(numericId) || numericId <= 0) {
          toast({
            title: "Error",
            description: "ID de pedido recurrente inválido",
            variant: "destructive",
          });
          console.error("Error de validación: ID de pedido recurrente inválido", { id, numericId });
          setIsSubmitting(false);
          return;
        }
        
        response = await fetch(`/api/recurring-orders/${numericId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });
      }

      if (!response.ok) {
        throw new Error('Error al guardar el pedido recurrente');
      }

      const savedOrder = await response.json();

      // Si es un nuevo pedido, necesitamos crear los items
      if (id === 'new') {
        // Verificar que el servidor haya devuelto un objeto con ID
        if (!savedOrder || !savedOrder.id) {
          console.error("Error: El servidor no devolvió un ID válido para el pedido recurrente:", savedOrder);
          toast({
            title: "Error al crear el pedido recurrente",
            description: "No se pudo obtener un ID válido del servidor",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Asegurar que savedOrder.id sea un número válido
        const safeOrderId = typeof savedOrder.id === 'string' ? parseInt(savedOrder.id, 10) : Number(savedOrder.id);
        
        if (isNaN(safeOrderId) || safeOrderId <= 0) {
          console.error(`Error: ID de pedido recurrente inválido al crear items: ${savedOrder.id}`);
          toast({
            title: "Error al crear los items",
            description: "El servidor devolvió un ID de pedido recurrente inválido",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        console.log("Creando items para el nuevo pedido:", safeOrderId);
        
        // Crear items para el nuevo pedido
        for (const item of data.items) {
          try {
            const response = await fetch(`/api/recurring-orders/${safeOrderId}/items`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recurringOrderId: safeOrderId, // Incluir explícitamente el ID
                productId: Number(item.productId),
                quantity: Number(item.quantity),
                price: typeof item.price === 'string' ? item.price : parseFloat(String(item.price)).toFixed(2),
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
              console.error(`Error al crear item para pedido ${safeOrderId}:`, errorData);
              toast({
                title: "Error al crear item",
                description: errorData.error || "No se pudo crear el item para el pedido recurrente",
                variant: "destructive",
              });
            }
          } catch (itemError) {
            console.error(`Error al procesar item para pedido ${safeOrderId}:`, itemError);
          }
        }
      } else {
        // Actualizar los items existentes y crear nuevos si es necesario
        for (const item of data.items) {
          if (item.id) {
            // Actualizar item existente
            await fetch(`/api/recurring-order-items/${item.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                productId: parseInt(String(item.productId)) || 0,
                quantity: parseInt(String(item.quantity)) || 1,
                price: typeof item.price === 'string' ? item.price : parseFloat(String(item.price)).toFixed(2),
              }),
            });
          } else {
            // Verificar que el servidor haya devuelto un objeto con ID
            if (!savedOrder || !savedOrder.id) {
              console.error("Error: El servidor no devolvió un ID válido para el pedido recurrente:", savedOrder);
              toast({
                title: "Error al actualizar el pedido recurrente",
                description: "No se pudo obtener un ID válido del servidor",
                variant: "destructive",
              });
              setIsSubmitting(false);
              return;
            }
            
            // Crear nuevo item - asegurar que el ID sea válido
            const safeOrderId = typeof savedOrder.id === 'string' ? parseInt(savedOrder.id, 10) : Number(savedOrder.id);
            
            if (isNaN(safeOrderId) || safeOrderId <= 0) {
              console.error(`Error: ID de pedido recurrente inválido al actualizar items: ${savedOrder.id}`);
              toast({
                title: "Error al crear los nuevos items",
                description: "El servidor devolvió un ID de pedido recurrente inválido",
                variant: "destructive",
              });
              setIsSubmitting(false);
              return;
            }
            
            try {
              const response = await fetch(`/api/recurring-orders/${safeOrderId}/items`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  recurringOrderId: safeOrderId, // Incluir explícitamente el ID
                  productId: parseInt(String(item.productId)) || 0,
                  quantity: parseInt(String(item.quantity)) || 1,
                  price: typeof item.price === 'string' ? item.price : parseFloat(String(item.price)).toFixed(2),
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                console.error(`Error al crear nuevo item para pedido existente ${safeOrderId}:`, errorData);
                toast({
                  title: "Error al crear nuevo item",
                  description: errorData.error || "No se pudo crear el nuevo item para el pedido recurrente",
                  variant: "destructive",
                });
              }
            } catch (itemError) {
              console.error(`Error al procesar nuevo item para pedido existente ${safeOrderId}:`, itemError);
            }
          }
        }

        // TODO: Manejar eliminación de items que ya no están en la lista
        // Por ahora no implementamos esta parte por simplicidad
      }

      // Actualizar la caché de react-query
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
      
      toast({
        title: isNew ? t('createSuccess') : t('updateSuccess'),
        description: isNew ? t('createSuccessDescription') : t('updateSuccessDescription'),
      });

      // Redirigir a la lista de pedidos recurrentes
      setLocation('/recurring-orders');
    } catch (error) {
      console.error('Error al guardar pedido recurrente:', error);
      toast({
        title: t('saveError'),
        description: t('saveErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar spinner mientras carga los datos
  if ((isLoadingOrder || isLoadingItems) && !isNew) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/recurring-orders')}
          className="mr-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('back')}
        </Button>
        <h1 className="text-2xl font-bold">
          Crear Pedido Recurrente
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('basicInfoTitle')}</CardTitle>
              <CardDescription>
                {t('basicInfoDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('customer')}</FormLabel>
                      <Select
                        disabled={isLoadingCustomers}
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectCustomer')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers && customers.map((customer: any) => (
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
                      <FormLabel>{t('orderName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('frequency')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectFrequency')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">{t('frequencyDaily')}</SelectItem>
                          <SelectItem value="weekly">{t('frequencyWeekly', { day: '' })}</SelectItem>
                          <SelectItem value="biweekly">{t('frequencyBiweekly', { day: '' })}</SelectItem>
                          <SelectItem value="monthly">{t('frequencyMonthly', { day: '' })}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch('frequency') === 'weekly' || form.watch('frequency') === 'biweekly') && (
                  <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dayOfWeek')}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString() || "1"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectDay')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">{t('sunday')}</SelectItem>
                            <SelectItem value="1">{t('monday')}</SelectItem>
                            <SelectItem value="2">{t('tuesday')}</SelectItem>
                            <SelectItem value="3">{t('wednesday')}</SelectItem>
                            <SelectItem value="4">{t('thursday')}</SelectItem>
                            <SelectItem value="5">{t('friday')}</SelectItem>
                            <SelectItem value="6">{t('saturday')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('frequency') === 'monthly' && (
                  <FormField
                    control={form.control}
                    name="dayOfMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('dayOfMonth')}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString() || "1"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectDayOfMonth')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}
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
                      <FormLabel>{t('startDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>{t('pickDate')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
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
                      <FormLabel>{t('endDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>{t('noEndDate')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-2">
                            <Button
                              variant="ghost"
                              onClick={() => field.onChange(null)}
                              className="w-full justify-start text-left font-normal"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {t('clearEndDate')}
                            </Button>
                          </div>
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={(date) => date < form.getValues('startDate')}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('paymentMethod')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-1 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="cash" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {t('cash')}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-1 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="credit" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {t('credit')}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-1 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="card" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {t('cardPayment')}
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('status')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectStatus')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t('statusActive')}</SelectItem>
                          <SelectItem value="paused">{t('statusPaused')}</SelectItem>
                          <SelectItem value="completed">{t('statusCompleted')}</SelectItem>
                          <SelectItem value="cancelled">{t('statusCancelled')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('itemsTitle')}</CardTitle>
              <CardDescription>{t('itemsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        {t('itemNumber', { number: index + 1 })}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          remove(index);
                          calculateTotal();
                        }}
                        disabled={fields.length === 1}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">{t('removeItem')}</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <Label htmlFor={`items.${index}.productId`}>
                          {t('product')}
                        </Label>
                        <Select
                          disabled={isLoadingProducts}
                          value={form.getValues(`items.${index}.productId`).toString() || '0'}
                          onValueChange={(value) => {
                            form.setValue(`items.${index}.productId`, Number(value));
                            handleProductChange(index, Number(value));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectProduct')} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingProducts ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Cargando productos...</span>
                              </div>
                            ) : !products || products.length === 0 ? (
                              <div className="p-2 text-center text-muted-foreground">
                                No hay productos disponibles
                              </div>
                            ) : (
                              products.map((product: any) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`items.${index}.quantity`}>
                          {t('quantity')}
                        </Label>
                        <Input
                          id={`items.${index}.quantity`}
                          type="number"
                          min="1"
                          {...form.register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                            onChange: handleQuantityChange,
                          })}
                        />
                      </div>
                      <div className="col-span-4">
                        <Label htmlFor={`items.${index}.price`}>
                          {t('price')}
                        </Label>
                        <Input
                          id={`items.${index}.price`}
                          type="text"
                          readOnly
                          {...form.register(`items.${index}.price`)}
                        />
                      </div>
                    </div>
                    <Separator className="my-2" />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    append({ productId: 0, quantity: 1, price: '0.00' });
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t('addItem')}
                </Button>

                <div className="mt-4 flex justify-end">
                  <div className="w-1/3">
                    <Label htmlFor="totalAmount">{t('total')}</Label>
                    <Input
                      id="totalAmount"
                      type="text"
                      readOnly
                      {...form.register('totalAmount')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creando..." : "Crear Pedido"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RecurringOrderForm;