import express, { type Request, Response, NextFunction } from "express";
import { setupVite, log } from "./vite";
import path from "path";
import fs from "fs";
import apiRouter from './api';
import { createServer } from 'http';

const app = express();

// Configurar body parsers globalmente primero
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    log(`Current working directory: ${process.cwd()}`);
    log(`Environment: ${process.env.NODE_ENV}`);

    // Montar el router API primero
    app.use('/api', apiRouter);
    log("API routes mounted successfully");

    // Crear el servidor HTTP
    const server = createServer(app);

    // Configurar el manejo de rutas para el cliente
    if (process.env.NODE_ENV === "production") {
      const distPath = path.resolve(process.cwd(), 'dist', 'public');
      if (!fs.existsSync(distPath)) {
        throw new Error(`Build directory not found at ${distPath}. Please run 'npm run build' first.`);
      }

      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
    } else {
      app.use(async (req, res, next) => {
        if (!req.path.startsWith('/api')) {
          try {
            await setupVite(app, server);
            next();
          } catch (e) {
            next(e);
          }
        }
      });
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${message}`);
      console.error("Error stack:", err.stack);
      res.status(status).json({ message });
    });

    // Start server
    const port = process.env.PORT || 5000;
    server.listen(Number(port), "0.0.0.0", () => {
      log(`Server started successfully on port ${port} and bound to 0.0.0.0`);
      log(`Environment: ${process.env.NODE_ENV}`);
      log(`Application URL: ${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : `http://localhost:${port}`}`);
    });

  } catch (error) {
    log(`Fatal error during server initialization: ${error}`);
    console.error("Full error:", error);
    process.exit(1);
  }
})();