import { type Request, type Response } from "express";

/**
 * Middleware para asegurar que las respuestas sean siempre JSON
 * Evita que el middleware de Vite procese la respuesta
 */
export function jsonResponseMiddleware(req: Request, res: Response, next: Function) {
  // Establecer cabeceras para evitar que Vite procese la respuesta
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Vite-Skip', 'true');
  next();
}

/**
 * Clase base para todos los controladores de API directa
 * Proporciona métodos para responder con diferentes estados HTTP
 */
export class DirectApiController {
  /**
   * Responde con código 200 (OK)
   */
  protected sendSuccess(res: Response, data: any, message: string = "Operación exitosa") {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Responde con código 201 (Created)
   */
  protected sendCreated(res: Response, data: any, message: string = "Recurso creado exitosamente") {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Responde con código 400 (Bad Request)
   */
  protected sendBadRequest(res: Response, message: string = "Solicitud inválida", details?: any) {
    return res.status(400).json({
      success: false,
      error: "bad_request",
      message,
      details
    });
  }

  /**
   * Responde con código 404 (Not Found)
   */
  protected sendNotFound(res: Response, message: string = "Recurso no encontrado", details?: any) {
    return res.status(404).json({
      success: false,
      error: "not_found",
      message,
      details
    });
  }

  /**
   * Responde con código 500 (Internal Server Error)
   */
  protected sendError(res: Response, error: any) {
    console.error("Error en controlador DirectAPI:", error);
    
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error instanceof Error ? error.message : "Error interno del servidor"
    });
  }
}

/**
 * Ejemplo de uso para cualquier funcionalidad
 * Se puede extender para implementar cualquier acción que necesites
 */
export class GenericAPIController extends DirectApiController {
  /**
   * Endpoint de ejemplo
   */
  async handleRequest(req: Request, res: Response) {
    try {
      console.log("=== INICIO DE SOLICITUD A DIRECT API ===");
      console.log("Datos recibidos:", req.body);
      
      // Lógica personalizada aquí
      const result = {
        id: 1,
        timestamp: new Date(),
        receivedData: req.body,
        params: req.params
      };
      
      console.log("Solicitud procesada con éxito");
      return this.sendSuccess(res, result);
      
    } catch (error) {
      return this.sendError(res, error);
    } finally {
      console.log("=== FIN DE SOLICITUD A DIRECT API ===");
    }
  }
}