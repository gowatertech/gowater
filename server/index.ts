import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add logging middleware for API routes only
app.use("/api", (req, res, next) => {
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
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }

    log(logLine);
  });

  next();
});

(async () => {
  // Register API routes first
  const server = await registerRoutes(app);

  // Then setup Vite or static serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Error:", err);
    res.status(status).json({ message });
  });

  // Try to serve on port 5000, fall back to another port if needed
  const startServer = (port = 5000) => {
    // First, try to close any existing server if it exists
    if (server.listening) {
      server.close();
    }

    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && port < 5010) {
        log(`Port ${port} is in use, trying ${port + 1}`);
        startServer(port + 1);
      } else {
        log(`Error starting server: ${err.message}`);
        // Try a random port as last resort
        if (err.code === 'EADDRINUSE') {
          const randomPort = Math.floor(Math.random() * 10000) + 10000;
          log(`Trying random port ${randomPort}`);
          startServer(randomPort);
        } else {
          throw err;
        }
      }
    });
  };

  startServer();
})();