//orders.ts
import { Router } from "express";
import { db } from '../db';
import { orders, orderItems, products } from "@shared/schema";
import { eq, and, desc } from 'drizzle-orm';
import { storage } from "../storage";
import { getCurrentCompanyId, setCurrentCompanyId } from "../company-db";
import { logTenantOperation } from "../middleware/company.middleware";

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

      res.json(updatedOrder);
    } catch (error) {
      console.error(`Error al actualizar estado del pedido ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });
};