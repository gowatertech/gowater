import { Router } from "express";
import { db } from "../db";
import { companyDb } from "../company-db";
import { orders, products, customers } from "@shared/schema";
import { askWaterLogisticsAssistant, analyzeOrderData, generateCustomerRecommendations } from "../ai/openai";
import { eq, and, sql, gte, lte } from 'drizzle-orm';

/**
 * Registra las rutas del asistente de IA
 * @param router Router de Express
 */
export function registerAIAssistantRoutes(router: Router) {
  /**
   * Endpoint para hacer preguntas al asistente de IA
   */
  router.post("/ai/assistant/ask", async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({
          error: "La pregunta es requerida y debe ser un texto"
        });
      }
      
      // Verificamos si tenemos la clave de API de OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "Falta la clave de API de OpenAI",
          message: "Contacte al administrador para configurar la clave de API"
        });
      }

      console.log(`🤖 Consultando al asistente de IA: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);
      
      // Enviamos la pregunta al asistente
      const answer = await askWaterLogisticsAssistant(question);
      
      console.log(`✅ Respuesta del asistente de IA generada (${answer.length} caracteres)`);
      
      res.json({
        question,
        answer
      });
    } catch (error) {
      console.error("❌ Error en el endpoint del asistente de IA:", error);
      res.status(500).json({
        error: "Error al procesar la consulta",
        message: String(error)
      });
    }
  });

  /**
   * Endpoint para analizar datos de pedidos con IA
   */
  router.post("/ai/assistant/analyze-orders", async (req, res) => {
    try {
      const { startDate, endDate, zoneId } = req.body;
      const companyId = req.session.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          error: "Se requiere una sesión con companyId"
        });
      }

      // Validar fechas
      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "Se requieren fechas de inicio y fin para el análisis"
        });
      }

      console.log(`🔍 Obteniendo datos de pedidos para análisis con IA (empresa ${companyId})`);
      console.log(`   Período: ${startDate} - ${endDate}`);
      
      // Construir la consulta base
      let query = companyDb
        .select({
          id: orders.id,
          customerId: orders.customerId,
          customerName: customers.businessname,
          total: orders.total,
          date: orders.date,
          status: orders.status,
          coordinates: customers.coordinates
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(
          and(
            eq(orders.companyId, companyId),
            gte(orders.date, new Date(startDate)),
            lte(orders.date, new Date(endDate))
          )
        );
      
      // Añadir filtro por zona si se proporciona
      if (zoneId) {
        query = query.where(eq(customers.zoneid, zoneId));
        console.log(`   Filtrado por zona: ${zoneId}`);
      }
      
      // Ejecutar la consulta
      const ordersData = await query;
      
      console.log(`📊 Encontrados ${ordersData.length} pedidos para analizar`);
      
      if (ordersData.length === 0) {
        return res.status(404).json({
          error: "No hay datos de pedidos en el período seleccionado",
          message: "Seleccione un período diferente o asegúrese de que existan pedidos"
        });
      }

      // Verificamos si tenemos la clave de API de OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "Falta la clave de API de OpenAI",
          message: "Contacte al administrador para configurar la clave de API"
        });
      }
      
      // Analizamos los datos con IA
      const analysis = await analyzeOrderData(ordersData);
      
      console.log(`✅ Análisis de pedidos con IA completado`);
      
      res.json({
        analysis,
        metadata: {
          period: { startDate, endDate },
          ordersCount: ordersData.length,
          zoneId: zoneId || null
        }
      });
    } catch (error) {
      console.error("❌ Error al analizar pedidos con IA:", error);
      res.status(500).json({
        error: "Error al analizar los datos de pedidos",
        message: String(error)
      });
    }
  });

  /**
   * Endpoint para obtener recomendaciones personalizadas para un cliente
   */
  router.get("/ai/assistant/customer-recommendations/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const companyId = req.session.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          error: "Se requiere una sesión con companyId"
        });
      }

      if (isNaN(customerId)) {
        return res.status(400).json({
          error: "ID de cliente inválido"
        });
      }

      console.log(`🔍 Obteniendo datos del cliente ${customerId} para recomendaciones (empresa ${companyId})`);
      
      // Obtener datos del cliente
      const customerData = await companyDb
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.companyId, companyId)
          )
        )
        .limit(1);
      
      if (customerData.length === 0) {
        return res.status(404).json({
          error: "Cliente no encontrado"
        });
      }

      // Obtener historial de pedidos del cliente
      const customerOrders = await companyDb
        .select({
          id: orders.id,
          total: orders.total,
          date: orders.date,
          status: orders.status
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, customerId),
            eq(orders.companyId, companyId)
          )
        )
        .orderBy(orders.date);
      
      // Preparar datos completos del cliente
      const customerProfile = {
        ...customerData[0],
        orderHistory: customerOrders
      };
      
      console.log(`📊 Cliente encontrado con ${customerOrders.length} pedidos en su historial`);

      // Verificamos si tenemos la clave de API de OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "Falta la clave de API de OpenAI",
          message: "Contacte al administrador para configurar la clave de API"
        });
      }
      
      // Generamos recomendaciones personalizadas
      const recommendations = await generateCustomerRecommendations(customerProfile);
      
      console.log(`✅ Recomendaciones para cliente generadas con éxito`);
      
      res.json({
        customer: {
          id: customerData[0].id,
          name: customerData[0].businessname
        },
        recommendations
      });
    } catch (error) {
      console.error("❌ Error al generar recomendaciones para el cliente:", error);
      res.status(500).json({
        error: "Error al generar recomendaciones",
        message: String(error)
      });
    }
  });
}