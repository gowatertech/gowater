import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleLoadingSchema } from "@shared/schema";
import type { InsertVehicleLoading, Product, User, Truck, Route, Order, OrderItem } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Plus, X, Truck as TruckIcon, Route as RouteIcon, Info, RefreshCw } from "lucide-react";

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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500";
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-500";
  }
};

interface VehicleLoadingFormProps {
  onSuccess?: () => void;
}

// Tipo para los productos agrupados por ruta
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

  const form = useForm<InsertVehicleLoading>({
    resolver: zodResolver(insertVehicleLoadingSchema),
    defaultValues: {
      initialCash: "0.00",
      items: [],
      routeId: undefined
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
    queryKey: ["/api/users/drivers", { role: "driver" }],
  });

  const { data: assistants = [] } = useQuery<User[]>({
    queryKey: ["/api/users/drivers", { role: "assistant" }],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Cargar todas las rutas y filtrar las activas en el cliente
  const { data: allRoutes = [] } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
    onSuccess: (data) => {
      console.log("Rutas cargadas (todas):", data);
    }
  });

  // Filtrar solo las rutas activas (pending o in_progress)
  const routes = allRoutes.filter(route => 
    route.status === "pending" || route.status === "in_progress"
  );
  
  // Función para obtener los pedidos de una ruta específica
  const getRouteOrders = async (routeId: number) => {
    try {
      setIsLoadingRouteOrders(true);
      const response = await fetch(`/api/routes/${routeId}/orders`);
      
      if (!response.ok) {
        throw new Error('Error al obtener las órdenes de la ruta');
      }
      
      const orders: Order[] = await response.json();
      console.log("Pedidos de la ruta:", orders);
      
      // Agrupar productos de todos los pedidos
      const productMap = new Map<number, GroupedProduct>();
      
      orders.forEach(order => {
        // Verificar que la orden tenga productos y que sea un array
        const orderProducts = (order as any).products;
        if (orderProducts && Array.isArray(orderProducts)) {
          orderProducts.forEach((item: any) => {
            const productId = item.productId;
            const quantity = item.quantity || 0;
            const productName = products.find(p => p.id === productId)?.name || item.name || `Producto #${productId}`;
            
            if (productMap.has(productId)) {
              // Actualizar cantidad si el producto ya existe
              const existing = productMap.get(productId)!;
              existing.totalQuantity += quantity;
              productMap.set(productId, existing);
            } else {
              // Añadir nuevo producto al mapa
              productMap.set(productId, {
                productId,
                productName,
                totalQuantity: quantity
              });
            }
          });
        }
      });
      
      // Convertir el mapa a un array
      const groupedProducts = Array.from(productMap.values());
      console.log("Productos agrupados por ruta:", groupedProducts);
      
      // Guardar los productos agrupados
      setRouteProducts(groupedProducts);
      
      // Preparar los items para el formulario
      const formItems = groupedProducts.map(product => ({
        productId: product.productId,
        quantity: product.totalQuantity
      }));
      
      // Reemplazar los items actuales con los nuevos
      replace(formItems);
      
      toast({
        title: "Productos cargados",
        description: `Se han cargado ${groupedProducts.length} productos de la ruta seleccionada`,
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
  
  // Precargar el conductor cuando se selecciona una ruta
  const handleRouteChange = async (routeId: number) => {
    // Buscar la ruta seleccionada
    const selectedRoute = routes.find(route => route.id === routeId);
    if (selectedRoute && selectedRoute.driverId) {
      // Actualizar el campo del conductor con el valor de la ruta
      form.setValue("driverId", selectedRoute.driverId);
      
      // Actualizar el campo del ayudante si existe en la ruta
      if (selectedRoute.assistantId) {
        form.setValue("assistantId", selectedRoute.assistantId);
      }
      
      // Cargar los productos de los pedidos de esta ruta
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
        routeId: values.routeId ? Number(values.routeId) : undefined,
        assistantId: values.assistantId ? Number(values.assistantId) : undefined,
        items: values.items.map(item => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity)
        }))
      };

      console.log("Submitting data:", formattedData);

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
        description: "Carga de vehículo registrada exitosamente",
        duration: 3000,
      });

      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      form.reset();
    } catch (error) {
      console.error("Error creating vehicle loading:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Error al crear la carga del vehículo",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="routeId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Ruta</FormLabel>
                <Select
                  onValueChange={(value) => {
                    const routeId = Number(value);
                    field.onChange(routeId);
                    handleRouteChange(routeId);
                  }}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar ruta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id.toString()} className="text-xs py-1">
                        {route.name} ({new Date(route.date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="truckId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Vehículo</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id.toString()} className="text-xs py-1">
                        {truck.plate} - {truck.brand} {truck.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="driverId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Conductor</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar conductor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()} className="text-xs py-1">
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assistantId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Ayudante</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar ayudante" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id.toString()} className="text-xs py-1">
                        {assistant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="initialCash"
            render={({ field }) => (
              <FormItem className="space-y-1 col-span-1">
                <FormLabel className="text-xs">Efectivo Inicial (RD$)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="0.00"
                    className="h-8 text-xs"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        field.onChange(value.toFixed(2));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center">
              <h3 className="text-sm font-semibold">Productos a Cargar</h3>
              {isLoadingRouteOrders && (
                <div className="flex items-center ml-2">
                  <Loader2 className="h-3 w-3 animate-spin text-primary mr-1" />
                  <span className="text-xs text-muted-foreground">Cargando productos de la ruta...</span>
                </div>
              )}
              {routeProducts.length > 0 && !isLoadingRouteOrders && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {routeProducts.length} productos de ruta
                </Badge>
              )}
            </div>
            <Button
              type="button"
              onClick={() => append({ productId: 0, quantity: 1 })}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar Producto
            </Button>
          </div>

          {/* Resumen de productos de ruta cuando se han cargado */}
          {routeProducts.length > 0 && form.getValues().routeId && (
            <div className="mb-2 p-2 bg-primary/5 border border-primary/10 rounded-md">
              <div className="flex items-center mb-1">
                <RouteIcon className="h-3.5 w-3.5 text-primary mr-1" />
                <span className="text-xs font-medium">Productos de la ruta seleccionada</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                Los siguientes productos se han cargado automáticamente según los pedidos de la ruta:
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {routeProducts.map(product => (
                  <TooltipProvider key={product.productId}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {product.productName}: {product.totalQuantity}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p>ID: {product.productId}</p>
                        <p>Cantidad total: {product.totalQuantity}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end">
                <FormField
                  control={form.control}
                  name={`items.${index}.productId`}
                  render={({ field }) => (
                    <FormItem className="flex-1 space-y-1">
                      <FormLabel className="text-xs">Producto</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                              className="text-xs py-1"
                            >
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Cantidad</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          className="w-16 h-8 text-xs"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 mt-5"
                  onClick={() => remove(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-8 text-xs mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Registrar Carga"}
        </Button>
      </form>
    </Form>
  );
}