import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BarChart4, Truck, Loader2, PillBottle, FileText, DollarSign, CreditCard, Calculator } from "lucide-react";
import type { VehicleLoading, Product, User, Truck as TruckType, BottleReturn, Route, Order } from "@shared/schema";

// Esquema para validar formulario de cuadre
const settlementSchema = z.object({
  vehicleLoadingId: z.number(),
  totalCashReceived: z.string().min(1, "Campo requerido"),
  totalCreditReceived: z.string().min(1, "Campo requerido"),
  totalInvoiced: z.string().min(1, "Campo requerido"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    loadedQuantity: z.number(),
    returnedQuantity: z.number(),
    soldQuantity: z.number(),
    returnedContainers: z.number(),
    productDifference: z.number().optional(), // Diferencia entre cargado-devuelto y vendido
    containersDifference: z.number().optional(), // Diferencia entre envases que deberían devolverse y los realmente devueltos
    notes: z.string().optional(),
  })),
});

interface LoadingWithRelations extends VehicleLoading {
  truck: TruckType;
  driver: User;
  route?: Route;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    returnedQuantity: number | null;
    notes: string | null;
    product: Product;
  }>;
}

// Extender el tipo BottleReturn para incluir el nombre del producto
interface ExtendedBottleReturn extends BottleReturn {
  productName?: string;
}

// Definir la estructura de un ítem de orden
interface OrderItem {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

// Extender las órdenes para incluir detalles de ítems
interface ExtendedOrder extends Order {
  items?: OrderItem[];
}

// Extender la respuesta de la API para incluir los datos de devolución de envases y órdenes relacionadas
interface SettlementResponse {
  loading: LoadingWithRelations;
  relatedOrders: ExtendedOrder[];
  bottleReturns: ExtendedBottleReturn[];
  productSummary?: Array<{
    productId: number;
    productName: string;
    quantity: number;
    total: number;
  }>;
}

// Interfaz para el resumen de productos vendidos
interface ProductSoldSummary {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface SettlementFormProps {
  loading: LoadingWithRelations;
  onSuccess: () => void;
}

// Exportación por defecto y por nombre para mayor flexibilidad
export default function VehicleSettlementForm({ loading, onSuccess }: SettlementFormProps) {
  const { toast } = useToast();
  
  const [calculatedTotals, setCalculatedTotals] = useState({
    cashDifference: "0.00",
    totalSold: "0.00",
    cashSales: "0.00",
    creditSales: "0.00",
    expectedCash: "0.00",
  });

  // Preparar valores iniciales para el formulario
  const defaultValues = {
    vehicleLoadingId: loading.id,
    // Siempre inicializar explícitamente en 0.00 para evitar valores predeterminados extraños
    totalCashReceived: "0.00",
    totalCreditReceived: "0.00",
    totalInvoiced: "0.00",
    notes: "",
    items: loading.items.map(item => {
      console.log(`Inicializando item ${item.productId}: ${item.product?.name} - cantidad=${item.quantity}`);
      return {
        productId: item.productId,
        loadedQuantity: item.quantity,
        returnedQuantity: 0,
        soldQuantity: 0, // Iniciamos con 0 para que se calcule correctamente
        returnedContainers: 0,
        productDifference: 0, // Diferencia entre cargado-devuelto y vendido
        containersDifference: 0, // Diferencia entre envases devueltos y vendidos
        notes: "",
      };
    }),
  };
  
  console.log("Valores iniciales del formulario:", defaultValues);

  // Inicializar formulario con validación
  const form = useForm<z.infer<typeof settlementSchema>>({
    resolver: zodResolver(settlementSchema),
    defaultValues,
  });
  
  // Cargar los datos de settlement incluyendo órdenes relacionadas
  const { data: settlementData, isLoading: isLoadingSettlementData } = useQuery<SettlementResponse>({
    queryKey: ["/api/route-settlements", loading.id],
    enabled: !!loading.id
  });
  
  // Verificar si los datos fueron cargados y mostrar información relevante
  useEffect(() => {
    if (settlementData) {
      console.log("DATOS RECIBIDOS DEL API:", JSON.stringify(settlementData, null, 2));
      
      // Verificar si tenemos resumen de productos
      if (settlementData.productSummary && settlementData.productSummary.length > 0) {
        console.log("✅ RESUMEN DE PRODUCTOS VENDIDOS:", settlementData.productSummary);
        console.log("Total de tipos de productos:", settlementData.productSummary.length);
        
        // Calcular totales
        const totalUnits = settlementData.productSummary.reduce((sum: number, product: any) => 
          sum + product.quantity, 0);
        const totalValue = settlementData.productSummary.reduce((sum: number, product: any) => 
          sum + product.total, 0);
          
        console.log(`Total unidades vendidas: ${totalUnits}`);
        console.log(`Valor total vendido: $${totalValue.toFixed(2)}`);
      } else {
        console.log("❌ No se encontró resumen de productos");
      }
      
      console.log("Órdenes relacionadas:", settlementData.relatedOrders?.length || 0);
      
      // Revisar cada orden para ver si tiene items
      if (settlementData.relatedOrders && settlementData.relatedOrders.length > 0) {
        settlementData.relatedOrders.forEach((order: any, index: number) => {
          console.log(`Orden #${index+1} (ID: ${order.id}):`, {
            routeId: order.routeId,
            total: order.total,
            status: order.status,
            items: order.items ? `${order.items.length} items` : "NO TIENE ITEMS"
          });
        });
      }
    }
  }, [settlementData]);
  
  // Usar useEffect para rastrear los datos cuando se cargan
  useEffect(() => {
    if (settlementData) {
      console.log("Settlement data loaded:", settlementData);
      if (settlementData.relatedOrders) {
        console.log("Related orders:", settlementData.relatedOrders);
        const total = settlementData.relatedOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total), 0);
        console.log("Orders total:", total.toFixed(2));
        console.log("Cash orders:", settlementData.relatedOrders.filter((order: any) => order.paymentMethod === "cash"));
        console.log("Credit orders:", settlementData.relatedOrders.filter((order: any) => order.paymentMethod === "credit"));
      }
    }
  }, [settlementData]);
  
