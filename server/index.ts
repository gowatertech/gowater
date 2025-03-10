import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import path from "path";

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
    let server;

    // Register API routes first
    server = await registerRoutes(app);
    log("Routes registered successfully");

    // Configure static file serving and client-side routing
    if (process.env.NODE_ENV === "production") {
      // Serve static files from the client build directory
      const distPath = path.join(process.cwd(), 'dist', 'client');
      app.use(express.static(distPath));

      // Handle client-side routing - send index.html for all non-API routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Development mode - use Vite
      await setupVite(app, server);
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${message}`);
      res.status(status).json({ message });
    });

    // Start server
    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      log(`Server started successfully on port ${port}`);
    });

  } catch (error) {
    log(`Fatal error during server initialization: ${error}`);
    process.exit(1);
  }
})();