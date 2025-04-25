import type { Router } from "express";
import multer from 'multer';
import { storage } from "./storage";
import { zones, routes, users, provinces, cities, municipalities, sectors, insertZoneSchema, insertRouteSchema, customers, insertCustomerSchema, invoices, invoiceItems, insertInvoiceSchema, insertInvoiceItemSchema, products, payments, orders, orderItems, trucks, insertTruckSchema, bottleReturns, productionBatches, productionBatchItems, warehouses, insertWarehouseSchema, vehicleLoading, vehicleLoadingItems, insertVehicleLoadingSchema, insertProductionBatchSchema, insertProductionBatchItemSchema, insertUserSchema, insertOrderSchema, insertOrderItemSchema, insertPaymentSchema } from "@shared/schema";
import { db, usersSimple } from './db';
import { companyDb, getCurrentCompanyId } from './company-db';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { registerVehicleLoadingRoutes } from "./routes/vehicleLoading";
import { registerRouteSettlements } from "./routes/routeSettlements";
import { registerDriverRoutes } from "./routes/driver";
import { registerRoutesEndpoints } from "./routes-endpoints";
import { registerDriversLocationsEndpoint } from "./routes/api/driversLocations";
import { registerStartRouteEndpoint } from "./routes/api/startRoute";
import { registerMobileApiEndpoints } from "./routes/mobile-api";
import commissionsRoutes from "./routes/commissions";
import { registerMultiTenantTestEndpoint } from "./routes/test-tenant";
import { registerTestSessionRoutes } from "./test-session";
import { calculateOptimalRoute } from './services/routeOptimizer';
import { companyAuthMiddleware, companyTenantMiddleware, loginWithEmail, logout, getCurrentUser } from './middleware/company-auth.middleware';

