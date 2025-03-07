import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { storage } from "./storage";
import { zones, routes, users, provinces, cities, municipalities, sectors, insertZoneSchema, insertRouteSchema, customers, insertCustomerSchema } from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';

// Configurar multer para manejar la carga de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Almacenar las conexiones activas de los conductores
const driverConnections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Configurar WebSocket Server
  const wss = new WebSocketServer({ 
    server: httpServer,
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

  // Endpoints para el manejo de direcciones
  app.get("/api/provinces", async (req, res) => {
    try {
      const allProvinces = await db
        .select()
        .from(provinces);
      res.json(allProvinces);
    } catch (error) {
      console.error("Error al obtener provincias:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/municipalities/:provinceId", async (req, res) => {
    try {
      const provinceId = parseInt(req.params.provinceId);
      const municipalitiesInProvince = await db
        .select()
        .from(municipalities)
        .where(eq(municipalities.provinceId, provinceId));
      res.json(municipalitiesInProvince);
    } catch (error) {
      console.error("Error al obtener municipios:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/cities/:provinceId", async (req, res) => {
    try {
      const provinceId = parseInt(req.params.provinceId);
      const citiesInProvince = await db
        .select()
        .from(cities)
        .innerJoin(
          municipalities,
          eq(cities.municipalityId, municipalities.id)
        )
        .where(eq(municipalities.provinceId, provinceId));
      res.json(citiesInProvince);
    } catch (error) {
      console.error("Error al obtener ciudades:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/sectors/:cityId", async (req, res) => {
    try {
      const cityId = parseInt(req.params.cityId);
      const sectorsInCity = await db
        .select()
        .from(sectors)
        .where(eq(sectors.cityId, cityId));
      res.json(sectorsInCity);
    } catch (error) {
      console.error("Error al obtener sectores:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Zonas
  app.get("/api/zones", async (req, res) => {
    try {
      const allZones = await db
        .select()
        .from(zones);

      console.log("Retrieved zones:", allZones);
      res.json(allZones);
    } catch (error) {
      console.error("Error al obtener zonas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/zones", async (req, res) => {
    console.log("Creating zone with data:", req.body);

    const result = insertZoneSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Error de validación:", result.error.format());
      return res.status(400).json({ error: result.error.format() });
    }

    try {
      // Validar el formato de las coordenadas antes de insertar
      const coordinates = result.data.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 3) {
        throw new Error("Se requieren al menos 3 puntos para crear una zona");
      }

      // Validar el formato de cada coordenada
      for (const coord of coordinates) {
        if (!/^-?\d+\.\d+,-?\d+\.\d+$/.test(coord)) {
          throw new Error(`Formato de coordenada inválido: ${coord}`);
        }
      }

      const [zone] = await db
        .insert(zones)
        .values(result.data)
        .returning();

      console.log("Created zone:", zone);
      res.json(zone);
    } catch (error) {
      console.error("Error al crear zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/zones/:id", async (req, res) => {
    try {
      const [deletedZone] = await db
        .delete(zones)
        .where(eq(zones.id, parseInt(req.params.id)))
        .returning();

      if (!deletedZone) {
        return res.status(404).json({ error: "Zona no encontrada" });
      }

      console.log("Deleted zone:", deletedZone);
      res.json(deletedZone);
    } catch (error) {
      console.error("Error al eliminar zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      // Si se especifica un rol, filtrar por ese rol
      const role = req.query.role as string;
      let usersList;

      if (role) {
        usersList = await db
          .select()
          .from(users)
          .where(eq(users.role, role));
      } else {
        usersList = await db
          .select()
          .from(users);
      }

      res.json(usersList);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas
  app.get("/api/routes", async (req, res) => {
    try {
      const allRoutes = await db
        .select()
        .from(routes);

      console.log("Retrieved routes:", allRoutes);
      res.json(allRoutes);
    } catch (error) {
      console.error("Error al obtener rutas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/routes", async (req, res) => {
    console.log("Creating route with data:", req.body);

    try {
      const routeData = {
        ...req.body,
        date: new Date(req.body.date),
        driverId: Number(req.body.driverId),
        truckId: 1, // Valor temporal para pruebas
        status: "pending",
        isCompleted: false
      };

      console.log("Processed route data:", routeData);

      const result = insertRouteSchema.safeParse(routeData);

      if (!result.success) {
        console.error("Validation error:", result.error.format());
        return res.status(400).json({ error: result.error.format() });
      }

      const [route] = await db
        .insert(routes)
        .values(result.data)
        .returning();

      console.log("Created route:", route);
      res.json(route);
    } catch (error) {
      console.error("Error al crear ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  // Customer endpoints
  app.post("/api/customers", upload.single('logo'), async (req, res) => {
    try {
      console.log("Received customer data:", req.body);
      console.log("Received file:", req.file);

      // Validar los datos del cliente
      const customerData = {
        ...req.body,
        logo: req.file ? req.file.buffer.toString('base64') : null,
        creditlimit: req.body.creditlimit || '0.00',
      };

      console.log("Processed customer data:", customerData);

      const [customer] = await db
        .insert(customers)
        .values(customerData)
        .returning();

      console.log("Created customer:", customer);
      res.json(customer);
    } catch (error) {
      console.error("Error al crear cliente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const allCustomers = await db
        .select({
          id: customers.id,
          logo: customers.logo,
          rnc: customers.rnc,
          businessname: customers.businessname,
          managername: customers.managername,
          phone: customers.phone,
          email: customers.email,
          zoneid: customers.zoneid,
          street: customers.street,
          streetnumber: customers.streetnumber,
          creditlimit: customers.creditlimit,
          provinceid: customers.provinceid,
          municipalityid: customers.municipalityid,
          reference: customers.reference,
          municipalityName: municipalities.name,
          provinceName: provinces.name,
        })
        .from(customers)
        .leftJoin(provinces, eq(customers.provinceid, provinces.id))
        .leftJoin(municipalities, eq(customers.municipalityid, municipalities.id));

      console.log("Retrieved customers:", allCustomers);
      res.json(allCustomers);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const [customer] = await db
        .select({
          ...customers,
          provinceName: provinces.name,
          municipalityName: municipalities.name,
        })
        .from(customers)
        .leftJoin(provinces, eq(customers.provinceId, provinces.id))
        .leftJoin(municipalities, eq(customers.municipalityId, municipalities.id))
        .where(eq(customers.id, customerId));

      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error al obtener cliente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return httpServer;
}