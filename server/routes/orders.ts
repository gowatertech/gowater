//orders.ts
import { Router } from "express";
import { db } from '../db';
import { orders, orderItems, products } from "@shared/schema";
import { eq, and, desc } from 'drizzle-orm';
import { storage } from "../storage";
import { getCurrentCompanyId, setCurrentCompanyId } from "../company-db";
import { logTenantOperation } from "../middleware/company.middleware";

export const createOrdersEndpoints = (router: Router) => {
  
  // Endpoint para crear un nuevo pedido
  router.post("/orders", async (req, res) => {
    try {
      console.log("POST /orders - Datos recibidos:", JSON.stringify(req.body, null, 2));
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para crear pedido");
        logTenantOperation(req, "ORDER_CREATE_FAILED", { reason: "No companyId" });
        return res.status(401).json({ 
          error: "Autenticación requerida", 
          details: "Debe iniciar sesión para crear pedidos" 
        });
      }
      
      // Añadir el companyId a los datos del pedido
      const orderData = {
        ...req.body,
        companyId: companyId
      };
      
      console.log("Datos del pedido con companyId:", orderData);
      
      // Crear el pedido
      const newOrder = await storage.createOrder(orderData);
      
      console.log("Pedido creado exitosamente:", newOrder);
      logTenantOperation(req, "ORDER_CREATED", { orderId: newOrder.id, companyId });
      
      // Si hay items en el cuerpo de la solicitud, crearlos también
      if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0) {
        console.log(`Procesando ${req.body.items.length} items para el pedido #${newOrder.id}`);
        
        for (const item of req.body.items) {
          const orderItem = {
            ...item,
            orderId: newOrder.id,
            companyId: companyId
          };
          
          console.log("Creando item de pedido:", orderItem);
          await storage.createOrderItem(orderItem);
        }
        
        console.log("Items de pedido creados exitosamente");
      }
      
      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Error al crear pedido:", error);
      logTenantOperation(req, "ORDER_CREATE_ERROR", { error: String(error) });
      res.status(500).json({ error: String(error) });
    }
  });

  // Obtener todos los pedidos (filtrados por companyId)
  router.get("/api/orders", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para listar pedidos");
        logTenantOperation(req, "ORDER_LIST_FAILED", { reason: "No companyId" });
        return res.status(401).json({ 
          error: "Autenticación requerida", 
          details: "Debe iniciar sesión para ver pedidos" 
        });
      }
      
      // Filtrar pedidos por companyId
      const allOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.companyId, companyId))
        .orderBy(desc(orders.id));

      console.log(`GET /api/orders - Retornando: ${allOrders.length} pedidos para companyId ${companyId}`);
      logTenantOperation(req, "ORDER_LIST", { count: allOrders.length, companyId });
      res.json(allOrders);
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      logTenantOperation(req, "ORDER_LIST_ERROR", { error: String(error) });
      res.status(500).json({ error: String(error) });
    }
  });

  // Obtener un pedido específico por ID (verificando pertenencia a la compañía)
  router.get("/api/orders/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para obtener pedido");
        logTenantOperation(req, "ORDER_GET_FAILED", { reason: "No companyId", orderId });
        return res.status(401).json({ 
          error: "Autenticación requerida", 
          details: "Debe iniciar sesión para ver este pedido" 
        });
      }
      
      // Buscar pedido asegurándose que pertenezca a la compañía actual
      const [order] = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ));
      
      if (!order) {
        console.log(`Pedido ${orderId} no encontrado o no pertenece a la compañía ${companyId}`);
        logTenantOperation(req, "ORDER_NOT_FOUND", { orderId, companyId });
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      console.log(`GET /api/orders/${orderId} - Pedido encontrado para companyId ${companyId}:`, order);
      logTenantOperation(req, "ORDER_GET", { orderId, companyId });
      res.json(order);
    } catch (error) {
      console.error(`Error al obtener pedido ${req.params.id}:`, error);
      logTenantOperation(req, "ORDER_GET_ERROR", { orderId: req.params.id, error: String(error) });
      res.status(500).json({ error: String(error) });
    }
  });

  // Obtener items de un pedido específico (con verificación de pertenencia a la compañía)
  router.get("/api/orders/:id/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para obtener items del pedido");
        logTenantOperation(req, "ORDER_ITEMS_GET_FAILED", { reason: "No companyId", orderId });
        return res.status(401).json({ 
          error: "Autenticación requerida", 
          details: "Debe iniciar sesión para ver estos items" 
        });
      }
      
      // Primero verificar que el pedido pertenezca a la compañía actual
      const [order] = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId)
        ));
      
      if (!order) {
        console.log(`Pedido ${orderId} no encontrado o no pertenece a la compañía ${companyId}`);
        logTenantOperation(req, "ORDER_NOT_FOUND_FOR_ITEMS", { orderId, companyId });
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Obtener los items con su información de producto
      const items = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          productName: products.name
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(and(
          eq(orderItems.orderId, orderId),
          eq(orderItems.companyId, companyId)
        ));

      console.log(`GET /api/orders/${orderId}/items - Items encontrados para companyId ${companyId}:`, items.length);
      logTenantOperation(req, "ORDER_ITEMS_GET", { orderId, itemCount: items.length, companyId });
      res.json(items);
    } catch (error) {
      console.error(`Error al obtener items del pedido ${req.params.id}:`, error);
      logTenantOperation(req, "ORDER_ITEMS_GET_ERROR", { orderId: req.params.id, error: String(error) });
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar estado de un pedido
  router.patch("/api/orders/:id/status", async (req, res) => {
    try {
      console.log("======= INICIO DE ACTUALIZACIÓN DE ESTADO =======");
      console.log("Request body:", req.body);
      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      console.log(`Pedido ID: ${orderId}, Estado solicitado: ${status}`);

      if (isNaN(orderId)) {
        console.log("ID de pedido inválido");
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      if (!status || !["pending", "in_transit", "delivered", "cancelled"].includes(status)) {
        console.log(`Estado inválido: ${status}`);
        return res.status(400).json({ error: "Estado inválido" });
      }

      // Verificar que el pedido exista
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      console.log("Pedido existente:", existingOrder);

      if (!existingOrder) {
        console.log(`Pedido ${orderId} no encontrado`);
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      console.log(`CompanyId del contexto: ${companyId}`);

      // Verificar que el pedido pertenezca a la compañía
      if (existingOrder.companyId !== companyId) {
        console.log(`El pedido pertenece a la compañía ${existingOrder.companyId}, no a ${companyId}`);
        return res.status(403).json({ error: "No tienes permiso para modificar este pedido" });
      }

      console.log(`Estado actual del pedido: ${existingOrder.status}, Nuevo estado: ${status}`);

      // Método directo: ejecutar SQL directamente
      console.log("Ejecutando SQL UPDATE...");

      // Construcción de la consulta
      const query = db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, orderId));

      console.log("Query SQL:", query.toSQL());

      const result = await query.returning();
      console.log("Resultado de la actualización:", result);

      const [updatedOrder] = result;

      if (!updatedOrder) {
        console.log("No se actualizó ningún registro");
        return res.status(404).json({ error: "No se pudo actualizar el pedido" });
      }

      console.log(`Pedido ${orderId} actualizado de '${existingOrder.status}' a '${status}'`);
      console.log("======= FIN DE ACTUALIZACIÓN DE ESTADO =======");
      
      logTenantOperation(req, "ORDER_STATUS_UPDATED", { 
        orderId, 
        oldStatus: existingOrder.status, 
        newStatus: status, 
        companyId 
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error(`Error al actualizar estado del pedido ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });
};