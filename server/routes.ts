import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { storage } from "./storage";
import { zones, routes, users, provinces, cities, municipalities, sectors, insertZoneSchema, insertRouteSchema, customers, insertCustomerSchema, invoices, invoiceItems, insertInvoiceSchema, insertInvoiceItemSchema, products, payments, orders, orderItems, trucks, insertTruckSchema, bottleReturns, productionBatches, productionBatchItems, warehouses, insertWarehouseSchema, vehicleLoading, vehicleLoadingItems, insertVehicleLoadingSchema, insertProductionBatchSchema, insertProductionBatchItemSchema, insertUserSchema, inventoryAdjustments, inventoryAdjustmentItems, insertInventoryAdjustmentSchema } from "@shared/schema";
import { db } from './db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import express from 'express';
import { registerVehicleLoadingRoutes } from "./routes/vehicleLoading";
import { registerRouteSettlements } from "./routes/routeSettlements";
import { registerDriverRoutes } from "./routes/driver";
import {Request, Response} from 'express';
import { calculateOptimalRoute } from './services/routeOptimizer';

// Configurar multer para manejar la carga de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express) {
  // Configurar express primero
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Registrar las rutas de carga de vehículo, cuadre y pedidos recurrentes
  await registerVehicleLoadingRoutes(app);
  await registerRouteSettlements(app);
  await registerDriverRoutes(app);
  
  // Ruta para pedidos recurrentes
  app.get("/api/recurring-orders", async (req, res) => {
    try {
      // Temporalmente retornamos datos de ejemplo
      const recurringOrders = [
        {
          id: 1,
          customerId: 1,
          frequency: "weekly",
          nextDeliveryDate: "2025-03-16",
          customerName: "Supermercado Nacional",
          order: "5 Botellones",
          isActive: true
        },
        {
          id: 2,
          customerId: 2,
          frequency: "biweekly",
          nextDeliveryDate: "2025-03-23",
          customerName: "Restaurante La Plaza",
          order: "8 Botellones",
          isActive: true
        }
      ];
      res.json(recurringOrders);
    } catch (error) {
      console.error("Error al obtener pedidos recurrentes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Warehouses endpoints
  app.get("/api/warehouses", async (req, res) => {
    try {
      const allWarehouses = await db
        .select()
        .from(warehouses)
        .orderBy(warehouses.code);

      console.log("GET /api/warehouses - Retornando:", allWarehouses.length, "almacenes");
      res.json(allWarehouses);
    } catch (error) {
      console.error("Error al obtener almacenes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/warehouses", async (req, res) => {
    try {
      console.log("POST /api/warehouses - Datos recibidos:", req.body);

      const result = insertWarehouseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Error de validación",
          details: result.error.format()
        });
      }

      const [warehouse] = await db
        .insert(warehouses)
        .values(result.data)
        .returning();

      console.log("POST /api/warehouses - Almacén creado:", warehouse);
      res.json(warehouse);
    } catch (error) {
      console.error("Error al crear almacén:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.patch("/api/warehouses/:id", async (req, res) => {
    try {
      console.log("PATCH /api/warehouses/:id - Body recibido:", req.body);
      const warehouseId = parseInt(req.params.id);

      const result = insertWarehouseSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Error de validación",
          details: result.error.format()
        });
      }

      const [warehouse] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, warehouseId));

      if (!warehouse) {
        return res.status(404).json({ error: "Almacén no encontrado" });
      }

      const [updatedWarehouse] = await db
        .update(warehouses)
        .set(result.data)
        .where(eq(warehouses.id, warehouseId))
        .returning();

      console.log("PATCH /api/warehouses/:id - Almacén actualizado:", updatedWarehouse);
      res.json(updatedWarehouse);
    } catch (error) {
      console.error("Error al actualizar almacén:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  // Endpoints para el manejo de direcciones
  app.get("/api/provinces", async (req, res) => {
    try {
      const allProvinces = await db
        .select()
        .from(provinces)
        .orderBy(provinces.name);
      res.json(allProvinces);
    } catch (error) {
      console.error("Error al obtener provincias:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/municipalities/:provinceId", async (req, res) => {
    try {
      const provinceId = parseInt(req.params.provinceId);
      if (isNaN(provinceId)) {
        return res.status(400).json({ error: "ID de provincia inválido" });
      }

      const municipalitiesInProvince = await db
        .select()
        .from(municipalities)
        .where(eq(municipalities.provinceId, provinceId))
        .orderBy(municipalities.name);

      console.log(`Municipios encontrados para provincia ${provinceId}:`, municipalitiesInProvince);
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

      res.json(allZones);
    } catch (error) {
      console.error("Error al obtener zonas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/zones/:id", async (req, res) => {
    try {
      const zoneId = parseInt(req.params.id);
      if (isNaN(zoneId)) {
        return res.status(400).json({ error: "ID de zona inválido" });
      }

      const zone = await db
        .select()
        .from(zones)
        .where(eq(zones.id, zoneId))
        .limit(1);

      if (zone.length === 0) {
        return res.status(404).json({ error: "Zona no encontrada" });
      }

      res.json(zone[0]);
    } catch (error) {
      console.error("Error al obtener zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/zones", async (req, res) => {
    const result = insertZoneSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.format() });
    }

    try {
      const coordinates = result.data.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 3) {
        throw new Error("Se requieren al menos 3 puntos para crear una zona");
      }

      for (const coord of coordinates) {
        if (!/^-?\d+\.\d+,-?\d+\.\d+$/.test(coord)) {
          throw new Error(`Formato de coordenada inválido: ${coord}`);
        }
      }

      const [zone] = await db
        .insert(zones)
        .values(result.data)
        .returning();

      res.json(zone);
    } catch (error) {
      console.error("Error al crear zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.patch("/api/zones/:id", async (req, res) => {
    try {
      const zoneId = parseInt(req.params.id);
      if (isNaN(zoneId)) {
        return res.status(400).json({ error: "ID de zona inválido" });
      }

      const { name, color } = req.body;
      
      if (!name || !color) {
        return res.status(400).json({ error: "Nombre y color son requeridos" });
      }

      const existingZone = await db
        .select()
        .from(zones)
        .where(eq(zones.id, zoneId))
        .limit(1);

      if (existingZone.length === 0) {
        return res.status(404).json({ error: "Zona no encontrada" });
      }

      const [updatedZone] = await db
        .update(zones)
        .set({
          name,
          color
        })
        .where(eq(zones.id, zoneId))
        .returning();

      res.json(updatedZone);
    } catch (error) {
      console.error("Error al actualizar zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/zones/:id", async (req, res) => {
    try {
      const zoneId = parseInt(req.params.id);
      if (isNaN(zoneId)) {
        return res.status(400).json({ error: "ID de zona inválido" });
      }

      const existingZone = await db
        .select()
        .from(zones)
        .where(eq(zones.id, zoneId))
        .limit(1);

      if (existingZone.length === 0) {
        return res.status(404).json({ error: "Zona no encontrada" });
      }

      // Eliminar la zona
      const [deletedZone] = await db
        .delete(zones)
        .where(eq(zones.id, zoneId))
        .returning();

      res.json({ 
        message: "Zona eliminada exitosamente", 
        id: zoneId,
        zone: deletedZone 
      });
    } catch (error) {
      console.error("Error al eliminar zona:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
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

  // Endpoint para obtener conductores y ayudantes
  app.get("/api/users/drivers", async (req, res) => {
    try {
      const role = req.query.role as string;
      const drivers = await db
        .select()
        .from(users)
        .where(
          role ? eq(users.role, role) : sql`${users.role} IN ('driver', 'assistant')`
        )
        .orderBy(users.name);

      console.log(`GET /api/users/drivers - Retornando: ${drivers.length} ${role || 'conductores/ayudantes'}`);
      res.json(drivers);
    } catch (error) {
      console.error("Error al obtener conductores:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener un usuario por ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error al obtener usuario:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para crear un nuevo usuario
  app.post("/api/users", async (req, res) => {
    try {
      const userData = req.body;
      
      // Validar el formato de los datos
      const result = insertUserSchema.safeParse(userData);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Datos de usuario inválidos", 
          details: result.error.format() 
        });
      }
      
      // Verificar si el username ya existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, userData.username));
        
      if (existingUser.length > 0) {
        return res.status(400).json({ 
          error: "Este nombre de usuario ya existe" 
        });
      }
      
      // Preparar los datos para la inserción con licenseExpiry en formato Date
      const insertData = {
        ...userData,
        licenseExpiry: userData.licenseExpiry ? new Date(userData.licenseExpiry) : null,
        hireDate: new Date()
      };
      
      // Crear el usuario
      const [newUser] = await db
        .insert(users)
        .values(insertData)
        .returning();
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para actualizar un usuario
  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Verificar si el usuario existe
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!existingUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Preparar datos para actualización
      const updateData = {
        ...userData,
        licenseExpiry: userData.licenseExpiry ? new Date(userData.licenseExpiry) : null
      };
      
      // Si la contraseña está vacía, no actualizarla
      if (!updateData.password) {
        delete updateData.password;
      }
      
      // Actualizar el usuario
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para eliminar un usuario (soft delete)
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verificar si el usuario existe
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!existingUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Marcar como inactivo en lugar de eliminar
      const [deletedUser] = await db
        .update(users)
        .set({ active: false })
        .where(eq(users.id, userId))
        .returning();
      
      res.json(deletedUser);
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas
  app.get("/api/routes", async (req, res) => {
    try {
      const allRoutes = await db
        .select()
        .from(routes);

      res.json(allRoutes);
    } catch (error) {
      console.error("Error al obtener rutas:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener una ruta por ID
  app.get("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (isNaN(routeId)) {
        return res.status(400).json({ error: "ID de ruta inválido" });
      }
      
      // Obtener la ruta específica
      const routeData = await db
        .select()
        .from(routes)
        .where(eq(routes.id, routeId))
        .limit(1);
        
      if (routeData.length === 0) {
        return res.status(404).json({ error: "Ruta no encontrada" });
      }
      
      const route = routeData[0];
      
      // Obtener información del conductor y ayudante
      let driverName = null;
      let assistantName = null;
      let truckDetails = null;
      
      if (route.driverId) {
        const driverData = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, route.driverId))
          .limit(1);
          
        if (driverData.length > 0) {
          driverName = driverData[0].name;
        }
      }
      
      if (route.assistantId) {
        const assistantData = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, route.assistantId))
          .limit(1);
          
        if (assistantData.length > 0) {
          assistantName = assistantData[0].name;
        }
      }
      
      if (route.truckId) {
        const truckData = await db
          .select()
          .from(trucks)
          .where(eq(trucks.id, route.truckId))
          .limit(1);
          
        if (truckData.length > 0) {
          const truck = truckData[0];
          truckDetails = `${truck.brand} ${truck.model} (${truck.plate})`;
        }
      }
      
      // Devolver la ruta con información adicional
      res.json({
        ...route,
        driverName,
        assistantName,
        truckDetails
      });
    } catch (error) {
      console.error("Error al obtener detalles de ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para optimizar ruta
  app.post("/api/routes/optimize", async (req, res) => {
    try {
      console.log("POST /api/routes/optimize - Body recibido:", req.body);
      const { orderIds, truckId, assistantId } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de IDs de pedidos" });
      }
      
      // Obtener las órdenes completas basadas en los IDs recibidos
      const ordersToOptimize = await db
        .select()
        .from(orders)
        .where(inArray(orders.id, orderIds));
      
      if (ordersToOptimize.length === 0) {
        return res.status(404).json({ error: "No se encontraron pedidos con los IDs proporcionados" });
      }
      
      // Calcular la ruta óptima usando el servicio de optimización
      const optimizedRoute = calculateOptimalRoute(ordersToOptimize);
      
      // Agregar información de vehículo y ayudante si se proporcionaron
      if (truckId) {
        optimizedRoute.truckId = truckId;
      }
      
      if (assistantId) {
        optimizedRoute.assistantId = assistantId;
      }
      
      console.log("Ruta optimizada calculada:", optimizedRoute);
      res.json(optimizedRoute);
    } catch (error) {
      console.error("Error al optimizar ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      console.log("POST /api/routes - Datos recibidos:", req.body);
      
      // Ahora solo requerimos un conductor, no assistant ni truck
      const routeData = {
        name: req.body.name,
        date: new Date(req.body.date),
        driverId: Number(req.body.driverId),
        zoneId: Number(req.body.zoneId),
        status: "pending",
        isCompleted: false,
        // Ya no se requiere truckId (es opcional)
        // Campos opcionales si están presentes
        deliverySequence: req.body.deliverySequence || [],
        stops: req.body.stops || [],
        // Incluir información calculada si está presente
        totalDistance: req.body.totalDistance || null,
        estimatedDuration: req.body.estimatedDuration ? Number(req.body.estimatedDuration) : null
      };
      
      console.log("Datos procesados para inserción:", routeData);

      // Validamos manualmente ya que el schema completo no coincide con nuestros datos actuales
      if (!routeData.name || !routeData.driverId || !routeData.zoneId) {
        return res.status(400).json({
          error: "Campos requeridos faltantes",
          fields: ["name", "driverId", "zoneId"].filter(field => !routeData[field])
        });
      }

      const [route] = await db
        .insert(routes)
        .values(routeData)
        .returning();

      res.json(route);
    } catch (error) {
      console.error("Error al crear ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Customer endpoints
  app.post("/api/customers", upload.single('logo'), async (req, res) => {
    try {
      // Validar los datos del cliente
      const customerData = {
        ...req.body,
        logo: req.file ? req.file.buffer.toString('base64') : null,
        creditlimit: req.body.creditlimit || '0.00',
        businessname: req.body.businessname,
        managername: req.body.managername,
        phone: req.body.phone,
        street: req.body.street,
        streetnumber: req.body.streetnumber,
        provinceid: req.body.provinceid,
        municipalityid: req.body.municipalityid,
      };

      const requiredFields = ['businessname', 'managername', 'phone', 'street', 'streetnumber', 'provinceid', 'municipalityid'];
      const missingFields = requiredFields.filter(field => !customerData[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: "Campos requeridos faltantes",
          fields: missingFields
        });
      }

      const [customer] = await db
        .insert(customers)
        .values(customerData)
        .returning();

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
          coordinates: customers.coordinates,
          municipalityName: municipalities.name,
          provinceName: provinces.name,
        })
        .from(customers)
        .leftJoin(provinces, eq(customers.provinceid, provinces.id))
        .leftJoin(municipalities, eq(customers.municipalityid, municipalities.id));

      res.json(allCustomers);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/customers/by-zone", async (req, res) => {
    try {
      const zoneId = parseInt(req.query.zoneId as string);
      
      if (isNaN(zoneId)) {
        return res.status(400).json({ error: "ID de zona inválido" });
      }

      const customersInZone = await db
        .select({
          id: customers.id,
          businessname: customers.businessname,
          managername: customers.managername,
          phone: customers.phone,
          email: customers.email,
          zoneid: customers.zoneid,
          street: customers.street,
          streetnumber: customers.streetnumber,
          provinceid: customers.provinceid,
          municipalityid: customers.municipalityid,
          reference: customers.reference,
          coordinates: customers.coordinates,
        })
        .from(customers)
        .where(eq(customers.zoneid, zoneId));

      // Obtener información de provincia y municipio para cada cliente
      const customersWithDetails = await Promise.all(
        customersInZone.map(async (customer) => {
          const [province] = await db
            .select({ name: provinces.name })
            .from(provinces)
            .where(eq(provinces.id, customer.provinceid));
            
          const [municipality] = await db
            .select({ name: municipalities.name })
            .from(municipalities)
            .where(eq(municipalities.id, customer.municipalityid));
            
          return {
            ...customer,
            municipalityName: municipality?.name || '',
            provinceName: province?.name || '',
          };
        })
      );

      res.json(customersWithDetails);
    } catch (error) {
      console.error("Error al obtener clientes por zona:", error);
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
        .leftJoin(provinces, eq(customers.provinceid, provinces.id))
        .leftJoin(municipalities, eq(customers.municipalityid, municipalities.id))
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

  // Agregar después del endpoint GET /api/customers/:id
  app.patch("/api/customers/:id", upload.single('logo'), async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);

      // Preparar los datos para actualizar
      const updateData = {
        ...req.body,
      };

      // Solo actualizar el logo si se recibió un nuevo archivo
      if (req.file) {
        updateData.logo = req.file.buffer.toString('base64');
      }

      // Convertir valores numéricos
      if (updateData.provinceid) updateData.provinceid = Number(updateData.provinceid);
      if (updateData.municipalityid) updateData.municipalityid = Number(updateData.municipalityid);
      if (updateData.zoneid && updateData.zoneid !== 'null') updateData.zoneid = Number(updateData.zoneid);

      const [updatedCustomer] = await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, customerId))
        .returning();

      if (!updatedCustomer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json(updatedCustomer);
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoints para los ajustes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      console.log("GET /api/settings - Retornando:", settings);
      res.json(settings || {});
    } catch (error) {
      console.error("Error al obtener configuración:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/settings", upload.single('logo'), async (req, res) => {
    try {
      console.log("POST /api/settings - Body recibido:", req.body);
      const settingsData = {
        ...req.body,
        logo: req.file ? req.file.buffer.toString('base64') : undefined,
      };

      // Verificar y convertir provinceId
      if (settingsData.provinceId) {
        settingsData.provinceId = Number(settingsData.provinceId);
        console.log("provinceId convertido:", settingsData.provinceId);
        if (isNaN(settingsData.provinceId)) {
          return res.status(400).json({ error: "ID de provincia inválido" });
        }
      }

      // Verificar y convertir municipalityId
      if (settingsData.municipalityId) {
        settingsData.municipalityId = Number(settingsData.municipalityId);
        console.log("municipalityId convertido:", settingsData.municipalityId);
        if (isNaN(settingsData.municipalityId)) {
          return res.status(400).json({ error: "ID de municipio inválido" });
        }
      }

      console.log("POST /api/settings - Datos procesados:", {
        ...settingsData,
        logo: settingsData.logo ? 'Base64 image data present' : 'No logo data'
      });

      const updatedSettings = await storage.updateSettings(settingsData);
      console.log("POST /api/settings - Configuración actualizada:", {
        ...updatedSettings,
        logo: updatedSettings.logo ? 'Base64 image data present' : 'No logo data'
      });

      res.json(updatedSettings);
    } catch (error) {
      console.error("Error al actualizar configuración:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Facturas
  app.get("/api/invoices", async (req, res) => {
    try {
      const allInvoices = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          total: invoices.total,
          status: invoices.status,
          paymentMethod: invoices.paymentMethod,
          date: invoices.date,
          notes: invoices.notes,
        })
        .from(invoices)
        .orderBy(invoices.date);

      res.json(allInvoices);
    } catch (error) {
      console.error("Error al obtener facturas:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Facturas pendientes de pago
  app.get("/api/invoices/pending", async (req, res) => {
    try {
      // Obtener todas las facturas con estado pendiente
      const allInvoices = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          businessName: customers.businessname,
          total: invoices.total,
          status: invoices.status,
          paymentMethod: invoices.paymentMethod,
          date: invoices.date,
          notes: invoices.notes,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(eq(invoices.status, "pending"))
        .orderBy(invoices.date);
      
      // Calcular el monto pagado y pendiente para cada factura
      const invoicesWithPayments = await Promise.all(allInvoices.map(async (invoice) => {
        const paymentsForInvoice = await db
          .select()
          .from(payments)
          .where(eq(payments.invoiceId, invoice.id));
        
        const totalPaid = paymentsForInvoice.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
        const pendingAmount = parseFloat(invoice.total) - totalPaid;
        
        // Solo incluir facturas que tengan un monto pendiente mayor a cero
        if (pendingAmount > 0) {
          return {
            ...invoice,
            totalPaid: totalPaid.toFixed(2),
            pendingAmount: pendingAmount.toFixed(2)
          };
        }
        return null;
      }));
      
      // Filtrar facturas nulas (totalmente pagadas)
      const pendingInvoices = invoicesWithPayments.filter(invoice => invoice !== null);
      
      console.log("GET /api/invoices/pending - Retornando:", pendingInvoices.length, "facturas pendientes");
      res.json(pendingInvoices);
    } catch (error) {
      console.error("Error al obtener facturas pendientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      console.log("POST /api/invoices - Datos recibidos:", req.body);
      const result = insertInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Error de validación:", result.error.format());
        return res.status(400).json({ error: result.error.format() });
      }

      // Crear la factura - la fecha se establecerá automáticamente con defaultNow()
      const [invoice] = await db
        .insert(invoices)
        .values({
          ...result.data,
          date: new Date(), // Aseguramos que tenga una fecha actual
        })
        .returning();

      console.log("Factura creada:", invoice);
      res.json(invoice);
    } catch (error) {
      console.error("Error al crear factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoints para estadísticas del dashboard
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Obtener el año actual
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Consulta para obtener el total de ventas del año actual
      const totalSales = await db
        .select({
          total: sql`COALESCE(SUM(total::numeric), 0)`.mapWith(Number),
        })
        .from(invoices)
        .where(sql`EXTRACT(YEAR FROM date) = ${currentYear}`);

      // Consulta para obtener el total de facturas pendientes de pago
      const pendingPayments = await db
        .select({
          total: sql`COALESCE(SUM(total::numeric), 0)`.mapWith(Number),
        })
        .from(invoices)
        .where(eq(invoices.status, "pending"));

      // Consulta para obtener el total de pedidos pendientes
      const pendingOrders = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(orders)
        .where(eq(orders.status, "pending"));

      // Consulta para obtener el total de pedidos entregados del mes actual
      const deliveredOrders = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "completed"),
            sql`EXTRACT(YEAR FROM date) = ${currentYear}`,
            sql`EXTRACT(MONTH FROM date) = ${currentMonth}`
          )
        );

      // Consulta para obtener el total de pedidos cancelados
      const cancelledOrders = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(orders)
        .where(eq(orders.status, "cancelled"));

      const stats = {
        totalSales: totalSales[0]?.total || 0,
        pendingPayments: pendingPayments[0]?.total || 0,
        pendingOrders: pendingOrders[0]?.count || 0,
        deliveredOrders: deliveredOrders[0]?.count || 0,
        cancelledOrders: cancelledOrders[0]?.count || 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas del dashboard:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  app.get("/api/dashboard/payments-stats", async (req, res) => {
    try {
      // Obtener el año actual y mes
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Consulta para obtener el total de pagos del año
      const yearlyPayments = await db
        .select({
          total: sql`COALESCE(SUM(amount::numeric), 0)`.mapWith(Number),
        })
        .from(payments)
        .where(sql`EXTRACT(YEAR FROM date) = ${currentYear}`);

      // Consulta para obtener el total de pagos del mes actual
      const monthlyPayments = await db
        .select({
          total: sql`COALESCE(SUM(amount::numeric), 0)`.mapWith(Number),
        })
        .from(payments)
        .where(
          and(
            sql`EXTRACT(YEAR FROM date) = ${currentYear}`,
            sql`EXTRACT(MONTH FROM date) = ${currentMonth}`
          )
        );

      const stats = {
        yearlyPayments: yearlyPayments[0]?.total || 0,
        monthlyPayments: monthlyPayments[0]?.total || 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas de pagos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/stats/sales", async (req, res) => {
    try {
      // Obtener el total de ventas de las facturas
      const salesStats = await db
        .select({
          total: sql`SUM(total)`.mapWith(Number),
          count: sql`COUNT(*)`.mapWith(Number)
        })
        .from(invoices);

      const result = {
        total: salesStats[0]?.total || 0,
        count: salesStats[0]?.count || 0,
        avgTicket: salesStats[0]?.count ? (salesStats[0].total / salesStats[0].count).toFixed(2) : 0
      };

      res.json(result);
    } catch (error) {
      console.error("Error al obtener estadísticas de ventas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/stats/sales-trend", async (req, res) => {
    try {
      // Obtener las últimas 7 ventas para tendencia
      const salesData = await db
        .select({
          date: invoices.date,
          sales: invoices.total
        })
        .from(invoices)
        .orderBy(invoices.date)
        .limit(7);

      // Formatear datos para el gráfico
      const salesTrend = salesData.map(item => ({
        date: item.date,
        sales: Number(item.sales)
      }));

      res.json(salesTrend);
    } catch (error) {
      console.error("Error al obtener tendencia de ventas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/stats/order-status", async (req, res) => {
    try {
      // Obtener conteo de pedidos por estado
      const orderStatusData = await db
        .select({
          status: orders.status,
          count: sql`COUNT(*)`.mapWith(Number)
        })
        .from(orders)
        .groupBy(orders.status);

      // Formatear datos para el gráfico de pie
      const statusColors = {
        pending: "#FFBB28",
        processing: "#0088FE",
        completed: "#00C49F",
        cancelled: "#FF8042"
      };

      const statusNames = {        pending: "Pendiente",
        processing: "En Proceso",
        completed: "Completado",
        cancelled: "Cancelado"
      };

      const orderStatusChart = orderStatusData.map(item => ({
        name: statusNames[item.status as keyof typeof statusNames] || item.status,
        value: item.count,
        color: statusColors[item.status as keyof typeof statusColors] || "#999999"
      }));

      res.json(orderStatusChart);
    } catch (error) {
      console.error("Error al obtener estado de pedidos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/stats/top-customers", async (req, res) => {
    try {
      // Obtener los clientes con más pedidos
      const topCustomersData = await db
        .select({
          customerId: orders.customerId,
          orderCount: sql`COUNT(*)`.mapWith(Number),
          totalAmount: sql`SUM(total)`.mapWith(Number),
          customerName: customers.businessname
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .groupBy(orders.customerId, customers.businessname)
        .orderBy(sql`COUNT(*)`, "desc")
        .limit(5);

      // Formatear datos para el gráfico
      const topCustomers = topCustomersData.map(item => ({
        name: item.customerName || `Cliente ${item.customerId}`,
        orders: item.orderCount,
        total: Number(item.totalAmount)
      }));

      res.json(topCustomers);
    } catch (error) {
      console.error("Error al obtener top clientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/invoices/:id/items", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId));

      res.json(items);
    } catch (error) {
      console.error("Error al obtener items de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/invoices/:id/items", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { productId, quantity, price } = req.body;

      // Validar datos básicos
      if (!productId || !quantity || !price) {
        return res.status(400).json({ error: "Faltan datos requeridos: productId, quantity, price" });
      }

      // Convertir a valores numéricos
      const numPrice = parseFloat(price);
      const numQuantity = parseInt(quantity);
      
      // Calcular el total
      const total = (numPrice * numQuantity).toFixed(2);
      
      // Guardar directamente en la base de datos
      const [item] = await db
        .insert(invoiceItems)
        .values({
          invoiceId,
          productId,
          quantity: numQuantity,
          price,
          total
        })
        .returning();

      // Actualizar el total de la factura
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId));

      if (invoice) {
        const newTotal = (parseFloat(invoice.total) + parseFloat(total)).toFixed(2);
        await db
          .update(invoices)
          .set({ total: newTotal })
          .where(eq(invoices.id, invoiceId));
      }

      console.log("Item de factura creado:", item);
      res.json(item);
    } catch (error) {
      console.error("Error al crear item de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar método de pago de una factura
  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { paymentMethod } = req.body;

      if (!["cash", "credit", "card"].includes(paymentMethod)) {
        return res.status(400).json({ error: "Método de pago inválido" });
      }

      const [updatedInvoice] = await db
        .update(invoices)
        .set({ paymentMethod })
        .where(eq(invoices.id, invoiceId))
        .returning();

      if (!updatedInvoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error al actualizar factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar un item de factura específico
  app.patch("/api/invoices/:invoiceId/items/:itemId", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const itemId = parseInt(req.params.itemId);
      const { quantity, price } = req.body;

      const [updatedItem] = await db
        .update(invoiceItems)
        .set({
          quantity: parseInt(quantity),
          price: price,
          total: (parseFloat(price) * parseInt(quantity)).toFixed(2),
        })
        .where(eq(invoiceItems.id, itemId))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ error: "Item no encontrado" });
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error al actualizar item:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Productos
  app.get("/api/products", async (req, res) =>{
    try {
      const allProducts = await db
        .select()
        .from(products)
        .orderBy(products.name);

      console.log("GET /api/products - Retornando:", allProducts.length, "productos");
      res.json(allProducts);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = {
        ...req.body,
        stock: Number(req.body.stock) || 0,
        price: Number(req.body.price).toFixed(2),
      };

      const [product] = await db
        .insert(products)
        .values(productData)
        .returning();

      console.log("POST /api/products - Producto creado:", product);      
      res.json(product);
    } catch (error) {
      console.error("Error al crear producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      console.log("PATCH /api/products/:id - Body recibido:", req.body);

      const productData = {
        ...req.body,
        stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined,
        price: req.body.price !== undefined ? Number(req.body.price).toFixed(2) : undefined,
      };

      const [existingProduct] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));

      if (!existingProduct) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const [updatedProduct] = await db
        .update(products)
        .set(productData)
        .where(eq(products.id, productId))
        .returning();

      console.log("PATCH /api/products/:id - Producto actualizado:", updatedProduct);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      console.log("DELETE /api/products/:id - Eliminando producto:", productId);

      const [existingProduct] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));

      if (!existingProduct) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const deletedProduct = await db
        .delete(products)
        .where(eq(products.id, productId))
        .returning();

      console.log("DELETE /api/products/:id - Producto eliminado:", deletedProduct);
      res.json({ success: true, message: "Producto eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Pagos
  app.get("/api/payments", async (req, res) => {
    try {
      const allPayments = await db        
        .select({
          id: payments.id,
          invoiceId: payments.invoiceId,
          amount: payments.amount,          
          date: payments.date,
          notes: payments.notes,
          method: payments.paymentMethod,
          customerName: customers.businessname,
          invoiceNumber: invoices.invoiceNumber
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .orderBy(payments.date);

      console.log("GET /api/payments - Retornando:", allPayments.length, "pagos");
      res.json(allPayments);
    } catch (error) {
      console.error("Error al obtener pagos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const paymentData = {
        ...req.body,
        amount: Number(req.body.amount).toFixed(2),
        date: new Date()
      };

      const [payment] = await db
        .insert(payments)
        .values(paymentData)
        .returning();

      console.log("POST /api/payments - Pago creado:", payment);
      res.json(payment);
    } catch (error) {
      console.error("Error al crear pago:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Pedidos
  app.get("/api/orders", async (req, res) => {
    try {
      const allOrders = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          total: orders.total,
          status: orders.status,
          date: orders.date,          
          customerName: customers.businessname,
          address: customers.street
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .orderBy(orders.date);

      console.log("GET /api/orders - Retornando:", allOrders.length, "pedidos");
      res.json(allOrders);
    } catch (error) {
      console.error("Error al obtener pedidos:", error);      
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = {
        ...req.body,
        date: new Date(),
        status: "pending",
        total: Number(req.body.total).toFixed(2)
      };

      // Crear el pedido
      const [order] = await db
        .insert(orders)
        .values(orderData)
        .returning();

      // Si hay items, crearlos
      if (req.body.items && Array.isArray(req.body.items)) {
        for (const item of req.body.items) {
          await db
            .insert(orderItems)
            .values({
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            });
        }
      }

      console.log("POST /api/orders - Pedido creado:", order);
      res.json(order);
    } catch (error) {
      console.error("Error al crear pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/orders/:id/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      console.log("Buscando items para el pedido:", orderId);

      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          productName: products.name,
          quantity: orderItems.quantity,
          price: orderItems.price,
          total: sql`${orderItems.quantity} * ${orderItems.price}::numeric`
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

      console.log("Items encontrados:", items);
      res.json(items);
    } catch (error) {
      console.error("Error al obtener items del pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para actualizar el estado de un pedido
  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'ID de pedido inválido' });
      }

      const { status } = req.body;
      if (!status || !['pending', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido. Debe ser "pending", "delivered" o "cancelled"' });
      }

      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      console.log(`PATCH /api/orders/${orderId}/status - Pedido actualizado a "${status}"`, updatedOrder);
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error al actualizar estado del pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/reports/sales", async (req, res) => {
    try {
      const range = req.query.range || 'month';
      let dateFilter;

      // Calcular el rango de fechas
      const now = new Date();
      switch(range) {
        case 'week':
          dateFilter = sql`date >= NOW() - INTERVAL '7 days'`;
          break;
        case 'month':
          dateFilter = sql`date >= DATE_TRUNC('month', NOW())`;
          break;
        case 'quarter':
          dateFilter = sql`date >= DATE_TRUNC('quarter', NOW())`;
          break;
        case 'year':
          dateFilter = sql`date >= DATE_TRUNC('year', NOW())`;
          break;
        default:
          dateFilter = sql`date >= DATE_TRUNC('month', NOW())`;
      }

      console.log("Consultando ventas con rango:", range);

      // Obtener datos de ventas agrupados por día
      const salesData = await db
        .select({
          date: sql`DATE_TRUNC('day', ${invoices.date})::date`,
          amount: sql`COALESCE(SUM(total::numeric), 0)`.mapWith(Number)
        })
        .from(invoices)
        .where(dateFilter)
        .groupBy(sql`DATE_TRUNC('day', ${invoices.date})`)
        .orderBy(sql`DATE_TRUNC('day', ${invoices.date})`);

      console.log("Datos de ventas encontrados:", salesData);
      res.json(salesData);
    } catch (error) {
      console.error("Error al obtener reporte de ventas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/reports/payments", async (req, res) => {
    try {
      const range = req.query.range || 'month';
      let dateFilter;

      // Calcular el rango de fechas
      const now = new Date();
      switch(range) {
        case 'week':
          dateFilter = sql`date >= NOW() - INTERVAL '7 days'`;
          break;
        case 'month':
          dateFilter = sql`date >= DATE_TRUNC('month', NOW())`;
          break;
        case 'quarter':
          dateFilter = sql`date >= DATE_TRUNC('quarter', NOW())`;
          break;
        case 'year':
          dateFilter = sql`date >= DATE_TRUNC('year', NOW())`;
          break;
        default:
          dateFilter = sql`date >= DATE_TRUNC('month', NOW())`;
      }

      console.log("Consultando pagos con rango:", range);

      // Obtener datos de pagos y cuentas por cobrar
      const paymentsData = await db
        .select({
          date: sql`DATE_TRUNC('day', ${invoices.date})::date`,
          paid: sql`COALESCE(SUM(CASE WHEN status = 'paid' THEN total::numeric ELSE 0 END), 0)`.mapWith(Number),
          pending: sql`COALESCE(SUM(CASE WHEN status = 'pending' THEN total::numeric ELSE 0 END), 0)`.mapWith(Number)
        })
        .from(invoices)
        .where(dateFilter)
        .groupBy(sql`DATE_TRUNC('day', ${invoices.date})`)
        .orderBy(sql`DATE_TRUNC('day', ${invoices.date})`);

      console.log("Datos de pagos encontrados:", paymentsData);
      res.json(paymentsData);
    } catch (error) {
      console.error("Error al obtener reporte de pagos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoints para envases faltantes
  app.get("/api/envases/faltantes/clientes", async (req, res) => {
    try {
      // Datos de ejemplo para pruebas
      const faltantesPorCliente = [
        {
          id: 1,
          customerName: "Tienda Juan",
          pendingQuantity: 5,
          amountCharged: 250.00,
          daysElapsed: 35,
          status: "pendiente",
          detectionType: "automatic",
          orderId: 1001,
          returnDate: new Date(),
        },
        {
          id: 2,
          customerName: "Colmado María",
          pendingQuantity: 3,
          amountCharged: 150.00,
          daysElapsed: 15,
          status: "pendiente",
          detectionType: "manual",
          orderId: 1002,
          returnDate: new Date(),
        },
      ];

      res.json(faltantesPorCliente);
    } catch (error) {
      console.error("Error al obtener envases faltantes por cliente:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/envases/faltantes/choferes", async (req, res) => {
    try {
      // Datos de ejemplo para pruebas
      const faltantesPorChofer = [
        {
          id: 3,
          driverName: "Pedro Conductor",
          customerName: "Tienda Juan",
          pendingQuantity: 5,
          amountCharged: 250.00,
          status: "pendiente",
          detectionType: "automatic",
          orderId: 1001,
          returnDate: new Date(),
        },
        {
          id: 4,
          driverName: "Luis Chofer",
          customerName: "Colmado María",
          pendingQuantity: 3,
          amountCharged: 150.00,
          status: "pendiente",
          detectionType: "manual",
          orderId: 1002,
          returnDate: new Date(),
        },
      ];

      res.json(faltantesPorChofer);
    } catch (error) {
      console.error("Error al obtener envases faltantes por conductor:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/envases/faltantes", async (req, res) => {
    try {
      const faltanteData = {
        ...req.body,
        status: "incomplete",
        createdAt: new Date(),
        chargeType: req.body.chargeType || "direct",
        commissionPercentage: req.body.chargeType === "commission" ? Number(req.body.commissionPercentage) : 0,
        commissionAmount: req.body.chargeType === "commission" ? Number(req.body.commissionAmount) : 0,
      };

      const [faltante] = await db
        .insert(bottleReturns)
        .values(faltanteData)
        .returning();

      res.json(faltante);
    } catch (error) {
      console.error("Error al crear faltante:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/envases/faltantes/asignar", async (req, res) => {
    try {
      const {
        bottleReturnId,
        responsible,
        customerPercentage,
        driverPercentage,
        chargeMethod,
        justification,
        amountCharged
      } = req.body;

      const [updatedBottleReturn] = await db
        .update(bottleReturns)
        .set({
          responsible_type: responsible,
          customer_percentage: customerPercentage ? Number(customerPercentage) : null,
          driver_percentage: driverPercentage ? Number(driverPercentage) : null,
          charge_method: chargeMethod,
          justification,
          amount_charged: amountCharged,
          manually_assigned: true,
          assigned_at: new Date(),
          automatic_alert: false, // Desactivar alerta automática al asignar manualmente
        })
        .where(eq(bottleReturns.id, bottleReturnId))
        .returning();

      res.json(updatedBottleReturn);
    } catch (error) {
      console.error("Error al asignar responsabilidad:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Production batches endpoints
  app.get("/api/production-batches", async (req, res) => {
    try {
      const batches = await db
        .select({
          id: productionBatches.id,
          batchNumber: productionBatches.batchNumber,
          warehouseId: productionBatches.warehouseId,
          date: productionBatches.date,
          notes: productionBatches.notes,
          status: productionBatches.status,
          totalCost: productionBatches.totalCost,
          warehouseName: warehouses.name,
          warehouseCode: warehouses.code
        })
        .from(productionBatches)
        .leftJoin(warehouses, eq(productionBatches.warehouseId, warehouses.id))
        .orderBy(sql`${productionBatches.date} DESC`);

      // Obtener los items para cada lote
      const batchesWithItems = await Promise.all(
        batches.map(async (batch) => {
          const items = await db
            .select({
              id: productionBatchItems.id,
              productId: productionBatchItems.productId,
              quantity: productionBatchItems.quantity,
              cost: productionBatchItems.cost,
              productName: products.name
            })
            .from(productionBatchItems)
            .leftJoin(products, eq(productionBatchItems.productId, products.id))
            .where(eq(productionBatchItems.batchId, batch.id));

          return {
            ...batch,
            items
          };
        })
      );

      console.log("GET /api/production-batches - Retornando:", batchesWithItems.length, "lotes");
      res.json(batchesWithItems);
    } catch (error) {
      console.error("Error al obtener lotes de producción:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/production-batches", async (req, res) => {
    try {
      console.log("POST /api/production-batches - Datos recibidos:", req.body);

      const result = insertProductionBatchSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Error de validación",
          details: result.error.format()
        });
      }

      // Obtener el almacén
      const [warehouse] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, result.data.warehouseId));

      if (!warehouse) {
        return res.status(404).json({ error: "Almacén no encontrado" });
      }

      // Contar lotes existentes para este almacén para generar el número secuencial
      const { count } = await db
        .select({
          count: sql`count(*)`.mapWith(Number)
        })
        .from(productionBatches)
        .where(eq(productionBatches.warehouseId, warehouse.id))
        .then(rows => rows[0]);

      const nextNumber = count + 1;
      const batchNumber = `${warehouse.code}-${nextNumber}`;

      // Calcular el costo total del lote
      const totalCost = result.data.items.reduce((sum, item) => 
        sum + (parseFloat(item.cost) * item.quantity), 0
      ).toFixed(2);

      // Crear el lote
      const [batch] = await db
        .insert(productionBatches)
        .values({
          batchNumber,
          warehouseId: warehouse.id,
          notes: result.data.notes || null,
          status: result.data.status || "completed",
          totalCost,
          date: new Date()
        })
        .returning();

      // Procesar cada item del lote
      const items = await Promise.all(result.data.items.map(async (item) => {
        // Verificar que el producto existe
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        if (!product) {
          throw new Error(`Producto ${item.productId} no encontrado`);
        }

        // Crear el item del lote
        const [batchItem] = await db
          .insert(productionBatchItems)
          .values({
            batchId: batch.id,
            productId: item.productId,
            quantity: item.quantity,
            cost: item.cost
          })
          .returning();

        // Actualizar el stock del producto
        const newStock = product.stock + item.quantity;
        await db
          .update(products)
          .set({ stock: newStock })
          .where(eq(products.id, item.productId));

        return {
          ...batchItem,
          productName: product.name
        };
      }));

      // Retornar el lote completo con sus items
      const response = {
        ...batch,
        warehouseName: warehouse.name,
        warehouseCode: warehouse.code,
        items
      };

      console.log("POST /api/production-batches - Lote creado:", response);
      res.json(response);

    } catch (error) {
      console.error("Error al crear lote de producción:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Trucks endpoints
  app.get("/api/trucks", async (req, res) => {
    try {
      const allTrucks = await storage.listTrucks();
      res.json(allTrucks);
    } catch (error) {
      console.error("Error al obtener camiones:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/trucks/:id", async (req, res) => {
    try {
      const truckId = parseInt(req.params.id);
      const truck = await storage.getTruck(truckId);

      if (!truck) {
        return res.status(404).json({ error: "Camión no encontrado" });
      }

      res.json(truck);
    } catch (error) {
      console.error("Error al obtener camión:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/trucks", async (req, res) => {
    try {
      const result = insertTruckSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
      }

      const truck = await storage.createTruck(result.data);
      res.json(truck);
    } catch (error) {
      console.error("Error al crear camión:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.put("/api/trucks/:id", async (req, res) => {
    try {
      const truckId = parseInt(req.params.id);
      const result = insertTruckSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
      }

      const truck = await storage.updateTruck(truckId, result.data);
      if (!truck) {
        return res.status(404).json({ error: "Camión no encontrado" });
      }

      res.json(truck);
    } catch (error) {
      console.error("Error al actualizar camión:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.patch("/api/trucks/:id/status", async (req, res) => {
    try {
      const truckId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["disponible", "en_reparacion", "en_ruta"].includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }

      const truck = await storage.updateTruckStatus(truckId, status);
      if (!truck) {
        return res.status(404).json({ error: "Camión no encontrado" });
      }

      res.json(truck);
    } catch (error) {
      console.error("Error al actualizar estado del camión:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Vehicle Loading endpoints
  app.get("/api/vehicle-loading", async (req, res) => {
    try {
      const allLoadings = await db
        .select()
        .from(vehicleLoading)
        .orderBy(vehicleLoading.date);

      console.log("GET /api/vehicle-loading - Retornando:", allLoadings.length, "cargas");
      res.json(allLoadings);
    } catch (error) {
      console.error("Error al obtener cargas de vehículos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/vehicle-loading", async (req, res) => {
    try {
      console.log("POST /api/vehicle-loading - Datos recibidos:", req.body);

      const result = insertVehicleLoadingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Error de validación",
          details: result.error.format()
        });
      }

      const { items, ...loadingData } = result.data;

      // Insertar la carga del vehículo
      await db
        .insert(vehicleLoading)
        .values({
          ...loadingData,
          status: "pending",
        })
        .execute();

      // Obtener el registro recién creado
      const [newLoading] = await db
        .select()
        .from(vehicleLoading)
        .orderBy(vehicleLoading.id, "desc")
        .limit(1);

      // Insertar los items si existen
      if (items && items.length > 0) {
        await db
          .insert(vehicleLoadingItems)
          .values(
            items.map(item => ({
              loadingId: newLoading.id,
              productId: Number(item.productId),
              quantity: Number(item.quantity)
            }))
          )
          .execute();
      }

      console.log("POST /api/vehicle-loading - Carga creada:", newLoading);
      res.json(newLoading);
    } catch (error) {
      console.error("Error al crear carga de vehículo:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Driver endpoints
  app.get("/api/driver/deliveries/today", async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const deliveries = await db
        .select({
          id: orders.id,
          customerName: customers.businessname,
          estimatedTime: orders.deliveryTime,
          status: orders.status
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(
          and(
            sql`DATE(${orders.date}) = DATE(NOW())`,
            eq(orders.status, "pending")
          )
        )
        .orderBy(orders.deliveryTime);

      res.json(deliveries);
    } catch (error) {
      console.error("Error al obtener entregas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/driver/cash-balance", async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cashBalance = {
        initialBalance: "1000.00", // Example fixed value
        cashIn: "2500.00",        // Sum of today's payments
        cashOut: "500.00",        // Sum of today's expenses
        finalBalance: "3000.00"   // Calculated balance
      };

      res.json(cashBalance);
    } catch (error) {
      console.error("Error al obtener balance:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/driver/performance", async (req, res) => {
    try {
      // Example performance metrics
      const performance = {
        deliveredOrders: 8,
        totalOrders: 10,
        onTimeDeliveries: 7
      };

      res.json(performance);
    } catch (error) {
      console.error("Error al obtener rendimiento:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Configurar WebSocket después de las rutas API
  const httpServer = createServer(app);
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

  return httpServer;
}