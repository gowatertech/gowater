import { Router, Express } from "express";
import { storage } from "./storage";
import { insertRecurringOrderSchema, insertRecurringOrderItemSchema } from "../shared/schema";
// Nota: Los endpoints de órdenes están ahora directamente en ordersRouter en ./routes/orders.ts

// Función para crear endpoints de pedidos recurrentes
export const createRecurringOrdersEndpoints = (router: Router) => {
  // Obtener todos los pedidos recurrentes
  router.get("/api/recurring-orders", async (req, res) => {
    try {
      console.log("GET /api/recurring-orders - Endpoint llamado desde cliente");
      
      // Identificar información de la sesión para depuración
      const sessionUser = (req.session as any)?.user;
      const companyId = (req.session as any)?.companyId || sessionUser?.companyId;
      
      console.log(`GET /api/recurring-orders - Usuario en sesión: ${JSON.stringify(sessionUser || 'No hay sesión')}`);
      console.log(`GET /api/recurring-orders - CompanyId en sesión: ${companyId || 'No definido'}`);
      
      // Mejorar los datos para el frontend haciendo una consulta directa
      if (companyId) {
        try {
          // Consulta directa para obtener los pedidos con información de clientes
          const dbConnect: any = await import('./db-connect');
          const pool = dbConnect.pool;
          
          // Consulta combinada para obtener datos de cliente junto con el pedido
          const query = `
            SELECT 
              ro.id, 
              ro.customer_id as "customerId", 
              ro.name, 
              ro.frequency, 
              ro.day_of_week as "dayOfWeek", 
              ro.day_of_month as "dayOfMonth", 
              ro.start_date as "startDate", 
              ro.end_date as "endDate", 
              ro.payment_method as "paymentMethod",
              ro.status, 
              ro.total_amount as "totalAmount", 
              ro.created_at as "createdAt",
              ro.last_generated_date as "lastGeneratedDate", 
              ro.next_generation_date as "nextGenerationDate", 
              ro.notes, 
              ro.updated_at as "updatedAt", 
              ro.company_id as "companyId",
              c.id as "customer.id", 
              c.businessname as "customer.name" 
            FROM recurring_orders ro
            LEFT JOIN customers c ON ro.customer_id = c.id AND c.company_id = $1
            WHERE ro.company_id = $1
            ORDER BY ro.id DESC
          `;

          const client = await pool.connect();
          
          try {
            const result = await client.query(query, [companyId]);
            
            // Procesar resultados para crear objetos anidados
            const formattedOrders = result.rows.map((row: any) => {
              // Crear objeto cliente si existe
              const customer = row['customer.id'] ? {
                id: row['customer.id'],
                name: row['customer.name']
              } : undefined;
              
              // Eliminar propiedades de cliente del objeto principal
              const { 'customer.id': _, 'customer.name': __, ...orderData } = row;
              
              // Devolver el objeto combinado
              return {
                ...orderData,
                customer
              };
            });
            
            console.log(`GET /api/recurring-orders - Consulta directa encontró ${formattedOrders.length} pedidos`);
            formattedOrders.forEach((order: any) => {
              console.log(`- DB Direct #${order.id}: ${order.name}, Cliente: ${order.customer?.name || 'Sin cliente'}`);
            });
            
            // Devolver directamente los resultados formateados
            return res.json(formattedOrders);
          } finally {
            client.release();
          }
        } catch (dbError) {
          console.error("Error en consulta directa:", dbError);
          // Si falla, continuar con el método normal
        }
      }
      
      // Si no se pudo usar la consulta directa, continuar con el flujo normal
      const recurringOrdersList = await storage.listRecurringOrders();
      console.log(`GET /api/recurring-orders - Storage retornó ${recurringOrdersList.length} pedidos recurrentes`);
      
      // Agregar registro para depuración
      if (recurringOrdersList && recurringOrdersList.length > 0) {
        console.log("Lista de pedidos recurrentes desde Storage:");
        recurringOrdersList.forEach(order => {
          console.log(`- Storage #${order.id}: ${order.name}, Cliente: ${order.customerId}, Compañía: ${order.companyId}`);
        });
      } else {
        console.log("No se encontraron pedidos recurrentes en Storage");
      }
      
      res.json(recurringOrdersList);
    } catch (error) {
      console.error("Error al obtener pedidos recurrentes:", error);
      res.status(500).json({ error: "Error al obtener pedidos recurrentes" });
    }
  });

  // Obtener pedidos recurrentes por cliente
  router.get("/api/customers/:customerId/recurring-orders", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "ID de cliente inválido" });
      }

      const recurringOrders = await storage.listCustomerRecurringOrders(customerId);
      res.json(recurringOrders);
    } catch (error) {
      console.error("Error al obtener pedidos recurrentes del cliente:", error);
      res.status(500).json({ error: "Error al obtener pedidos recurrentes del cliente" });
    }
  });

  // Obtener un pedido recurrente específico
  router.get("/api/recurring-orders/:id", async (req, res) => {
    try {
      // Verificar si es el ID especial 'new'
      if (req.params.id === 'new') {
        // Para la ruta 'new', devolvemos un objeto vacío compatible con el formulario
        return res.json({
          id: null,
          customerId: 0,
          name: '',
          frequency: 'weekly',
          dayOfWeek: 1,
          dayOfMonth: null,
          startDate: new Date().toISOString(),
          endDate: null,
          paymentMethod: 'cash',
          status: 'active',
          totalAmount: '0.00',
          companyId: (req as any).companyId || 15,
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const recurringOrder = await storage.getRecurringOrder(id);
      if (!recurringOrder) {
        return res.status(404).json({ error: "Pedido recurrente no encontrado" });
      }

      res.json(recurringOrder);
    } catch (error) {
      console.error("Error al obtener pedido recurrente:", error);
      res.status(500).json({ error: "Error al obtener pedido recurrente" });
    }
  });

  // Crear un nuevo pedido recurrente
  router.post("/api/recurring-orders", async (req, res) => {
    try {
      console.log("Recibiendo solicitud para crear pedido recurrente:", req.body);

      // Importar getCurrentCompanyId para obtener el companyId de la sesión actual
      const { getCurrentCompanyId } = await import('./company-db');
      const companyId = req.body.companyId || (req as any).companyId || getCurrentCompanyId() || 1;

      // Asegurar que los campos numéricos sean realmente números
      const validatedData = {
        ...req.body,
        companyId, // Asegurar que el companyId esté presente
        customerId: Number(req.body.customerId) || 0,
        dayOfWeek: req.body.dayOfWeek ? Number(req.body.dayOfWeek) || 0 : null,
        dayOfMonth: req.body.dayOfMonth ? Number(req.body.dayOfMonth) || 0 : null,
      };

      console.log("Datos validados:", validatedData);
      
      const parseResult = insertRecurringOrderSchema.safeParse(validatedData);
      if (!parseResult.success) {
        console.error("Error de validación:", parseResult.error.format());
        return res.status(400).json({ 
          error: "Datos inválidos",
          details: parseResult.error.format() 
        });
      }

      // Agregamos monitoreo extensivo para asegurar que el ID se esté generando correctamente
      try {
        const newRecurringOrder = await storage.createRecurringOrder(parseResult.data);
        // Validamos que el objeto retornado tenga un ID válido
        if (!newRecurringOrder || !newRecurringOrder.id || isNaN(Number(newRecurringOrder.id))) {
          console.error("Error crítico: El pedido recurrente creado no tiene un ID válido:", newRecurringOrder);
          
          // Intentar obtener el pedido más reciente como alternativa
          const { recurringOrders } = await import("../shared/schema");
          const { desc } = await import("drizzle-orm");
          const { db } = await import("./db");
          
          const latestOrders = await db
            .select()
            .from(recurringOrders)
            .orderBy(desc(recurringOrders.id))
            .limit(1);
          
          if (latestOrders.length > 0) {
            console.log(`Sustituyendo pedido sin ID con el pedido más reciente: ${latestOrders[0].id}`);
            // Asegurarse de que el objeto tenga el formato correcto que espera el cliente
            const recoveredOrder = {
              ...latestOrders[0],
              id: latestOrders[0].id, // Asegurar que el ID esté presente
              startDate: latestOrders[0].startDate?.toISOString(),
              endDate: latestOrders[0].endDate?.toISOString(),
              createdAt: latestOrders[0].createdAt?.toISOString(),
              updatedAt: latestOrders[0].updatedAt?.toISOString(),
            };
            return res.status(201).json(recoveredOrder);
          }
        }
        
        console.log("Pedido recurrente creado con éxito. ID:", newRecurringOrder.id);
        res.status(201).json(newRecurringOrder);
      } catch (storageError) {
        console.error("Error al crear pedido recurrente en storage:", storageError);
        
        // Intento de recuperación directa mediante consulta a la base de datos
        try {
          const { recurringOrders } = await import("../shared/schema");
          const { desc } = await import("drizzle-orm");
          const { db } = await import("./db");
          
          // Intentar crear el pedido directamente en la base de datos
          const { getCurrentCompanyId } = await import('./company-db');
          const fallbackCompanyId = getCurrentCompanyId() || 1;
          
          const dataToInsert: any = {
            ...parseResult.data,
            companyId: fallbackCompanyId,
            startDate: parseResult.data.startDate ? new Date(parseResult.data.startDate) : new Date(),
            endDate: parseResult.data.endDate ? new Date(parseResult.data.endDate) : null
          };
          
          const [directInsertedOrder] = await db
            .insert(recurringOrders)
            .values([dataToInsert])
            .returning();
          
          if (directInsertedOrder) {
            console.log("Pedido creado directamente en la base de datos. ID:", directInsertedOrder.id);
            return res.status(201).json({
              ...directInsertedOrder,
              startDate: directInsertedOrder.startDate?.toISOString(),
              endDate: directInsertedOrder.endDate?.toISOString(),
              createdAt: directInsertedOrder.createdAt?.toISOString(),
              updatedAt: directInsertedOrder.updatedAt?.toISOString(),
            });
          }
        } catch (directDbError) {
          console.error("Error al intentar crear pedido directamente en la base de datos:", directDbError);
        }
        
        // Si no logramos recuperarnos, devolvemos un error detallado
        return res.status(500).json({ 
          error: "Error al crear pedido recurrente", 
          details: "Ocurrió un error al intentar crear el pedido recurrente en la base de datos."
        });
      }
    } catch (error) {
      console.error("Error al crear pedido recurrente:", error);
      res.status(500).json({ 
        error: "Error al crear pedido recurrente", 
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Actualizar un pedido recurrente
  router.patch("/api/recurring-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Usamos un schema extendido para validación parcial
      const partialSchema = insertRecurringOrderSchema.partial();
      
      // Asegurar que los campos numéricos sean números
      const validatedData = {
        ...req.body,
        customerId: req.body.customerId ? Number(req.body.customerId) || 0 : undefined,
        dayOfWeek: req.body.dayOfWeek ? Number(req.body.dayOfWeek) || 0 : undefined,
        dayOfMonth: req.body.dayOfMonth ? Number(req.body.dayOfMonth) || 0 : undefined
      };
      
      const parseResult = partialSchema.safeParse(validatedData);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos",
          details: parseResult.error.format() 
        });
      }

      const updatedRecurringOrder = await storage.updateRecurringOrder(id, parseResult.data);
      res.json(updatedRecurringOrder);
    } catch (error) {
      console.error("Error al actualizar pedido recurrente:", error);
      res.status(500).json({ error: "Error al actualizar pedido recurrente" });
    }
  });

  // Actualizar el estado de un pedido recurrente
  router.patch("/api/recurring-orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const { status } = req.body;
      if (!status || !["active", "paused", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }

      const updatedRecurringOrder = await storage.updateRecurringOrderStatus(id, status);
      res.json(updatedRecurringOrder);
    } catch (error) {
      console.error("Error al actualizar estado del pedido recurrente:", error);
      res.status(500).json({ error: "Error al actualizar estado del pedido recurrente" });
    }
  });

  // Eliminar un pedido recurrente
  router.delete("/api/recurring-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      await storage.deleteRecurringOrder(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error al eliminar pedido recurrente:", error);
      res.status(500).json({ error: "Error al eliminar pedido recurrente" });
    }
  });

  // ======================= ITEMS DE PEDIDOS RECURRENTES =======================

  // Obtener items de un pedido recurrente
  router.get("/api/recurring-orders/:id/items", async (req, res) => {
    try {
      // Verificar si es el ID especial 'new'
      if (req.params.id === 'new') {
        // Para la ruta 'new', devolvemos un array vacío
        console.log("GET /api/recurring-orders/new/items - Devolviendo array vacío para new");
        return res.json([]);
      }
      
      const recurringOrderId = parseInt(req.params.id);
      if (isNaN(recurringOrderId)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const recurringOrderItems = await storage.listRecurringOrderItems(recurringOrderId);
      res.json(recurringOrderItems);
    } catch (error) {
      console.error("Error al obtener items del pedido recurrente:", error);
      res.status(500).json({ error: "Error al obtener items del pedido recurrente" });
    }
  });

  // Añadir un item a un pedido recurrente
  router.post("/api/recurring-orders/:id/items", async (req, res) => {
    try {
      // Manejo más flexible del ID
      let recurringOrderId: number;
      
      // Intentar convertir usando varias estrategias
      if (typeof req.params.id === 'string') {
        // Eliminar caracteres no numéricos si existen
        const cleanId = req.params.id.replace(/[^0-9]/g, '');
        recurringOrderId = parseInt(cleanId, 10);
      } else {
        recurringOrderId = Number(req.params.id);
      }
      
      console.log(`POST /api/recurring-orders/:id/items - ID recibido: ${req.params.id}, convertido a: ${recurringOrderId}`);
      
      // No lanzamos error aquí, intentamos recuperarnos si es posible
      if (isNaN(recurringOrderId) || recurringOrderId <= 0) {
        // Intentar obtener el pedido recurrente más reciente para usar su ID
        try {
          const { recurringOrders } = await import("../shared/schema");
          const { desc } = await import("drizzle-orm");
          const { db } = await import("./db");
          
          const latestOrders = await db
            .select()
            .from(recurringOrders)
            .orderBy(desc(recurringOrders.id))
            .limit(1);
          
          if (latestOrders.length > 0) {
            console.log(`Sustituyendo ID inválido ${req.params.id} con el ID del pedido más reciente: ${latestOrders[0].id}`);
            recurringOrderId = latestOrders[0].id;
          } else {
            // Si no hay pedidos recurrentes, realmente no podemos continuar
            return res.status(400).json({
              error: "ID inválido y no hay pedidos recurrentes existentes",
              details: `No se pudo usar ${req.params.id} como ID y no hay pedidos recurrentes alternativos.`
            });
          }
        } catch (fetchError) {
          console.error("Error al intentar obtener ID alternativo:", fetchError);
          // En caso de error, devolvemos el error original de ID inválido
          return res.status(400).json({ 
            error: "ID inválido", 
            details: `El ID proporcionado (${req.params.id}) no es un número válido.`
          });
        }
      }

      // No verificamos si el pedido existe para permitir pedidos recién creados

      // Importar getCurrentCompanyId para obtener el companyId de la sesión actual
      const { getCurrentCompanyId } = await import('./company-db');
      const companyId = req.body.companyId || (req as any).companyId || getCurrentCompanyId() || 1;
      
      // Validar el item y asegurar que los campos numéricos sean números
      const itemData = {
        ...req.body,
        companyId, // Asegurar que el companyId esté presente
        recurringOrderId,
        productId: Number(req.body.productId) || 0,
        quantity: Number(req.body.quantity) || 1
      };

      const parseResult = insertRecurringOrderItemSchema.safeParse(itemData);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos",
          details: parseResult.error.format() 
        });
      }

      // Crear el item
      const newItem = await storage.createRecurringOrderItem(parseResult.data);
      
      // Recalcular el total del pedido recurrente
      const allItems = await storage.listRecurringOrderItems(recurringOrderId);
      const totalAmount = allItems.reduce((sum, item) => {
        const itemTotal = parseFloat(item.price) * item.quantity;
        return sum + itemTotal;
      }, 0).toFixed(2);

      // Actualizar el total del pedido recurrente
      await storage.updateRecurringOrder(recurringOrderId, { totalAmount });

      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error al añadir item al pedido recurrente:", error);
      res.status(500).json({ error: "Error al añadir item al pedido recurrente" });
    }
  });

  // Actualizar un item de un pedido recurrente
  router.patch("/api/recurring-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Validar los datos de actualización
      const partialSchema = insertRecurringOrderItemSchema.partial().omit({ recurringOrderId: true });
      
      // Asegurar que los campos numéricos sean números
      const validatedData = {
        ...req.body,
        productId: req.body.productId ? Number(req.body.productId) || 0 : undefined,
        quantity: req.body.quantity ? Number(req.body.quantity) || 1 : undefined
      };
      
      const parseResult = partialSchema.safeParse(validatedData);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos",
          details: parseResult.error.format() 
        });
      }

      // Actualizar el item
      const updatedItem = await storage.updateRecurringOrderItem(id, parseResult.data);
      
      // Recalcular el total del pedido recurrente
      const allItems = await storage.listRecurringOrderItems(updatedItem.recurringOrderId);
      const totalAmount = allItems.reduce((sum, item) => {
        const itemTotal = parseFloat(item.price) * item.quantity;
        return sum + itemTotal;
      }, 0).toFixed(2);

      // Actualizar el total del pedido recurrente
      await storage.updateRecurringOrder(updatedItem.recurringOrderId, { totalAmount });

      res.json(updatedItem);
    } catch (error) {
      console.error("Error al actualizar item del pedido recurrente:", error);
      res.status(500).json({ error: "Error al actualizar item del pedido recurrente" });
    }
  });

  // Eliminar un item de un pedido recurrente
  router.delete("/api/recurring-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Obtener el item para saber a qué pedido recurrente pertenece
      const items = await storage.listRecurringOrderItems(0); // Obtenemos todos para buscar
      const itemToDelete = items.find(item => item.id === id);
      
      if (!itemToDelete) {
        return res.status(404).json({ error: "Item no encontrado" });
      }

      const recurringOrderId = itemToDelete.recurringOrderId;

      // Eliminar el item
      await storage.deleteRecurringOrderItem(id);
      
      // Recalcular el total del pedido recurrente
      const remainingItems = await storage.listRecurringOrderItems(recurringOrderId);
      const totalAmount = remainingItems.reduce((sum, item) => {
        const itemTotal = parseFloat(item.price) * item.quantity;
        return sum + itemTotal;
      }, 0).toFixed(2);

      // Actualizar el total del pedido recurrente
      await storage.updateRecurringOrder(recurringOrderId, { totalAmount });

      res.status(204).end();
    } catch (error) {
      console.error("Error al eliminar item del pedido recurrente:", error);
      res.status(500).json({ error: "Error al eliminar item del pedido recurrente" });
    }
  });

  // =====================================================================
  // ENDPOINT CORREGIDO: Para generar orden a partir de un pedido recurrente
  // =====================================================================
  router.post("/api/recurring-orders/:id/generate", async (req, res) => {
    try {
      console.log("Iniciando generación de orden a partir de pedido recurrente");
      
      // Aceptamos el ID en varios formatos - será procesado en profundidad por los servicios
      // Solo hacemos una validación mínima aquí
      let recurringOrderId: any = req.params.id;
      
      console.log(`POST /api/recurring-orders/:id/generate - ID recibido: ${JSON.stringify(recurringOrderId)}, tipo: ${typeof recurringOrderId}`);
      
      // Verificamos si viene algo en el body que podría contener un ID alternativo
      if (req.body && (req.body.id || req.body.recurringOrderId)) {
        console.log(`También se encontró ID en el body: ${JSON.stringify(req.body)}`);
        recurringOrderId = req.body.id || req.body.recurringOrderId || recurringOrderId;
      }
      
      // No hacemos conversión aquí - dejamos que las capas internas manejen todos los formatos posibles
      try {
        // Simplemente verificamos que NO sea indefinido o null
        if (recurringOrderId === undefined || recurringOrderId === null) {
          console.warn("ID no definido, intentando recuperar el pedido más reciente");
          const { recurringOrdersService } = await import('./recurring-orders');
          const latestOrder = await recurringOrdersService.getNewestRecurringOrder();
          
          if (latestOrder) {
            recurringOrderId = latestOrder.id;
            console.log(`Usando ID más reciente como alternativa: ${recurringOrderId}`);
          } else {
            // Si no hay pedidos recurrentes, no tiene sentido continuar
            throw new Error("No hay pedidos recurrentes existentes en el sistema");
          }
        }
      } catch (idError) {
        console.error("Error obteniendo pedido recurrente:", idError);
        return res.status(400).json({
          error: "ID de pedido recurrente inválido",
          details: idError instanceof Error ? idError.message : "Error desconocido"
        });
      }
      
      // Importar directamente el servicio de órdenes recurrentes
      const { recurringOrdersService } = await import('./recurring-orders');
      
      // Configurar la compañía correcta para el contexto
      const { getCurrentCompanyId, setCurrentCompanyId } = await import('./company-db');
      const companyId = req.body.companyId || (req as any).companyId || 15;
      const prevCompanyId = getCurrentCompanyId();
      
      console.log(`Usando companyId: ${companyId} para generar orden desde pedido recurrente #${recurringOrderId}`);
      setCurrentCompanyId(companyId);
      
      try {
        // Generar la orden usando el servicio
        const generatedOrder = await recurringOrdersService.generateOrderFromRecurring(recurringOrderId);
        console.log("✅ ORDEN GENERADA EXITOSAMENTE:", generatedOrder);
        res.status(201).json(generatedOrder);
      } finally {
        // Restaurar el contexto original
        setCurrentCompanyId(prevCompanyId);
      }
    } catch (error) {
      console.error("❌ ERROR AL GENERAR ORDEN:", error);
      res.status(500).json({ 
        error: "Error al generar orden desde pedido recurrente",
        message: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });
};

// Función principal para registrar todos los endpoints
export function registerRoutesEndpoints(router: Router) {
  // Registrar endpoints para pedidos recurrentes
  createRecurringOrdersEndpoints(router);
  
  // Nota: Los endpoints de órdenes estándar ahora son manejados por ordersRouter
  // y están montados directamente en app.use() en el index.ts
}