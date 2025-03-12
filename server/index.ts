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
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    log(`Current working directory: ${process.cwd()}`);
    log(`Environment: ${process.env.NODE_ENV}`);

    // Register API routes first
    const server = await registerRoutes(app);
    log("API routes registered successfully");

    // Configure static file serving and client-side routing based on environment
    if (process.env.NODE_ENV === "production") {
      log("Production mode: Setting up static file serving");
      const distPath = path.resolve(process.cwd(), 'dist', 'public');

      if (!fs.existsSync(distPath)) {
        log(`ERROR: Build directory not found at ${distPath}`);
        throw new Error(`Build directory not found at ${distPath}. Please run 'npm run build' first.`);
      }

      // Serve static files
      app.use(express.static(distPath));

      // Handle client-side routing
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });

      log("Static file serving configured");
    } else {
      // Development mode - use Vite only for non-API routes
      app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
          log(`API request detected: ${req.method} ${req.path}`);
          return next();
        }
        log(`Non-API request, using Vite: ${req.method} ${req.path}`);
        setupVite(app, server)
          .then(() => next())
          .catch(next);
      });
      log("Development mode: Vite setup modified for API handling");
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