import { Router, Request, Response } from 'express';
import { orders, routes } from '../../../shared/schema';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { getCurrentCompanyId } from '../../company-db';

// Router para las operaciones relacionadas con la creación de rutas
export const createRouter = Router();

// Interface para los datos de una ruta nueva
interface NewRoute {
  name: string;
  driverId: number;
  assistantId?: number | null;
  truckId?: number | null;
  zoneId: number;
  date: string;
  stops: RouteStop[];
}

// Interface para cada parada en la ruta
interface RouteStop {
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  coordinates?: string;
  sequenceNumber: number;
}

// Endpoint para crear una nueva ruta
createRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const companyId = getCurrentCompanyId();
    if (!companyId) {
      return res.status(403).json({ 
        error: "Acceso denegado", 
        message: "No se ha encontrado un contexto de compañía válido" 
      });
    }
    
    const { 
      name, 
      driverId, 
      assistantId, 
      truckId, 
      zoneId, 
      date, 
      stops 
    } = req.body as NewRoute;
    
    // Validaciones básicas
    if (!name || !driverId || !zoneId || !date || !stops || !Array.isArray(stops)) {
      return res.status(400).json({ 
        error: "Datos incompletos", 
        message: "Faltan campos requeridos para crear la ruta" 
      });
    }
    
    console.log(`🔄 Creando nueva ruta: ${name} con ${stops.length} paradas...`);
    
    // Crear la ruta en la base de datos
    const [newRoute] = await db.insert(routes).values({
      companyId,
      name,
      driverId,
      assistantId,
      truckId,
      zoneId,
      date: new Date(date),
      status: "pending",
      deliverySequence: stops.map(stop => String(stop.orderId)),
      stops: stops.map(stop => JSON.stringify({
        orderId: stop.orderId,
        sequenceNumber: stop.sequenceNumber,
        customerId: stop.customerId,
        customerName: stop.customerName,
        address: stop.address,
        coordinates: stop.coordinates,
      })),
    }).returning();
    
    // Actualizar las órdenes para asignarlas a esta ruta
    for (const stop of stops) {
      await db.update(orders)
        .set({ 
          routeId: newRoute.id,
          deliverySequence: stop.sequenceNumber
        })
        .where(eq(orders.id, stop.orderId));
    }
    
    console.log(`✅ Ruta ${newRoute.id} creada exitosamente con ${stops.length} paradas`);
    
    res.status(201).json({
      success: true,
      routeId: newRoute.id,
      message: `Ruta creada exitosamente con ${stops.length} paradas`
    });
  } catch (error) {
    console.error("Error al crear ruta:", error);
    res.status(500).json({ 
      error: "Error al crear nueva ruta", 
      message: String(error) 
    });
  }
});

export default createRouter;