// Configurar multer para manejar la carga de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(router: express.Router) {
  // Registrar las rutas de carga de vehículo y cuadre
  await registerVehicleLoadingRoutes(router);
  await registerRouteSettlements(router);
  await registerDriverRoutes(router);
  
  // Registrar endpoint para ubicaciones de conductores
  registerDriversLocationsEndpoint(router);
  
  // Registrar endpoint para iniciar rutas (validación para chofer con ruta activa)
  registerStartRouteEndpoint(router);
  
  // Registrar endpoints de la API móvil
  registerMobileApiEndpoints(router);
  
  // Registrar endpoint de prueba para multi-tenant
  registerMultiTenantTestEndpoint(router);

  // Registrar endpoints para comisiones
  router.use('/commissions', commissionsRoutes);
  
  // Endpoints de autenticación para panel principal
  // Login para panel empresa (email + password)
  router.post("/login", loginWithEmail);
  
  // Logout
  router.post("/logout", logout);
  
  // Información del usuario actual
  router.get("/user", getCurrentUser);
  
  // Registrar endpoints de prueba para sesiones (solo en desarrollo)
  registerTestSessionRoutes(router);
  
  // Proteger todas las rutas siguientes con el middleware de autenticación
  router.use(companyAuthMiddleware);
  
  // Endpoint de prueba para verificar el funcionamiento del filtrado multi-tenant
  router.get("/test-company-filter", async (req, res) => {
    try {
      // Obtener el ID de compañía del contexto
      const currentCompanyId = getCurrentCompanyId();
      
      console.log(`Test filtro multi-tenant. CompanyId en contexto: ${currentCompanyId}`);
      
      // Realizar una consulta con el cliente DB original (sin filtro)
      const allCustomersWithoutFilter = await db
        .select()
        .from(customers)
        .limit(10);
      
      // Realizar la misma consulta pero con el cliente adaptado para multi-tenant
      const allCustomersWithFilter = await companyDb
        .select()
        .from(customers)
        .limit(10);
      
      res.json({
        companyIdEnContexto: currentCompanyId,
        sinFiltro: {
          cantidad: allCustomersWithoutFilter.length,
          primeros5: allCustomersWithoutFilter.slice(0, 5)
        },
        conFiltroCompania: {
          cantidad: allCustomersWithFilter.length,
          primeros5: allCustomersWithFilter.slice(0, 5)
        }
      });
    } catch (error) {
      console.error("Error en prueba de filtrado multi-tenant:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener el usuario actual (redundante con /user, pero se mantiene por compatibilidad)
  router.get("/me", (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ 
        success: false,
        message: "No autenticado"
      });
    }
    
    res.json(req.session.user);
  });

  // Registrar endpoints para rutas y pedidos
  registerRoutesEndpoints(router);
  


  // Warehouses endpoints
  router.get("/warehouses", async (req, res) => {
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

  router.post("/warehouses", async (req, res) => {
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

  router.patch("/warehouses/:id", async (req, res) => {
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
  router.get("/provinces", async (req, res) => {
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

  router.get("/municipalities/:provinceId", async (req, res) => {
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

  router.get("/cities/:provinceId", async (req, res) => {
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

  router.get("/sectors/:cityId", async (req, res) => {
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
  router.get("/zones", async (req, res) => {
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

  router.get("/zones/:id", async (req, res) => {
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
  
  // Endpoint para obtener pedidos pendientes por zona
  router.get("/zones/:id/pending-orders", async (req, res) => {
    try {
      const zoneId = parseInt(req.params.id);
      
      if (isNaN(zoneId)) {
        return res.status(400).json({ error: "ID de zona inválido" });
      }
      
      console.log(`GET /zones/${zoneId}/pending-orders - Buscando pedidos pendientes`);
      
      // Primero obtenemos los clientes de la zona
      const zoneCustomers = await db
        .select({
          id: customers.id,
        })
        .from(customers)
        .where(eq(customers.zoneid, zoneId));
      
      if (zoneCustomers.length === 0) {
        console.log(`No hay clientes en la zona ${zoneId}`);
        return res.json([]);
      }
      
      // Extraemos los IDs de clientes
      const customerIds = zoneCustomers.map(customer => customer.id);
      
      console.log(`Clientes encontrados en zona ${zoneId}:`, customerIds);
      
      // Ahora buscamos todas las órdenes pendientes para esos clientes y que no estén asignadas a una ruta
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
          coordinates: customers.coordinates, // Añadimos las coordenadas del cliente
          customerName: customers.businessname,
          customerAddress: customers.street,
          customerAddressNumber: customers.streetnumber,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(
          and(
            inArray(orders.customerId, customerIds),
            eq(orders.status, "pending"),
            sql`${orders.routeId} IS NULL`
          )
        )
        .orderBy(orders.date);
      
      console.log(`Encontrados ${pendingOrders.length} pedidos pendientes para la zona ${zoneId}`);
      
      res.json(pendingOrders);
    } catch (error) {
      console.error(`Error al obtener pedidos pendientes para la zona ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.post("/zones", async (req, res) => {
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

  router.patch("/zones/:id", async (req, res) => {
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

  router.delete("/zones/:id", async (req, res) => {
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
  router.get("/users", async (req, res) => {
    try {
      const role = req.query.role as string;
      let usersList;

      if (role) {
        usersList = await db
          .select()
          .from(usersSimple) // Usar esquema sin email
          .where(eq(usersSimple.role, role));
      } else {
        usersList = await db
          .select()
          .from(usersSimple); // Usar esquema sin email
      }

      res.json(usersList);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener conductores y ayudantes
  router.get("/users/drivers", async (req, res) => {
    try {
      const role = req.query.role as string;
      const drivers = await db
        .select()
        .from(usersSimple)
        .where(
          role ? eq(usersSimple.role, role) : sql`${usersSimple.role} IN ('driver', 'assistant')`
        )
        .orderBy(usersSimple.name);

      console.log(`GET /api/users/drivers - Retornando: ${drivers.length} ${role || 'conductores/ayudantes'}`);
      res.json(drivers);
    } catch (error) {
      console.error("Error al obtener conductores:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener un usuario por ID
  router.get("/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const [user] = await db
        .select()
        .from(usersSimple)
        .where(eq(usersSimple.id, userId));
      
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
  router.post("/users", async (req, res) => {
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
        .from(usersSimple)
        .where(eq(usersSimple.username, userData.username));
        
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
      
      // Eliminar el campo email si existe para usar usersSimple
      if (insertData.email) {
        delete insertData.email;
      }
      
      // Crear el usuario usando usersSimple en lugar de users
      const [newUser] = await db
        .insert(usersSimple)
        .values(insertData)
        .returning();
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para actualizar un usuario
  router.put("/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Verificar si el usuario existe
      const [existingUser] = await db
        .select()
        .from(usersSimple)
        .where(eq(usersSimple.id, userId));
        
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
        .update(usersSimple)
        .set(updateData)
        .where(eq(usersSimple.id, userId))
        .returning();
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para eliminar un usuario (soft delete)
  router.delete("/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verificar si el usuario existe
      const [existingUser] = await db
        .select()
        .from(usersSimple)
        .where(eq(usersSimple.id, userId));
        
      if (!existingUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Marcar como inactivo en lugar de eliminar
      const [deletedUser] = await db
        .update(usersSimple)
        .set({ active: false })
        .where(eq(usersSimple.id, userId))
        .returning();
      
      res.json(deletedUser);
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Rutas
  router.get("/routes", async (req, res) => {
    try {
      console.log("GET /api/routes - Obteniendo todas las rutas");
      console.log("Query params:", req.query);
      
      // Si se especifica un filtro de estado
      let statusFilter = req.query.status;
      console.log("Tipo de statusFilter:", typeof statusFilter, "Valor:", statusFilter);
      
      let query = db.select().from(routes);
      
      // Aplicar filtro si se especificó
      if (statusFilter) {
        // Verificar si es un array o un valor único
        if (Array.isArray(statusFilter)) {
          // Es un array de estados (por ejemplo: ["pending", "in_progress"])
          console.log(`GET /api/routes - Filtrando por estados: ${statusFilter.join(', ')}`);
          query = query.where(inArray(routes.status, statusFilter as any[]));
        } else if (typeof statusFilter === 'string' && statusFilter.includes(',')) {
          // Es una string con valores separados por comas - convertir a array
          const statusArray = statusFilter.split(',');
          console.log(`GET /api/routes - Filtrando por estados: ${statusArray.join(', ')}`);
          query = query.where(inArray(routes.status, statusArray as any[]));
        } else {
          // Es un solo estado (string)
          statusFilter = statusFilter.toString();
          console.log(`GET /api/routes - Filtrando por estado: ${statusFilter}`);
          query = query.where(eq(routes.status, statusFilter as any));
        }
      }
      
      // Ordenar por fecha, más recientes primero
      const allRoutes = await query.orderBy(desc(routes.date));
      
      console.log(`GET /api/routes - Total de rutas: ${allRoutes.length}`);
      res.json(allRoutes);
    } catch (error) {
      console.error("Error al obtener rutas:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para obtener una ruta por ID
  // Endpoint para obtener rutas activas (pending o in_progress)
  router.get("/routes/active", async (req, res) => {
    try {
      console.log("GET /api/routes/active - Obteniendo rutas activas");
      
      const activeRoutes = await db
        .select()
        .from(routes)
        .where(inArray(routes.status, ["pending", "in_progress"]))
        .orderBy(routes.date);
      
      console.log(`GET /api/routes/active - Retornando ${activeRoutes.length} rutas activas`);
      res.json(activeRoutes);
    } catch (error) {
      console.error("Error al obtener rutas activas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para obtener las órdenes asociadas a una ruta específica
  router.get("/routes/:id/orders", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (isNaN(routeId)) {
        return res.status(400).json({ error: "ID de ruta inválido" });
      }
      
      console.log(`GET /api/routes/${routeId}/orders - Obteniendo órdenes para la ruta`);
      
      // Usemos una consulta más simple para evitar errores de NULL
      const routeOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.routeId, routeId));
        
      console.log(`GET /api/routes/${routeId}/orders - Se encontraron ${routeOrders.length} órdenes`);
      
      // Para cada orden, obtener la información del cliente y los productos
      const ordersWithDetails = await Promise.all(
        routeOrders.map(async (order) => {
          // Obtener los datos del cliente
          let customerData = null;
          if (order.customerId) {
            const customerResult = await db
              .select()
              .from(customers)
              .where(eq(customers.id, order.customerId))
              .limit(1);
              
            if (customerResult.length > 0) {
              customerData = customerResult[0];
            }
          }

          // Obtener los productos de la orden
          const orderProductItems = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
            
          // Para cada ítem, obtener información del producto
          const productsWithDetails = await Promise.all(
            orderProductItems.map(async (item) => {
              const productResult = await db
                .select()
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1);
                
              const productInfo = productResult.length > 0 ? productResult[0] : null;
              
              return {
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                name: productInfo?.name || 'Producto desconocido',
                isReturnable: productInfo?.isReturnable || false
              };
            })
          );
            
          return {
            id: order.id,
            customerId: order.customerId,
            total: order.total,
            status: order.status,
            paymentMethod: order.paymentMethod,
            date: order.date,
            notes: order.notes,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            actualDeliveryTime: order.actualDeliveryTime,
            deliverySequence: order.deliverySequence,
            deliveryCoordinates: order.deliveryCoordinates,
            // Datos del cliente
            customerName: customerData?.businessname || 'Cliente',
            street: customerData?.street || '',
            streetnumber: customerData?.streetnumber || '',
            coordinates: customerData?.coordinates || null,
            latitude: customerData?.latitude || null,
            longitude: customerData?.longitude || null,
            // Productos
            products: productsWithDetails
          };
        })
      );
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error(`Error al obtener órdenes de la ruta ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get("/routes/:id", async (req, res) => {
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
          .select({ name: usersSimple.name })
          .from(usersSimple)
          .where(eq(usersSimple.id, route.driverId))
          .limit(1);
          
        if (driverData.length > 0) {
          driverName = driverData[0].name;
        }
      }
      
      if (route.assistantId) {
        const assistantData = await db
          .select({ name: usersSimple.name })
          .from(usersSimple)
          .where(eq(usersSimple.id, route.assistantId))
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
  
  // Endpoint para eliminar una ruta por ID
  router.delete("/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      if (isNaN(routeId)) {
        return res.status(400).json({ error: "ID de ruta inválido" });
      }
      
      console.log(`DELETE /api/routes/${routeId} - Eliminando ruta`);
      
      // Llamar al método de almacenamiento para eliminar la ruta
      const deletedRoute = await storage.deleteRoute(routeId);
      
      if (!deletedRoute) {
        return res.status(404).json({ error: "Ruta no encontrada" });
      }
      
      console.log(`Ruta ${routeId} eliminada con éxito`);
      
      // Retornar la información de la ruta eliminada
      res.json({
        message: "Ruta eliminada exitosamente",
        route: deletedRoute
      });
    } catch (error) {
      console.error(`Error al eliminar la ruta ${req.params.id}:`, error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para optimizar ruta
  router.post("/routes/optimize", async (req, res) => {
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

  router.post("/routes", async (req, res) => {
    try {
      console.log("POST /api/routes - Datos recibidos:", req.body);
      
      // Requerimos conductor y opcionales asistente y camión
      const routeData = {
        name: req.body.name,
        date: new Date(req.body.date),
        driverId: Number(req.body.driverId),
        assistantId: req.body.assistantId ? Number(req.body.assistantId) : null,
        truckId: req.body.truckId ? Number(req.body.truckId) : null,
        zoneId: Number(req.body.zoneId),
        status: "pending",
        isCompleted: false,
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

      // Iniciar transacción para crear la ruta y asignar los pedidos
      const [route] = await db
        .insert(routes)
        .values(routeData)
        .returning();
      
      // Asignar pedidos a la ruta creada
      if (route && req.body.orderIds && Array.isArray(req.body.orderIds) && req.body.orderIds.length > 0) {
        console.log(`Asignando ${req.body.orderIds.length} pedidos a la ruta ${route.id}`);
        
        // Actualizar cada pedido para asignarlo a esta ruta
        for (const orderId of req.body.orderIds) {
          await db
            .update(orders)
            .set({ routeId: route.id })
            .where(eq(orders.id, Number(orderId)));
        }
        
        console.log(`Pedidos asignados a la ruta ${route.id}`);
      } else {
        console.log("No se proporcionaron IDs de pedidos para asignar a la ruta");
      }

      res.json(route);
    } catch (error) {
      console.error("Error al crear ruta:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Customer endpoints
  router.post("/customers", upload.single('logo'), async (req, res) => {
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

  router.get("/customers", async (req, res) => {
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

  router.get("/customers/by-zone", async (req, res) => {
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

  router.get("/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      
      // Select specific fields from customers table instead of spreading the entire table
      const [customer] = await db
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
          balance: customers.balance,
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

  // Actualizar cliente por ID
  router.patch("/customers/:id", upload.single('logo'), async (req, res) => {
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
  router.get("/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      console.log("GET /api/settings - Retornando:", settings);
      res.json(settings || {});
    } catch (error) {
      console.error("Error al obtener configuración:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.post("/settings", upload.single('logo'), async (req, res) => {
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
  router.get("/invoices", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para obtener facturas");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto", details: "Para asegurar la separación de datos entre empresas, se requiere el ID de empresa" });
      }
      
      console.log(`GET /api/invoices - Obteniendo facturas para la empresa ${companyId}`);
      
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
          companyId: invoices.companyId
        })
        .from(invoices)
        .where(eq(invoices.companyId, companyId)) // Filtrar por companyId
        .orderBy(invoices.date);

      console.log(`GET /api/invoices - Retornando ${allInvoices.length} facturas`);
      res.json(allInvoices);
    } catch (error) {
      console.error("Error al obtener facturas:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Facturas pendientes de pago
  router.get("/invoices/pending", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para obtener facturas pendientes");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto", details: "Para asegurar la separación de datos entre empresas, se requiere el ID de empresa" });
      }
      
      console.log(`GET /api/invoices/pending - Obteniendo facturas pendientes para la empresa ${companyId}`);
      
      // Obtener todas las facturas con estado pendiente para esta empresa
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
          companyId: invoices.companyId
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(and(
          eq(invoices.status, "pending"),
          eq(invoices.companyId, companyId) // Filtrar por companyId
        ))
        .orderBy(invoices.date);
      
      console.log(`Encontradas ${allInvoices.length} facturas pendientes iniciales para la empresa ${companyId}`);
      
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
      
      console.log(`GET /api/invoices/pending - Retornando ${pendingInvoices.length} facturas pendientes para la empresa ${companyId}`);
      res.json(pendingInvoices);
    } catch (error) {
      console.error("Error al obtener facturas pendientes:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.post("/invoices", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para crear factura");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto", details: "Para asegurar la separación de datos entre empresas, se requiere el ID de empresa" });
      }
      
      console.log(`POST /api/invoices - Datos recibidos para empresa ${companyId}:`, req.body);
      
      const result = insertInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Error de validación:", result.error.format());
        return res.status(400).json({ error: result.error.format() });
      }

      // Obtener el último número de factura para esta empresa
      const maxInvoiceNumberResult = await db
        .select({
          maxInvoiceNumber: sql`MAX(${invoices.invoiceNumber})`
        })
        .from(invoices)
        .where(eq(invoices.companyId, companyId));
      
      const maxInvoiceNumber = maxInvoiceNumberResult[0]?.maxInvoiceNumber || 0;
      const nextInvoiceNumber = maxInvoiceNumber + 1;

      // Crear la factura con el companyId del contexto
      const [invoice] = await db
        .insert(invoices)
        .values({
          ...result.data,
          companyId: companyId, // Asegurar que se guarda con el companyId correcto
          date: new Date(), // Aseguramos que tenga una fecha actual
          invoiceNumber: nextInvoiceNumber // Usar el siguiente número de factura
        })
        .returning();

      console.log(`Factura #${invoice.id} creada para la empresa ${companyId}:`, invoice);
      res.json(invoice);
    } catch (error) {
      console.error("Error al crear factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoints para estadísticas del dashboard
  router.get("/dashboard/stats", async (req, res) => {
    try {
      console.log("GET /api/dashboard/stats - Endpoint invocado");
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/dashboard/stats - Obteniendo estadísticas del dashboard para empresa ${companyId}`);
      
      // Obtener el año actual y fechas
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log(`Año actual: ${currentYear}, Mes actual: ${currentMonth}`);
      
      // Consulta para obtener el total de ventas (sin filtro de año para ver todos los datos)
      const totalSales = await db
        .select({
          total: sql`COALESCE(SUM(total::numeric), 0)`.mapWith(Number),
        })
        .from(invoices)
        .where(
          eq(invoices.companyId, companyId)
        );
        
      console.log("Total ventas (sin filtro de año):", totalSales);

      // Consulta para obtener el total de facturas pendientes de pago
      const pendingPayments = await db
        .select({
          total: sql`COALESCE(SUM(total::numeric), 0)`.mapWith(Number),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, "pending"),
            eq(invoices.companyId, companyId)
          )
        );

      // Consulta para obtener el total de pedidos pendientes
      const pendingOrders = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "pending"),
            eq(orders.companyId, companyId)
          )
        );

      // Consulta para obtener el total de pedidos entregados del mes actual
      const deliveredOrders = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "delivered"),
            sql`EXTRACT(YEAR FROM date) = ${currentYear}`,
            sql`EXTRACT(MONTH FROM date) = ${currentMonth}`,
            eq(orders.companyId, companyId)
          )
        );

      // Consulta para obtener el total de pedidos cancelados
      const cancelledOrders = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "cancelled"),
            eq(orders.companyId, companyId)
          )
        );
        
      // Consulta para obtener ventas diarias (todas, no solo de hoy)
      const dailySales = await db
        .select({
          total: sql`COALESCE(SUM(total::numeric), 0)`.mapWith(Number),
        })
        .from(invoices)
        .where(
          eq(invoices.companyId, companyId)
        );
        
      console.log("Total ventas diarias (sin filtro de fecha):", dailySales);
        
      // Consulta para obtener tendencia de ventas (sin límite de 7 días)
      const weeklyTrend = await db
        .select({
          day: sql`DATE(date)`,
          total: sql`COALESCE(SUM(total::numeric), 0)`.mapWith(Number),
        })
        .from(invoices)
        .where(
          eq(invoices.companyId, companyId)
        )
        .groupBy(sql`DATE(date)`)
        .orderBy(sql`DATE(date)`);
        
      console.log("Tendencia de ventas (sin filtro de 7 días):", weeklyTrend);

      const stats = {
        totalSales: totalSales[0]?.total || 0,
        pendingPayments: pendingPayments[0]?.total || 0,
        pendingOrders: pendingOrders[0]?.count || 0,
        deliveredOrders: deliveredOrders[0]?.count || 0,
        cancelledOrders: cancelledOrders[0]?.count || 0,
        dailySales: dailySales[0]?.total || 0,
        weeklyTrend: weeklyTrend,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas del dashboard:", error);
      res.status(500).json({ error: String(error) });
    }
  });


  router.get("/dashboard/payments-stats", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/dashboard/payments-stats - Obteniendo estadísticas de pagos para empresa ${companyId}`);
      
      // Obtener el año actual y mes
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      console.log(`Año actual: ${currentYear}, Mes actual: ${currentMonth}`);
      
      // Consulta para obtener el total de pagos (sin filtro de año)
      const yearlyPayments = await db
        .select({
          total: sql`COALESCE(SUM(amount::numeric), 0)`.mapWith(Number),
        })
        .from(payments)
        .where(
          eq(payments.companyId, companyId)
        );
        
      console.log("Total pagos (sin filtro de año):", yearlyPayments);

      // Consulta para obtener el total de pagos (sin filtro de mes)
      const monthlyPayments = await db
        .select({
          total: sql`COALESCE(SUM(amount::numeric), 0)`.mapWith(Number),
        })
        .from(payments)
        .where(
          eq(payments.companyId, companyId)
        );
        
      console.log("Total pagos mensuales (sin filtro):", monthlyPayments);

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

  // Endpoint para estadísticas de rutas
  router.get("/dashboard/route-stats", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/dashboard/route-stats - Obteniendo estadísticas de rutas para empresa ${companyId}`);
      
      // Obtener rutas activas
      const activeRoutes = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(routes)
        .where(
          and(
            inArray(routes.status, ["pending", "in_progress"]),
            eq(routes.companyId, companyId)
          )
        );
      
      // Obtener rutas completadas hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log(`Buscando rutas completadas hoy: ${today.toISOString().split('T')[0]}`);
      
      const completedTodayRoutes = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(routes)
        .where(
          and(
            eq(routes.status, "completed"),
            sql`DATE(date) = DATE(${today})`,
            eq(routes.companyId, companyId)
          )
        );

      // Obtener estadísticas de eficiencia de rutas
      const routeEfficiency = await db
        .select({
          avgEfficiency: sql`CASE 
            WHEN AVG(CASE WHEN estimated_duration > 0 AND actual_duration > 0 
                     THEN estimated_duration::float / actual_duration::float 
                     ELSE NULL END) IS NULL THEN 0
            ELSE AVG(CASE WHEN estimated_duration > 0 AND actual_duration > 0 
                     THEN estimated_duration::float / actual_duration::float 
                     ELSE NULL END)
            END`.mapWith(Number),
        })
        .from(routes)
        .where(
          and(
            eq(routes.status, "completed"),
            eq(routes.companyId, companyId)
          )
        );

      const stats = {
        activeRoutes: activeRoutes[0]?.count || 0,
        completedToday: completedTodayRoutes[0]?.count || 0,
        avgEfficiency: routeEfficiency[0]?.avgEfficiency || 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas de rutas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para estadísticas de envases
  router.get("/dashboard/bottle-stats", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/dashboard/bottle-stats - Obteniendo estadísticas de envases para empresa ${companyId}`);
      
      // Obtener envases pendientes de devolución
      const pendingReturns = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
          totalQty: sql`COALESCE(SUM(expected_quantity), 0)`.mapWith(Number),
          returnedQty: sql`COALESCE(SUM(returned_quantity), 0)`.mapWith(Number),
        })
        .from(bottleReturns)
        .where(
          and(
            sql`expected_quantity > returned_quantity`,
            eq(bottleReturns.companyId, companyId)
          )
        );
      
      // Envases con devolución vencida (más de 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log(`Buscando devoluciones vencidas anteriores a: ${thirtyDaysAgo.toISOString().split('T')[0]}`);
      
      const overdueReturns = await db
        .select({
          count: sql`COUNT(*)`.mapWith(Number),
        })
        .from(bottleReturns)
        .where(
          and(
            sql`expected_quantity > returned_quantity`,
            sql`return_date < ${thirtyDaysAgo}`,
            eq(bottleReturns.companyId, companyId)
          )
        );

      const stats = {
        pendingReturns: pendingReturns[0]?.count || 0,
        totalPendingQty: (pendingReturns[0]?.totalQty || 0) - (pendingReturns[0]?.returnedQty || 0),
        overdueReturns: overdueReturns[0]?.count || 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas de envases:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get("/stats/sales", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/stats/sales - Obteniendo estadísticas de ventas para empresa ${companyId}`);
      
      // Obtener el total de ventas de las facturas
      const salesStats = await db
        .select({
          total: sql`SUM(total)`.mapWith(Number),
          count: sql`COUNT(*)`.mapWith(Number)
        })
        .from(invoices)
        .where(eq(invoices.companyId, companyId));

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

  router.get("/stats/sales-trend", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/stats/sales-trend - Obteniendo tendencia de ventas para empresa ${companyId}`);
      
      // Obtener las últimas 7 ventas para tendencia
      const salesData = await db
        .select({
          date: invoices.date,
          sales: invoices.total
        })
        .from(invoices)
        .where(eq(invoices.companyId, companyId))
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

  router.get("/stats/order-status", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/stats/order-status - Obteniendo estado de pedidos para empresa ${companyId}`);
      
      // Obtener conteo de pedidos por estado
      const orderStatusData = await db
        .select({
          status: orders.status,
          count: sql`COUNT(*)`.mapWith(Number)
        })
        .from(orders)
        .where(eq(orders.companyId, companyId))
        .groupBy(orders.status);

      // Formatear datos para el gráfico de pie
      const statusColors = {
        pending: "#FFBB28",
        in_transit: "#0088FE",
        delivered: "#00C49F",
        cancelled: "#FF8042"
      };

      const statusNames = {
        pending: "Pendiente",
        in_transit: "En Tránsito",
        delivered: "Entregado",
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

  router.get("/stats/top-customers", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/stats/top-customers - Obteniendo top clientes para empresa ${companyId}`);
      
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
        .where(eq(orders.companyId, companyId))
        .groupBy(orders.customerId, customers.businessname)
        .orderBy(desc(orders.id))
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

  router.get("/invoices/:id/items", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      console.log(`GET /api/invoices/${invoiceId}/items - Inicio`);
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/invoices/${invoiceId}/items - Usando companyId: ${companyId}`);
      
      // Verificar primero que la factura existe y pertenece a la empresa
      console.log(`GET /api/invoices/${invoiceId}/items - Verificando existencia de la factura`);
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.companyId, companyId)
        ));
      
      if (!invoice) {
        console.warn(`GET /api/invoices/${invoiceId}/items - Error: Factura ${invoiceId} no encontrada o no pertenece a la empresa ${companyId}`);
        return res.status(404).json({ error: "Factura no encontrada o no pertenece a la empresa actual" });
      }
      
      console.log(`GET /api/invoices/${invoiceId}/items - Factura encontrada:`, JSON.stringify(invoice));
      
      // Primero, recuperamos los productos para tener la información actualizada
      const productsList = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));
        
      console.log(`GET /api/invoices/${invoiceId}/items - Productos disponibles: ${productsList.length}`);
      
      // Obtener los items de la factura sin unir con productos
      const invoiceItemsList = await db
        .select()
        .from(invoiceItems)
        .where(and(
          eq(invoiceItems.invoiceId, invoiceId),
          eq(invoiceItems.companyId, companyId)
        ));
      
      console.log(`GET /api/invoices/${invoiceId}/items - Items de factura encontrados: ${invoiceItemsList.length}`);
      
      // Enriquecer manualmente los items con información de productos
      const enrichedItems = invoiceItemsList.map(item => {
        const product = productsList.find(p => p.id === item.productId);
        return {
          ...item,
          productName: product ? product.name : "Producto desconocido",
          isReturnable: product ? product.isReturnable : false,
          depositAmount: product ? product.depositAmount : "0.00",
          productIcon: product ? product.icon : "water",
          hasCommission: product ? product.hasCommission : false
        };
      });
      
      if (enrichedItems.length === 0) {
        console.log(`GET /api/invoices/${invoiceId}/items - No hay items. Verificando tabla invoiceItems sin filtro...`);
        // Verificar si hay items en la tabla sin filtrar por companyId (para depuración)
        const allItems = await db
          .select({
            id: invoiceItems.id,
            invoiceId: invoiceItems.invoiceId,
            companyId: invoiceItems.companyId,
            productId: invoiceItems.productId
          })
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, invoiceId));
        
        console.log(`GET /api/invoices/${invoiceId}/items - Total items sin filtro de companyId: ${allItems.length}`);
        if (allItems.length > 0) {
          console.log(`GET /api/invoices/${invoiceId}/items - Items encontrados pero con companyId diferente:`, JSON.stringify(allItems));
        }
      } else {
        console.log(`GET /api/invoices/${invoiceId}/items - Items enriquecidos con éxito:`, enrichedItems.length);
      }
      
      res.json(enrichedItems);
    } catch (error) {
      console.error("Error al obtener items de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.post("/invoices/:id/items", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { productId, quantity, price } = req.body;
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`POST /api/invoices/${invoiceId}/items - Usando companyId: ${companyId}`);

      // Validar datos básicos
      if (!productId || !quantity || !price) {
        return res.status(400).json({ error: "Faltan datos requeridos: productId, quantity, price" });
      }

      // Convertir a valores numéricos
      const numPrice = parseFloat(price);
      const numQuantity = parseInt(quantity);
      
      // Calcular el total
      const total = (numPrice * numQuantity).toFixed(2);
      
      console.log(`Creando item para factura ${invoiceId}, producto: ${productId}, cantidad: ${numQuantity}`);
      
      // Guardar directamente en la base de datos incluyendo companyId
      const [item] = await db
        .insert(invoiceItems)
        .values({
          invoiceId,
          productId,
          quantity: numQuantity,
          price,
          total,
          companyId // Usar el companyId del contexto
        })
        .returning();

      // Actualizar el total de la factura
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.companyId, companyId)
        ));

      if (invoice) {
        const newTotal = (parseFloat(invoice.total) + parseFloat(total)).toFixed(2);
        await db
          .update(invoices)
          .set({ total: newTotal })
          .where(and(
            eq(invoices.id, invoiceId),
            eq(invoices.companyId, companyId)
          ));
      }

      console.log("Item de factura creado:", item);
      res.json(item);
    } catch (error) {
      console.error("Error al crear item de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Eliminar un item de factura
  router.delete("/invoices/:invoiceId/items/:itemId", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const itemId = parseInt(req.params.itemId);
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para eliminar item de factura");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto", details: "Para asegurar la separación de datos entre empresas, se requiere el ID de empresa" });
      }
      
      console.log(`DELETE /api/invoices/${invoiceId}/items/${itemId} - Eliminando item para la empresa ${companyId}`);
      
      // Obtener el item antes de eliminarlo para tener su valor
      const [item] = await db
        .select()
        .from(invoiceItems)
        .where(and(
          eq(invoiceItems.id, itemId),
          eq(invoiceItems.invoiceId, invoiceId),
          eq(invoiceItems.companyId, companyId) // Filtrar por companyId para seguridad
        ));
      
      if (!item) {
        return res.status(404).json({ error: "Item no encontrado o no pertenece a la empresa actual" });
      }
      
      // Eliminar el item
      await db
        .delete(invoiceItems)
        .where(and(
          eq(invoiceItems.id, itemId),
          eq(invoiceItems.companyId, companyId) // Filtrar por companyId
        ));
      
      // Actualizar el total de la factura
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.companyId, companyId)
        ));
      
      if (invoice) {
        // Restar el valor del item eliminado
        const newTotal = Math.max(0, parseFloat(invoice.total) - parseFloat(item.total)).toFixed(2);
        
        await db
          .update(invoices)
          .set({ total: newTotal })
          .where(and(
            eq(invoices.id, invoiceId),
            eq(invoices.companyId, companyId)
          ));
          
        console.log(`Total de factura actualizado a ${newTotal} después de eliminar item`);
      }
      
      console.log(`Item ${itemId} eliminado correctamente de la factura ${invoiceId}`);
      res.json({ success: true, message: "Item eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar item de factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar método de pago de una factura
  router.patch("/invoices/:id", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { paymentMethod } = req.body;
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para actualizar factura");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto" });
      }
      
      if (!["cash", "credit", "card"].includes(paymentMethod)) {
        return res.status(400).json({ error: "Método de pago inválido" });
      }
      
      console.log(`Actualizando factura ${invoiceId}, método de pago: ${paymentMethod}, companyId: ${companyId}`);

      const [updatedInvoice] = await db
        .update(invoices)
        .set({ paymentMethod })
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.companyId, companyId) // Asegurar que solo se actualice la factura si pertenece a la empresa
        ))
        .returning();

      if (!updatedInvoice) {
        return res.status(404).json({ error: "Factura no encontrada o no pertenece a la empresa actual" });
      }
      
      console.log("Factura actualizada:", updatedInvoice);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error al actualizar factura:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Actualizar un item de factura específico
  router.patch("/invoices/:invoiceId/items/:itemId", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const itemId = parseInt(req.params.itemId);
      const { quantity, price } = req.body;
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para actualizar item de factura");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto" });
      }
      
      console.log(`Actualizando item ${itemId} de factura ${invoiceId}, companyId: ${companyId}`);
      
      // Verificar que el item existe y pertenece a la empresa
      const [existingItem] = await db
        .select()
        .from(invoiceItems)
        .where(and(
          eq(invoiceItems.id, itemId),
          eq(invoiceItems.companyId, companyId)
        ));
        
      if (!existingItem) {
        return res.status(404).json({ error: "Item no encontrado o no pertenece a la empresa actual" });
      }
      
      const [updatedItem] = await db
        .update(invoiceItems)
        .set({
          quantity: parseInt(quantity),
          price: price,
          total: (parseFloat(price) * parseInt(quantity)).toFixed(2),
        })
        .where(and(
          eq(invoiceItems.id, itemId),
          eq(invoiceItems.companyId, companyId) // Asegurar que solo se actualice el item si pertenece a la empresa
        ))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ error: "Item no encontrado" });
      }
      
      // Actualizar el total de la factura
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.companyId, companyId)
        ));
      
      if (invoice) {
        // Obtener todos los items de la factura
        const invoiceItemSummary = await db
          .select({
            total: sql`SUM(total::numeric)`.mapWith(Number)
          })
          .from(invoiceItems)
          .where(and(
            eq(invoiceItems.invoiceId, invoiceId),
            eq(invoiceItems.companyId, companyId)
          ));
        
        if (invoiceItemSummary.length > 0 && invoiceItemSummary[0].total) {
          // Actualizar el total de la factura
          await db
            .update(invoices)
            .set({ 
              total: invoiceItemSummary[0].total.toFixed(2) 
            })
            .where(and(
              eq(invoices.id, invoiceId),
              eq(invoices.companyId, companyId)
            ));
          
          console.log(`Total de factura actualizado a ${invoiceItemSummary[0].total.toFixed(2)}`);
        }
      }

      console.log("Item de factura actualizado:", updatedItem);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error al actualizar item:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Productos
  router.get("/products", async (req, res) =>{
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`GET /api/products - Obteniendo productos para empresa ${companyId}`);
      
      const allProducts = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          stock: products.stock,
          icon: products.icon,
          isReturnable: products.isReturnable,
          depositAmount: products.depositAmount,
          hasCommission: products.hasCommission,
          companyId: products.companyId
        })
        .from(products)
        .where(eq(products.companyId, companyId))
        .orderBy(products.name);

      console.log(`GET /api/products - Retornando ${allProducts.length} productos para la empresa ${companyId}`);
      res.json(allProducts);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.post("/products", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`POST /api/products - Usando companyId: ${companyId}`);
      
      const productData = {
        ...req.body,
        stock: Number(req.body.stock) || 0,
        price: Number(req.body.price).toFixed(2),
        companyId: companyId // Usar el companyId del contexto
      };

      console.log(`Creando producto para la empresa ${companyId}:`, productData);

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

  router.patch("/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`PATCH /api/products/${productId} - Usando companyId: ${companyId}`);
      console.log(`PATCH /api/products/${productId} - Body recibido:`, req.body);

      const productData = {
        ...req.body,
        stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined,
        price: req.body.price !== undefined ? Number(req.body.price).toFixed(2) : undefined,
        // No permitir cambiar el companyId
        companyId: undefined
      };

      // Verificar que el producto existe y pertenece a esta empresa
      const [existingProduct] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.companyId, companyId)
        ));

      if (!existingProduct) {
        return res.status(404).json({ error: "Producto no encontrado o no pertenece a la empresa actual" });
      }

      const [updatedProduct] = await db
        .update(products)
        .set(productData)
        .where(and(
          eq(products.id, productId),
          eq(products.companyId, companyId) // Filtrar por companyId para evitar modificar productos de otras empresas
        ))
        .returning();

      console.log(`PATCH /api/products/${productId} - Producto actualizado:`, updatedProduct);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.delete("/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`DELETE /api/products/${productId} - Usando companyId: ${companyId}`);
      console.log(`DELETE /api/products/${productId} - Eliminando producto para la empresa ${companyId}`);

      // Verificar que el producto existe y pertenece a esta empresa
      const [existingProduct] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.companyId, companyId)
        ));

      if (!existingProduct) {
        return res.status(404).json({ error: "Producto no encontrado o no pertenece a la empresa actual" });
      }

      const deletedProduct = await db
        .delete(products)
        .where(and(
          eq(products.id, productId),
          eq(products.companyId, companyId) // Filtrar por companyId para evitar eliminar productos de otras empresas
        ))
        .returning();

      console.log(`DELETE /api/products/${productId} - Producto eliminado:`, deletedProduct);
      res.json({ success: true, message: "Producto eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para actualizar todos los productos existentes, estableciendo hasCommission = true
  router.post("/products/update-all-commission", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Validación de seguridad: No permitir acceso a datos si no hay companyId
      if (!companyId) {
        console.error("Error de seguridad: No se encontró un ID de compañía válido en el contexto");
        return res.status(403).json({ 
          error: "Acceso denegado", 
          message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente." 
        });
      }
      
      console.log(`POST /api/products/update-all-commission - Usando companyId: ${companyId}`);
      console.log(`POST /api/products/update-all-commission - Iniciando actualización de comisiones para empresa ${companyId}`);
      
      // Obtener todos los productos de esta empresa
      const allProducts = await db
        .select()
        .from(products)
        .where(eq(products.companyId, companyId));
      
      console.log(`Encontrados ${allProducts.length} productos para actualizar en la empresa ${companyId}.`);
      
      // Contador para productos actualizados
      let updatedCount = 0;
      let alreadyUpdatedCount = 0;
      
      // Actualizar cada producto
      for (const product of allProducts) {
        // Solo actualizar si hasCommission no está establecido como true
        if (product.hasCommission !== true) {
          const result = await db
            .update(products)
            .set({ hasCommission: true })
            .where(and(
              eq(products.id, product.id),
              eq(products.companyId, companyId) // Asegurar que solo actualizamos productos de esta empresa
            ))
            .returning();
          
          if (result.length > 0) {
            updatedCount++;
            console.log(`Producto ID ${product.id} (${product.name}) actualizado a hasCommission = true (S)`);
          }
        } else {
          alreadyUpdatedCount++;
          console.log(`Producto ID ${product.id} (${product.name}) ya tiene hasCommission = true (S)`);
        }
      }
      
      console.log(`Proceso completado. Se actualizaron ${updatedCount} productos. ${alreadyUpdatedCount} productos ya tenían hasCommission = true`);
      
      res.json({ 
        success: true, 
        message: `Se actualizaron ${updatedCount} productos. ${alreadyUpdatedCount} productos ya tenían hasCommission = true`,
        totalProducts: allProducts.length,
        updatedProducts: updatedCount,
        alreadyUpdatedProducts: alreadyUpdatedCount
      });
    } catch (error) {
      console.error("Error durante la actualización de comisiones:", error);
      res.status(500).json({ 
        success: false,
        error: String(error) 
      });
    }
  });

  // Pagos
  router.get("/payments", async (req, res) => {
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

  router.post("/payments", async (req, res) => {
    try {
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      console.log("POST /api/payments - Datos recibidos:", JSON.stringify(req.body, null, 2));
      console.log("POST /api/payments - CompanyId del contexto:", companyId);
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para crear pago");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto", details: "Para asegurar la separación de datos entre empresas, se requiere el ID de empresa" });
      }
      
      // Asegurarnos que amount tenga el formato correcto (string con 2 decimales)
      const amount = typeof req.body.amount === 'number' 
        ? req.body.amount.toFixed(2) 
        : Number(req.body.amount).toFixed(2);
      
      const paymentData = {
        ...req.body,
        companyId: companyId, // Añadir el companyId del contexto
        amount: amount,
        date: new Date()
      };

      console.log("POST /api/payments - Datos del pago preparados:", JSON.stringify(paymentData, null, 2));

      // Validar los datos del pago contra el esquema
      const validationResult = insertPaymentSchema.safeParse(paymentData);
      if (!validationResult.success) {
        console.error("Error de validación:", validationResult.error.format());
        return res.status(400).json({ error: "Datos de pago inválidos", details: validationResult.error.format() });
      }

      console.log("POST /api/payments - Datos validados, procediendo a insertar:", JSON.stringify(validationResult.data, null, 2));

      try {
        // Insertar el pago validado
        const [payment] = await db
          .insert(payments)
          .values(validationResult.data)
          .returning();
        
        console.log("POST /api/payments - Pago creado:", payment);
        
        // Actualizar el estado de la factura si corresponde
        const invoiceId = payment.invoiceId;
        
        // 1. Obtener la factura
        const [invoice] = await db
          .select()
          .from(invoices)
          .where(and(
            eq(invoices.id, invoiceId),
            eq(invoices.companyId, companyId)
          ));
        
        if (invoice) {
          // 2. Obtener todos los pagos para esta factura
          const paymentsForInvoice = await db
            .select()
            .from(payments)
            .where(and(
              eq(payments.invoiceId, invoiceId),
              eq(payments.companyId, companyId)
            ));
          
          // 3. Calcular el total pagado
          const totalPaid = paymentsForInvoice.reduce(
            (sum, payment) => sum + parseFloat(payment.amount.toString()), 
            0
          );
          
          // 4. Verificar si se ha pagado el total o más
          const invoiceTotal = parseFloat(invoice.total);
          
          console.log(`Total de la factura: ${invoiceTotal}, Total pagado: ${totalPaid}`);
          
          if (totalPaid >= invoiceTotal) {
            // 5. Actualizar el estado de la factura a "paid"
            console.log(`Actualizando factura ${invoiceId} a estado "paid" porque se ha pagado completamente`);
            
            await db
              .update(invoices)
              .set({ status: "paid" })
              .where(and(
                eq(invoices.id, invoiceId),
                eq(invoices.companyId, companyId)
              ));
          } else {
            console.log(`La factura ${invoiceId} sigue pendiente. Total: ${invoiceTotal}, Pagado: ${totalPaid}`);
          }
        }
        
        res.json(payment);
      } catch (dbError) {
        console.error("Error al insertar en base de datos:", dbError);
        throw new Error(`Error de base de datos: ${dbError.message}`);
      }
    } catch (error) {
      console.error("Error al crear pago:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Pedidos
  router.get("/orders", async (req, res) => {
    try {
      const companyId = req.session.companyId || 1;
      
      const allOrders = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          total: orders.total,
          status: orders.status,
          date: orders.date,          
          customerName: customers.businessname,
          address: customers.street,
          paymentMethod: orders.paymentMethod,
          routeId: orders.routeId,
          companyId: orders.companyId
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.companyId, companyId))
        .orderBy(desc(orders.date));

      console.log("GET /api/orders - Retornando:", allOrders.length, "pedidos");
      res.json(allOrders);
    } catch (error) {
      console.error("Error al obtener pedidos:", error);      
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Ruta para obtener un pedido específico por ID
  router.get("/orders/:id", async (req, res) => {
    try {
      // Validar que el ID de la orden sea un número
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido, debe ser un número" });
      }
      
      // Obtener el companyId adecuado del contexto o de la sesión
      let companyId = getCurrentCompanyId();
      
      // Si no hay companyId en el contexto, intentar obtenerlo de la sesión
      if (!companyId && req.session && (req.session.companyId || (req.session.user && req.session.user.companyId))) {
        companyId = req.session.companyId || req.session.user?.companyId;
      }
      
      // Si aún no tenemos companyId, usamos el valor 1 como último recurso (para depuración TEMPORAL)
      if (!companyId) {
        console.warn(`ADVERTENCIA: No se encontró companyId para la petición. Usando companyId=1 como fallback`);
        companyId = 1; // SOLO PARA DEPURACIÓN
      }
      
      console.log(`GET /api/orders/${orderId} - Buscando pedido para compañía ${companyId}`);
      
      // Consulta SQL para obtener la orden y sus detalles en un solo viaje a la base de datos
      const { pool } = await import('./db');
      const query = `
        SELECT 
          o.id, o.company_id as "companyId", o.customer_id as "customerId", 
          o.route_id as "routeId", o.total, o.status, o.payment_method as "paymentMethod", 
          o.date, o.estimated_delivery_time as "estimatedDeliveryTime",
          o.actual_delivery_time as "actualDeliveryTime", 
          o.delivery_sequence as "deliverySequence",
          o.delivery_coordinates as "deliveryCoordinates", 
          o.notes, o.cash_collected as "cashCollected",
          o.driver_commission as "driverCommission", 
          o.assistant_commission as "assistantCommission",
          c.businessname as "customerName", 
          c.email as "customerEmail", 
          c.phone as "customerPhone",
          c.street as "customerStreet"
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1 AND o.company_id = $2
        LIMIT 1
      `;
      
      console.log(`Ejecutando query SQL para pedido ${orderId} y compañía ${companyId}`);
      const result = await pool.query(query, [orderId, companyId]);
      
      if (!result.rows || result.rows.length === 0) {
        console.log(`GET /api/orders/${orderId} - Pedido no encontrado para compañía ${companyId}`);
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      const orderData = result.rows[0];
      
      // Asegurarse de que la fecha sea una cadena ISO
      if (orderData.date && orderData.date instanceof Date) {
        orderData.date = orderData.date.toISOString();
      }
      
      // Asegurarse de que los otros timestamps también sean cadenas ISO si existen
      if (orderData.estimatedDeliveryTime && orderData.estimatedDeliveryTime instanceof Date) {
        orderData.estimatedDeliveryTime = orderData.estimatedDeliveryTime.toISOString();
      }
      
      if (orderData.actualDeliveryTime && orderData.actualDeliveryTime instanceof Date) {
        orderData.actualDeliveryTime = orderData.actualDeliveryTime.toISOString();
      }
      
      // Obtener también los items del pedido
      try {
        const itemsQuery = `
          SELECT 
            id, order_id as "orderId", product_id as "productId",
            quantity, unit_price as "unitPrice", 
            total, discount, notes
          FROM order_items
          WHERE order_id = $1
        `;
        
        // Usamos el pool ya importado
        const itemsResult = await pool.query(itemsQuery, [orderId]);
        
        // Si hay items, agregarlos a la respuesta
        if (itemsResult.rows && itemsResult.rows.length > 0) {
          orderData.items = itemsResult.rows;
          
          // Obtener información de productos para cada item
          const productIds = [...new Set(itemsResult.rows.map(item => item.productId))];
          
          if (productIds.length > 0) {
            const productsQuery = `
              SELECT 
                id, name, description, price, 
                category, image_url as "imageUrl", 
                sku, bottle_deposit as "bottleDeposit"
              FROM products
              WHERE id = ANY($1) AND company_id = $2
            `;
            
            const productsResult = await pool.query(productsQuery, [productIds, companyId]);
            
            // Crear un mapa de productos por ID para consulta rápida
            const productsMap = {};
            if (productsResult.rows && productsResult.rows.length > 0) {
              productsResult.rows.forEach(product => {
                productsMap[product.id] = product;
              });
              
              // Enriquecer cada item con la información del producto
              orderData.items = orderData.items.map(item => ({
                ...item,
                product: productsMap[item.productId] || null
              }));
            }
          }
        } else {
          orderData.items = [];
        }
      } catch (itemsError) {
        console.error(`Error al obtener items del pedido ${orderId}:`, itemsError);
        // No fallamos la petición principal si hay error en los items
        orderData.items = [];
        orderData.itemsError = "Error al obtener items del pedido";
      }
      
      console.log(`GET /api/orders/${orderId} - Retornando datos completos del pedido`);
      res.json(orderData);
    } catch (error) {
      console.error(`Error al obtener pedido ${req.params.id}:`, error);      
      res.status(500).json({ error: String(error) });
    }
  });

  router.post("/orders", async (req, res) => {
    try {
      console.log("POST /api/orders - Datos recibidos:", JSON.stringify(req.body, null, 2));

      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para crear pedido");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto", details: "Para asegurar la separación de datos entre empresas, se requiere el ID de empresa" });
      }

      // Extraer datos de los items antes de preparar los datos del pedido
      const orderItemsData = req.body.items || [];
      
      // Preparar datos del pedido (excluir items para no guardarlos en la tabla orders)
      const { items, ...orderDataRaw } = req.body;
      
      // Procesar datos adicionales del pedido
      const orderData = {
        ...orderDataRaw,
        companyId: companyId, // Asegurar que se usa el companyId correcto
        date: new Date(req.body.date || new Date()),
      };

      console.log("Datos de orden procesados:", orderData);
      console.log("Items del pedido a insertar:", orderItemsData);

      // Validar los datos del pedido antes de la inserción
      const validationResult = insertOrderSchema.safeParse(orderData);
      if (!validationResult.success) {
        console.error("Error de validación:", validationResult.error.format());
        return res.status(400).json({ error: "Datos de pedido inválidos", details: validationResult.error.format() });
      }

      // Crear el pedido
      const [order] = await db
        .insert(orders)
        .values(validationResult.data)
        .returning();

      // Si hay items, crearlos
      if (orderItemsData && Array.isArray(orderItemsData) && orderItemsData.length > 0) {
        console.log(`Insertando ${orderItemsData.length} items para el pedido #${order.id}`);
        
        for (const item of orderItemsData) {
          // Validar que el item tiene los datos necesarios
          if (!item.code && !item.productId) {
            console.warn("Item sin código de producto:", item);
            continue;
          }
          
          const productId = parseInt(item.code || item.productId);
          
          if (isNaN(productId)) {
            console.warn(`ID de producto inválido: ${item.code || item.productId}`);
            continue;
          }
          
          const itemToInsert = {
            orderId: order.id,
            productId: productId,
            quantity: parseInt(item.quantity) || 1,
            price: typeof item.price === 'string' ? item.price : item.price.toFixed(2),
            companyId: companyId // Asegurar que items también tengan companyId
          };
          
          console.log("Insertando item:", itemToInsert);
          
          // Validar cada item antes de insertarlo
          const itemValidationResult = insertOrderItemSchema.safeParse(itemToInsert);
          if (!itemValidationResult.success) {
            console.warn("Item inválido:", item, itemValidationResult.error.format());
            continue;
          }
          
          await db
            .insert(orderItems)
            .values(itemValidationResult.data);
        }
        
        console.log(`Items insertados correctamente para el pedido #${order.id}`);
      } else {
        console.log("No se recibieron items para este pedido");
      }

      console.log("POST /api/orders - Pedido creado:", order);
      res.json(order);
    } catch (error) {
      console.error("Error al crear pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get("/orders/:id/items", async (req, res) => {
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
  
  // Endpoint para agregar items a un pedido existente
  router.post("/orders/:id/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'ID de pedido inválido' });
      }
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para agregar item a pedido");
        return res.status(400).json({ error: "ID de empresa no encontrado en el contexto" });
      }
      
      console.log("POST /api/orders/:id/items - Datos recibidos:", JSON.stringify(req.body, null, 2));
      
      // Validar datos requeridos
      const { productId, quantity, price } = req.body;
      if (!productId || !quantity || !price) {
        return res.status(400).json({ error: 'Faltan datos requeridos (productId, quantity, price)' });
      }

      // Preparar datos del item
      const itemData = {
        orderId,
        productId: parseInt(productId.toString()),
        quantity: parseInt(quantity.toString()),
        price: typeof price === 'string' ? price : price.toFixed(2),
        companyId: companyId // Añadir campo requerido
      };
      
      // Validar datos con el esquema
      const validationResult = insertOrderItemSchema.safeParse(itemData);
      if (!validationResult.success) {
        console.error("Error de validación:", validationResult.error.format());
        return res.status(400).json({ error: "Datos del item inválidos", details: validationResult.error.format() });
      }
      
      // Crear el item del pedido
      const [orderItem] = await db
        .insert(orderItems)
        .values(validationResult.data)
        .returning();
      
      console.log("Item agregado al pedido:", orderItem);
      res.status(201).json(orderItem);
    } catch (error) {
      console.error("Error al agregar item al pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint para actualizar el estado de un pedido
  router.patch("/orders/:id/status", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'ID de pedido inválido' });
      }

      const { status, paymentReceived, updateBalance } = req.body;
      if (!status || !['pending', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido. Debe ser "pending", "delivered" o "cancelled"' });
      }

      // Actualizar el estado del pedido
      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      console.log(`PATCH /api/orders/${orderId}/status - Pedido actualizado a "${status}"`, updatedOrder);
      
      // Si el estado es "delivered", debemos procesar el pago y generar la factura
      if (status === 'delivered' && updatedOrder) {
        try {
          // Obtener el pedido completo con detalles para generar la factura
          const order = await storage.getOrder(orderId);
          
          if (order && order.customerId) {
            // 1. Actualizar el balance del cliente si se requiere
            if (paymentReceived && updateBalance) {
              const customer = await storage.updateCustomerBalance(order.customerId, Number(paymentReceived));
              console.log(`Balance del cliente ${order.customerId} actualizado con el pago de ${paymentReceived}`);
            }
            
            // 2. Generar una factura para este pedido entregado
            try {
              // Datos para la factura
              const invoiceData = {
                customerId: order.customerId,
                total: order.total,
                status: paymentReceived ? "paid" : "pending", // Si se recibió el pago, la factura está pagada
                paymentMethod: order.paymentMethod,
                notes: `Factura generada automáticamente para el pedido #${orderId}`,
              };
              
              // Validar datos de factura
              const validationResult = insertInvoiceSchema.safeParse(invoiceData);
              if (validationResult.success) {
                // Obtener el último número de factura para esta empresa
                const companyId = getCurrentCompanyId();
                const maxInvoiceNumberResult = await db
                  .select({
                    maxInvoiceNumber: sql`MAX(${invoices.invoiceNumber})`
                  })
                  .from(invoices)
                  .where(eq(invoices.companyId, companyId));
                
                const maxInvoiceNumber = maxInvoiceNumberResult[0]?.maxInvoiceNumber || 0;
                const nextInvoiceNumber = maxInvoiceNumber + 1;
                
                // Crear la factura
                const [invoice] = await db
                  .insert(invoices)
                  .values({
                    ...validationResult.data,
                    companyId, // Asegurar que se usa el companyId correcto
                    date: new Date(), // Aseguramos que tenga una fecha actual
                    invoiceNumber: nextInvoiceNumber // Usar el siguiente número de factura
                  })
                  .returning();
                
                console.log(`Factura #${invoice.id} creada automáticamente para el pedido #${orderId}`);
                
                // Obtener los ítems del pedido
                const orderItemsData = await db
                  .select({
                    orderId: orderItems.orderId,
                    productId: orderItems.productId,
                    quantity: orderItems.quantity,
                    price: orderItems.price,
                  })
                  .from(orderItems)
                  .where(eq(orderItems.orderId, orderId));
                
                // Crear los ítems de la factura basados en los ítems del pedido
                if (orderItemsData.length > 0) {
                  const invoiceItemsToInsert = orderItemsData.map(item => ({
                    invoiceId: invoice.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    total: Number(item.price) * item.quantity,
                  }));
                  
                  // Insertar los ítems de la factura
                  await db
                    .insert(invoiceItems)
                    .values(invoiceItemsToInsert);
                  
                  console.log(`${invoiceItemsToInsert.length} ítems añadidos a la factura #${invoice.id}`);
                  
                  // Si se recibió un pago, registrarlo en la tabla de pagos
                  if (paymentReceived) {
                    try {
                      // Obtener el companyId del contexto
                      const companyId = getCurrentCompanyId();
                      
                      if (!companyId) {
                        console.warn("No se encontró companyId en el contexto para registrar pago automático");
                        throw new Error("ID de empresa no encontrado en el contexto");
                      }
                      
                      // Datos para el pago
                      const paymentData = {
                        invoiceId: invoice.id,
                        customerId: order.customerId,
                        companyId: companyId, // Agregar el companyId al pago
                        amount: order.total,
                        paymentMethod: order.paymentMethod || "cash",
                        reference: `Pago recibido en entrega del pedido #${orderId}`,
                        notes: `Pago registrado automáticamente para la factura #${invoice.id}`,
                      };
                      
                      // Validar datos del pago
                      const paymentValidation = insertPaymentSchema.safeParse(paymentData);
                      if (!paymentValidation.success) {
                        console.error("Error de validación en pago automático:", paymentValidation.error.format());
                        throw new Error(`Error de validación en datos de pago: ${paymentValidation.error}`);
                      }
                      
                      // Registrar el pago
                      await storage.registerPayment(paymentValidation.data);
                      console.log(`Pago registrado para factura #${invoice.id}`);
                    } catch (paymentError) {
                      console.error("Error al registrar pago:", paymentError);
                      // No fallamos la operación principal si el registro del pago falla
                    }
                  }
                }
              } else {
                console.error("Error al validar datos de factura:", validationResult.error);
              }
            } catch (invoiceError) {
              console.error("Error al generar factura para el pedido:", invoiceError);
              // No fallamos la operación principal si la generación de factura falla
            }
          }
        } catch (processingError) {
          console.error("Error al procesar datos para entrega completada:", processingError);
          // No fallamos la operación principal si este procesamiento falla
        }
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error al actualizar estado del pedido:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get("/reports/sales", async (req, res) => {
    try {
      const range = req.query.range || 'month';
      let dateFilter;

      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Si no hay companyId en contexto, usar un valor predeterminado (1)
      const effectiveCompanyId = companyId || 1;
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para obtener reporte de ventas. Usando valor predeterminado.");
      }
      
      console.log(`GET /api/reports/sales - Obteniendo reporte para empresa ${effectiveCompanyId} (${companyId ? 'de sesión' : 'valor predeterminado'})`);

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
        .where(and(
          dateFilter,
          eq(invoices.companyId, effectiveCompanyId)
        ))
        .groupBy(sql`DATE_TRUNC('day', ${invoices.date})`)
        .orderBy(sql`DATE_TRUNC('day', ${invoices.date})`);

      console.log("Datos de ventas encontrados:", salesData);
      res.json(salesData);
    } catch (error) {
      console.error("Error al obtener reporte de ventas:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get("/reports/payments", async (req, res) => {
    try {
      const range = req.query.range || 'month';
      let dateFilter;
      
      // Obtener el companyId del contexto
      const companyId = getCurrentCompanyId();
      
      // Si no hay companyId en contexto, usar un valor predeterminado (1)
      const effectiveCompanyId = companyId || 1;
      
      if (!companyId) {
        console.warn("No se encontró companyId en el contexto para obtener reporte de pagos. Usando valor predeterminado.");
      }
      
      console.log(`GET /api/reports/payments - Obteniendo reporte para empresa ${effectiveCompanyId} (${companyId ? 'de sesión' : 'valor predeterminado'})`);

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
        .where(and(
          dateFilter,
          eq(invoices.companyId, effectiveCompanyId)
        ))
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
  router.get("/envases/faltantes/clientes", async (req, res) => {
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

  router.get("/envases/faltantes/choferes", async (req, res) => {
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

  router.post("/envases/faltantes", async (req, res) => {
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

  router.post("/envases/faltantes/asignar", async (req, res) => {
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
  router.get("/production-batches", async (req, res) => {
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

  router.post("/production-batches", async (req, res) => {
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
  router.get("/trucks", async (req, res) => {
    try {
      const allTrucks = await storage.listTrucks();
      res.json(allTrucks);
    } catch (error) {
      console.error("Error al obtener camiones:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get("/trucks/:id", async (req, res) => {
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

  router.post("/trucks", async (req, res) => {
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

  router.put("/trucks/:id", async (req, res) => {
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

  router.patch("/trucks/:id/status", async (req, res) => {
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
  router.get("/vehicle-loading", async (req, res) => {
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

  router.post("/vehicle-loading", async (req, res) => {
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
  router.get("/driver/deliveries/today", async (req, res) => {
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

  router.get("/driver/cash-balance", async (req, res) => {
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

  router.get("/driver/performance", async (req, res) => {
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

  // Nota: El WebSocketServer se configurará en server/index.ts
  // Para permitir que el router sea modular, dejamos la configuración del WebSocketServer
  // fuera de este archivo y solo registramos las rutas API
  
  // No se necesita retornar httpServer ya que las rutas se registran a través del router
  // El server/index.ts es quien maneja la creación y configuración del servidor HTTP
}