import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth, requireRole } from "./auth";

export function registerRoutes(app: Express): Server {
  // Configuración de autenticación
  setupAuth(app);

  // API de usuarios
  app.get("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    // Aquí implementaríamos la lógica para obtener usuarios
    res.json({ message: "Endpoint de usuarios" });
  });

  // Otras rutas de la aplicación
  
  const httpServer = createServer(app);
  return httpServer;
}