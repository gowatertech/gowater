import type { Router } from "express";
import multer from 'multer';
import { storage } from "./storage";
import { zones, routes, users, provinces, cities, municipalities, sectors, insertZoneSchema, insertRouteSchema, customers, insertCustomerSchema, invoices, invoiceItems, insertInvoiceSchema, insertInvoiceItemSchema, products, payments, orders, orderItems, trucks, insertTruckSchema, bottleReturns, productionBatches, productionBatchItems, warehouses, insertWarehouseSchema, vehicleLoading, vehicleLoadingItems, insertVehicleLoadingSchema, insertProductionBatchSchema, insertProductionBatchItemSchema, insertUserSchema, insertOrderSchema, insertOrderItemSchema, insertPaymentSchema } from "@shared/schema";
import * as platformSchema from "@shared/schema";
import { db, usersSimple } from './db';
import { platformDb } from './platform-db';
import { companyDb, getCurrentCompanyId, setCurrentCompanyId } from './company-db';
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
import { createUpdateOrderStatusEndpoint } from "./routes/update-order-status";
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

  // Registrar nuevo endpoint para actualización de estado de pedidos
  createUpdateOrderStatusEndpoint(router);
  
  // Registrar endpoints para comisiones
  router.use('/commissions', commissionsRoutes);
  
  // Registrar endpoints de pedidos y pedidos recurrentes
  registerRoutesEndpoints(router);
  
  // Endpoints de autenticación para panel principal
  // Login para panel empresa (email + password)
  router.post("/login", loginWithEmail);
  
  // Logout
  router.post("/logout", logout);
  
  // Información del usuario actual
  router.get("/user", getCurrentUser);
  
  // Registrar endpoints de prueba para sesiones (solo en desarrollo)
  registerTestSessionRoutes(router);
  
  // Endpoint de diagnóstico sin autenticación
  router.get("/api/diagnostic/no-auth/pending-orders", async (req, res) => {
    try {
      // Este endpoint es solo para pruebas internas, sin autenticación
      const zoneId = parseInt(req.query.zoneId as string);
      const companyId = parseInt(req.query.companyId as string);
      
      if (isNaN(zoneId) || isNaN(companyId)) {
        return res.status(400).json({
          error: "Parámetros inválidos",
          message: "Se requieren los parámetros zoneId y companyId como números"
        });
      }
      
      console.log(`🔍 Diagnóstico SIN AUTH de pedidos pendientes para zona ${zoneId} y compañía ${companyId}`);
      
      // Establecer temporalmente el contexto de compañía para esta consulta
      setCurrentCompanyId(companyId);
      
      // 1. Verificar si la zona existe
      const zonaExiste = await db
        .select()
        .from(zones)
        .where(
          and(
            eq(zones.id, zoneId),
            eq(zones.companyId, companyId)
          )
        );
      
      // 2. Obtener clientes de la zona
      const zoneCustomers = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.zoneid, zoneId),
            eq(customers.companyId, companyId)
          )
        );
      
      // 3. Obtener IDs de clientes
      const customerIds = zoneCustomers.map(customer => customer.id);
      
      // 4. Buscar pedidos pendientes
      const pendingOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            inArray(orders.customerId, customerIds),
            eq(orders.status, "pending"),
            sql`${orders.routeId} IS NULL`,
            eq(orders.companyId, companyId)
          )
        );
      
      // Limpiar el contexto después de usarlo
      setCurrentCompanyId(undefined);
      
      res.json({
        diagnostico: {
          zona: {
            id: zoneId,
            existe: zonaExiste.length > 0,
            detalles: zonaExiste[0] || null
          },
          clientes: {
            total: zoneCustomers.length,
            ids: customerIds
          },
          pedidos_pendientes: {
            enZona: pendingOrders.length,
            detalle: pendingOrders
          }
        }
      });
    } catch (error) {
      // Limpiar el contexto en caso de error
      setCurrentCompanyId(undefined);
      
      console.error("Error en diagnóstico de pedidos pendientes:", error);
      res.status(500).json({ 
        error: "Error de diagnóstico", 
        message: String(error) 
      });
    }
  });
  
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
  
  // Final de la función registerRoutes
}
