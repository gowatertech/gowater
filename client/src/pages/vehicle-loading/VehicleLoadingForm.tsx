import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleLoadingSchema } from "@shared/schema";
import type { InsertVehicleLoading, Product, User, Truck, Route, Order } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { formatDateRD } from "@/lib/date-utils";
import { 
  Plus, 
  Minus, 
  Truck as TruckIcon, 
  MapPin, 
  DollarSign, 
  Package, 
  Save, 
  Loader2,
  PackageCheck,
  AlertCircle
} from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface VehicleLoadingFormProps {
  onSuccess?: () => void;
}

interface GroupedProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
}

export function VehicleLoadingForm({ onSuccess }: VehicleLoadingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRouteOrders, setIsLoadingRouteOrders] = useState(false);
  const [routeProducts, setRouteProducts] = useState<GroupedProduct[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const form = useForm<InsertVehicleLoading>({
    resolver: zodResolver(insertVehicleLoadingSchema),
    defaultValues: {
      initialCash: "0.00",
      items: [],
      routeId: undefined,
      truckId: undefined,
      driverId: undefined,
      assistantId: undefined,
      notes: ""
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/drivers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: allRoutes = [] } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  // Filtrar solo rutas activas (pending o in_progress)
  const routes = allRoutes.filter(route => 
    route.status === "pending" || route.status === "in_progress"
  );

  const getRouteOrders = async (routeId: number) => {
    try {
      setIsLoadingRouteOrders(true);
      const response = await fetch(`/api/routes/${routeId}/orders`);
      
      if (!response.ok) {
        throw new Error('Error al obtener las órdenes de la ruta');
      }
      
      const orders: Order[] = await response.json();
      
      const productMap = new Map<number, GroupedProduct>();
      
      orders.forEach(order => {
        const orderProducts = (order as any).products;
        if (orderProducts && Array.isArray(orderProducts)) {
          orderProducts.forEach((item: any) => {
            const productId = item.productId;
            const quantity = item.quantity || 0;
            const productName = products.find(p => p.id === productId)?.name || item.name || `Producto #${productId}`;
            
            if (productMap.has(productId)) {
              const existing = productMap.get(productId)!;
              existing.totalQuantity += quantity;
              productMap.set(productId, existing);
            } else {
              productMap.set(productId, {
                productId,
                productName,
                totalQuantity: quantity
              });
            }
          });
        }
      });
      
      const groupedProducts = Array.from(productMap.values());
      setRouteProducts(groupedProducts);
      
      const formItems = groupedProducts.map(product => ({
        productId: product.productId,
        quantity: product.totalQuantity,
        notes: ""
      }));
      
      replace(formItems);
      
      toast({
        title: "✓ Productos cargados",
        description: `${groupedProducts.length} producto(s) agregado(s) desde la ruta`,
      });
    } catch (error) {
      console.error("Error al cargar órdenes de la ruta:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los productos de la ruta",
      });
    } finally {
      setIsLoadingRouteOrders(false);
    }
  };

  const handleRouteChange = async (routeId: number) => {
    const route = routes.find(r => r.id === routeId);
    setSelectedRoute(route || null);
    
    if (route) {
      if (route.driverId) {
        form.setValue("driverId", route.driverId);
      }
      if (route.assistantId) {
        form.setValue("assistantId", route.assistantId);
      }
      if (route.truckId) {
        form.setValue("truckId", route.truckId);
      }
      
      await getRouteOrders(routeId);
    }
  };

  const onSubmit = async (values: InsertVehicleLoading) => {
    try {
      setIsSubmitting(true);

      const formattedData = {
        ...values,
        initialCash: values.initialCash.toString(),
        truckId: Number(values.truckId),
        driverId: Number(values.driverId),
        routeId: values.routeId ? Number(values.routeId) : null,
        assistantId: values.assistantId ? Number(values.assistantId) : null,
        items: values.items.map(item => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          notes: item.notes || ""
        }))
      };

      const response = await fetch("/api/vehicle-loading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear la carga del vehículo");
      }

      toast({
        title: "✓ Carga registrada",
        description: "La carga del vehículo ha sido registrada exitosamente",
      });

      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      form.reset();
      setSelectedRoute(null);
      setRouteProducts([]);
    } catch (error) {
      console.error("Error creating vehicle loading:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la carga del vehículo",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateQuantity = (index: number, change: number) => {
    const currentValue = form.getValues(`items.${index}.quantity`);
    const newValue = Math.max(0, currentValue + change);
    form.setValue(`items.${index}.quantity`, newValue);
  };

  const getTotalProducts = () => {
    return fields.reduce((sum, _, index) => {
      return sum + (form.watch(`items.${index}.quantity`) || 0);
    }, 0);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header con Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stat 1: Ruta */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Ruta Seleccionada</p>
                  <p className="text-sm font-semibold">
                    {selectedRoute ? selectedRoute.name : "Sin seleccionar"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stat 2: Productos */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Total Productos</p>
                  <p className="text-sm font-semibold">{getTotalProducts()} unidades</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stat 3: Efectivo */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Efectivo Inicial</p>
                  <p className="text-sm font-semibold">
                    ${form.watch("initialCash") || "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección: Datos de la Ruta */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TruckIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Datos del Vehículo y Ruta</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ruta */}
              <FormField
                control={form.control}
                name="routeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ruta *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const routeId = Number(value);
                        field.onChange(routeId);
                        handleRouteChange(routeId);
                      }}
                      value={field.value?.toString()}
                      disabled={isLoadingRouteOrders}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-route">
                          <SelectValue placeholder="Seleccionar ruta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {routes.map((route) => (
                          <SelectItem key={route.id} value={route.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{route.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {formatDateRD(route.date, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vehículo */}
              <FormField
                control={form.control}
                name="truckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-truck">
                          <SelectValue placeholder="Seleccionar vehículo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks.filter(t => t.status === "disponible").map((truck) => (
                          <SelectItem key={truck.id} value={truck.id.toString()}>
                            {truck.brand} {truck.model} - {truck.plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conductor */}
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conductor *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-driver">
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.filter(d => d.role === "driver").map((driver) => (
                          <SelectItem key={driver.id} value={driver.id.toString()}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ayudante */}
              <FormField
                control={form.control}
                name="assistantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ayudante</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-assistant">
                          <SelectValue placeholder="Seleccionar ayudante (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.filter(d => d.role === "assistant").map((assistant) => (
                          <SelectItem key={assistant.id} value={assistant.id.toString()}>
                            {assistant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Efectivo Inicial - Destacado */}
            <div className="pt-4">
              <FormField
                control={form.control}
                name="initialCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-yellow-600" />
                      Efectivo Inicial *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          {...field}
                          type="text"
                          placeholder="0.00"
                          className="pl-8 text-lg font-semibold h-12"
                          data-testid="input-initial-cash"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Permitir solo números y punto decimal
                            if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                              field.onChange(value);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sección: Productos a Cargar */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Productos a Cargar</h3>
              </div>
              {isLoadingRouteOrders && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando productos...
                </div>
              )}
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Selecciona una ruta para cargar los productos automáticamente
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const product = products.find(p => p.id === form.watch(`items.${index}.productId`));
                  const routeProduct = routeProducts.find(rp => rp.productId === form.watch(`items.${index}.productId`));
                  
                  return (
                    <Card key={field.id} className="border-l-4 border-l-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Nombre del Producto */}
                          <div className="flex-1">
                            <p className="font-medium">
                              {product?.name || routeProduct?.productName || `Producto #${form.watch(`items.${index}.productId`)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cantidad requerida: {routeProduct?.totalQuantity || 0} unidades
                            </p>
                          </div>

                          {/* Controles de Cantidad */}
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updateQuantity(index, -1)}
                              data-testid={`button-decrease-${index}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="w-20">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      className="text-center font-semibold h-9"
                                      data-testid={`input-quantity-${index}`}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updateQuantity(index, 1)}
                              data-testid={`button-increase-${index}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Badge de Estado */}
                          {form.watch(`items.${index}.quantity`) !== routeProduct?.totalQuantity && (
                            <Badge variant="secondary" className="text-xs">
                              Modificado
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notas */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Agregar notas sobre esta carga..."
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botón de Envío */}
        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1 h-12 text-base font-semibold"
            disabled={isSubmitting || fields.length === 0}
            data-testid="button-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Registrar Carga
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
