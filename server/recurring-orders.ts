import { eq, desc } from "drizzle-orm";
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
    // Validar y convertir el ID para asegurar que sea un número entero válido
    const safeId = Number(id);
    if (isNaN(safeId) || safeId <= 0) {
      console.error(`Error: ID de pedido recurrente inválido: ${id}`);
      throw new Error("ID de pedido recurrente inválido");
    }
    
    console.log(`RecurringOrdersService.getRecurringOrder - Buscando pedido recurrente con ID: ${safeId}`);
    const [recurringOrder] = await db.select().from(recurringOrders).where(eq(recurringOrders.id, safeId));
    
    if (!recurringOrder) {
      console.log(`RecurringOrdersService.getRecurringOrder - Pedido recurrente no encontrado con ID: ${safeId}`);
    }
    return recurringOrder;
  }

  /**
   * Obtiene el siguiente ID para un pedido recurrente
   * @returns Número entero que representa el próximo ID disponible
   */
  async getNextRecurringOrderId(): Promise<number> {
    const orders = await db
      .select({ id: recurringOrders.id })
      .from(recurringOrders)
      .orderBy(desc(recurringOrders.id))
      .limit(1);

    return orders.length > 0 ? orders[0].id + 1 : 1;
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
      
      // Obtener el siguiente ID
      const nextId = await this.getNextRecurringOrderId();
      console.log("RecurringOrdersService.createRecurringOrder - Siguiente ID:", nextId);
      
      const recurringOrderData = {
        id: nextId, // Usar el siguiente ID secuencial
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
    console.log("RecurringOrdersService.listRecurringOrders - Obteniendo todos los pedidos recurrentes");
    
    // Importar getCurrentCompanyId para verificar contexto actual
    const { getCurrentCompanyId } = await import('./company-db');
    const companyId = getCurrentCompanyId();
    
    console.log(`RecurringOrdersService.listRecurringOrders - CompanyId en contexto: ${companyId}`);
    
    // Obtener todos los pedidos recurrentes para diagnosticar
    const allOrders = await db.select().from(recurringOrders);
    console.log(`RecurringOrdersService.listRecurringOrders - Encontrados ${allOrders.length} pedidos recurrentes en total`);
    allOrders.forEach(order => {
      console.log(`Pedido recurrente ID: ${order.id}, Nombre: ${order.name}, CompanyId: ${order.companyId}`);
    });
    
    // Filtrar por companyId si existe
    if (companyId) {
      const filteredOrders = await db
        .select()
        .from(recurringOrders)
        .where(eq(recurringOrders.companyId, companyId));
      
      console.log(`RecurringOrdersService.listRecurringOrders - Encontrados ${filteredOrders.length} pedidos para empresa ${companyId}`);
      return filteredOrders;
    }
    
    return allOrders;
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
      
      // Validar y asegurar que el ID del pedido recurrente sea un número válido
      let recurringOrderId = item.recurringOrderId;
      
      // Verificar que recurringOrderId sea un número válido
      if (typeof recurringOrderId === 'string') {
        recurringOrderId = parseInt(recurringOrderId, 10);
      } else if (typeof recurringOrderId === 'object' && recurringOrderId !== null) {
        // Intentar acceder a 'id' si existe, pero con comprobación segura
        const objWithId = recurringOrderId as any;
        if (objWithId.id !== undefined) {
          recurringOrderId = Number(objWithId.id);
        }
      } else {
        recurringOrderId = Number(recurringOrderId);
      }
      
      if (isNaN(recurringOrderId) || recurringOrderId <= 0) {
        console.error(`Error: ID de pedido recurrente inválido para item: ${JSON.stringify(item)}`);
        throw new Error("ID de pedido recurrente inválido");
      }
      
      // Asegurar que el item tenga companyId
      const itemWithCompanyId = {
        ...item,
        recurringOrderId: recurringOrderId, // Usar el ID validado
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

  async generateOrderFromRecurring(recurringOrderId: any): Promise<Order> {
    console.log(`RecurringOrdersService.generateOrderFromRecurring - Iniciando con ID: ${recurringOrderId}`);
    
    // Ser extremadamente permisivo con el formato de ID (acepta string, number, e incluso objetos con .toString)
    let safeId: number;
    
    // Si viene un objeto que tiene un campo ID, intentar usarlo también
    if (typeof recurringOrderId === 'object' && recurringOrderId !== null) {
      // Intentar acceder a 'id' si existe, pero con comprobación segura
      const objWithId = recurringOrderId as any;
      if (objWithId.id !== undefined) {
        safeId = Number(objWithId.id);
      } else {
        safeId = Number(recurringOrderId);
      }
    } else {
      // Eliminar posibles caracteres no numéricos si es string
      if (typeof recurringOrderId === 'string') {
        const cleanId = recurringOrderId.replace(/[^0-9]/g, '');
        safeId = parseInt(cleanId, 10);
      } else {
        safeId = Number(recurringOrderId);
      }
    }
    
    // Última verificación - solo validamos que sea un número válido mayor que 0
    if (isNaN(safeId) || safeId <= 0) {
      console.error(`Error: ID de pedido recurrente inválido: ${recurringOrderId} (convertido a ${safeId})`);
      throw new Error("ID de pedido recurrente inválido");
    }
    
    console.log(`RecurringOrdersService - Usando ID normalizado: ${safeId}`)
    
    // Obtener el pedido recurrente
    const [recurringOrder] = await db
      .select()
      .from(recurringOrders)
      .where(eq(recurringOrders.id, safeId));

    if (!recurringOrder) {
      console.error(`Error: Pedido recurrente #${safeId} no encontrado`);
      throw new Error("Pedido recurrente no encontrado");
    }

    console.log(`RecurringOrdersService - Pedido recurrente encontrado:`, recurringOrder);

    // Obtener los items del pedido recurrente usando el safeId
    const recurringItems = await db
      .select()
      .from(recurringOrderItems)
      .where(eq(recurringOrderItems.recurringOrderId, safeId));

    if (recurringItems.length === 0) {
      console.error(`Error: El pedido recurrente #${safeId} no tiene productos`);
      throw new Error("El pedido recurrente no tiene productos");
    }

    console.log(`RecurringOrdersService - Items del pedido recurrente:`, recurringItems);

    // Importar la función para obtener el companyId actual
    const { getCurrentCompanyId } = await import('./company-db');
    const companyId = recurringOrder.companyId || getCurrentCompanyId() || 1;
    
    console.log(`RecurringOrdersService - Usando companyId:`, companyId);
    
    // Crear un nuevo pedido usando nomenclatura camelCase
    const newOrderData = {
      customerId: recurringOrder.customerId,
      companyId: companyId,
      total: recurringOrder.totalAmount,
      status: "pending" as const,
      paymentMethod: recurringOrder.paymentMethod,
      date: new Date(),
      routeId: null,
      notes: `Pedido generado automáticamente desde pedido recurrente #${safeId}: ${recurringOrder.name}`,
      cashCollected: "0.00",
      driverCommission: "0.00",
      assistantCommission: "0.00",
      recurringOrderId: safeId,
    };

    console.log(`RecurringOrdersService - Creando nuevo pedido:`, newOrderData);

    // Insertar el nuevo pedido
    const [order] = await db.insert(orders).values([newOrderData]).returning();
    
    console.log(`RecurringOrdersService - Pedido creado:`, order);

    // Insertar los items del pedido con nomenclatura camelCase
    for (const item of recurringItems) {
      const orderItemData = {
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.toString(),
        companyId: companyId,
        total: (parseFloat(item.price) * item.quantity).toFixed(2),
      };
      
      console.log(`RecurringOrdersService - Creando item para el pedido:`, orderItemData);
      await db.insert(orderItems).values([orderItemData]);
    }

    // Actualizar la fecha de última generación y próxima generación
    const lastGenDate = new Date();
    const nextGenDate = this.calculateNextGenerationDate(
      lastGenDate,
      recurringOrder.frequency,
      recurringOrder.dayOfWeek,
      recurringOrder.dayOfMonth
    );

    console.log(`RecurringOrdersService - Actualizando fechas para el pedido recurrente #${safeId}`);
    
    await db
      .update(recurringOrders)
      .set({ 
        lastGeneratedDate: lastGenDate,
        nextGenerationDate: nextGenDate,
        updatedAt: new Date()
      })
      .where(eq(recurringOrders.id, safeId));

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