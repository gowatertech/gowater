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
        relatedOrders = await db
          .select()
          .from(orders)
          .where(eq(orders.routeId, loading.routeId))
          .orderBy(orders.createdAt);
      } 
      // Si no hay ruta asociada, usar el enfoque anterior basado en el conductor
      else if (loading.driverId) {
        // 1. Obtener las rutas asignadas al conductor desde que se creó la carga
        const driverRoutes = await db
          .select({
            id: routes.id
          })
          .from(routes)
          .where(eq(routes.driverId, loading.driverId));

        const routeIds = driverRoutes.map(route => route.id);
        
        if (routeIds.length > 0) {
          // 2. Obtener las órdenes asociadas a esas rutas
          relatedOrders = await db
            .select()
            .from(orders)
            .where(inArray(orders.routeId, routeIds))
            .orderBy(orders.createdAt);
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

      res.json({
        loading,
        relatedOrders,
        bottleReturns: bottleReturnData
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