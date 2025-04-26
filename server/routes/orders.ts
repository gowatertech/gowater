import { Router } from "express";
import { db } from '../db';
import { orders, orderItems } from "@shared/schema";
import { eq, and, desc } from 'drizzle-orm';
import { storage } from "../storage";
import { getCurrentCompanyId } from "../company-db";

export const createOrdersEndpoints = (router: Router) => {
  
  // Obtener todos los pedidos
  router.get("/api/orders", async (req, res) => {
    try {
      const allOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.id));
      
      console.log(`GET /api/orders - Retornando: ${allOrders.length} pedidos`);
      res.json(allOrders);
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Obtener un pedido específico por ID
  router.get("/api/orders/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      console.log(`GET /api/orders/${orderId} - Pedido encontrado:`, order);
      res.json(order);
    } catch (error) {
      console.error(`Error al obtener pedido ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Obtener items de un pedido específico
  router.get("/api/orders/:id/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      const items = await storage.listOrderItems(orderId);
      
      console.log(`GET /api/orders/${orderId}/items - Items encontrados:`, items.length);
      res.json(items);
    } catch (error) {
      console.error(`Error al obtener items del pedido ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar estado de un pedido
  router.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      if (!status || !["pending", "in_transit", "delivered", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }
      
      // Obtenemos el companyId del contexto
      const companyId = getCurrentCompanyId();
      console.log(`Actualizando pedido ${orderId} al estado '${status}' para compañía ${companyId}`);
      
      // Método directo: actualizar directamente en la base de datos
      const [updatedOrder] = await db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, orderId))
        .where(eq(orders.companyId, companyId || 0))
        .returning();
      
      if (!updatedOrder) {
        console.error(`No se encontró el pedido ${orderId} para la compañía ${companyId}`);
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      console.log(`PATCH /api/orders/${orderId}/status - Pedido actualizado a '${status}'`, updatedOrder);
      res.json(updatedOrder);
    } catch (error) {
      console.error(`Error al actualizar estado del pedido ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });
};