  // Manejador para calcular diferencias y ajustes (definido con useCallback para evitar dependencias cíclicas)
  const calculateDifferences = useCallback(() => {
    console.log("=================== INICIO CÁLCULO ===================");
    console.log("calculateDifferences called");
    
    // Valores iniciales para limpiar el formulario antes de recalcular
    const cleanValues = {
      totalInvoiced: "0.00",
      totalCreditReceived: "0.00",
    };
    
    toast({
      title: "Calculando totales",
      description: settlementData?.relatedOrders?.length 
        ? `Se encontraron ${settlementData.relatedOrders.length} órdenes relacionadas` 
        : "No se encontraron órdenes relacionadas con esta carga"
    });
    
    // Continuar con el cálculo normal
    const values = form.getValues();
    console.log("Form values completo:", JSON.stringify(values, null, 2));
    const totalCashReceived = parseFloat(values.totalCashReceived) || 0;
    console.log("totalCashReceived:", totalCashReceived);
    
    // Registrar detalles de los productos cargados
    console.log("Productos cargados (loading.items):", loading.items.map(item => ({
      id: item.id,
      productId: item.productId,
      product: item.product ? {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price
      } : null,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity
    })));
    
    // Variables para los cálculos
    let totalProductsSold = 0;
    let totalProductsValue = 0;
    let productSoldDetails: Array<{productId: number; productName: string; quantity: number}> = [];
    let totalSold = 0;
    
    let calculatedCreditSales = 0;
    let calculatedCashSales = 0;
    
    // Si tenemos órdenes relacionadas, usar esos datos para calcular el crédito
    if (settlementData && settlementData.relatedOrders && settlementData.relatedOrders.length > 0) {
      // CORRECCIÓN: Filtrar órdenes relacionadas con la ruta exacta de la carga
      const orders = settlementData.relatedOrders.filter(order => {
        // Verificar si la orden está entregada o completada (status es case-insensitive)
        const orderStatus = (order.status || "").toLowerCase();
        const isDelivered = orderStatus === "delivered" || 
                           orderStatus === "completed" || 
                           orderStatus.includes("deliver") ||
                           (!order.status && parseFloat(order.total || "0") > 0);
        
        // Verificar si la orden pertenece a la ruta asociada a la carga
        let belongsToRoute = false;
        
        if (loading.routeId) {
          // Comparar como números para evitar problemas de tipo string vs number
          belongsToRoute = Number(order.routeId) === Number(loading.routeId);
          console.log(`Orden #${order.id}: ruta=${order.routeId}, carga.routeId=${loading.routeId}, coincide=${belongsToRoute}`);
        } else {
          // Si no hay routeId, buscar órdenes del mismo conductor
          belongsToRoute = true;
          console.log(`Orden #${order.id}: no hay ruta en carga, se asume que es del conductor`);
        }
        
        console.log(`Orden #${order.id}: status=${order.status}, total=${order.total}, entregada=${isDelivered}, de la ruta=${belongsToRoute}`);
        
        return isDelivered && belongsToRoute;
      });
      
      console.log(`Órdenes filtradas (entregadas y de la ruta): ${orders.length}`);
      
      try {
        // Sumar totales de pedidos para obtener el valor total vendido
        totalProductsValue = orders.reduce((sum, order) => {
          return sum + parseFloat(order.total || "0");
        }, 0);
        
        // Asignar valor total
        totalSold = totalProductsValue;
        console.log(`Valor total de pedidos vendidos: $${totalProductsValue.toFixed(2)}`);
        
        // Crear resumen de productos vendidos por tipo
        const productSummary = new Map();
        
        // Recorrer cada orden para obtener cantidades vendidas por producto
        for (const order of orders) {
          // Unificar acceso a items (pueden venir como 'items' o 'products')
          const orderItems = (order as any).items || (order as any).products || [];
          
          if (Array.isArray(orderItems)) {
            for (const item of orderItems) {
              const productId = item.productId;
              const quantity = item.quantity || 0;
              
              // Actualizar o crear entrada en el mapa
              if (productSummary.has(productId)) {
                const current = productSummary.get(productId);
                productSummary.set(productId, {
                  ...current,
                  quantity: current.quantity + quantity
                });
              } else {
                // Nueva entrada para este producto
                productSummary.set(productId, {
                  productId,
                  productName: item.productName || `Producto #${productId}`,
                  quantity
                });
              }
            }
          }
        }
        
        // Generar array con el resumen de productos
        productSoldDetails = Array.from(productSummary.values());
        console.log("Resumen de productos vendidos:", productSoldDetails);
        
        // Total de unidades vendidas
        totalProductsSold = productSoldDetails.reduce((sum: number, product: any) => sum + product.quantity, 0);
        console.log(`Total unidades vendidas: ${totalProductsSold} unidades`);
        
        // ACTUALIZAR CANTIDADES VENDIDAS en el formulario basado en órdenes reales
        const formItems = form.getValues().items;
        
        // Para cada producto cargado, actualizar datos del formulario
        formItems.forEach((formItem, index) => {
          // Buscar info de ventas para este producto
          const productSoldInfo = productSoldDetails.find(
            p => p.productId === formItem.productId
          );
          
          if (productSoldInfo) {
            // Actualizar cantidad vendida desde órdenes
            const soldQuantity = productSoldInfo.quantity;
            console.log(`Producto #${formItem.productId}: vendido=${soldQuantity} unidades`);
            form.setValue(`items.${index}.soldQuantity`, soldQuantity);
            
            // Calcular diferencia de productos: (cargado - devuelto) - vendido
            const loadedQuantity = formItem.loadedQuantity;
            const returnedQuantity = formItem.returnedQuantity;
            const productDifference = (loadedQuantity - returnedQuantity) - soldQuantity;
            console.log(`Diferencia producto #${formItem.productId}: ${productDifference}`);
            form.setValue(`items.${index}.productDifference`, productDifference);
            
            // Calcular diferencia de envases para productos retornables
            const product = loading.items.find(item => item.productId === formItem.productId)?.product;
            if (product?.isReturnable) {
              const returnedContainers = formItem.returnedContainers;
              const containersDifference = soldQuantity - returnedContainers;
              console.log(`Diferencia envases producto #${formItem.productId}: ${containersDifference}`);
              form.setValue(`items.${index}.containersDifference`, containersDifference);
            }
          } else {
            // Si no se encontraron ventas para este producto, mantener en cero
            console.log(`Producto #${formItem.productId}: sin ventas registradas`);
            form.setValue(`items.${index}.soldQuantity`, 0);
            form.setValue(`items.${index}.productDifference`, formItem.loadedQuantity - formItem.returnedQuantity);
          }
        });
        
      } catch (error) {
        console.error("Error al calcular productos vendidos:", error);
        totalSold = 0;
        totalProductsValue = 0;
      }
      
      // Calcular ventas en efectivo y crédito
      const cashOrders = orders.filter(order => 
        (order.paymentMethod || "").toLowerCase() === "cash" || 
        (order.paymentMethod || "").toLowerCase() === "efectivo"
      );
      console.log(`Órdenes en efectivo: ${cashOrders.length}`);
      
      calculatedCashSales = cashOrders.reduce((sum, order) => {
        console.log(`  - Orden #${order.id}: ${order.total}`);
        return sum + parseFloat(order.total || "0");
      }, 0);
      console.log(`Total ventas en efectivo: ${calculatedCashSales.toFixed(2)}`);
        
      const creditOrders = orders.filter(order => 
        (order.paymentMethod || "").toLowerCase() === "credit" || 
        (order.paymentMethod || "").toLowerCase() === "credito" || 
        (order.paymentMethod || "").toLowerCase() === "crédito"
      );
      console.log(`Órdenes a crédito: ${creditOrders.length}`);
      
      calculatedCreditSales = creditOrders.reduce((sum, order) => {
        console.log(`  - Orden #${order.id}: ${order.total}`);
        return sum + parseFloat(order.total || "0");
      }, 0);
      console.log(`Total ventas a crédito: ${calculatedCreditSales.toFixed(2)}`);
        
      // Establecer totales en el formulario basados en los cálculos
      console.log(`Estableciendo crédito recibido: ${calculatedCreditSales.toFixed(2)}`);
      form.setValue("totalCreditReceived", calculatedCreditSales.toFixed(2));
      
      // Total facturado = ventas efectivo + ventas crédito
      const newTotalInvoiced = calculatedCashSales + calculatedCreditSales;
      console.log(`Estableciendo total facturado: ${newTotalInvoiced.toFixed(2)}`);
      form.setValue("totalInvoiced", newTotalInvoiced.toFixed(2));
    } else {
      console.log("No hay órdenes relacionadas disponibles");
      form.setValue("totalInvoiced", "0.00");
      form.setValue("totalCreditReceived", "0.00");
    }
    
    // Recalcular totales finales
    // Efectivo inicial de la carga
    const initialCash = parseFloat(loading.initialCash || "0");
    
    // Obtener valores actualizados del formulario
    const totalInvoiced = parseFloat(form.getValues().totalInvoiced) || 0;
    const totalCreditReceived = parseFloat(form.getValues().totalCreditReceived) || 0;
    
    // Calcular efectivo esperado: Efectivo Inicial + (Total Facturado - Crédito)
    const expectedCash = initialCash + (totalInvoiced - totalCreditReceived);
    
    // Diferencia de efectivo = Recibido - Esperado
    const cashDifference = (totalCashReceived - expectedCash).toFixed(2);
    
    // Actualizar estado para mostrar en UI
    setCalculatedTotals({
      cashDifference,
      totalSold: totalInvoiced.toFixed(2),
      cashSales: calculatedCashSales.toFixed(2),
      creditSales: calculatedCreditSales.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
    });
    
    console.log("=================== FIN CÁLCULO ===================");
  }, [form, loading.items, loading.initialCash, loading.routeId, settlementData]);
  
