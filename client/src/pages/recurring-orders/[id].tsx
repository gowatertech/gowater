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
  paymentMethod: z.enum(['cash', 'credit', 'transfer']),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
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

  const isNew = id === 'new';
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
      // Preparar los datos para enviar al servidor
      const submitData = {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate ? data.endDate.toISOString() : null,
      };

      let response;
      
      if (isNew) {
        // Crear nuevo pedido recurrente
        response = await fetch('/api/recurring-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
      } else {
        // Actualizar pedido recurrente existente
        const { items, ...orderData } = submitData; // No actualizamos items en la entidad principal
        
        response = await fetch(`/api/recurring-orders/${id}`, {
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
      if (isNew) {
        // Crear items para el nuevo pedido
        for (const item of data.items) {
          await fetch(`/api/recurring-orders/${savedOrder.id}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            }),
          });
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
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              }),
            });
          } else {
            // Crear nuevo item
            await fetch(`/api/recurring-orders/${id}/items`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              }),
            });
          }
        }

        // TODO: Manejar eliminación de items que ya no están en la lista
        // Por ahora no implementamos esta parte por simplicidad
      }

      // Actualizar la caché de react-query
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
      
      toast({
        title: isNew ? t('recurringOrders.createSuccess') : t('recurringOrders.updateSuccess'),
        description: isNew ? t('recurringOrders.createSuccessDescription') : t('recurringOrders.updateSuccessDescription'),
      });

      // Redirigir a la lista de pedidos recurrentes
      setLocation('/recurring-orders');
    } catch (error) {
      console.error('Error al guardar pedido recurrente:', error);
      toast({
        title: t('recurringOrders.saveError'),
        description: t('recurringOrders.saveErrorDescription'),
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
          {t('common.back')}
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? t('createTitle') : t('editTitle')}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('recurringBasicInfo')}</CardTitle>
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
                      <FormLabel>{t('recurringOrders.customer')}</FormLabel>
                      <Select
                        disabled={isLoadingCustomers}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('recurringOrders.selectCustomer')} />
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
                      <FormLabel>{t('recurringOrders.orderName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('recurringOrders.namePlaceholder')} {...field} />
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
                      <FormLabel>{t('recurringOrders.frequency')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('recurringOrders.selectFrequency')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">{t('recurringOrders.frequencyDaily')}</SelectItem>
                          <SelectItem value="weekly">{t('recurringOrders.frequencyWeekly', { day: '' })}</SelectItem>
                          <SelectItem value="biweekly">{t('recurringOrders.frequencyBiweekly', { day: '' })}</SelectItem>
                          <SelectItem value="monthly">{t('recurringOrders.frequencyMonthly', { day: '' })}</SelectItem>
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
                        <FormLabel>{t('recurringOrders.dayOfWeek')}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || "1"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('recurringOrders.selectDay')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">{t('days.sunday')}</SelectItem>
                            <SelectItem value="1">{t('days.monday')}</SelectItem>
                            <SelectItem value="2">{t('days.tuesday')}</SelectItem>
                            <SelectItem value="3">{t('days.wednesday')}</SelectItem>
                            <SelectItem value="4">{t('days.thursday')}</SelectItem>
                            <SelectItem value="5">{t('days.friday')}</SelectItem>
                            <SelectItem value="6">{t('days.saturday')}</SelectItem>
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
                        <FormLabel>{t('recurringOrders.dayOfMonth')}</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || "1"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('recurringOrders.selectDayOfMonth')} />
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
                      <FormLabel>{t('recurringOrders.startDate')}</FormLabel>
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
                                <span>{t('common.pickDate')}</span>
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
                      <FormLabel>{t('recurringOrders.endDate')}</FormLabel>
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
                                <span>{t('recurringOrders.noEndDate')}</span>
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
                              {t('recurringOrders.clearEndDate')}
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
                      <FormLabel>{t('recurringOrders.paymentMethod')}</FormLabel>
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
                              {t('paymentMethods.cash')}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-1 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="credit" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {t('paymentMethods.credit')}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-1 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="transfer" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {t('paymentMethods.transfer')}
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
                      <FormLabel>{t('recurringOrders.status')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('recurringOrders.selectStatus')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t('recurringOrders.statusActive')}</SelectItem>
                          <SelectItem value="paused">{t('recurringOrders.statusPaused')}</SelectItem>
                          <SelectItem value="completed">{t('recurringOrders.statusCompleted')}</SelectItem>
                          <SelectItem value="cancelled">{t('recurringOrders.statusCancelled')}</SelectItem>
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
              <CardTitle>{t('recurringOrders.productsTitle')}</CardTitle>
              <CardDescription>
                {t('recurringOrders.productsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{index === 0 ? t('recurringOrders.orderProduct') : <span className="sr-only">{t('recurringOrders.orderProduct')}</span>}</FormLabel>
                            <Select
                              disabled={isLoadingProducts}
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                                handleProductChange(index, parseInt(value));
                              }}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('recurringOrders.selectOrderProduct')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products && products.map((product: any) => (
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
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{index === 0 ? t('recurringOrders.orderQuantity') : <span className="sr-only">{t('recurringOrders.orderQuantity')}</span>}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseInt(e.target.value));
                                  handleQuantityChange();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{index === 0 ? t('recurringOrders.orderPrice') : <span className="sr-only">{t('recurringOrders.orderPrice')}</span>}</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  handleQuantityChange();
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            remove(index);
                            handleQuantityChange();
                          }}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">{t('common.remove')}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ productId: 0, quantity: 1, price: '0.00' })}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('recurringOrders.addProduct')}
                </Button>

                <Separator className="my-4" />

                <div className="flex justify-end">
                  <div className="w-1/3">
                    <FormField
                      control={form.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('recurringOrders.orderTotal')}</FormLabel>
                          <FormControl>
                            <Input readOnly {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/recurring-orders')}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RecurringOrderForm;