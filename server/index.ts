import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();

// Basic middleware for parsing JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");

    // Variable para almacenar el servidor HTTP
    let server;

    // Registrar rutas API primero
    server = await registerRoutes(app);
    log("Routes registered successfully");

    // Middleware para asegurar que las rutas API se manejen primero
    app.use((req, res, next) => {
      log(`[Route Debug] Handling request for: ${req.path}`);

      if (req.path.startsWith('/api/')) {
        // Para requests de API, asegurarnos de que se manejen por las rutas registradas
        log(`[Route Debug] API request detected: ${req.path}`);
        next();
      } else if (process.env.NODE_ENV === "production") {
        // En producción, servir archivos estáticos
        log(`[Route Debug] Production mode, serving static files for: ${req.path}`);
        const distPath = path.join(process.cwd(), 'dist', 'public');
        const indexPath = path.join(distPath, 'index.html');

        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          log(`[Route Debug] Error: index.html not found at ${indexPath}`);
          res.status(404).send('Not found');
        }
      } else {
        // En desarrollo, pasar a Vite
        log(`[Route Debug] Development mode, passing to Vite: ${req.path}`);
        next();
      }
    });

    // Configurar Vite solo en desarrollo
    if (process.env.NODE_ENV !== "production") {
      log("Setting up Vite for development");
      await setupVite(app, server);
      log("Vite setup completed");
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${message}`);
      res.status(status).json({ message });
    });

    // Try to serve on port 5000 and bind to 0.0.0.0
    const startServer = (port = 5000) => {
      log(`Attempting to start server on port ${port}`);

      try {
        server.listen({
          port,
          host: "0.0.0.0", // Bind to all network interfaces
        }, () => {
          log(`Server started successfully on port ${port} and bound to 0.0.0.0`);
        });
      } catch (error) {
        log(`Failed to start server: ${error}`);
        process.exit(1);
      }
    };

    startServer();
  } catch (error) {
    log(`Fatal error during server initialization: ${error}`);
    process.exit(1);
  }
})();