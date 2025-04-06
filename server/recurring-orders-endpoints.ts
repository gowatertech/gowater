import { Express, Request, Response } from "express";
import { db } from "./db";
import {
  recurringOrders,
  recurringOrderItems,
  recurringOrderExceptions,
  recurringOrderHistory,
  insertRecurringOrderSchema,
  insertRecurringOrderItemSchema,
  insertRecurringOrderExceptionSchema
} from "@shared/schema-recurring-orders";
import {
  customers,
  products,
  orders,
  orderItems
} from "@shared/schema";
import { eq, and, lt, gte, inArray } from "drizzle-orm";
import { addDays, format, parseISO, getDay, getDate } from "date-fns";

export function registerRecurringOrdersEndpoints(app: Express) {
  // Obtener todos los pedidos recurrentes
  app.get("/api/recurring-orders", async (req: Request, res: Response) => {
    try {
      const allRecurringOrders = await db
        .select({
          id: recurringOrders.id,
          name: recurringOrders.name,
          customerId: recurringOrders.customerId,
          customerName: customers.businessname,
          status: recurringOrders.status,
          frequency: recurringOrders.frequency,
          startDate: recurringOrders.startDate,
          endDate: recurringOrders.endDate,
          nextDeliveryDate: recurringOrders.nextDeliveryDate,
          totalGeneratedOrders: recurringOrders.totalGeneratedOrders,
          zoneId: recurringOrders.zoneId,
          lastGeneratedDate: recurringOrders.lastGeneratedDate,
          notifyCustomer: recurringOrders.notifyCustomer
        })
        .from(recurringOrders)
        .leftJoin(customers, eq(recurringOrders.customerId, customers.id))
        .orderBy(recurringOrders.nextDeliveryDate);
      
      // Si estamos obteniendo datos del endpoint existente, transformamos para tener compatibilidad
      const legacyEndpoint = req.query.legacy === 'true';
      if (legacyEndpoint) {
        const legacyFormat = allRecurringOrders.map(order => ({
          id: order.id,
          customerId: order.customerId,
          frequency: order.frequency,
          nextDeliveryDate: order.nextDeliveryDate,
          customerName: order.customerName,
          order: order.name,
          isActive: order.status === "active"
        }));
        return res.json(legacyFormat);
      }
      
      res.json(allRecurringOrders);
    } catch (error) {
      console.error("Error al obtener pedidos recurrentes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Obtener un pedido recurrente por ID
  app.get("/api/recurring-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Obtener datos principales del pedido recurrente
      const recurringOrder = await db.query.recurringOrders.findFirst({
        where: eq(recurringOrders.id, id),
        with: {
          customer: true
        }
      });

      if (!recurringOrder) {
        return res.status(404).json({ error: "Pedido recurrente no encontrado" });
      }

      // Obtener items del pedido
      const items = await db
        .select({
          id: recurringOrderItems.id,
          productId: recurringOrderItems.productId,
          quantity: recurringOrderItems.quantity,
          price: recurringOrderItems.price,
          notes: recurringOrderItems.notes,
          productName: products.name,
          productIcon: products.icon,
          isReturnable: products.isReturnable
        })
        .from(recurringOrderItems)
        .leftJoin(products, eq(recurringOrderItems.productId, products.id))
        .where(eq(recurringOrderItems.recurringOrderId, id));

      // Obtener excepciones
      const exceptions = await db
        .select()
        .from(recurringOrderExceptions)
        .where(eq(recurringOrderExceptions.recurringOrderId, id))
        .orderBy(recurringOrderExceptions.exceptionDate);

      // Obtener historial de pedidos generados
      const history = await db
        .select({
          id: recurringOrderHistory.id,
          generatedOrderId: recurringOrderHistory.generatedOrderId,
          scheduledDate: recurringOrderHistory.scheduledDate,
          generatedDate: recurringOrderHistory.generatedDate,
          status: recurringOrderHistory.status,
          notes: recurringOrderHistory.notes,
          orderTotal: orders.total,
          orderStatus: orders.status
        })
        .from(recurringOrderHistory)
        .leftJoin(orders, eq(recurringOrderHistory.generatedOrderId, orders.id))
        .where(eq(recurringOrderHistory.recurringOrderId, id))
        .orderBy(recurringOrderHistory.scheduledDate);

      res.json({
        ...recurringOrder,
        items,
        exceptions,
        history
      });
    } catch (error) {
      console.error("Error al obtener pedido recurrente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Crear un nuevo pedido recurrente
  app.post("/api/recurring-orders", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/recurring-orders - Datos recibidos:", JSON.stringify(req.body, null, 2));
      
      // Validar y extraer los datos del pedido recurrente
      const { items, exceptions, ...recurringOrderData } = req.body;
      
      // Añadir nextDeliveryDate si no se proporcionó
      if (!recurringOrderData.nextDeliveryDate) {
        recurringOrderData.nextDeliveryDate = recurringOrderData.startDate;
      }
      
      // Validar el pedido recurrente con el esquema insertRecurringOrderSchema
      const validatedData = insertRecurringOrderSchema.parse(recurringOrderData);
      
      // Crear el pedido recurrente
      const [newRecurringOrder] = await db
        .insert(recurringOrders)
        .values(validatedData)
        .returning();

      console.log("Pedido recurrente creado:", newRecurringOrder);
      
      // Crear los items si existen
      if (items && Array.isArray(items) && items.length > 0) {
        console.log(`Insertando ${items.length} items para el pedido recurrente #${newRecurringOrder.id}`);
        
        for (const item of items) {
          const validatedItem = insertRecurringOrderItemSchema.parse({
            ...item,
            recurringOrderId: newRecurringOrder.id
          });
          
          await db
            .insert(recurringOrderItems)
            .values(validatedItem);
        }
      }
      
      // Crear las excepciones si existen
      if (exceptions && Array.isArray(exceptions) && exceptions.length > 0) {
        console.log(`Insertando ${exceptions.length} excepciones para el pedido recurrente #${newRecurringOrder.id}`);
        
        for (const exception of exceptions) {
          const validatedException = insertRecurringOrderExceptionSchema.parse({
            ...exception,
            recurringOrderId: newRecurringOrder.id
          });
          
          await db
            .insert(recurringOrderExceptions)
            .values(validatedException);
        }
      }
      
      // Devolver el pedido recurrente completo
      const completeRecurringOrder = await db.query.recurringOrders.findFirst({
        where: eq(recurringOrders.id, newRecurringOrder.id),
        with: {
          customer: true
        }
      });
      
      res.status(201).json(completeRecurringOrder);
    } catch (error) {
      console.error("Error al crear pedido recurrente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar un pedido recurrente
  app.patch("/api/recurring-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      console.log(`PATCH /api/recurring-orders/${id} - Datos recibidos:`, JSON.stringify(req.body, null, 2));
      
      // Extraer items y excepciones para procesarlos por separado
      const { items, exceptions, ...updateData } = req.body;
      
      // Actualizar el pedido recurrente
      const [updatedRecurringOrder] = await db
        .update(recurringOrders)
        .set({ 
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(recurringOrders.id, id))
        .returning();
        
      if (!updatedRecurringOrder) {
        return res.status(404).json({ error: "Pedido recurrente no encontrado" });
      }
      
      // Si se proporcionaron nuevos items, eliminar los existentes y agregar los nuevos
      if (items && Array.isArray(items)) {
        // Eliminar items existentes
        await db
          .delete(recurringOrderItems)
          .where(eq(recurringOrderItems.recurringOrderId, id));
          
        // Agregar nuevos items
        for (const item of items) {
          await db
            .insert(recurringOrderItems)
            .values({
              ...item,
              recurringOrderId: id
            });
        }
      }
      
      // Si se proporcionaron nuevas excepciones, actualizar
      if (exceptions && Array.isArray(exceptions)) {
        for (const exception of exceptions) {
          if (exception.id) {
            // Actualizar excepción existente
            await db
              .update(recurringOrderExceptions)
              .set(exception)
              .where(eq(recurringOrderExceptions.id, exception.id));
          } else {
            // Crear nueva excepción
            await db
              .insert(recurringOrderExceptions)
              .values({
                ...exception,
                recurringOrderId: id
              });
          }
        }
      }
      
      res.json(updatedRecurringOrder);
    } catch (error) {
      console.error("Error al actualizar pedido recurrente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Eliminar un pedido recurrente
  app.delete("/api/recurring-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Eliminar primero los items y excepciones (relaciones)
      await db
        .delete(recurringOrderItems)
        .where(eq(recurringOrderItems.recurringOrderId, id));
        
      await db
        .delete(recurringOrderExceptions)
        .where(eq(recurringOrderExceptions.recurringOrderId, id));
        
      // Actualizar el historial para desvincular la relación
      await db
        .update(recurringOrderHistory)
        .set({ recurringOrderId: null })
        .where(eq(recurringOrderHistory.recurringOrderId, id));
      
      // Finalmente eliminar el pedido recurrente
      const [deletedRecurringOrder] = await db
        .delete(recurringOrders)
        .where(eq(recurringOrders.id, id))
        .returning();
        
      if (!deletedRecurringOrder) {
        return res.status(404).json({ error: "Pedido recurrente no encontrado" });
      }
      
      res.json({ success: true, message: "Pedido recurrente eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar pedido recurrente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Agregar una excepción a un pedido recurrente
  app.post("/api/recurring-orders/:id/exceptions", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      console.log(`POST /api/recurring-orders/${id}/exceptions - Datos recibidos:`, JSON.stringify(req.body, null, 2));
      
      const exceptionData = {
        ...req.body,
        recurringOrderId: id
      };
      
      const validatedException = insertRecurringOrderExceptionSchema.parse(exceptionData);
      
      const [newException] = await db
        .insert(recurringOrderExceptions)
        .values(validatedException)
        .returning();
        
      res.status(201).json(newException);
    } catch (error) {
      console.error("Error al agregar excepción:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Generar órdenes para pedidos recurrentes que deben crearse hoy o están pendientes
  app.post("/api/recurring-orders/generate", async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Encontrar todos los pedidos recurrentes activos cuya próxima entrega es hoy o anterior
      const pendingRecurringOrders = await db
        .select()
        .from(recurringOrders)
        .where(
          and(
            eq(recurringOrders.status, "active"),
            lt(recurringOrders.nextDeliveryDate, new Date(today.getTime() + 24 * 60 * 60 * 1000)) // hasta mañana
          )
        );
        
      console.log(`Se encontraron ${pendingRecurringOrders.length} pedidos recurrentes pendientes`);
      
      const results = [];
      
      for (const recurringOrder of pendingRecurringOrders) {
        // Verificar si hay una excepción para esta fecha
        const exceptionDate = format(new Date(recurringOrder.nextDeliveryDate), 'yyyy-MM-dd');
        const exception = await db
          .select()
          .from(recurringOrderExceptions)
          .where(
            and(
              eq(recurringOrderExceptions.recurringOrderId, recurringOrder.id),
              eq(recurringOrderExceptions.exceptionDate, new Date(exceptionDate))
            )
          )
          .limit(1);
          
        // Si hay una excepción de tipo "skip", saltamos este pedido
        if (exception.length > 0 && exception[0].exceptionType === "skip") {
          console.log(`Saltando pedido recurrente #${recurringOrder.id} por excepción de tipo skip`);
          
          // Actualizar la próxima fecha de entrega según la frecuencia
          const nextDate = calculateNextDeliveryDate(recurringOrder);
          
          await db
            .update(recurringOrders)
            .set({ 
              nextDeliveryDate: nextDate
            })
            .where(eq(recurringOrders.id, recurringOrder.id));
            
          results.push({
            recurringOrderId: recurringOrder.id,
            action: "skipped",
            reason: "exception",
            nextDeliveryDate: nextDate
          });
          
          continue;
        }
        
        // Si hay una excepción de tipo "reschedule", actualizamos la próxima fecha de entrega
        if (exception.length > 0 && exception[0].exceptionType === "reschedule" && exception[0].newDate) {
          console.log(`Reprogramando pedido recurrente #${recurringOrder.id} por excepción`);
          
          await db
            .update(recurringOrders)
            .set({ 
              nextDeliveryDate: exception[0].newDate
            })
            .where(eq(recurringOrders.id, recurringOrder.id));
            
          results.push({
            recurringOrderId: recurringOrder.id,
            action: "rescheduled",
            reason: "exception",
            nextDeliveryDate: exception[0].newDate
          });
          
          continue;
        }
        
        // Obtener los items del pedido recurrente
        const items = await db
          .select({
            productId: recurringOrderItems.productId,
            quantity: recurringOrderItems.quantity,
            price: recurringOrderItems.price
          })
          .from(recurringOrderItems)
          .where(eq(recurringOrderItems.recurringOrderId, recurringOrder.id));
          
        if (items.length === 0) {
          console.log(`El pedido recurrente #${recurringOrder.id} no tiene items, no se puede generar`);
          results.push({
            recurringOrderId: recurringOrder.id,
            action: "skipped",
            reason: "no_items"
          });
          continue;
        }
        
        // Modificar los items según la excepción si es de tipo "modify"
        if (exception.length > 0 && exception[0].exceptionType === "modify" && exception[0].modifiedItems) {
          try {
            const modifiedItems = JSON.parse(exception[0].modifiedItems);
            // Aquí aplicar modificaciones a items según la excepción
            console.log(`Aplicando modificaciones a los items del pedido recurrente #${recurringOrder.id}`);
            
            for (const modifiedItem of modifiedItems) {
              const index = items.findIndex(item => item.productId === modifiedItem.productId);
              if (index !== -1) {
                items[index].quantity = modifiedItem.quantity || items[index].quantity;
                if (modifiedItem.price) items[index].price = modifiedItem.price;
              }
            }
          } catch (e) {
            console.error(`Error al parsear modified_items de la excepción:`, e);
          }
        }
        
        // Calcular el total
        let total = 0;
        for (const item of items) {
          const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
          total += price * item.quantity;
        }
        
        // Crear el pedido
        const [newOrder] = await db
          .insert(orders)
          .values({
            customerId: recurringOrder.customerId,
            total: total.toFixed(2),
            status: "pending",
            paymentMethod: "cash", // Por defecto, se podría personalizar más adelante
            date: new Date(),
            notes: `Pedido recurrente #${recurringOrder.id}`,
            recurringOrderId: recurringOrder.id
          })
          .returning();
          
        console.log(`Pedido #${newOrder.id} creado a partir del pedido recurrente #${recurringOrder.id}`);
        
        // Crear los items del pedido
        for (const item of items) {
          await db
            .insert(orderItems)
            .values({
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: typeof item.price === 'string' ? item.price : (item.price || 0).toFixed(2)
            });
        }
        
        // Registrar en el historial
        const [historyEntry] = await db
          .insert(recurringOrderHistory)
          .values({
            recurringOrderId: recurringOrder.id,
            generatedOrderId: newOrder.id,
            scheduledDate: recurringOrder.nextDeliveryDate,
            status: "created"
          })
          .returning();
          
        // Actualizar el pedido recurrente: próxima fecha de entrega, última generada y contador
        const nextDate = calculateNextDeliveryDate(recurringOrder);
        
        await db
          .update(recurringOrders)
          .set({ 
            nextDeliveryDate: nextDate,
            lastGeneratedDate: new Date(),
            totalGeneratedOrders: recurringOrder.totalGeneratedOrders + 1
          })
          .where(eq(recurringOrders.id, recurringOrder.id));
          
        results.push({
          recurringOrderId: recurringOrder.id,
          generatedOrderId: newOrder.id,
          action: "created",
          nextDeliveryDate: nextDate
        });
      }
      
      res.json({
        success: true,
        totalProcessed: pendingRecurringOrders.length,
        results
      });
    } catch (error) {
      console.error("Error al generar órdenes recurrentes:", error);
      res.status(500).json({ error: String(error) });
    }
  });
}

// Función auxiliar para calcular la próxima fecha de entrega según la frecuencia
function calculateNextDeliveryDate(recurringOrder: any): Date {
  const currentDate = new Date(recurringOrder.nextDeliveryDate);
  
  switch (recurringOrder.frequency) {
    case "daily":
      return addDays(currentDate, 1);
      
    case "weekly":
      // Si hay días específicos de la semana configurados
      if (recurringOrder.weekdays) {
        try {
          const weekdays = recurringOrder.weekdays.split(',').map(Number);
          if (weekdays.length > 0) {
            const currentDayOfWeek = getDay(currentDate); // 0 = domingo, 1 = lunes, ...
            
            // Encontrar el próximo día de la semana configurado
            let daysToAdd = 1;
            let nextDayFound = false;
            
            for (let i = 1; i <= 7; i++) {
              const checkDay = (currentDayOfWeek + i) % 7;
              if (weekdays.includes(checkDay)) {
                daysToAdd = i;
                nextDayFound = true;
                break;
              }
            }
            
            if (nextDayFound) {
              return addDays(currentDate, daysToAdd);
            }
          }
        } catch (e) {
          console.error("Error al procesar weekdays:", e);
        }
      }
      
      // Por defecto, una semana
      return addDays(currentDate, 7);
      
    case "biweekly":
      return addDays(currentDate, 14);
      
    case "monthly":
      // Si hay días específicos del mes configurados
      if (recurringOrder.monthDays) {
        try {
          const monthDays = recurringOrder.monthDays.split(',').map(Number);
          if (monthDays.length > 0) {
            const currentDayOfMonth = getDate(currentDate);
            
            // Copiar la fecha actual para no modificarla
            const nextDate = new Date(currentDate);
            
            // Avanzar al siguiente mes
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextDate.setDate(1); // Primer día del siguiente mes
            
            // Encontrar el primer día configurado en el siguiente mes
            const nextMonthDay = monthDays.find(day => day > 0 && day <= 31) || 1;
            nextDate.setDate(nextMonthDay);
            
            return nextDate;
          }
        } catch (e) {
          console.error("Error al procesar monthDays:", e);
        }
      }
      
      // Por defecto, un mes (aproximadamente 30 días)
      const nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      return nextDate;
      
    case "custom":
      // Si hay días personalizados configurados
      if (recurringOrder.frequencyDays && recurringOrder.frequencyDays > 0) {
        return addDays(currentDate, recurringOrder.frequencyDays);
      }
      
      // Por defecto, una semana
      return addDays(currentDate, 7);
      
    default:
      return addDays(currentDate, 7); // Por defecto, una semana
  }
}