  // Efecto para actualizar los valores de envases devueltos cuando se carguen los datos
  useEffect(() => {
    // Usamos la variable existente settlementData (declarada en línea 101)
    const bottleReturnsData = settlementData?.bottleReturns;
    if (bottleReturnsData && bottleReturnsData.length > 0) {
      // Para cada item en el formulario, buscamos si hay datos de devolución para ese producto
      const formItems = form.getValues().items;
      let updated = false;
      
      formItems.forEach((item, index) => {
        const returnData = bottleReturnsData.filter(
          (br: ExtendedBottleReturn) => br.productId === item.productId
        );
        
        if (returnData.length > 0) {
          // Sumamos todas las devoluciones para este producto
          const totalReturned = returnData.reduce(
            (sum: number, br: ExtendedBottleReturn) => sum + br.returnedQuantity, 
            0
          );
          
          // Actualizamos el valor en el formulario
          if (totalReturned > 0) {
            form.setValue(`items.${index}.returnedContainers`, totalReturned);
            updated = true;
          }
        }
      });
      
      // NO recalcular automáticamente, el usuario debe usar el botón
      // if (updated) {
      //   calculateDifferences();
      // }
    }
  }, [settlementData, form, calculateDifferences]);
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/route-settlements", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading/pending"] });
      toast({
        title: "Cuadre completado",
        description: "El cuadre de vehículo ha sido registrado exitosamente.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el cuadre de vehículo.",
        variant: "destructive",
      });
    },
  });

  // Funciones para calcular totales - Esta función no se usa actualmente, todo se calcula en calculateDifferences
  function calculateTotalInvoiced() {
    let total = 0;
    loading.items.forEach(item => {
      const price = parseFloat(item.product?.price || "0");
      // Usamos la cantidad vendida (totalSold), no la cantidad cargada (quantity)
      const soldQuantity = (item.quantity || 0) - (item.returnedQuantity || 0);
      total += price * soldQuantity;
    });
    return total.toFixed(2);
  }

  // handleChange utiliza calculateDifferences que ya está definido con useCallback

  const handleChange = () => {
    // Calcular las diferencias cuando cambian los valores
    calculateDifferences();
  };

  // Actualizar campos calculados cuando cambian las cantidades
  // IMPORTANTE: No calculamos automáticamente la cantidad vendida
  // Este método solo registra los cambios
  const updateSoldQuantity = (index: number, returnedQuantity: number) => {
    // No modificamos soldQuantity automáticamente
    // Ahora este valor se obtiene de las órdenes realmente entregadas
    
    // Solo registramos el cambio de returnedQuantity
    console.log(`Cantidad devuelta actualizada para producto #${index}: ${returnedQuantity}`);
    
    // Actualizar la diferencia de productos al cambiar la cantidad devuelta
    const formItem = form.getValues().items[index];
    const loadedQuantity = formItem.loadedQuantity;
    const soldQuantity = formItem.soldQuantity;
    const productDifference = (loadedQuantity - returnedQuantity) - soldQuantity;
    console.log(`Actualizando diferencia de producto #${index}: ${productDifference}`);
    form.setValue(`items.${index}.productDifference`, productDifference);
    
    // No recalcular totales automáticamente para evitar recálculos excesivos
  };

  const onSubmit = (data: z.infer<typeof settlementSchema>) => {
    // Asegurarse de que las cantidades sean números válidos
    const formattedData = {
      ...data,
      totalCashReceived: parseFloat(data.totalCashReceived).toFixed(2),
      totalCreditReceived: parseFloat(data.totalCreditReceived).toFixed(2),
      totalInvoiced: parseFloat(data.totalInvoiced).toFixed(2),
      cashDifference: calculatedTotals.cashDifference,
    };
    
    mutate(formattedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuadre de Vehículo - Carga #{loading.loadingNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Información de la carga */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Fecha</p>
              <p className="font-medium">{new Date(loading.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Conductor</p>
              <p className="font-medium">{loading.driver?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vehículo</p>
              <p className="font-medium">{loading.truck?.plate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Efectivo Inicial</p>
              <p className="font-medium">RD$ {loading.initialCash}</p>
            </div>
          </div>
        </div>

        {isLoadingSettlementData ? (
          <div className="flex justify-center items-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
            <span>Cargando datos de devoluciones...</span>
          </div>
        ) : settlementData?.bottleReturns && settlementData.bottleReturns.length > 0 ? (
          <div className="mb-6 border border-primary/20 bg-primary/5 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <PillBottle className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-lg font-medium">Devoluciones de Envases Registradas</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Se encontraron {settlementData.bottleReturns.length} devoluciones de envases registradas por el conductor.
            </p>
            <div className="overflow-x-auto max-h-40">
              <table className="w-full text-sm">
                <thead className="bg-primary/10">
                  <tr>
                    <th className="px-2 py-1 text-left">Producto</th>
                    <th className="px-2 py-1 text-center">Esperados</th>
                    <th className="px-2 py-1 text-center">Devueltos</th>
                    <th className="px-2 py-1 text-center">Pendientes</th>
                    <th className="px-2 py-1 text-right">Depósito</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementData.bottleReturns.map((bottleReturn: ExtendedBottleReturn) => (
                    <tr key={bottleReturn.id} className="border-b border-primary/10">
                      <td className="px-2 py-1">{bottleReturn.productName || `Producto #${bottleReturn.productId}`}</td>
                      <td className="px-2 py-1 text-center">{bottleReturn.expectedQuantity}</td>
                      <td className="px-2 py-1 text-center">{bottleReturn.returnedQuantity}</td>
                      <td className="px-2 py-1 text-center">{bottleReturn.pendingQuantity}</td>
                      <td className="px-2 py-1 text-right">RD$ {parseFloat(bottleReturn.depositAmount || "0").toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sección de Efectivo y Crédito */}
            <div className="border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Totales de Facturación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="totalCashReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Efectivo Recibido (RD$)</FormLabel>
                      <FormControl>
                        <Input 
                          // No pasamos todos los props del field para tener más control
                          name={field.name}
                          ref={field.ref}
                          value={field.value}
                          type="text" 
                          inputMode="decimal"
                          onFocus={(e) => {
                            console.log("onFocus totalCashReceived - valor actual:", e.target.value);
                            // Si el valor es 0.00, limpiar el campo para facilitar la entrada
                            if (e.target.value === "0.00") {
                              e.target.value = "";
                              field.onChange("");
                            }
                          }}
                          onBlur={(e) => {
                            console.log("onBlur totalCashReceived - valor antes de formatear:", e.target.value);
                            // Formatear el valor para mostrar dos decimales
                            const value = e.target.value.trim();
                            // Si está vacío, usar 0.00
                            if (!value) {
                              const formattedValue = "0.00";
                              e.target.value = formattedValue;
                              field.onChange(formattedValue);
                              console.log("Campo vacío, estableciendo a:", formattedValue);
                              return;
                            }
                            
                            // Si no hay punto decimal, añadir .00
                            let formattedValue;
                            if (value && !value.includes('.')) {
                              formattedValue = parseFloat(value).toFixed(2);
                            } else {
                              formattedValue = (parseFloat(value) || 0).toFixed(2);
                            }
                            console.log("Valor formateado:", formattedValue);
                            e.target.value = formattedValue;
                            field.onChange(formattedValue);
                            // NO calcular automáticamente - dejarlo para el botón
                          }}
                          onChange={(e) => {
                            console.log("onChange totalCashReceived - valor original:", e.target.value);
                            // Permitir solo números y un punto decimal
                            const value = e.target.value.replace(/[^\d.]/g, '');
                            // Prevenir múltiples puntos decimales
                            const parts = value.split('.');
                            const newValue = parts.length > 2 
                              ? parts[0] + '.' + parts.slice(1).join('') 
                              : value;
                            console.log("onChange totalCashReceived - nuevo valor:", newValue);
                            field.onChange(newValue);
                            // No calcular en cada cambio
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalCreditReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crédito Otorgado (RD$)</FormLabel>
                      <FormControl>
                        <Input 
                          name={field.name}
                          ref={field.ref}
                          type="text" 
                          inputMode="decimal"
                          className="bg-gray-50"
                          readOnly
                          disabled
                          // Garantiza que siempre se muestre con dos decimales en UI
                          value={(parseFloat(field.value) || 0).toFixed(2)}
                          // Eliminar todos los eventos para evitar modificaciones
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">Total de ventas a crédito (calculado automáticamente)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalInvoiced"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Facturado (RD$)</FormLabel>
                      <FormControl>
                        <Input 
                          name={field.name}
                          ref={field.ref}
                          type="text" 
                          inputMode="decimal"
                          className="bg-gray-50"
                          readOnly
                          disabled
                          // Garantiza que siempre se muestre con dos decimales en UI
                          value={(parseFloat(field.value) || 0).toFixed(2)}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 mt-1">Total de producto vendido (no devuelto)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Mostrar las diferencias calculadas */}
              <div className="mt-4 p-3 border border-gray-200 rounded bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Diferencia de Efectivo</p>
                    <p className={`font-medium ${parseFloat(calculatedTotals.cashDifference) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      RD$ {calculatedTotals.cashDifference}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">(Efectivo recibido - Efectivo esperado)</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Producto Vendido</p>
                    <p className="font-medium">RD$ {form.getValues().totalInvoiced}</p>
                    <p className="text-xs text-gray-500 mt-1">Igual al Total Facturado</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Efectivo Esperado</p>
                    <p className="font-medium">
                      RD$ {calculatedTotals.expectedCash}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">(Inicial + Ventas en efectivo)</p>
                  </div>
                </div>
                
                {/* Botón para calcular manualmente */}
                <div className="mt-3 flex justify-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => calculateDifferences()}
                    className="flex items-center gap-1"
                  >
                    <Calculator className="h-4 w-4" />
                    Calcular Totales
                  </Button>
                </div>
              </div>
            </div>

            {/* Sección de Productos */}
            <div className="border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Productos y Envases</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-center">Cargado</th>
                      <th className="px-4 py-2 text-center">Devuelto</th>
                      <th className="px-4 py-2 text-center">Vendido</th>
                      <th className="px-4 py-2 text-center">
                        <div className="relative group cursor-help">
                          <span>Diferencia Producto</span>
                          <div className="hidden group-hover:block absolute z-10 w-60 p-2 bg-white border border-gray-200 rounded shadow-lg text-xs text-gray-700 left-1/2 transform -translate-x-1/2">
                            (Cargado - Devuelto) - Vendido. <br/>
                            <span className="text-green-600">Valor positivo:</span> Hay más productos registrados como disponibles que lo realmente vendido. <br/>
                            <span className="text-red-600">Valor negativo:</span> Hay menos productos disponibles que lo reportado como vendido.
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-2 text-center">Envases Devueltos</th>
                      <th className="px-4 py-2 text-center">
                        <div className="relative group cursor-help">
                          <span>Diferencia Envases</span>
                          <div className="hidden group-hover:block absolute z-10 w-60 p-2 bg-white border border-gray-200 rounded shadow-lg text-xs text-gray-700 left-1/2 transform -translate-x-1/2">
                            Vendido - Envases Devueltos. <br/>
                            <span className="text-red-600">Valor positivo:</span> Hay envases vendidos que no fueron devueltos. <br/>
                            <span className="text-green-600">Valor negativo:</span> Se devolvieron más envases de los reportados como vendidos.
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-2 text-center">¿Retornable?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.items.map((item, index) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-2">
                          {item.product?.name}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.returnedQuantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="text"
                                    inputMode="numeric"
                                    value={field.value}
                                    onChange={(e) => {
                                      // Solo permitir números enteros
                                      const value = e.target.value.replace(/\D/g, '');
                                      const intValue = parseInt(value) || 0;
                                      // Validar que no exceda el máximo
                                      const validValue = Math.min(intValue, item.quantity);
                                      field.onChange(validValue);
                                      updateSoldQuantity(index, validValue);
                                    }}
                                    className="w-20 mx-auto text-center"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.soldQuantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    // No pasamos {...field} para evitar eventos no deseados
                                    name={field.name}
                                    value={field.value}
                                    type="text"
                                    inputMode="numeric"
                                    readOnly
                                    disabled
                                    className="w-20 mx-auto text-center bg-gray-50"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productDifference`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    name={field.name}
                                    value={field.value}
                                    type="text"
                                    inputMode="numeric"
                                    readOnly
                                    disabled
                                    className={`w-20 mx-auto text-center ${
                                      Number(field.value || 0) !== 0 
                                        ? Number(field.value || 0) > 0 
                                          ? 'bg-green-50 text-green-700' 
                                          : 'bg-red-50 text-red-700'
                                        : 'bg-gray-50'
                                    }`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.product?.isReturnable ? (
                            <FormField
                              control={form.control}
                              name={`items.${index}.returnedContainers`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      {...field}
                                      type="text"
                                      inputMode="numeric"
                                      value={field.value}
                                      onChange={(e) => {
                                        // Solo permitir números enteros
                                        const value = e.target.value.replace(/\D/g, '');
                                        const intValue = parseInt(value) || 0;
                                        // Validar que no exceda el máximo
                                        const maxValue = form.getValues().items[index].soldQuantity;
                                        const validValue = Math.min(intValue, maxValue);
                                        field.onChange(validValue);
                                        
                                        // Actualizar la diferencia de envases
                                        const soldQuantity = form.getValues().items[index].soldQuantity;
                                        const containersDifference = soldQuantity - validValue;
                                        console.log(`Actualizando diferencia de envases para producto #${index}: ${containersDifference}`);
                                        form.setValue(`items.${index}.containersDifference`, containersDifference);
                                      }}
                                      // NO calcular automáticamente - dejarlo para el botón
                                      onBlur={() => {}}
                                      className="w-20 mx-auto text-center"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.product?.isReturnable ? (
                            <FormField
                              control={form.control}
                              name={`items.${index}.containersDifference`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      name={field.name}
                                      value={field.value}
                                      type="text"
                                      inputMode="numeric"
                                      readOnly
                                      disabled
                                      className={`w-20 mx-auto text-center ${
                                        Number(field.value || 0) !== 0 
                                          ? Number(field.value || 0) > 0 
                                            ? 'bg-red-50 text-red-700' 
                                            : 'bg-green-50 text-green-700'
                                          : 'bg-gray-50'
                                      }`}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.product?.isReturnable ? "Sí" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Observaciones sobre el cuadre de vehículo"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onSuccess}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Procesando..." : "Registrar Cuadre"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}