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

    // Error handling middleware  (Moved up)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${message}`);
      res.status(status).json({ message });
    });

    // Variable para almacenar el servidor HTTP
    let server;

    // Configurar Vite en modo desarrollo
    if (process.env.NODE_ENV !== "production") {
      log("Setting up Vite for development");
      server = await registerRoutes(app); //Routes registered before vite setup
      log("Routes registered successfully");
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      // En producción, servir archivos estáticos
      const distPath = path.join(process.cwd(), 'dist');
      log(`Production mode: Serving static files from ${distPath}`);

      // Verificar que la carpeta dist existe
      if (!fs.existsSync(distPath)) {
        log(`Error: dist folder not found at ${distPath}`);
        throw new Error('Production build not found. Please run build first.');
      }

      // Verificar que index.html existe
      const indexPath = path.join(distPath, 'index.html');
      if (!fs.existsSync(indexPath)) {
        log(`Error: index.html not found at ${indexPath}`);
        throw new Error('Production build incomplete. Missing index.html');
      }

      log('Found production build files successfully');
      server = await registerRoutes(app); //Routes registered before static files
      log("Routes registered successfully");

      // API middleware protection
      app.use('/api/*', (req, res, next) => {
        if (req.originalUrl.startsWith('/api/')) {
          next();
        } else {
          res.status(404).json({ error: 'API route not found' });
        }
      });

      // Servir archivos estáticos sin index
      app.use(express.static(distPath, {
        index: false // Deshabilitar el servido automático de index.html
      }));

      // Ruta catch-all para SPA
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          log(`API 404 for path: ${req.path}`);
          res.status(404).json({ error: 'API route not found' });
        } else {
          log(`Serving SPA for path: ${req.path}`);
          res.sendFile(indexPath);
        }
      });
    }

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