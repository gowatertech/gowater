import { Router } from "express";
import { PgDatabase } from "drizzle-orm/pg-core";
import { orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from '../db';

// Endpoint especializado para actualización de estado de pedidos
export function createUpdateOrderStatusEndpoint(router: Router) {
  console.log("Registrando endpoint /api/update-order-status");
  
  router.post("/api/update-order-status", async (req, res) => {
    try {
      // Log detallado de la solicitud
      console.log("------ SOLICITUD DE ACTUALIZACIÓN DE ESTADO ------");
      console.log("Cuerpo de la solicitud:", req.body);
      console.log("Método:", req.method);
      console.log("URL:", req.url);
      console.log("Headers:", req.headers);
      
      const { orderId, status } = req.body;
      
      if (!orderId || isNaN(parseInt(orderId))) {
        console.log("Error: ID de pedido inválido o no proporcionado");
        return res.status(400).json({ 
          success: false, 
          message: "ID de pedido inválido o no proporcionado" 
        });
      }
      
      if (!status || !["pending", "in_transit", "delivered", "cancelled"].includes(status)) {
        console.log(`Error: Estado inválido: ${status}`);
        return res.status(400).json({ 
          success: false, 
          message: "Estado inválido" 
        });
      }
      
      // Convertir a número
      const orderIdNum = parseInt(orderId);
      
      // Verificar si el pedido existe
      const existingOrder = await db.select()
        .from(orders)
        .where(eq(orders.id, orderIdNum));
      
      if (!existingOrder || existingOrder.length === 0) {
        console.log(`Error: Pedido ${orderIdNum} no encontrado`);
        return res.status(404).json({ 
          success: false, 
          message: "Pedido no encontrado" 
        });
      }
      
      console.log(`Pedido encontrado: ${orderIdNum}, estado actual: ${existingOrder[0].status}`);
      
      // Usar un update simple y directo
      console.log(`Actualizando pedido ${orderIdNum} al estado: ${status}`);
      
      try {
        // Actualización directa con SQL simple
        const updateResult = await db.update(orders)
          .set({ status: status })
          .where(eq(orders.id, orderIdNum));
        
        console.log("Resultado de la actualización:", updateResult);
        
        // Obtener el pedido actualizado
        const updatedOrder = await db.select()
          .from(orders)
          .where(eq(orders.id, orderIdNum));
        
        console.log(`Pedido actualizado a: ${updatedOrder[0].status}`);
        console.log("------ FIN DE ACTUALIZACIÓN DE ESTADO ------");
        
        return res.json({ 
          success: true, 
          message: "Estado actualizado correctamente", 
          order: updatedOrder[0] 
        });
      } catch (updateError) {
        console.error("Error en la actualización:", updateError);
        return res.status(500).json({ 
          success: false, 
          message: "Error al actualizar el estado", 
          error: String(updateError) 
        });
      }
    } catch (error) {
      console.error("Error general:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error en el servidor", 
        error: String(error) 
      });
    }
  });
}