import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerPlatformEndpoints } from "./platform-routes-register";
import { setupVite, log } from "./vite";
import path from "path";
import session from "express-session";
import { tenantMiddleware, companyFilterMiddleware } from "./multi-tenant-middleware";
import { platformStorage } from "./platform-storage";
import { setupPlatform } from "./platform-db-setup";
import { companyDbMiddleware } from "./company-db";

const app = express();

// Basic middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'sistema_multi_empresas_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 1 día
  }
};

app.use(session(sessionConfig));

// Creamos routers separados para APIs de empresas y plataforma
const companyApiRouter = express.Router();
const platformApiRouter = express.Router();

// Solo aplicamos los middlewares de multi-tenancy al router de empresas
companyApiRouter.use(tenantMiddleware);
companyApiRouter.use(companyDbMiddleware);
companyApiRouter.use(companyFilterMiddleware);

// Montamos los routers en sus respectivas rutas
app.use("/api/platform", platformApiRouter);
app.use("/api", companyApiRouter);

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
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }
    log(logLine);
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    log(`Current working directory: ${process.cwd()}`);
    log(`Environment: ${process.env.NODE_ENV}`);
    
    // Setup platform tables and initial data
    log("Setting up platform database tables and initial data...");
    await setupPlatform();
    log("Platform setup completed");
    
    let server;

    // Register Platform API routes first (for admin platform)
    registerPlatformEndpoints(app);
    log("Platform routes registered successfully");
    
    // Register regular API routes for company operations
    server = await registerRoutes(companyApiRouter);
    log("Company routes registered successfully");

    // Configure static file serving and client-side routing
    if (process.env.NODE_ENV === "production") {
      log("Production mode: Setting up static file serving");
      const distPath = path.resolve(process.cwd(), 'dist', 'public');

      // Handle static files
      app.use(express.static(distPath));

      // Client-side routing - send index.html for non-API routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Development mode - use Vite
      await setupVite(app, server);
      log("Development mode: Vite setup complete");
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
    });

  } catch (error) {
    log(`Fatal error during server initialization: ${error}`);
    console.error("Full error:", error);
    process.exit(1);
  }
})();