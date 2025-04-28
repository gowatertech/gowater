import express, { Request, Response } from 'express';
import { zones, customers, orders } from "@shared/schema";
import { db } from '../db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { setCurrentCompanyId, getCurrentCompanyId } from '../company-db';

// Crear un router para diagnósticos que no requieren autenticación
const diagnosticRouter = express.Router();

// Endpoint para diagnosticar pedidos pendientes por zona
diagnosticRouter.get("/pending-orders", async (req: Request, res: Response) => {
  try {
    // Este endpoint es solo para pruebas internas, no requiere autenticación
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
    
    try {
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
      
      // Obtener TODOS los pedidos pendientes para la compañía
      const allPendingOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, "pending"),
            sql`${orders.routeId} IS NULL`,
            eq(orders.companyId, companyId)
          )
        );
      
      // Verificar cliente específico
      // Para depuración, buscar pedidos para un cliente específico (ID 9)
      const clienteEspecifico = 9;
      const pedidosClienteEspecifico = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.customerId, clienteEspecifico),
            eq(orders.status, "pending"),
            sql`${orders.routeId} IS NULL`,
            eq(orders.companyId, companyId)
          )
        );
      
      res.json({
        diagnostico: {
          companyId,
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
            totalCompania: allPendingOrders.length,
            detalle_resumido: pendingOrders.map(p => ({ 
              id: p.id, 
              customerId: p.customerId, 
              status: p.status,
              routeId: p.routeId
            }))
          },
          cliente_especifico: {
            id: clienteEspecifico,
            pedidos_pendientes: pedidosClienteEspecifico.length,
            detalle: pedidosClienteEspecifico.map(p => ({ 
              id: p.id, 
              status: p.status,
              routeId: p.routeId
            }))
          }
        }
      });
    } finally {
      // Limpiar el contexto después de usarlo
      setCurrentCompanyId(undefined);
    }
  } catch (error) {
    console.error("Error en diagnóstico de pedidos pendientes:", error);
    res.status(500).json({ 
      error: "Error de diagnóstico", 
      message: String(error) 
    });
  }
});

// Endpoint para verificar el contexto de compañía
diagnosticRouter.get("/context", (req: Request, res: Response) => {
  try {
    const companyId = getCurrentCompanyId();
    const sessionCompanyId = req.session?.companyId;
    const userCompanyId = req.session?.user?.companyId;
    
    const userInfo = req.session?.user ? {
      id: req.session.user.id,
      role: req.session.user.role,
      name: req.session.user.name,
      companyId: req.session.user.companyId
    } : null;
    
    res.json({
      contextCompanyId: companyId,
      sessionCompanyId: sessionCompanyId,
      userCompanyId: userCompanyId,
      sessionUser: userInfo,
      isAuthenticated: !!req.session?.user,
      sessionExists: !!req.session,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error en endpoint de diagnóstico:", error);
    res.status(500).json({ 
      error: "Error en diagnóstico", 
      message: String(error)
    });
  }
});

// Función para registrar las rutas de diagnóstico
export function registerDiagnosticRoutes(app: express.Express) {
  app.use('/api/diagnostic-no-auth', diagnosticRouter);
}