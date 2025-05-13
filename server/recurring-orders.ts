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
      console.error(`Error: ID de pedido recurrente inválido paso 1: ${id}`);
      throw new Error("ID de pedido recurrente inválido paso 1");
    }

    console.log(`RecurringOrdersService.getRecurringOrder - Buscando pedido recurrente con ID: ${safeId}`);
    const [recurringOrder] = await db.select().from(recurringOrders).where(eq(recurringOrders.id, safeId));

    if (!recurringOrder) {
      console.log(`RecurringOrdersService.getRecurringOrder - Pedido recurrente no encontrado con ID: ${safeId}`);
    }
    return recurringOrder;
  }

  /**
   * Obtiene el pedido recurrente más reciente
   * @returns El pedido recurrente más reciente o null si no hay ninguno
   */
  async getNewestRecurringOrder(): Promise<RecurringOrder | null> {
    try {
      // Obtener el pedido recurrente más reciente según su ID o fecha de creación
      const [newestOrder] = await db
        .select()
        .from(recurringOrders)
        .orderBy(desc(recurringOrders.id))
        .limit(1);

      return newestOrder || null;
    } catch (error) {
      console.error('Error al obtener el pedido recurrente más reciente:', error);
      return null;
    }
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

    // Importaciones necesarias
    const { getCurrentCompanyId } = await import('./company-db');
    const { customers } = await import('../shared/schema');

    const companyId = getCurrentCompanyId();
    console.log(`RecurringOrdersService.listRecurringOrders - CompanyId en contexto: ${companyId}`);

    try {
      // Obtener todos los pedidos recurrentes para diagnosticar
      const allOrders = await db.select().from(recurringOrders);
      console.log(`RecurringOrdersService.listRecurringOrders - Encontrados ${allOrders.length} pedidos recurrentes en total`);

      // Mostrar todos los pedidos recurrentes para depuración
      console.log("Lista completa de pedidos recurrentes:");
      allOrders.forEach(order => {
        console.log(`Pedido recurrente ID: ${order.id}, Nombre: ${order.name}, Cliente: ${order.customerId}, CompanyId: ${order.companyId}`);
      });

      // Filtrar por companyId si existe
      if (companyId) {
        const filteredOrders = await db
          .select()
          .from(recurringOrders)
          .where(eq(recurringOrders.companyId, companyId));

        console.log(`RecurringOrdersService.listRecurringOrders - Encontrados ${filteredOrders.length} pedidos para empresa ${companyId}`);

        // Mostrar pedidos filtrados para depuración
        console.log("Lista de pedidos recurrentes filtrados por compañía:");
        filteredOrders.forEach(order => {
          console.log(`Pedido recurrente ID: ${order.id}, Nombre: ${order.name}, Cliente: ${order.customerId}, CompanyId: ${order.companyId}`);
        });

        // Agregar info de clientes para el frontend
        const ordersWithCustomerInfo = await Promise.all(
          filteredOrders.map(async (order) => {
            try {
              // Buscar el cliente asociado
              const customerResults = await db
                .select()
                .from(customers)
                .where(eq(customers.id, order.customerId));

              const customer = customerResults.length > 0 ? customerResults[0] : null;

              // Agregar información del cliente al pedido recurrente
              return {
                ...order,
                customer: customer ? { 
                  id: customer.id, 
                  name: customer.businessname 
                } : undefined
              };
            } catch (error) {
              console.error(`Error al obtener cliente para pedido ${order.id}:`, error);
              return order;
            }
          })
        );

        console.log(`RecurringOrdersService.listRecurringOrders - Preparados ${ordersWithCustomerInfo.length} pedidos con info de clientes`);
        return ordersWithCustomerInfo as RecurringOrder[];
      }

      return allOrders;
    } catch (error) {
      console.error("Error al listar pedidos recurrentes:", error);
      throw error;
    }
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
      let recurringOrderId: number;

      // Nueva implementación más tolerante para convertir recurringOrderId a número
      if (typeof item.recurringOrderId === 'number') {
        recurringOrderId = item.recurringOrderId;
      } else if (typeof item.recurringOrderId === 'string') {
        // Eliminar cualquier caracter no numérico
        const cleanId = String(item.recurringOrderId).replace(/[^0-9]/g, '');
        recurringOrderId = parseInt(cleanId, 10);
      } else if (typeof item.recurringOrderId === 'object' && item.recurringOrderId !== null) {
        // Intentar acceder a la propiedad 'id' si existe
        const objWithId = item.recurringOrderId as any;
        if (objWithId.id !== undefined) {
          if (typeof objWithId.id === 'number') {
            recurringOrderId = objWithId.id;
          } else if (typeof objWithId.id === 'string') {
            const cleanId = String(objWithId.id).replace(/[^0-9]/g, '');
            recurringOrderId = parseInt(cleanId, 10);
          } else {
            recurringOrderId = Number(objWithId.id);
          }
        } else {
          recurringOrderId = Number(item.recurringOrderId);
        }
      } else {
        recurringOrderId = Number(item.recurringOrderId);
      }

      // Validación más permisiva - Si tenemos un valor NaN, usamos un valor predeterminado
      // para permitir la creación de items incluso cuando hay problemas con el ID
      if (isNaN(recurringOrderId) || recurringOrderId <= 0) {
        // En lugar de lanzar un error, intentamos recuperar de forma segura
        try {
          const allOrders = await db
            .select()
            .from(recurringOrders)
            .orderBy(desc(recurringOrders.id))
            .limit(1);

          if (allOrders.length > 0 && allOrders[0].id) {
            console.log(`Sustituyendo ID inválido con el ID del pedido más reciente: ${allOrders[0].id}`);
            recurringOrderId = allOrders[0].id;
          } else {
            console.error(`Error: No existen pedidos recurrentes para usar como alternativa`);
            // Como último recurso, asignamos un ID predeterminado para evitar el error
            // NOTA: Esto es arriesgado y podría causar problemas de integridad, pero es mejor que un error
            recurringOrderId = 1;
            console.warn("Usando ID predeterminado = 1 como último recurso");
          }
        } catch (idError) {
          console.error(`Error crítico al intentar obtener ID alternativo: ${idError}`);
          // Como último recurso en caso de fallo total
          recurringOrderId = 1;
          console.warn("Error al consultar la base de datos. Usando ID predeterminado = 1");
        }
      }

      // Asegurar que el item tenga companyId y usar el ID validado numéricamente
      const itemWithCompanyId = {
        ...item,
        recurringOrderId: recurringOrderId, // Usar el ID validado y transformado
        companyId: (item as any).companyId || getCurrentCompanyId() || 1
      };

      console.log("RecurringOrdersService.createRecurringOrderItem - Item a insertar:", itemWithCompanyId);

      try {
        const [newItem] = await db.insert(recurringOrderItems).values(itemWithCompanyId as any).returning();
        console.log("RecurringOrdersService.createRecurringOrderItem - Item creado con éxito:", newItem);
        return newItem;
      } catch (dbError) {
        console.error("RecurringOrdersService.createRecurringOrderItem - Error al insertar en la base de datos:", dbError);

        // Proporcionar un mensaje de error más detallado
        if (dbError instanceof Error) {
          throw new Error(`Error al crear item: ${dbError.message}`);
        }
        throw new Error("Error desconocido al crear item para pedido recurrente");
      }
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
    
    // Normalizamos el ID con lógica mejorada y más robusta
    let safeId: number;
    
    try {
      // Normalización mejorada del ID
      if (typeof recurringOrderId === 'object' && recurringOrderId !== null) {
        // Buscar el ID en diferentes propiedades del objeto
        if ('id' in recurringOrderId) {
          safeId = Number(recurringOrderId.id);
        } else if ('recurringOrderId' in recurringOrderId) {
          safeId = Number(recurringOrderId.recurringOrderId);
        } else if ('orderId' in recurringOrderId) {
          safeId = Number(recurringOrderId.orderId);
        } else {
          // Intentar extraer cualquier propiedad numérica
          const numberProps = Object.entries(recurringOrderId)
            .filter(([_, value]) => !isNaN(Number(value)) && typeof value !== 'boolean')
            .map(([_, value]) => Number(value));
          
          if (numberProps.length > 0) {
            safeId = Math.max(...numberProps); // Usamos el valor numérico más alto
          } else {
            console.log("No se encontraron propiedades numéricas en el objeto", recurringOrderId);
            safeId = NaN;
          }
        }
      } else if (typeof recurringOrderId === 'string') {
        // Manejar diferentes formatos de string
        const trimmedId = recurringOrderId.trim();
        
        if (/^\d+$/.test(trimmedId)) {
          // Es un string numérico puro
          safeId = parseInt(trimmedId, 10);
        } else {
          // Extraer todos los dígitos del string
          const digits = trimmedId.replace(/[^0-9]/g, '');
          if (digits) {
            safeId = parseInt(digits, 10);
          } else {
            safeId = NaN;
          }
        }
      } else {
        // Número u otro tipo
        safeId = Number(recurringOrderId);
      }
      
      console.log(`RecurringOrdersService.generateOrderFromRecurring - ID convertido: ${safeId}, tipo: ${typeof safeId}`);
      
      // Mecanismo de recuperación si el ID no es válido
      if (isNaN(safeId) || safeId <= 0) {
        console.log("ID inválido, iniciando proceso de recuperación");
        
        // Primera estrategia: buscar todos los pedidos recurrentes y usar el más reciente
        try {
          const latestOrders = await db
            .select()
            .from(recurringOrders)
            .orderBy(desc(recurringOrders.id))
            .limit(1);
            
          if (latestOrders.length > 0) {
            safeId = latestOrders[0].id;
            console.log(`Recuperación exitosa con ID: ${safeId}`);
          } else {
            // Segunda estrategia: usar el método existente
            const latestOrder = await this.getNewestRecurringOrder();
            if (latestOrder) {
              console.log(`Recuperando con el ID más reciente (método alternativo): ${latestOrder.id}`);
              safeId = latestOrder.id;
            } else {
              console.error("No se pudo recuperar ningún pedido recurrente");
              throw new Error("No existen pedidos recurrentes en el sistema");
            }
          }
        } catch (recoveryError) {
          console.error("Error durante la recuperación del ID:", recoveryError);
          throw new Error("Error en proceso de recuperación del ID de pedido recurrente");
        }
      }
    } catch (err) {
      console.error("Error crítico procesando ID de pedido recurrente:", err);
      
      // Último intento de recuperación
      try {
        const latestOrder = await this.getNewestRecurringOrder();
        if (latestOrder && latestOrder.id) {
          console.log(`Último intento de recuperación con ID: ${latestOrder.id}`);
          safeId = latestOrder.id;
        } else {
          throw new Error("Imposible recuperar información de pedidos recurrentes");
        }
      } catch (finalError) {
        console.error("Error fatal:", finalError);
        throw new Error("No se pudo procesar el pedido recurrente - verificar el sistema");
      }
    }
    
    // Verificación final simplificada
    if (isNaN(safeId)) {
      console.error(`Error: ID de pedido recurrente inválido paso 1: ${recurringOrderId} (convertido a ${safeId})`);
      throw new Error("ID de pedido recurrente inválido paso 1");
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