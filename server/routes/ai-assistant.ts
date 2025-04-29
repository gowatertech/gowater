import { Router } from "express";
import { db } from "../db";
import { z } from "zod";
import { askWaterLogisticsAssistant, analyzeOrderData, generateCustomerRecommendations } from "../ai/openai";
import { withCompany } from "../company-db";
import { eq, and, between, desc, sql } from "drizzle-orm";
import { orders } from "../../shared/schema";

const aiAssistantRouter = Router();

/**
 * Endpoint para realizar preguntas al asistente de IA
 */
aiAssistantRouter.post("/ask", async (req, res) => {
  try {
    const questionSchema = z.object({
      question: z.string().min(1, "La pregunta no puede estar vacía"),
    });

    const parsedBody = questionSchema.safeParse(req.body);
    
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Datos inválidos",
        details: parsedBody.error.format(),
      });
    }

    const { question } = parsedBody.data;
    
    // Realizamos la consulta a OpenAI
    const answer = await askWaterLogisticsAssistant(question);
    
    // Devolvemos la respuesta
    return res.json({ answer });
  } catch (error) {
    console.error("Error en el endpoint /ask:", error);
    return res.status(500).json({
      error: "Error al procesar la pregunta",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * Endpoint para analizar datos de pedidos
 */
aiAssistantRouter.post("/analyze-orders", async (req, res) => {
  try {
    const analyzeSchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
      zoneId: z.number().optional(),
    });

    const parsedBody = analyzeSchema.safeParse(req.body);
    
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Datos inválidos",
        details: parsedBody.error.format(),
      });
    }

    const { startDate, endDate, zoneId } = parsedBody.data;
    
    // Consulta para obtener los pedidos en el rango de fechas especificado
    let query = withCompany(
      db.select()
        .from(orders)
        .where(
          and(
            between(orders.date, new Date(startDate), new Date(endDate))
          )
        )
        .orderBy(desc(orders.date))
    );

    // Si se especificó un zoneId, filtramos por zona
    if (zoneId) {
      query = query.where(eq(orders.zoneId, zoneId));
    }

    // Ejecutamos la consulta
    const ordersData = await query;

    // Extraemos datos adicionales para análisis
    // Agregamos metadatos útiles para el análisis
    const orderCount = ordersData.length;
    
    // Preparamos los datos para enviar a OpenAI
    const analysisData = {
      orders: ordersData,
      summary: {
        totalOrders: orderCount,
        period: { startDate, endDate },
        zoneId: zoneId || null
      }
    };
    
    // Realizamos la consulta a OpenAI para el análisis
    const analysis = await analyzeOrderData(analysisData);
    
    // Devolvemos el resultado del análisis
    return res.json({
      analysis,
      metadata: {
        period: { startDate, endDate },
        ordersCount: orderCount,
        zoneId: zoneId || null
      }
    });
  } catch (error) {
    console.error("Error en el endpoint /analyze-orders:", error);
    return res.status(500).json({
      error: "Error al analizar pedidos",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * Endpoint para generar recomendaciones para un cliente
 */
aiAssistantRouter.post("/customer-recommendations/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId || isNaN(parseInt(customerId))) {
      return res.status(400).json({
        error: "ID de cliente inválido",
      });
    }
    
    const customerIdNum = parseInt(customerId);
    
    // Consulta para obtener datos del cliente
    const customerData = await withCompany(
      db.select()
        .from(sql.raw('customers'))
        .where(eq(sql.raw('customers.id'), customerIdNum))
    );
    
    if (!customerData || customerData.length === 0) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }
    
    // Consulta para obtener pedidos del cliente
    const customerOrders = await withCompany(
      db.select()
        .from(orders)
        .where(eq(orders.customerId, customerIdNum))
        .orderBy(desc(orders.date))
        .limit(50) // Limitamos a los últimos 50 pedidos para evitar exceder límites de tokens
    );
    
    // Preparamos los datos para enviar a OpenAI
    const customerAnalysisData = {
      customer: customerData[0],
      orders: customerOrders,
      summary: {
        totalOrders: customerOrders.length,
        period: customerOrders.length > 0 
          ? {
              first: customerOrders[customerOrders.length - 1].date,
              last: customerOrders[0].date
            }
          : null
      }
    };
    
    // Realizamos la consulta a OpenAI para las recomendaciones
    const recommendations = await generateCustomerRecommendations(customerAnalysisData);
    
    // Devolvemos las recomendaciones
    return res.json({
      recommendations,
      metadata: {
        customerId: customerIdNum,
        ordersCount: customerOrders.length,
      }
    });
  } catch (error) {
    console.error("Error en el endpoint /customer-recommendations:", error);
    return res.status(500).json({
      error: "Error al generar recomendaciones",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

export default aiAssistantRouter;