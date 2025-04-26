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
      
      // Verificamos el estado actual
      const currentOrder = await db.select().from(orders).where(
        sql`${orders.id} = ${orderIdNum} AND ${orders.companyId} = ${companyId}`
      );
      
      console.log("Resultado de consulta inicial:", currentOrder);
      
      if (currentOrder.length === 0) {
        console.log(`Pedido ${orderIdNum} no encontrado para companyId ${companyId}`);
        return res.status(404).json({ 
          success: false, 
          message: "Pedido no encontrado o no pertenece a la empresa" 
        });
      }
      
      console.log(`Estado actual del pedido ${orderIdNum}: ${currentOrder[0].status}`);
      console.log(`Nuevo estado a aplicar: ${status}`);
      
      let updateResult;
      
      try {
        // Intentar actualizar con Drizzle ORM primero (más seguro y tipado)
        updateResult = await db.update(orders)
          .set({ status: status })
          .where(
            sql`${orders.id} = ${orderIdNum} AND ${orders.companyId} = ${companyId}`
          )
          .returning();
          
        console.log("Resultado de actualización con Drizzle:", updateResult);
        
        if (updateResult.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: "Pedido no encontrado o no pertenece a la empresa (después de intentar actualizar)" 
          });
        }
          
      } catch (ormError) {
        console.error("Error en actualización con Drizzle ORM:", ormError);
        
        // Si falla Drizzle, intentar con SQL directo
        try {
          // Usar la conexión directa a la base de datos
          const updateQuery = `
            UPDATE orders 
            SET status = $1 
            WHERE id = $2 AND company_id = $3
            RETURNING *;
          `;
          
          console.log(`Ejecutando query SQL: ${updateQuery} con valores: [${status}, ${orderIdNum}, ${companyId}]`);
          
          const result = await pool.query(updateQuery, [status, orderIdNum, companyId]);
          
          console.log("Resultado SQL directo:", result);
          
          if (result.rowCount === 0) {
            return res.status(404).json({ 
              success: false, 
              message: "Pedido no encontrado o no pertenece a la empresa (SQL directo)" 
            });
          }
          
          updateResult = result.rows;
          
        } catch (sqlError) {
          console.error("Error en SQL directo:", sqlError);
          return res.status(500).json({ 
            success: false, 
            message: "Error en la actualización de la base de datos", 
            error: String(sqlError)
          });
        }
      }
      
      // Verificación adicional del resultado
      if (!updateResult || updateResult.length === 0) {
        console.error("Resultado de actualización indefinido o vacío");
        return res.status(500).json({ 
          success: false, 
          message: "Error en la actualización (resultado indefinido)"
        });
      }
      
      const updatedOrder = Array.isArray(updateResult) ? updateResult[0] : updateResult;
      console.log("Pedido actualizado:", updatedOrder);
      console.log(`Status anterior: ${currentOrder[0].status}, Status nuevo: ${updatedOrder.status}`);
      
      // Verificar que el estado realmente cambió
      if (updatedOrder.status !== status) {
        console.error(`¡ADVERTENCIA! El estado no se actualizó correctamente. Esperado: ${status}, Actual: ${updatedOrder.status}`);
      }
      
      console.log("------ FIN DE ACTUALIZACIÓN DE ESTADO ------");
      
      // Respuesta exitosa con resultado de la actualización
      return res.status(200).json({ 
        success: true, 
        message: "Estado actualizado correctamente", 
        order: updatedOrder
      });
      
    } catch (error) {
      console.error("Error general en actualización de estado:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error en el servidor", 
        error: String(error) 
      });
    }
  });
}