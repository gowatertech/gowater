import express, { Request, Response } from 'express';
import { db } from './db';
import { orders, customers, zones } from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentCompanyId } from './company-db';

// Router para rutas directas que necesitan evitar el manejo de Vite
const directRouter = express.Router();

// Endpoint para obtener todos los pedidos pendientes para el generador de rutas
directRouter.get('/route-generator/orders/pending', async (req: Request, res: Response) => {
  try {
    console.log(`[Direct API Route] Handling request for /api/route-generator/orders/pending`);
    
    // Verificar si el usuario está autenticado
    if (!req.session?.user) {
      console.log("❌ Usuario no autenticado intentando acceder a pedidos pendientes");
      return res.status(401).json({ 
        success: false, 
        message: "No autenticado" 
      });
    }
    
    // Obtener company ID
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ 
        error: "No se encontró ID de compañía en el contexto" 
      });
    }
    
    console.log(`[Generador de Rutas] Obteniendo pedidos pendientes para compañía ${companyId}`);
    
    // Obtener todos los pedidos pendientes sin ruta asignada
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
    
    // Para cada pedido, obtener los datos del cliente
    const pendingOrdersWithCustomers = await Promise.all(
      pendingOrders.map(async (order) => {
        // Obtener cliente
        const customer = await db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.id, order.customerId),
              eq(customers.companyId, companyId)
            )
          )
          .limit(1);
            
        // Si el cliente tiene zona, obtener los datos de la zona
        let customerZone = null;
        if (customer[0]?.zoneid) {
          const zone = await db
            .select()
            .from(zones)
            .where(
              and(
                eq(zones.id, customer[0].zoneid),
                eq(zones.companyId, companyId)
              )
            )
            .limit(1);
            
          if (zone.length > 0) {
            customerZone = zone[0];
          }
        }
        
        return {
          ...order,
          customer: customer.length > 0 ? customer[0] : null,
          zone: customerZone
        };
      })
    );
    
    console.log(`[Generador de Rutas] Se encontraron ${pendingOrdersWithCustomers.length} pedidos pendientes`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(pendingOrdersWithCustomers);
  } catch (error) {
    console.error("[Generador de Rutas] Error al obtener pedidos pendientes:", error);
    return res.status(500).json({ 
      error: "Error al obtener pedidos pendientes",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export function registerDirectRoutes(app: express.Express) {
  app.use('/api', directRouter);
  console.log('✅ Rutas directas registradas correctamente');
}