import { Router } from "express";
import { orders } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from '../db';
import { pool } from '../db';
import { getCurrentCompanyId } from '../company-db';

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
      
      // Determinar el companyId actual
      const companyId = getCurrentCompanyId() || 1; // Default a companyId 1 si no hay contexto
      console.log(`Actualización para companyId: ${companyId}`);
      
      // Ejecutar SQL directo para la actualización (más seguro y directo)
      const updateQuery = `
        UPDATE orders 
        SET status = $1 
        WHERE id = $2 AND "companyId" = $3
        RETURNING *;
      `;
      
      console.log(`Ejecutando query SQL: ${updateQuery} con valores: [${status}, ${orderIdNum}, ${companyId}]`);
      
      try {
        // Usar la conexión directa a la base de datos
        const result = await pool.query(updateQuery, [status, orderIdNum, companyId]);
        
        console.log("Resultado completo de la actualización SQL:", result);
        
        if (result.rowCount === 0) {
          console.log(`No se pudo actualizar. Pedido ${orderIdNum} no encontrado para companyId ${companyId}`);
          return res.status(404).json({ 
            success: false, 
            message: "Pedido no encontrado o no pertenece a la empresa" 
          });
        }
        
        const updatedOrder = result.rows[0];
        console.log("Pedido actualizado:", updatedOrder);
        console.log(`Status anterior: ${status}, Status nuevo: ${updatedOrder.status}`);
        console.log("------ FIN DE ACTUALIZACIÓN DE ESTADO ------");
        
        return res.json({ 
          success: true, 
          message: "Estado actualizado correctamente", 
          order: updatedOrder
        });
      } catch (updateError) {
        console.error("Error en la actualización SQL:", updateError);
        
        // Intento alternativo con Drizzle ORM si falla el SQL directo
        console.log("Intentando actualización con Drizzle ORM como alternativa");
        
        try {
          const updateResult = await db.update(orders)
            .set({ status: status })
            .where(
              sql`${orders.id} = ${orderIdNum} AND ${orders.companyId} = ${companyId}`
            )
            .returning();
            
          console.log("Resultado de actualización con Drizzle:", updateResult);
          
          if (updateResult.length === 0) {
            return res.status(404).json({ 
              success: false, 
              message: "Pedido no encontrado o no pertenece a la empresa" 
            });
          }
          
          return res.json({ 
            success: true, 
            message: "Estado actualizado correctamente usando método alternativo", 
            order: updateResult[0] 
          });
        } catch (ormError) {
          console.error("Error en actualización con Drizzle ORM:", ormError);
          return res.status(500).json({ 
            success: false, 
            message: "Error en ambos métodos de actualización", 
            sqlError: String(updateError),
            ormError: String(ormError)
          });
        }
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