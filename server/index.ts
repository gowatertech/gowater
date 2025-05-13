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
import { companyAuthMiddleware } from "./middleware/company-auth.middleware";
import { setupAuth } from "./auth";
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

// La configuración de sesión se hará en setupAuth para unificar la gestión de autenticación
// Configurar el sistema completo de autenticación (incluye sesión, passport y endpoints)
setupAuth(app);

// Creamos routers separados para APIs de empresas, plataforma y datos geográficos
const companyApiRouter = express.Router();
const platformApiRouter = express.Router();
const geoDataApiRouter = express.Router(); // Router para datos geográficos sin autenticación

// Endpoint especial para debugging sin autenticación
app.get("/api/zones/:id/pending-orders", async (req, res) => {
  try {
    console.log("🔍 Iniciando búsqueda de pedidos pendientes por zona (endpoint público)...");
    
    // Parse zoneId una sola vez aquí
    const zoneId = parseInt(req.params.id);
    if (isNaN(zoneId)) {
      return res.status(400).json({ error: "ID de zona inválido" });
    }
    
    // Comprobar si es modo debug o companyId en los parámetros
    const isDebugMode = req.query.debug === 'true';
    
    // Obtener companyId principalmente desde parámetros de consulta para debug
    let companyId: number | undefined;
    let companyIdSource = "";
    
    if (req.query.companyId) {
      const queryCompanyId = parseInt(req.query.companyId as string);
      if (!isNaN(queryCompanyId)) {
        companyId = queryCompanyId;
        companyIdSource = "query string";
        console.log("🔄 CompanyId obtenido del query string:", companyId);
      }
    } else {
      console.error("❌ Error: No se encontró companyId en los parámetros de consulta");
      return res.status(400).json({ 
        error: "Parámetro requerido", 
        message: "Se requiere el parámetro companyId para este endpoint de depuración.",
      });
    }
    
    console.log(`🔍 GET /api/zones/${zoneId}/pending-orders - Buscando pedidos pendientes para compañía ${companyId}`);
    
    // Verificar que la zona existe para esta compañía
    const { db } = await import('./db');
    const { zones, orders, customers } = await import('../shared/schema');
    const { and, eq, sql } = await import('drizzle-orm');
    
    const zonaExiste = await db
      .select({ id: zones.id, name: zones.name })
      .from(zones)
      .where(
        and(
          eq(zones.id, zoneId),
          eq(zones.companyId, companyId)
        )
      );
    
    console.log(`🗺️ Zona encontrada:`, zonaExiste);
    
    if (zonaExiste.length === 0) {
      console.error(`❌ La zona ${zoneId} no pertenece a la compañía ${companyId}`);
      return res.json([]);
    }
    
    // Enfoque más directo: buscar pedidos pendientes cuyo cliente está en la zona seleccionada
    console.log(`🔍 Buscando pedidos pendientes para zona ${zoneId} y compañía ${companyId}`);
    
    // Consulta mejorada que une orders, customers y zones directamente
    const pendingOrders = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        total: orders.total,
        date: orders.date,
        estimatedDeliveryTime: orders.estimatedDeliveryTime,
        status: orders.status,
        notes: orders.notes,
        deliveryCoordinates: orders.deliveryCoordinates,
        coordinates: customers.coordinates,
        customerName: customers.businessname,
        customerAddress: customers.street,
        customerAddressNumber: customers.streetnumber,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          eq(customers.zoneid, zoneId), // Clientes de la zona especificada
          eq(orders.status, "pending"), // Pedidos pendientes
          sql`${orders.routeId} IS NULL`, // No asignados a una ruta
          eq(orders.companyId, companyId), // De la compañía correcta
          eq(customers.companyId, companyId) // Cliente de la compañía correcta
        )
      )
      .orderBy(orders.date);
      
    console.log(`📊 Encontrados ${pendingOrders.length} pedidos pendientes para zona ${zoneId}`);
    
    // Si no se encontraron pedidos, registramos la información para depuración
    if (pendingOrders.length === 0) {
      // Contar cuántos clientes hay en la zona
      const zoneCustomersCount = await db
        .select({ count: sql`COUNT(*)` })
        .from(customers)
        .where(
          and(
            eq(customers.zoneid, zoneId),
            eq(customers.companyId, companyId)
          )
        );
        
      // Contar cuántos pedidos pendientes hay para la compañía
      const pendingOrdersCount = await db
        .select({ count: sql`COUNT(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.status, "pending"),
            sql`${orders.routeId} IS NULL`,
            eq(orders.companyId, companyId)
          )
        );
        
      console.log(`⚠️ Diagnóstico: Hay ${zoneCustomersCount[0]?.count || 0} clientes en la zona ${zoneId}`);
      console.log(`⚠️ Diagnóstico: Hay ${pendingOrdersCount[0]?.count || 0} pedidos pendientes totales para la compañía ${companyId}`);
    }
    
    console.log(`✅ Encontrados ${pendingOrders.length} pedidos pendientes para la zona ${zoneId} de compañía ${companyId}`);
    
    // Verificar y mostrar algunos detalles de los pedidos encontrados
    if (pendingOrders.length > 0) {
      console.log("📦 Primer pedido encontrado:", {
        id: pendingOrders[0].id,
        customerId: pendingOrders[0].customerId,
        customerName: pendingOrders[0].customerName,
        status: pendingOrders[0].status
      });
    }
    
    res.json(pendingOrders);
  } catch (error) {
    console.error(`❌ Error al obtener pedidos pendientes para la zona ${req.params.id}:`, error);
    res.status(500).json({ error: String(error) });
  }
});

// Usamos el middleware consolidado para la gestión multi-tenant
companyApiRouter.use(consolidatedCompanyMiddleware);
// Nuestro nuevo middleware de autenticación de compañía
companyApiRouter.use(companyAuthMiddleware);

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
      console.log(`⭐️ Servidor iniciado en http://0.0.0.0:${port}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    log(`Fatal error during server initialization: ${error}`);
    console.error("Full error:", error);
    process.exit(1);
  }
})();