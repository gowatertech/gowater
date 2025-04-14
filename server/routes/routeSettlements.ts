import { Express, Request, Response } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { vehicleLoading, vehicleLoadingItems, routes, orders, bottleReturns, products } from "@shared/schema";

export async function registerRouteSettlements(app: Express) {
  // Crear nuevo cuadre de vehículo
  app.post("/api/route-settlements", async (req: Request, res: Response) => {
    try {
      const { vehicleLoadingId, totalCashReceived, totalCreditReceived, totalInvoiced, notes, items, cashDifference } = req.body;

      // Validar datos básicos
      if (!vehicleLoadingId || !totalCashReceived || !totalCreditReceived || !totalInvoiced || !items || !Array.isArray(items)) {
        return res.status(400).json({
          error: "Datos incompletos o inválidos",
          message: "Todos los campos requeridos deben ser proporcionados"
        });
      }

      // 1. Verificar que la carga exista y esté pendiente
      const loading = await db.query.vehicleLoading.findFirst({
        where: and(
          eq(vehicleLoading.id, vehicleLoadingId),
          eq(vehicleLoading.status, "pending")
        )
      });

      if (!loading) {
        return res.status(404).json({
          error: "Carga no encontrada",
          message: "La carga especificada no existe o ya ha sido completada"
        });
      }

      // 2. Actualizar estado de la carga a "completed"
      await db
        .update(vehicleLoading)
        .set({
          status: "completed",
          completedAt: new Date().toISOString()
        })
        .where(eq(vehicleLoading.id, vehicleLoadingId));

      // 3. Actualizar las cantidades devueltas de cada item
      for (const item of items) {
        await db
          .update(vehicleLoadingItems)
          .set({
            returnedQuantity: item.returnedQuantity
          })
          .where(and(
            eq(vehicleLoadingItems.loadingId, vehicleLoadingId),
            eq(vehicleLoadingItems.productId, item.productId)
          ));
      }

      // 4. Obtener la carga actualizada con todos sus items
      const updatedLoading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, vehicleLoadingId),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true
        }
      });

      // 5. Responder con la carga actualizada
      res.json({
        message: "Cuadre de vehículo completado exitosamente",
        loading: updatedLoading,
        settlement: {
          vehicleLoadingId,
          totalCashReceived,
          totalCreditReceived,
          totalInvoiced,
          cashDifference,
          notes,
          settlementDate: new Date().toISOString(),
          status: "completed"
        }
      });
    } catch (error) {
      console.error("Error al procesar cuadre de vehículo:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        message: String(error)
      });
    }
  });

  // Obtener cuadre de vehículo por ID de carga
  app.get("/api/route-settlements/:loadingId", async (req: Request, res: Response) => {
    try {
      const loadingId = parseInt(req.params.loadingId);
      
      // Obtener la carga con sus items y la ruta asociada
      const loading = await db.query.vehicleLoading.findFirst({
        where: eq(vehicleLoading.id, loadingId),
        with: {
          items: {
            with: {
              product: true
            }
          },
          truck: true,
          driver: true,
          route: true
        }
      });

      if (!loading) {
        return res.status(404).json({
          error: "Carga no encontrada",
          message: "La carga especificada no existe"
        });
      }

      // Obtenemos las devoluciones de envases para las órdenes del conductor
      let bottleReturnData: any[] = [];
      // Inicializar el array de órdenes relacionadas
      let relatedOrders: any[] = [];
      
      // Si tenemos una ruta asociada a la carga, obtenemos sus órdenes
      if (loading.routeId) {
        console.log(`Buscando órdenes para la ruta ID: ${loading.routeId}`);
        
        // 1. Obtener todas las órdenes de la ruta
        const ordersData = await db
          .select()
          .from(orders)
          .where(eq(orders.routeId, loading.routeId));
        
        console.log(`Encontradas ${ordersData.length} órdenes para la ruta ${loading.routeId}`);
        
        // 2. Obtener todos los items de todas las órdenes de una vez
        const orderIds = ordersData.map(order => order.id);
        
        if (orderIds.length > 0) {
          console.log(`Buscando items para ${orderIds.length} órdenes (IDs: ${orderIds.join(', ')})`);
          
          const allOrderItems = await db
            .select()
            .from(schema.orderItems)
            .where(inArray(schema.orderItems.orderId, orderIds));
          
          console.log(`Encontrados ${allOrderItems.length} items en total para todas las órdenes`);
          
          // 3. Obtener todos los productos de una vez para evitar consultas individuales
          const productIds = [...new Set(allOrderItems.map(item => item.productId))];
          
          const productsData = await db
            .select()
            .from(products)
            .where(inArray(products.id, productIds));
          
          console.log(`Datos de ${productsData.length} productos recuperados`);
          
          // 4. Crear mapa de productos para acceso rápido
          const productsMap = new Map();
          for (const product of productsData) {
            productsMap.set(product.id, product);
            console.log(`Producto ID: ${product.id}, Nombre: ${product.name}, Precio: ${product.price}`);
          }
          
          // 5. Agrupar items por orden
          const orderItemsMap = new Map();
          for (const item of allOrderItems) {
            if (!orderItemsMap.has(item.orderId)) {
              orderItemsMap.set(item.orderId, []);
              console.log(`Creando array para Orden ID: ${item.orderId}`);
            }
            
            // Adjuntar información del producto al item
            const product = productsMap.get(item.productId);
            
            if (!product) {
              console.log(`⚠️ ADVERTENCIA: No se encontró información del producto ID ${item.productId}`);
            }
            
            const itemWithProduct = {
              ...item,
              productName: product?.name || `Producto #${item.productId}`,
              price: product?.price || "0.00",
              isReturnable: product?.isReturnable || false,
              product: product || null
            };
            
            console.log(`Item de Orden ${item.orderId}: productId=${item.productId}, cantidad=${item.quantity}, nombre=${itemWithProduct.productName}, precio=${itemWithProduct.price}`);
            
            orderItemsMap.get(item.orderId).push(itemWithProduct);
          }
          
          // 6. Construir órdenes completas con sus items
          relatedOrders = ordersData.map(order => {
            return {
              ...order,
              items: orderItemsMap.get(order.id) || []
            };
          });
          
          console.log(`Órdenes procesadas con sus items: ${relatedOrders.length}`);
          
          // 7. Generar resumen de ventas por producto
          const productSummary = [];
          const productQuantityMap = new Map();
          
          // Recorrer todas las órdenes y sus items
          for (const order of relatedOrders) {
            if (order.items && order.items.length > 0) {
              for (const item of order.items) {
                const productId = item.productId;
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                
                if (!productQuantityMap.has(productId)) {
                  const product = productsMap.get(productId);
                  productQuantityMap.set(productId, {
                    productId,
                    productName: product?.name || `Producto #${productId}`,
                    quantity: 0,
                    total: 0
                  });
                }
                
                const currentData = productQuantityMap.get(productId);
                currentData.quantity += quantity;
                currentData.total += quantity * price;
                
                productQuantityMap.set(productId, currentData);
              }
            }
          }
          
          // Convertir el mapa a un array para la respuesta
          for (const productData of productQuantityMap.values()) {
            productSummary.push(productData);
          }
          
          console.log("Resumen de ventas por producto:", productSummary);
          
          // Añadir el resumen a la respuesta
          relatedOrders.forEach(order => {
            // Solo mostrar algunos campos para depuración
            console.log(`Orden #${order.id}: ${order.status}, total=${order.total}, items=${order.items.length}`);
          });
        } else {
          console.log("No se encontraron órdenes para esta ruta");
        }
      } 
      // Si no hay ruta asociada, usar el enfoque anterior basado en el conductor
      else if (loading.driverId) {
        console.log(`No hay ruta asociada a la carga, buscando órdenes del conductor ID: ${loading.driverId}`);
        
        // MEJORA: Forzar un array con al menos un ID válido para el caso de no tener rutas
        // Esto permitirá que se busquen órdenes directamente del conductor sin importar la ruta
        
        // 1. Obtener las rutas asignadas al conductor desde que se creó la carga
        const driverRoutes = await db
          .select({
            id: routes.id
          })
          .from(routes)
          .where(eq(routes.driverId, loading.driverId));

        let routeIds = driverRoutes.map(route => route.id);
        
        // Si no hay rutas, usar un truco: buscar TODAS las órdenes del conductor
        if (routeIds.length === 0) {
          console.log("El conductor no tiene rutas asociadas, buscando sus órdenes directamente");
          // Incluir un ID falso (999999) para que la consulta IN funcione, pero usar el conductor como filtro adicional
          routeIds = [999999]; // ID que seguramente no existe
        }
        
        if (routeIds.length > 0) {
          // 2. Obtener las órdenes asociadas a esas rutas (o al conductor si usamos el ID falso)
          // MEJORA: Si usamos el ID falso (999999), entonces buscar directamente por el conductor
          let ordersData;
          
          // Si el único ID es el falso (999999), buscar por driverId directamente
          if (routeIds.length === 1 && routeIds[0] === 999999) {
            console.log(`Buscando órdenes directamente por conductor ID: ${loading.driverId}`);
            // Nota: No existe el campo driverId o createdAt en el schema, esto requerirá actualización del schema
            ordersData = await db
              .select()
              .from(orders)
              // No podemos usar driverId o createdAt hasta actualizar el schema
              .where(sql`driver_id = ${loading.driverId}`)
              .orderBy(sql`created_at`);
          } else {
            // Buscar normalmente por routeId usando la cláusula IN
            ordersData = await db
              .select()
              .from(orders)
              .where(inArray(orders.routeId, routeIds))
              .orderBy(orders.createdAt);
          }
          
          // Para cada orden, obtener sus productos (items)
          relatedOrders = await Promise.all(ordersData.map(async (order) => {
            // Consultar los items de esta orden
            const orderItems = await db
              .select()
              .from(schema.orderItems)
              .where(eq(schema.orderItems.orderId, order.id));
            
            // Para cada item, obtener la información del producto
            const itemsWithProductInfo = await Promise.all(orderItems.map(async (item) => {
              const productData = await db
                .select()
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1);
              
              const product = productData.length > 0 ? productData[0] : null;
              
              return {
                ...item,
                name: product?.name || `Producto #${item.productId}`,
                isReturnable: product?.isReturnable || false
              };
            }));
            
            // Retornar la orden con sus items
            return {
              ...order,
              items: itemsWithProductInfo  // Incluir los items en la orden
            };
          }));
          
          console.log(`Obtenidas ${relatedOrders.length} órdenes relacionadas con el conductor ${loading.driverId}`);
        }
      }
      
      // Obtener devoluciones de envases si hay órdenes relacionadas
      if (relatedOrders.length > 0) {
        const orderIds = relatedOrders.map(order => order.id);
          
        // Obtener todas las devoluciones de envases para esas órdenes
        const returns = await db
          .select()
          .from(bottleReturns)
          .where(inArray(bottleReturns.orderId, orderIds));
              
        // Para cada devolución, obtener el nombre del producto correspondiente
        bottleReturnData = await Promise.all(
          returns.map(async (bottleReturn) => {
            // Buscar el producto por ID
            const product = await db
              .select({ name: products.name })
              .from(products)
              .where(eq(products.id, bottleReturn.productId))
              .then(results => results[0]);
                
            // Devolver la devolución con el nombre del producto
            return {
              ...bottleReturn,
              productName: product?.name || `Producto #${bottleReturn.productId}`
            };
          })
        );
      }

      // Crear un resumen de productos vendidos para facilitar el cuadre
      const productSummary = [];
      const productMap = new Map();
      
      console.log("DEBUG - Generando resumen de productos vendidos");
      console.log(`DEBUG - Total de órdenes a procesar: ${relatedOrders.length}`);
            
      // Recorrer todas las órdenes y sus items
      for (const order of relatedOrders) {
        // Solo incluir órdenes entregadas o completadas
        const orderStatus = (order.status || "").toLowerCase();
        const isValidStatus = orderStatus === "delivered" || 
                             orderStatus === "completed" || 
                             orderStatus.includes("deliver");
        
        console.log(`DEBUG - Orden #${order.id}: status=${order.status}, isValidStatus=${isValidStatus}`);
        
        if (isValidStatus) {
          console.log(`DEBUG - ✅ Procesando orden #${order.id} (${orderStatus})`);
              
          // Procesar los items de la orden si existen
          if (order.items && Array.isArray(order.items)) {
            console.log(`DEBUG - La orden #${order.id} tiene ${order.items.length} items`);
            
            for (const item of order.items) {
              const productId = item.productId;
              const quantity = Number(item.quantity) || 0;
              const price = Number(item.price) || 0;
              
              console.log(`DEBUG - Item: producto=${productId}, cantidad=${quantity}, precio=${price}`);
                    
              // Si es la primera vez que vemos este producto
              if (!productMap.has(productId)) {
                productMap.set(productId, {
                  productId,
                  productName: item.productName || item.name || `Producto #${productId}`,
                  quantity: 0,
                  total: 0
                });
              }
                    
              // Actualizar la cantidad y el total
              const product = productMap.get(productId);
              product.quantity += quantity;
              product.total += quantity * price;
              console.log(`DEBUG - Actualizado producto ${productId}: cantidad=${product.quantity}, total=${product.total}`);
              productMap.set(productId, product);
            }
          } else {
            console.log(`DEBUG - ⚠️ La orden #${order.id} no tiene items o no son un array`);
          }
        } else {
          console.log(`DEBUG - ❌ Orden #${order.id} ignorada por status=${orderStatus}`);
        }
      }
            
      // Convertir el mapa a un array para la respuesta
      productMap.forEach(product => {
        productSummary.push(product);
      });
            
      console.log("Resumen final de ventas:", productSummary);
            
      res.json({
        loading,
        relatedOrders,
        bottleReturns: bottleReturnData,
        productSummary  // Incluir el resumen en la respuesta
      });
    } catch (error) {
      console.error("Error al obtener cuadre de vehículo:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        message: String(error)
      });
    }
  });
}