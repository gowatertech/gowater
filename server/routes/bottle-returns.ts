import { Express } from "express";
import { db } from "../db";
import { bottleReturns, products, orders, customers } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function registerBottleReturnsEndpoints(app: Express) {
  // Endpoint para obtener los envases retornables de una orden específica
  app.get("/api/orders/:id/bottle-returns", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de orden inválido" });
      }
      
      // Obtener los envases retornables para esta orden
      const bottleReturnsData = await db
        .select({
          id: bottleReturns.id,
          orderId: bottleReturns.orderId,
          productId: bottleReturns.productId,
          productName: products.name,
          expectedQuantity: bottleReturns.expectedQuantity,
          returnedQuantity: bottleReturns.returnedQuantity,
          pendingQuantity: bottleReturns.pendingQuantity,
          returnDate: bottleReturns.returnDate,
          status: bottleReturns.status,
          amountCharged: bottleReturns.amountCharged,
          depositAmount: bottleReturns.depositAmount,
          responsibleType: bottleReturns.responsibleType,
          chargeMethod: bottleReturns.chargeMethod,
        })
        .from(bottleReturns)
        .innerJoin(products, eq(bottleReturns.productId, products.id))
        .where(eq(bottleReturns.orderId, orderId));
      
      res.json(bottleReturnsData);
    } catch (error) {
      console.error("Error al obtener los envases retornables de la orden:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para actualizar un retorno de envase
  app.post("/api/bottle-returns/:id/update", async (req, res) => {
    try {
      const bottleReturnId = parseInt(req.params.id);
      const { returnedQuantity } = req.body;
      
      if (isNaN(bottleReturnId) || typeof returnedQuantity !== 'number') {
        return res.status(400).json({ 
          error: "Datos inválidos. Se requiere returnedQuantity como número." 
        });
      }
      
      // Obtener el registro actual
      const [currentBottleReturn] = await db
        .select()
        .from(bottleReturns)
        .where(eq(bottleReturns.id, bottleReturnId));
      
      if (!currentBottleReturn) {
        return res.status(404).json({ error: "Registro de retorno de envase no encontrado" });
      }
      
      // Calcular nueva cantidad pendiente
      const pendingQuantity = Math.max(0, currentBottleReturn.expectedQuantity - returnedQuantity);
      
      // Determinar el nuevo estado
      let status: "pending" | "complete" | "incomplete" = "pending";
      if (pendingQuantity === 0) {
        status = "complete";
      } else if (returnedQuantity > 0) {
        status = "incomplete";
      }
      
      // Calcular monto a cargar (si aplica)
      // Remover esta línea ya que tenemos depositAmountNum abajo
      // Calcular el monto a cargar, asegurándonos que depositAmount sea un número
      const depositAmountNum = parseFloat(currentBottleReturn.depositAmount || "0");
      const amountCharged = pendingQuantity * depositAmountNum;
      
      // Actualizar el registro
      const [updatedBottleReturn] = await db
        .update(bottleReturns)
        .set({
          returnedQuantity,
          pendingQuantity,
          status,
          amountCharged: amountCharged.toFixed(2),
          returnDate: new Date()
        })
        .where(eq(bottleReturns.id, bottleReturnId))
        .returning();
      
      res.json(updatedBottleReturn);
    } catch (error) {
      console.error("Error al actualizar retorno de envase:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener todos los retornos de envases pendientes
  app.get("/api/bottle-returns", async (req, res) => {
    try {
      const allBottleReturns = await db
        .select({
          id: bottleReturns.id,
          orderId: bottleReturns.orderId,
          productId: bottleReturns.productId,
          productName: products.name,
          expectedQuantity: bottleReturns.expectedQuantity,
          returnedQuantity: bottleReturns.returnedQuantity,
          pendingQuantity: bottleReturns.pendingQuantity,
          returnDate: bottleReturns.returnDate,
          status: bottleReturns.status,
          amountCharged: bottleReturns.amountCharged,
          depositAmount: bottleReturns.depositAmount,
          responsibleType: bottleReturns.responsibleType,
          chargeMethod: bottleReturns.chargeMethod,
          customerName: customers.businessname,
          customerAddress: customers.street,
        })
        .from(bottleReturns)
        .innerJoin(products, eq(bottleReturns.productId, products.id))
        .innerJoin(orders, eq(bottleReturns.orderId, orders.id))
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(and(
          eq(bottleReturns.status, "pending"),
          eq(bottleReturns.pendingQuantity, bottleReturns.expectedQuantity)
        ));
      
      res.json(allBottleReturns);
    } catch (error) {
      console.error("Error al obtener los envases retornables pendientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });
}