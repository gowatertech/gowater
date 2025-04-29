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
// Importamos el generador de rutas 
import { registerRouteGeneratorEndpoints } from "./routes/route-generator";
// Importamos la nueva implementación simplificada del generador de rutas
import { registerSimplifiedRoutes } from "./simplified-routes";
// Importamos la nueva API del generador de rutas
import { registerNewRouteGenerator } from "./new-route-generator";
// Importamos dependencies para las consultas directas
import { db } from "./db";
import { orders, customers, zones } from "../shared/schema";
import { eq, and, isNull } from "drizzle-orm";

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
    
    // Registrar la nueva API del generador de rutas
    registerNewRouteGenerator(app);
    log("New route generator API endpoints registered successfully");
    
    // Registrar las rutas simplificadas
    registerSimplifiedRoutes(app);
    log("Simplified routes registered successfully");
    
    // Usar el router de órdenes personalizado con el middleware consolidado
    app.use(consolidatedCompanyMiddleware, ordersRouter);
    log("Custom orders router registered successfully with consolidated company middleware");
    
    // Montar las rutas públicas para registro de empresas interesadas
    app.use("/api/leads", leadsRoutes);
    log("Lead registration routes registered successfully");
    
    // Montar las rutas para gestionar empresas interesadas
    app.use("/api", interestedCompaniesRoutes);
    log("Interested companies routes registered successfully");
    
    // Ruta directa para obtener pedidos pendientes sin pasar por Vite
    app.get("/api/route-generator/orders/pending", async (req: Request, res: Response) => {
      // Verificar si el usuario está autenticado
      if (!req.session?.user) {
        return res.status(401).json({ 
          success: false, 
          message: "No autenticado" 
        });
      }
      
      try {
        // Obtener companyId del usuario
        const companyId = req.session.user.companyId;
        if (!companyId) {
          return res.status(400).json({ 
            error: "No se encontró ID de compañía" 
          });
        }
        
        console.log(`[API Direct] Obteniendo pedidos pendientes para compañía ${companyId}`);
        
        // Obtener pedidos pendientes
        const pendingOrders = await db
          .select({
            id: orders.id,
            customerId: orders.customerId,
            status: orders.status,
            date: orders.date,
            total: orders.total,
            paymentMethod: orders.paymentMethod,
            deliveryCoordinates: orders.deliveryCoordinates,
            notes: orders.notes
          })
          .from(orders)
          .where(
            and(
              eq(orders.companyId, companyId),
              eq(orders.status, 'pending'),
              isNull(orders.routeId)
            )
          );
        
        // Para cada pedido, obtener datos del cliente y su zona
        const result = await Promise.all(
          pendingOrders.map(async (order) => {
            const customer = await db
              .select()
              .from(customers)
              .where(and(
                eq(customers.id, order.customerId),
                eq(customers.companyId, companyId)
              ))
              .limit(1);
              
            let zone = null;
            if (customer[0]?.zoneid) {
              const zoneData = await db
                .select()
                .from(zones)
                .where(and(
                  eq(zones.id, customer[0].zoneid),
                  eq(zones.companyId, companyId)
                ))
                .limit(1);
                
              if (zoneData.length > 0) {
                zone = zoneData[0];
              }
            }
            
            return {
              ...order,
              customer: customer.length > 0 ? customer[0] : null,
              zone
            };
          })
        );
        
        console.log(`[API Direct] Se encontraron ${result.length} pedidos pendientes`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(result);
      } catch (error) {
        console.error('[API Direct] Error al obtener pedidos pendientes:', error);
        return res.status(500).json({ 
          error: "Error al obtener pedidos pendientes",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });
    log("Direct route-generator/orders/pending endpoint registered");
    
    // Ya registramos estas rutas arriba
    // No necesitamos registrarlas de nuevo
    
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

      // Ruta de prueba para verificar el generador de rutas
      app.get('/test-route-generator', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'test-route-generator.html'));
      });
      
      // Client-side routing - send index.html for non-API routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Ruta de prueba para verificar el generador de rutas
      app.get('/test-route-generator', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'test-route-generator.html'));
      });
      
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