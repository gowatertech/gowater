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
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import leadsRoutes from "./leads-routes";
import interestedCompaniesRoutes from "./routes/api/interested-companies";
import { companyTenantMiddleware } from "./middleware/company-auth.middleware";
import { registerTestAPIRoutes } from "./test-api";
import { loginRateLimitMiddleware, rateLimitMiddleware } from "./middleware/rate-limit.middleware";
import { consolidatedCompanyMiddleware } from "./middleware/consolidated-company.middleware";
// Importamos el router de órdenes
import ordersRouter from "./routes/orders";
// Importamos las rutas para datos geográficos
import { registerGeoDataRoutes } from "./routes/geo-data";

const app = express();

// Basic middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar rate limiting para evitar ataques de fuerza bruta
app.use(loginRateLimitMiddleware);
app.use(rateLimitMiddleware);

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

// Creamos routers separados para APIs de empresas, plataforma y datos geográficos
const companyApiRouter = express.Router();
const platformApiRouter = express.Router();
const geoDataApiRouter = express.Router(); // Router para datos geográficos sin autenticación

// Usamos el middleware consolidado para la gestión multi-tenant
companyApiRouter.use(consolidatedCompanyMiddleware);
// El middleware companyTenantMiddleware se mantiene para compatibilidad retroactiva
companyApiRouter.use(companyTenantMiddleware);

// Montamos los routers en sus respectivas rutas
app.use("/api/platform", platformApiRouter);
app.use("/api/geo", geoDataApiRouter); // Para datos geográficos sin autenticación
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
    registerPlatformEndpoints(platformApiRouter);
    log("Platform routes registered successfully");
    
    // Register geographic data routes that don't require authentication
    registerGeoDataRoutes(geoDataApiRouter);
    log("Geographic data routes registered successfully");
    
    // Register regular API routes for company operations
    await registerRoutes(companyApiRouter);
    log("Company routes registered successfully");
    
    // Montar directamente las rutas del generador de rutas para evitar problemas con Vite
    registerRouteGeneratorEndpoints(companyApiRouter);
    log("Route generator endpoints registered directly to avoid Vite issues");
    
    // Usar el router de órdenes personalizado con el middleware consolidado
    app.use(consolidatedCompanyMiddleware, ordersRouter);
    log("Custom orders router registered successfully with consolidated company middleware");
    
    // Montar las rutas públicas para registro de empresas interesadas
    app.use("/api/leads", leadsRoutes);
    log("Lead registration routes registered successfully");
    
    // Montar las rutas para gestionar empresas interesadas
    app.use("/api", interestedCompaniesRoutes);
    log("Interested companies routes registered successfully");
    
    // Registrar rutas de prueba (solo en desarrollo)
    if (process.env.NODE_ENV !== "production") {
      registerTestAPIRoutes(app);
      log("Test API routes registered successfully");
    }
    
    // Crear servidor HTTP
    server = createServer(app);
    
    // Configurar WebSocket Server
    const driverConnections = new Map<number, WebSocket>();
    const wss = new WebSocketServer({ 
      server: server,
      path: '/ws'
    });
    
    wss.on('connection', (ws) => {
      console.log('Nueva conexión WebSocket');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'driver_location') {
            // Almacenar la conexión del conductor
            driverConnections.set(data.driverId, ws);

            // Actualizar ubicación en la base de datos
            await storage.updateDriverLocation(data.driverId, {
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: new Date()
            });

            // Broadcast a todos los clientes conectados
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'location_update',
                  driverId: data.driverId,
                  location: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: new Date()
                  }
                }));
              }
            });
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
        }
      });

      ws.on('close', () => {
        // Eliminar la conexión cuando se cierra
        driverConnections.forEach((connection, driverId) => {
          if (connection === ws) {
            driverConnections.delete(driverId);
          }
        });
      });
    });

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