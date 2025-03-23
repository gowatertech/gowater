import { Express, Request, Response } from "express";

export async function registerRouteSettlements(app: Express) {
  // Crear nuevo cuadre de ruta - Deshabilitado temporalmente
  app.post("/api/route-settlements", async (_req: Request, res: Response) => {
    // Respuesta temporal mientras se implementa la funcionalidad
    res.status(501).json({
      error: "Funcionalidad en desarrollo",
      message: "El módulo de cuadre de ruta se encuentra en desarrollo"
    });
  });

  // Obtener cuadre de ruta por ID - Deshabilitado temporalmente
  app.get("/api/route-settlements/:id", async (_req: Request, res: Response) => {
    // Respuesta temporal mientras se implementa la funcionalidad
    res.status(501).json({
      error: "Funcionalidad en desarrollo",
      message: "El módulo de cuadre de ruta se encuentra en desarrollo"
    });
  });
}