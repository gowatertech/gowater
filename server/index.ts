import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import path from "path";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { runMigrations } from "../migrations";

const app = express();

// Basic middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar el sistema de autenticación
setupAuth(app);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Montar las rutas de la API
const httpServer = registerRoutes(app);

// Iniciar servidor
(async () => {
  try {
    log("Iniciando el servidor...");
    
    // Ejecutar migraciones para crear tablas necesarias
    log("Ejecutando migraciones...");
    await runMigrations();
    log("Migraciones completadas");
    
    // Modo desarrollo: usar Vite para servir archivos del cliente
    await setupVite(app, httpServer);
    log("Configuración de Vite completada");
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err.stack);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Error interno del servidor";
      res.status(status).json({ error: message });
    });
    
    // Iniciar servidor
    const port = process.env.PORT || 5000;
    httpServer.listen(Number(port), "0.0.0.0", () => {
      log(`Servidor iniciado en puerto ${port}`);
      log(`Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
    });
    
  } catch (error) {
    log(`Error fatal durante la inicialización: ${error}`);
    console.error("Error completo:", error);
    process.exit(1);
  }
})();