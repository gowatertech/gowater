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
import { BarChart4, Truck, Loader2, PillBottle, FileText, DollarSign, CreditCard, Calculator, MapPin } from "lucide-react";
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
    price?: number;
    isReturnable?: boolean;
    orderCount?: number;
    paymentTypes?: string[];
  }>;
  totalOrdersFound?: number;
  warningMessage?: string;
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
  const { data: settlementData, isLoading: isLoadingSettlementData, isError, error } = useQuery<SettlementResponse>({
    queryKey: ["/api/route-settlements", loading.id],
    enabled: !!loading.id,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  // Manejador para calcular diferencias y ajustes (definido con useCallback para evitar dependencias cíclicas)
  const calculateDifferences = useCallback(() => {
    console.log("=================== INICIO CÁLCULO ===================");
    console.log("calculateDifferences called");
    
    // Valores iniciales para limpiar el formulario antes de recalcular
    const cleanValues = {
      totalInvoiced: "0.00",
      totalCreditReceived: "0.00",
    };
    
    // Verificar si hay un mensaje de advertencia del backend
    if (settlementData?.warningMessage) {
      toast({
        title: "Advertencia",
        description: settlementData.warningMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Calculando totales",
        description: settlementData?.relatedOrders?.length 
          ? `Se encontraron ${settlementData.relatedOrders.length} órdenes completadas` 
          : "No se encontraron órdenes completadas para esta carga"
      });
    }
    
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
  }, [form, loading.items, loading.initialCash, loading.routeId, settlementData, toast]);
  
  // Verificar si los datos fueron cargados y mostrar información relevante
  useEffect(() => {
    if (settlementData) {
      // Hacemos una depuración detallada para ver exactamente qué estamos recibiendo
      console.log("👇 DATOS DE API COMPLETOS:", JSON.stringify(settlementData, null, 2));
      console.log("▶️ Órdenes relacionadas:", settlementData.relatedOrders?.length || 0);
      console.log("▶️ Devoluciones de envases:", settlementData.bottleReturns?.length || 0);
      console.log("▶️ Resumen de productos:", settlementData.productSummary?.length || 0);
      
      // Mostrar notificación con un resumen de los datos recibidos
      toast({
        title: "Datos cargados",
        description: `Se encontraron ${settlementData.relatedOrders?.length || 0} órdenes y ${settlementData.productSummary?.length || 0} productos.`,
        duration: 5000
      });
      
      // Si hay órdenes relacionadas, mostrar detalles para depuración
      if (settlementData.relatedOrders && settlementData.relatedOrders.length > 0) {
        console.log("➡️ ÓRDENES ENCONTRADAS:");
        settlementData.relatedOrders.forEach((order, index) => {
          console.log(`   Orden #${order.id}: status=${order.status}, route=${order.routeId}, total=${order.total}`);
          if (order.items && order.items.length > 0) {
            console.log(`      Items: ${order.items.length}`);
            order.items.forEach(item => {
              console.log(`         Item: ${item.productId}, cantidad: ${item.quantity}`);
            });
          } else {
            console.log("      ❌ Sin items");
          }
        });
      } else {
        console.log("⚠️ NO SE ENCONTRARON ÓRDENES RELACIONADAS");
      }
      
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

        // Ejecutar el cálculo de diferencias automáticamente cuando se cargan los datos
        // Esto automatiza el proceso para el supervisor
        setTimeout(() => {
          calculateDifferences();
          toast({
            title: "Datos cargados",
            description: "Se han calculado automáticamente los totales basados en las órdenes entregadas",
          });
        }, 500); // Pequeño retraso para asegurar que todos los datos estén disponibles
      } else {
        console.log("❌ No se encontró resumen de productos");
        toast({
          title: "Datos insuficientes",
          description: "No se encontraron detalles de productos vendidos para esta carga",
        });
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
  }, [settlementData, calculateDifferences, toast]);
  
  // Efecto para actualizar los valores de envases devueltos cuando se carguen los datos
  useEffect(() => {
    // Usamos la variable existente settlementData (declarada anteriormente)
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
      
      // Para la automatización completa, recalcular si hay actualizaciones
      if (updated) {
        // Ejecutar con un pequeño retraso para asegurar que todos los valores estén actualizados
        setTimeout(() => {
          calculateDifferences();
          toast({
            title: "Devoluciones actualizadas",
            description: "Se han actualizado las devoluciones de envases registradas por el conductor",
          });
        }, 600);
      }
    }
  }, [settlementData, form, calculateDifferences, toast]);
  
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
  // Este método ahora actualiza la diferencia de productos inmediatamente cuando cambia una cantidad
  const updateSoldQuantity = (index: number, returnedQuantity: number) => {
    // No modificamos soldQuantity automáticamente (se obtiene de las órdenes)
    console.log(`Cantidad devuelta actualizada para producto #${index}: ${returnedQuantity}`);
    
    // Actualizar la diferencia de productos al cambiar la cantidad devuelta
    const formItem = form.getValues().items[index];
    const loadedQuantity = formItem.loadedQuantity;
    const soldQuantity = formItem.soldQuantity;
    const productDifference = (loadedQuantity - returnedQuantity) - soldQuantity;
    console.log(`Actualizando diferencia de producto #${index}: ${productDifference}`);
    form.setValue(`items.${index}.productDifference`, productDifference);
    
    // También actualizar la diferencia de envases si corresponde (para productos retornables)
    const product = loading.items.find(item => item.productId === formItem.productId)?.product;
    if (product?.isReturnable) {
      form.setValue(`items.${index}.containersDifference`, soldQuantity - returnedQuantity);
    }
    
    // Recalcular totales automáticamente para una mejor experiencia
    // Añadido pequeño retraso para permitir que se actualice el formulario
    setTimeout(() => {
      calculateDifferences();
    }, 300);
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
        <div className="flex items-center justify-between">
          <CardTitle>Cuadre de Vehículo - Carga #{loading.loadingNumber}</CardTitle>
          {loading.routeId && (
            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              Ruta #{loading.routeId} {loading.route?.name && `- ${loading.route.name}`}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Información de la carga */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <div>
              <p className="text-sm text-gray-600">Ruta</p>
              <p className="font-medium">
                {loading.routeId ? (
                  <span className="text-blue-600">
                    #{loading.routeId} {loading.route?.name && `- ${loading.route.name}`}
                  </span>
                ) : (
                  <span className="text-gray-400">Sin ruta asignada</span>
                )}
              </p>
            </div>
          </div>
        </div>
        
        {/* Resumen del Cuadre */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Resumen de órdenes
            </h3>
            <Button
              type="button"
              onClick={calculateDifferences}
              className="flex items-center h-8 px-3 text-xs"
              variant="outline"
            >
              <Calculator className="h-4 w-4 mr-1" /> Recalcular
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
            <div className="bg-white p-3 rounded border flex flex-col justify-between">
              <div className="text-sm text-gray-500">Órdenes relacionadas</div>
              <div className="text-2xl font-bold text-center">
                {settlementData?.relatedOrders?.length || 0}
              </div>
              <div className="text-xs text-gray-500 text-right">
                {settlementData?.relatedOrders?.length > 0 
                  ? "Órdenes encontradas" 
                  : "No hay órdenes" }
              </div>
            </div>
            
            <div className="bg-white p-3 rounded border flex flex-col justify-between">
              <div className="text-sm text-gray-500">Total Facturado</div>
              <div className="text-2xl font-bold text-center text-green-600">
                RD$ {calculatedTotals.totalSold || "0.00"}
              </div>
              <div className="text-xs flex justify-between">
                <span className="text-gray-500">Efectivo: RD$ {calculatedTotals.cashSales || "0.00"}</span>
                <span className="text-gray-500">Crédito: RD$ {calculatedTotals.creditSales || "0.00"}</span>
              </div>
            </div>
            
            <div className={`bg-white p-3 rounded border flex flex-col justify-between ${
              parseFloat(calculatedTotals.cashDifference || "0") < 0 
                ? "border-red-300" 
                : parseFloat(calculatedTotals.cashDifference || "0") > 0 
                  ? "border-yellow-300" 
                  : "border-green-300"
            }`}>
              <div className="text-sm text-gray-500">Diferencia de Efectivo</div>
              <div className={`text-2xl font-bold text-center ${
                parseFloat(calculatedTotals.cashDifference || "0") < 0 
                  ? "text-red-600" 
                  : parseFloat(calculatedTotals.cashDifference || "0") > 0 
                    ? "text-yellow-600" 
                    : "text-green-600"
              }`}>
                RD$ {calculatedTotals.cashDifference || "0.00"}
              </div>
              <div className="text-xs text-gray-500 text-right">
                Esperado: RD$ {calculatedTotals.expectedCash || "0.00"}
              </div>
            </div>
          </div>
          
          {settlementData?.warningMessage && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-2">
              <p className="text-yellow-700 text-sm">
                ⚠️ {settlementData.warningMessage}
              </p>
            </div>
          )}
          
          {/* Resumen de productos vendidos */}
          {settlementData?.productSummary?.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <BarChart4 className="h-4 w-4 mr-1" /> 
                Resumen de productos vendidos
              </h4>
              <div className="bg-white rounded border overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">Producto</th>
                      <th className="px-2 py-1 text-center">Cantidad</th>
                      <th className="px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementData?.productSummary?.map((product, idx) => (
                      <tr key={`product-summary-${product.productId}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="px-2 py-1">{product.productName}</td>
                        <td className="px-2 py-1 text-center">{product.quantity}</td>
                        <td className="px-2 py-1 text-right">RD$ {product.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {isLoadingSettlementData ? (
          <div className="flex justify-center items-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
            <span>Cargando datos de devoluciones...</span>
          </div>
        ) : settlementData?.bottleReturns?.length > 0 ? (
          <div className="mb-6 border border-primary/20 bg-primary/5 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <PillBottle className="h-5 w-5 text-primary mr-2" />
              <h3 className="text-lg font-medium">Devoluciones de Envases Registradas</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Se encontraron {settlementData?.bottleReturns?.length || 0} devoluciones de envases registradas por el conductor.
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
                  {settlementData?.bottleReturns?.map((bottleReturn: ExtendedBottleReturn) => (
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
                            // Calcular automáticamente cuando el usuario termina de editar
                            calculateDifferences();
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
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left">Producto</th>
                      <th className="px-2 py-2 text-center">Cargado</th>
                      <th className="px-2 py-2 text-center">Devuelto</th>
                      <th className="px-2 py-2 text-center">Vendido</th>
                      <th className="px-2 py-2 text-center">Diferencia</th>
                      <th className="px-2 py-2 text-center">Envases Dev.</th>
                      <th className="px-2 py-2 text-center">Dif. Envases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.getValues().items.map((item, index) => {
                      const product = loading.items.find(i => i.productId === item.productId)?.product;
                      const isReturnable = product?.isReturnable || false;
                      
                      return (
                        <tr key={item.productId} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-2">
                            <div className="font-medium">{product?.name || `Producto #${item.productId}`}</div>
                            <div className="text-xs text-gray-500">{isReturnable ? 'Envase retornable' : 'No retornable'}</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FormField
                              control={form.control}
                              name={`items.${index}.loadedQuantity`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      className="w-20 m-auto text-center"
                                      readOnly
                                      disabled
                                      value={field.value}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FormField
                              control={form.control}
                              name={`items.${index}.returnedQuantity`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0"
                                      className="w-20 m-auto text-center"
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 0;
                                        field.onChange(value);
                                        updateSoldQuantity(index, value);
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FormField
                              control={form.control}
                              name={`items.${index}.soldQuantity`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      className="w-20 m-auto text-center bg-gray-50"
                                      readOnly
                                      disabled
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <FormField
                              control={form.control}
                              name={`items.${index}.productDifference`}
                              render={({ field }) => (
                                <FormItem className="m-0">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      className={`w-20 m-auto text-center ${field.value != 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}
                                      readOnly
                                      disabled
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isReturnable ? (
                              <FormField
                                control={form.control}
                                name={`items.${index}.returnedContainers`}
                                render={({ field }) => (
                                  <FormItem className="m-0">
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        min="0"
                                        className="w-20 m-auto text-center"
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 0;
                                          field.onChange(value);
                                          
                                          // Cuando cambian los envases devueltos, actualizar la diferencia de envases
                                          const soldQuantity = form.getValues().items[index].soldQuantity;
                                          form.setValue(`items.${index}.containersDifference`, soldQuantity - value);
                                          
                                          // Recalcular totales
                                          calculateDifferences();
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {isReturnable ? (
                              <FormField
                                control={form.control}
                                name={`items.${index}.containersDifference`}
                                render={({ field }) => (
                                  <FormItem className="m-0">
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        className={`w-20 m-auto text-center ${field.value != 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}
                                        readOnly
                                        disabled
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección de Notas y Comentarios */}
            <div className="border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Notas y Comentarios</h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentarios (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Añadir comentarios sobre el cuadre, justificaciones de diferencias, etc." 
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Operación cancelada",
                    description: "No se realizaron cambios en el sistema",
                  });
                  onSuccess();
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="flex items-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Completar Cuadre
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}