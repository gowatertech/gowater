import { eq } from "drizzle-orm";
import { db } from "./db";
import { 
  recurringOrders, 
  recurringOrderItems,
  orders,
  orderItems,
  InsertRecurringOrder, 
  RecurringOrder, 
  RecurringOrderItem, 
  InsertRecurringOrderItem,
  InsertOrder,
  Order,
  InsertOrderItem
} from "../shared/schema";

class RecurringOrdersService {
  async getRecurringOrder(id: number): Promise<RecurringOrder | undefined> {
    const [recurringOrder] = await db.select().from(recurringOrders).where(eq(recurringOrders.id, id));
    return recurringOrder;
  }

  async createRecurringOrder(recurringOrder: InsertRecurringOrder): Promise<RecurringOrder> {
    try {
      console.log("RecurringOrdersService.createRecurringOrder - Datos recibidos:", recurringOrder);
      
      if (!recurringOrder.customerId || recurringOrder.customerId <= 0) {
        throw new Error("Se requiere un cliente válido");
      }
      
      if (!recurringOrder.frequency) {
        throw new Error("Se requiere una frecuencia válida");
      }
      
      const totalAmount = parseFloat(recurringOrder.totalAmount);
      if (isNaN(totalAmount)) {
        throw new Error("El monto total debe ser un número válido");
      }

      // Asegurarse de que todos los campos numéricos sean números
      const dayOfWeek = recurringOrder.dayOfWeek !== undefined ? 
        (typeof recurringOrder.dayOfWeek === 'string' ? 
          parseInt(recurringOrder.dayOfWeek) : recurringOrder.dayOfWeek) : null;
      
      const dayOfMonth = recurringOrder.dayOfMonth !== undefined ? 
        (typeof recurringOrder.dayOfMonth === 'string' ? 
          parseInt(recurringOrder.dayOfMonth) : recurringOrder.dayOfMonth) : null;

      // Importar la función para obtener el companyId actual
      const { getCurrentCompanyId } = await import('./company-db');
      const companyId = (recurringOrder as any).companyId || getCurrentCompanyId() || 1;
      
      const recurringOrderData = {
        ...recurringOrder,
        companyId, // Asegurar que exista companyId
        dayOfWeek: dayOfWeek,
        dayOfMonth: dayOfMonth,
        startDate: new Date(recurringOrder.startDate),
        endDate: recurringOrder.endDate ? new Date(recurringOrder.endDate) : null,
        totalAmount: totalAmount.toFixed(2), // Asegurar formato correcto
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("RecurringOrdersService.createRecurringOrder - Datos formateados:", recurringOrderData);

      // Calcular la próxima fecha de generación basada en la frecuencia
      const nextGenDate = this.calculateNextGenerationDate(
        new Date(recurringOrder.startDate), 
        recurringOrder.frequency,
        dayOfWeek,
        dayOfMonth
      );

      // Añadir la fecha de próxima generación
      (recurringOrderData as any).nextGenerationDate = nextGenDate;

      console.log("RecurringOrdersService.createRecurringOrder - Insertando en la base de datos");
      const [newRecurringOrder] = await db.insert(recurringOrders).values(recurringOrderData as any).returning();
      console.log("RecurringOrdersService.createRecurringOrder - Orden creada:", newRecurringOrder);
      
      return newRecurringOrder;
    } catch (error) {
      console.error('Error en createRecurringOrder:', error);
      throw error;
    }
  }

  async listRecurringOrders(): Promise<RecurringOrder[]> {
    return db.select().from(recurringOrders);
  }

  async listCustomerRecurringOrders(customerId: number): Promise<RecurringOrder[]> {
    return db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.customerId, customerId));
  }

  async updateRecurringOrder(id: number, data: Partial<InsertRecurringOrder>): Promise<RecurringOrder> {
    const [recurringOrder] = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.id, id));

    if (!recurringOrder) throw new Error("Pedido recurrente no encontrado");

    // Preparar datos para actualización
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Convertir fechas si se proporcionan
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
      
      // Recalcular la próxima fecha de generación si cambia la fecha de inicio
      const nextGenDate = this.calculateNextGenerationDate(
        new Date(data.startDate),
        data.frequency || recurringOrder.frequency,
        data.dayOfWeek !== undefined ? data.dayOfWeek : recurringOrder.dayOfWeek,
        data.dayOfMonth !== undefined ? data.dayOfMonth : recurringOrder.dayOfMonth
      );
      
      updateData.nextGenerationDate = nextGenDate;
    }

    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    // Actualizar el monto total si se proporciona
    if (data.totalAmount) {
      const totalAmount = parseFloat(data.totalAmount);
      if (isNaN(totalAmount)) {
        throw new Error("El monto total debe ser un número válido");
      }
      updateData.totalAmount = totalAmount.toString();
    }

    const [updatedRecurringOrder] = await db
      .update(recurringOrders)
      .set(updateData)
      .where(eq(recurringOrders.id, id))
      .returning();

    return updatedRecurringOrder;
  }

  async updateRecurringOrderStatus(id: number, status: "active" | "paused" | "completed" | "cancelled"): Promise<RecurringOrder> {
    const [recurringOrder] = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.id, id));

    if (!recurringOrder) throw new Error("Pedido recurrente no encontrado");

    const [updatedRecurringOrder] = await db
      .update(recurringOrders)
      .set({ 
        status,
        updatedAt: new Date() 
      })
      .where(eq(recurringOrders.id, id))
      .returning();

    return updatedRecurringOrder;
  }

  async deleteRecurringOrder(id: number): Promise<void> {
    // Primero eliminar todos los elementos del pedido recurrente
    await db
      .delete(recurringOrderItems)
      .where(eq(recurringOrderItems.recurringOrderId, id));

    // Luego eliminar el pedido recurrente
    await db
      .delete(recurringOrders)
      .where(eq(recurringOrders.id, id));
  }

  // Recurring Order Items Methods
  async createRecurringOrderItem(item: InsertRecurringOrderItem): Promise<RecurringOrderItem> {
    try {
      // Importar la función para obtener el companyId actual
      const { getCurrentCompanyId } = await import('./company-db');
      
      // Asegurar que el item tenga companyId
      const itemWithCompanyId = {
        ...item,
        companyId: (item as any).companyId || getCurrentCompanyId() || 1
      };
      
      console.log("RecurringOrdersService.createRecurringOrderItem - Item a insertar:", itemWithCompanyId);
      const [newItem] = await db.insert(recurringOrderItems).values(itemWithCompanyId as any).returning();
      return newItem;
    } catch (error) {
      console.error('Error en createRecurringOrderItem:', error);
      throw error;
    }
  }

  async listRecurringOrderItems(recurringOrderId: number): Promise<RecurringOrderItem[]> {
    return db
      .select()
      .from(recurringOrderItems)
      .where(eq(recurringOrderItems.recurringOrderId, recurringOrderId));
  }

  async updateRecurringOrderItem(id: number, item: Partial<InsertRecurringOrderItem>): Promise<RecurringOrderItem> {
    const [updatedItem] = await db
      .update(recurringOrderItems)
      .set(item)
      .where(eq(recurringOrderItems.id, id))
      .returning();

    return updatedItem;
  }

  async deleteRecurringOrderItem(id: number): Promise<void> {
    await db
      .delete(recurringOrderItems)
      .where(eq(recurringOrderItems.id, id));
  }

  async generateOrderFromRecurring(recurringOrderId: number): Promise<Order> {
    // Modificado: Aceptar cualquier valor numérico que pueda ser convertido a número entero
    const safeId = Math.floor(Number(recurringOrderId));
    
    if (isNaN(safeId)) {
      console.error(`Error: ID de pedido recurrente no es un número: ${recurringOrderId}`);
      throw new Error("ID de pedido recurrente debe ser un número");
    }
    
    console.log(`RecurringOrdersService.generateOrderFromRecurring - Iniciando generación con ID: ${recurringOrderId}`);
    
    // Obtener el pedido recurrente
    const [recurringOrder] = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.id, recurringOrderId));

    if (!recurringOrder) {
      console.error(`Error: Pedido recurrente #${recurringOrderId} no encontrado`);
      throw new Error("Pedido recurrente no encontrado");
    }

    console.log(`RecurringOrdersService - Pedido recurrente encontrado:`, recurringOrder);

    // Obtener los items del pedido recurrente
    const recurringItems = await db
      .select()
      .from(recurringOrderItems)
      .where(eq(recurringOrderItems.recurringOrderId, recurringOrderId));

    if (recurringItems.length === 0) {
      console.error(`Error: El pedido recurrente #${recurringOrderId} no tiene productos`);
      throw new Error("El pedido recurrente no tiene productos");
    }

    console.log(`RecurringOrdersService - Items del pedido recurrente:`, recurringItems);

    // Importar la función para obtener el companyId actual
    const { getCurrentCompanyId } = await import('./company-db');
    const companyId = recurringOrder.companyId || getCurrentCompanyId() || 1;
    
    console.log(`RecurringOrdersService - Usando companyId:`, companyId);
    
    // Crear un nuevo pedido directamente con DB en lugar de usar storage
    const newOrder = {
      customerId: recurringOrder.customerId,
      companyId: companyId,
      total: recurringOrder.totalAmount,
      status: "pending" as const,
      paymentMethod: recurringOrder.paymentMethod,
      date: new Date(), // Usar Date directamente en lugar de string
      routeId: null, // No asignado a una ruta inicialmente
      notes: `Pedido generado automáticamente desde pedido recurrente #${recurringOrderId}: ${recurringOrder.name}`,
      cashCollected: "0.00",
      driverCommission: "0.00",
      assistantCommission: "0.00",
    };

    console.log(`RecurringOrdersService - Creando nuevo pedido:`, newOrder);

    // Insertar el nuevo pedido directamente con DB
    const [order] = await db.insert(orders).values(newOrder).returning();
    
    console.log(`RecurringOrdersService - Pedido creado:`, order);

    // Insertar los items del pedido directamente con DB
    for (const item of recurringItems) {
      const orderItem = {
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.toString(),
        companyId: companyId,
        total: (parseFloat(item.price) * item.quantity).toFixed(2), // Calcular el total
      };
      
      console.log(`RecurringOrdersService - Creando item para el pedido:`, orderItem);
      await db.insert(orderItems).values(orderItem);
    }

    // Actualizar la fecha de última generación y próxima generación
    const lastGenDate = new Date();
    const nextGenDate = this.calculateNextGenerationDate(
      lastGenDate,
      recurringOrder.frequency,
      recurringOrder.dayOfWeek,
      recurringOrder.dayOfMonth
    );

    console.log(`RecurringOrdersService - Actualizando fechas para el pedido recurrente #${recurringOrderId}`);
    
    await db
      .update(recurringOrders)
      .set({ 
        lastGeneratedDate: lastGenDate,
        nextGenerationDate: nextGenDate,
        updatedAt: new Date()
      })
      .where(eq(recurringOrders.id, recurringOrderId));

    console.log(`RecurringOrdersService - Proceso completado exitosamente`);
    
    return order;
  }

  // Método auxiliar para calcular la próxima fecha de generación
  private calculateNextGenerationDate(
    startDate: Date,
    frequency: string,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null
  ): Date {
    const nextDate = new Date(startDate);
    
    switch (frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      
      case "weekly":
        if (dayOfWeek !== undefined && dayOfWeek !== null) {
          // Establecer al próximo día de la semana especificado
          const currentDay = nextDate.getDay(); // 0 = domingo, 1 = lunes, etc.
          const daysToAdd = (7 + dayOfWeek - currentDay) % 7;
          nextDate.setDate(nextDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
        } else {
          // Si no se especifica el día, simplemente agregar 7 días
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;
      
      case "biweekly":
        if (dayOfWeek !== undefined && dayOfWeek !== null) {
          // Primero ajustar al día de la semana correcto
          const currentDay = nextDate.getDay();
          const daysToAdd = (7 + dayOfWeek - currentDay) % 7;
          nextDate.setDate(nextDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
          // Luego agregar otra semana para hacerlo quincenal
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          // Si no se especifica el día, simplemente agregar 14 días
          nextDate.setDate(nextDate.getDate() + 14);
        }
        break;
      
      case "monthly":
        if (dayOfMonth !== undefined && dayOfMonth !== null) {
          // Avanzar al mes siguiente
          nextDate.setMonth(nextDate.getMonth() + 1);
          // Establecer el día del mes
          const maxDaysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          // Asegurarse de que el día no exceda los días del mes
          nextDate.setDate(Math.min(dayOfMonth, maxDaysInMonth));
        } else {
          // Si no se especifica el día, simplemente avanzar un mes manteniendo el mismo día
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
      
      default:
        // Para cualquier otro caso, simplemente devolver la fecha de inicio
        return startDate;
    }
    
    return nextDate;
  }
}

export const recurringOrdersService = new RecurringOrdersService();