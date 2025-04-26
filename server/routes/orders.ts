import { Router } from "express";
import { db } from "../db";
import { orders, orderItems, products } from "@shared/schema";
import { z } from "zod";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getCurrentCompanyId } from "../company-db";
import { logTenantOperation } from "../middleware/company.middleware";

const validateCompanyAccess = (req: any, resourceCompanyId: number) => {
  const currentCompanyId = getCurrentCompanyId();
  if (!currentCompanyId) {
    return {
      success: false,
      message: "No hay contexto de empresa establecido"
    };
  }
  
  if (currentCompanyId !== resourceCompanyId) {
    return {
      success: false,
      message: "No tiene permisos para acceder a recursos de otra empresa"
    };
  }
  
  return { success: true };
};

export function registerOrdersEndpoints(router: Router) {
  // Endpoint de prueba para actualizar órdenes sin autenticación
  router.put('/update-order-status', async (req, res) => {
    try {
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No hay contexto de empresa establecido"
        });
      }
      
      const { orderId, status, notes } = req.body;
      if (!orderId || isNaN(parseInt(orderId))) {
        return res.status(400).json({
          success: false,
          message: "ID de pedido no válido"
        });
      }
      
      const id = parseInt(orderId);
      
      // Verificar que el pedido pertenezca a esta empresa
      const [orderToUpdate] = await db.select()
        .from(orders)
        .where(and(
          eq(orders.id, id),
          eq(orders.companyId, companyId)
        ));
      
      if (!orderToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Pedido no encontrado o sin acceso"
        });
      }
      
      // Validar el estado
      if (!["pending", "in_progress", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Estado no válido"
        });
      }
      
      logTenantOperation(req, 'test-update-order-status', { 
        companyId, 
        orderId: id, 
        oldStatus: orderToUpdate.status,
        newStatus: status
      });
      
      // Actualizar el estado
      const [updatedOrder] = await db.update(orders)
        .set({
          status: status,
          notes: notes || orderToUpdate.notes,
          lastUpdate: new Date()
        })
        .where(and(
          eq(orders.id, id),
          eq(orders.companyId, companyId)
        ))
        .returning();
      
      res.json({
        success: true,
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado del pedido'
      });
    }
  });
  // Obtener todos los pedidos (filtrados por companyId)
  router.get('/orders', async (req, res) => {
    try {
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No hay contexto de empresa establecido"
        });
      }
      
      logTenantOperation(req, 'get-orders', { companyId });
      
      const results = await db.select()
        .from(orders)
        .where(eq(orders.companyId, companyId));
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los pedidos'
      });
    }
  });

  // Obtener un pedido específico por ID (verificando que pertenezca a la compañía actual)
  router.get('/orders/:id', async (req, res) => {
    try {
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No hay contexto de empresa establecido"
        });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID de pedido no válido"
        });
      }
      
      logTenantOperation(req, 'get-order-detail', { companyId, orderId: id });
      
      const [order] = await db.select()
        .from(orders)
        .where(and(
          eq(orders.id, id),
          eq(orders.companyId, companyId)
        ));
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Pedido no encontrado o sin acceso"
        });
      }
      
      // Obtener los items del pedido
      const items = await db.select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
        productName: products.name
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));
      
      res.json({
        success: true,
        data: {
          ...order,
          items
        }
      });
    } catch (error) {
      console.error('Error al obtener detalle del pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el detalle del pedido'
      });
    }
  });

  // Crear un nuevo pedido (con contexto de empresa)
  router.post('/orders', async (req, res) => {
    try {
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No hay contexto de empresa establecido"
        });
      }
      
      logTenantOperation(req, 'create-order', { companyId, body: req.body });
      
      // Validar el esquema de entrada
      const orderSchema = z.object({
        customerId: z.number(),
        date: z.string().transform(str => new Date(str)),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
        total: z.string(),
        notes: z.string().optional(),
        preferredDeliveryTime: z.string().transform(str => new Date(str)).optional(),
        orderType: z.enum(["regular", "wholesale", "special"]).optional(),
        paymentStatus: z.enum(["pending", "partial", "paid"]).optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          unitPrice: z.string()
        })).optional()
      });
      
      const parsedData = orderSchema.parse(req.body);
      
      // Crear transacción para insertar pedido e items
      const orderResult = await db.transaction(async (tx) => {
        // Insertar el pedido
        const [newOrder] = await tx.insert(orders).values({
          companyId,
          customerId: parsedData.customerId,
          date: parsedData.date,
          status: parsedData.status,
          total: parsedData.total,
          notes: parsedData.notes,
          preferredDeliveryTime: parsedData.preferredDeliveryTime,
          orderType: parsedData.orderType || "regular",
          paymentStatus: parsedData.paymentStatus || "pending",
          createdAt: new Date()
        }).returning();
        
        // Insertar items del pedido si existen
        if (parsedData.items && parsedData.items.length > 0) {
          const itemsToInsert = parsedData.items.map(item => ({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: (parseFloat(item.unitPrice) * item.quantity).toString()
          }));
          
          await tx.insert(orderItems).values(itemsToInsert);
        }
        
        return newOrder;
      });
      
      res.status(201).json({
        success: true,
        data: orderResult
      });
    } catch (error) {
      console.error('Error al crear pedido:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Datos de pedido inválidos',
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error al crear el pedido'
      });
    }
  });

  // Actualizar el estado de un pedido (verificando que pertenezca a la compañía actual)
  router.put('/orders/:id/status', async (req, res) => {
    try {
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No hay contexto de empresa establecido"
        });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID de pedido no válido"
        });
      }
      
      // Verificar que el pedido pertenezca a esta empresa
      const [orderToUpdate] = await db.select()
        .from(orders)
        .where(and(
          eq(orders.id, id),
          eq(orders.companyId, companyId)
        ));
      
      if (!orderToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Pedido no encontrado o sin acceso"
        });
      }
      
      // Validar el esquema de entrada
      const statusSchema = z.object({
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
        notes: z.string().optional()
      });
      
      const parsedData = statusSchema.parse(req.body);
      
      logTenantOperation(req, 'update-order-status', { 
        companyId, 
        orderId: id, 
        oldStatus: orderToUpdate.status,
        newStatus: parsedData.status
      });
      
      // Actualizar el estado
      const [updatedOrder] = await db.update(orders)
        .set({
          status: parsedData.status,
          notes: parsedData.notes || orderToUpdate.notes,
          lastUpdate: new Date()
        })
        .where(and(
          eq(orders.id, id),
          eq(orders.companyId, companyId)
        ))
        .returning();
      
      res.json({
        success: true,
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Datos de estado inválidos',
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado del pedido'
      });
    }
  });

  // Eliminar un pedido (verificando que pertenezca a la compañía actual)
  router.delete('/orders/:id', async (req, res) => {
    try {
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No hay contexto de empresa establecido"
        });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "ID de pedido no válido"
        });
      }
      
      // Verificar que el pedido pertenezca a esta empresa
      const [orderToDelete] = await db.select()
        .from(orders)
        .where(and(
          eq(orders.id, id),
          eq(orders.companyId, companyId)
        ));
      
      if (!orderToDelete) {
        return res.status(404).json({
          success: false,
          message: "Pedido no encontrado o sin acceso"
        });
      }
      
      logTenantOperation(req, 'delete-order', { 
        companyId, 
        orderId: id, 
        orderStatus: orderToDelete.status
      });
      
      // Eliminar en transacción para asegurar integridad
      await db.transaction(async (tx) => {
        // Primero eliminar los items del pedido
        await tx.delete(orderItems)
          .where(eq(orderItems.orderId, id));
        
        // Luego eliminar el pedido
        await tx.delete(orders)
          .where(and(
            eq(orders.id, id),
            eq(orders.companyId, companyId)
          ));
      });
      
      res.json({
        success: true,
        message: "Pedido eliminado correctamente"
      });
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el pedido'
      });
    }
  });
}