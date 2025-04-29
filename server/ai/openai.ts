import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Realiza una pregunta al asistente de IA sobre gestión del agua y logística
 * @param question Pregunta del usuario
 * @returns Respuesta generada por el asistente de IA
 */
export async function askWaterLogisticsAssistant(question: string): Promise<string> {
  try {
    const systemPrompt = `
      Eres un asistente especializado en gestión del agua y logística para una plataforma de manejo de distribución de agua.
      Ayudas a los usuarios con preguntas sobre:
      - Buenas prácticas en la distribución de agua
      - Gestión de flotas y rutas de entrega
      - Optimización de logística de distribución
      - Reducción de costos operativos
      - Prácticas sostenibles en la gestión del agua
      - Regulaciones locales e internacionales sobre distribución de agua
      - Uso de la plataforma y sus características
      
      Tus respuestas deben ser:
      - Concretas y directas
      - Basadas en conocimientos técnicos pero explicadas de forma accesible
      - Enfocadas en soluciones prácticas
      - Respetuosas con el medioambiente y el cumplimiento normativo
      
      Si te preguntan sobre algo fuera de tu área de experiencia, indica que eres un asistente especializado
      en gestión del agua y logística, y que tu conocimiento se limita a esos campos.
    `;

    // Realizamos la consulta a la API de OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content || "Lo siento, no pude generar una respuesta en este momento.";
  } catch (error) {
    console.error("Error al consultar OpenAI:", error);
    return "Ocurrió un error al procesar tu pregunta. Por favor, inténtalo de nuevo más tarde.";
  }
}

/**
 * Analiza un conjunto de datos de pedidos y proporciona insights
 * @param orderData Datos de pedidos a analizar
 * @returns Análisis e insights proporcionados por la IA
 */
export async function analyzeOrderData(orderData: any): Promise<any> {
  try {
    const jsonData = JSON.stringify(orderData);
    
    const systemPrompt = `
      Eres un analista experto en logística y distribución de agua.
      Analiza los siguientes datos de pedidos y proporciona insights valiosos sobre:
      - Patrones en los pedidos
      - Oportunidades de optimización de rutas
      - Sugerencias para reducir costos operativos
      - Tendencias de consumo por zona geográfica
      - Predicciones de demanda futura basadas en patrones históricos
      
      Formata tu respuesta en JSON con la siguiente estructura:
      {
        "keyInsights": ["Insight 1", "Insight 2", ...],
        "opportunityAreas": ["Área 1", "Área 2", ...],
        "recommendations": ["Recomendación 1", "Recomendación 2", ...]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analiza estos datos de pedidos: ${jsonData}` }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error al analizar datos con OpenAI:", error);
    return {
      keyInsights: ["No se pudieron generar insights debido a un error."],
      opportunityAreas: [],
      recommendations: ["Intente nuevamente más tarde."]
    };
  }
}

/**
 * Genera recomendaciones personalizadas para un cliente basadas en su historial
 * @param customerData Datos del cliente y su historial
 * @returns Recomendaciones personalizadas
 */
export async function generateCustomerRecommendations(customerData: any): Promise<any> {
  try {
    const jsonData = JSON.stringify(customerData);
    
    const systemPrompt = `
      Eres un especialista en CRM para empresas de distribución de agua.
      Genera recomendaciones personalizadas para este cliente basadas en:
      - Su historial de pedidos
      - Patrones de consumo
      - Ubicación geográfica
      - Tipo de cliente (residencial, comercial, industrial)
      
      Formata tu respuesta en JSON con la siguiente estructura:
      {
        "customerInsights": ["Insight 1", "Insight 2", ...],
        "recommendedProducts": ["Producto 1", "Producto 2", ...],
        "serviceImprovements": ["Mejora 1", "Mejora 2", ...],
        "retentionStrategies": ["Estrategia 1", "Estrategia 2", ...]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analiza este cliente: ${jsonData}` }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error al generar recomendaciones con OpenAI:", error);
    return {
      customerInsights: ["No se pudieron generar insights debido a un error."],
      recommendedProducts: [],
      serviceImprovements: [],
      retentionStrategies: ["Intente nuevamente más tarde."]
    };
  }
}

export default {
  askWaterLogisticsAssistant,
  analyzeOrderData,
  generateCustomerRecommendations
};