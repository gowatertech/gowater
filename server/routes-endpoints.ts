import { Router, Express } from "express";
import { storage } from "./storage";
import { insertRecurringOrderSchema, insertRecurringOrderItemSchema } from "../shared/schema";
// Nota: Los endpoints de órdenes están ahora directamente en ordersRouter en ./routes/orders.ts

// Función para crear endpoints de pedidos recurrentes
export const createRecurringOrdersEndpoints = (router: Router) => {
  // Obtener todos los pedidos recurrentes
  router.get("/api/recurring-orders", async (req, res) => {
    try {
      const recurringOrders = await storage.listRecurringOrders();
      res.json(recurringOrders);
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

      // Asegurar que los campos numéricos sean realmente números
      const validatedData = {
        ...req.body,
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

      const newRecurringOrder = await storage.createRecurringOrder(parseResult.data);
      console.log("Pedido recurrente creado:", newRecurringOrder);
      res.status(201).json(newRecurringOrder);
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
      const recurringOrderId = parseInt(req.params.id);
      if (isNaN(recurringOrderId)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Verificar que el pedido recurrente exista
      const recurringOrder = await storage.getRecurringOrder(recurringOrderId);
      if (!recurringOrder) {
        return res.status(404).json({ error: "Pedido recurrente no encontrado" });
      }

      // Validar el item y asegurar que los campos numéricos sean números
      const itemData = {
        ...req.body,
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

  // Generar orden a partir de un pedido recurrente
  router.post("/api/recurring-orders/:id/generate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const generatedOrder = await storage.generateOrderFromRecurring(id);
      res.status(201).json(generatedOrder);
    } catch (error) {
      console.error("Error al generar orden desde pedido recurrente:", error);
      res.status(500).json({ error: "Error al generar orden desde pedido recurrente" });
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