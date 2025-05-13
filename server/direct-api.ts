import { type Request, type Response } from "express";

/**
 * Endpoint directo para generar una orden a partir de un pedido recurrente
 * Evita el middleware de Vite y responde directamente con JSON
 */
export async function generateFromRecurringOrder(req: Request, res: Response) {
  // Evitar que Vite transforme la respuesta
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Vite-Skip', 'true');
  
  try {
    console.log("=== INICIO DE ENDPOINT DIRECTO PARA GENERACIÓN DE ORDEN RECURRENTE ===");
    console.log("Headers actuales:", JSON.stringify(res.getHeaders()));
    
    // Obtener el ID del pedido recurrente como parámetro
    let recurringOrderId: number;
    
    // Intentar convertir el ID usando varias estrategias
    if (typeof req.params.id === 'string') {
      const cleanId = req.params.id.replace(/[^0-9]/g, '');
      recurringOrderId = parseInt(cleanId, 10);
    } else {
      recurringOrderId = Number(req.params.id);
    }
    
    console.log(`Endpoint directo - ID recibido: ${req.params.id}, procesado como: ${recurringOrderId}`);
    
    // Validación básica del ID
    if (isNaN(recurringOrderId) || recurringOrderId <= 0) {
      console.error(`Error: ID de pedido recurrente inválido: ${req.params.id}`);
      return res.status(400).json({ 
        success: false,
        error: "ID de pedido recurrente inválido", 
        details: `El ID proporcionado (${req.params.id}) no se pudo convertir a un número válido.`
      });
    }
    
    // Importar las dependencias necesarias
    const { recurringOrdersService } = await import('./recurring-orders');
    const { getCurrentCompanyId, setCurrentCompanyId } = await import('./company-db');
    
    // Configurar la compañía correcta para el contexto
    const companyId = req.body.companyId || (req as any).companyId || 15;
    const prevCompanyId = getCurrentCompanyId();
    
    console.log(`Endpoint directo - Usando companyId: ${companyId}`);
    setCurrentCompanyId(companyId);
    
    try {
      // Paso 1: Verificar que el pedido recurrente existe
      const recurringOrderData = await recurringOrdersService.getRecurringOrder(recurringOrderId);
      if (!recurringOrderData) {
        return res.status(404).json({
          success: false,
          error: "Pedido recurrente no encontrado",
          details: `No existe un pedido recurrente con ID ${recurringOrderId}`
        });
      }
      
      console.log(`Endpoint directo - Pedido recurrente #${recurringOrderId} verificado`);
      
      // Paso 2: Verificar que hay elementos en el pedido recurrente
      const items = await recurringOrdersService.listRecurringOrderItems(recurringOrderId);
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Pedido recurrente sin elementos",
          details: `El pedido recurrente #${recurringOrderId} no tiene elementos asociados`
        });
      }
      
      console.log(`Endpoint directo - Pedido recurrente #${recurringOrderId} tiene ${items.length} elementos`);
      
      // Paso 3: Generar la orden
      console.log(`Endpoint directo - Generando orden a partir del pedido recurrente #${recurringOrderId}`);
      const generatedOrder = await recurringOrdersService.generateOrderFromRecurring(recurringOrderId);
      
      // Paso 4: Enviar respuesta JSON exitosa
      const responseData = {
        success: true,
        message: `Pedido generado exitosamente desde pedido recurrente #${recurringOrderId}`,
        order: generatedOrder
      };
      
      console.log(`Endpoint directo - Orden generada exitosamente:`, JSON.stringify(responseData));
      return res.status(201).json(responseData);
    } finally {
      // Restaurar el contexto original
      setCurrentCompanyId(prevCompanyId);
      console.log("=== FIN DE ENDPOINT DIRECTO PARA GENERACIÓN DE ORDEN RECURRENTE ===");
    }
  } catch (error) {
    console.error("❌ ERROR EN ENDPOINT DIRECTO:", error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        success: false,
        error: "Error al generar orden desde pedido recurrente",
        message: error.message
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Error desconocido",
      message: "Se produjo un error desconocido al procesar la solicitud"
    });
  }
}