import express, { Request, Response } from 'express';
import { zones, customers, orders } from "@shared/schema";
import { db } from '../db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getCurrentCompanyId } from '../company-db';
import { consolidatedCompanyMiddleware } from '../middleware/consolidated-company.middleware';

const zonesRouter = express.Router();

// Endpoint para obtener pedidos pendientes por zona
zonesRouter.get("/:id/pending-orders", async (req: Request, res: Response) => {
  try {
    console.log("🔍 Iniciando búsqueda de pedidos pendientes por zona...");
    
    // 1. Obtener ID de zona de los parámetros
    const zoneId = parseInt(req.params.id);
    if (isNaN(zoneId)) {
      return res.status(400).json({ 
        error: "ID de zona inválido", 
        message: "El ID de zona debe ser un número" 
      });
    }
    
    // 2. Obtener companyId del contexto (middleware se encarga de establecerlo)
    const companyId = getCurrentCompanyId();
    if (!companyId) {
      console.error("No se encontró companyId en el contexto para pedidos pendientes");
      return res.status(403).json({ 
        error: "Error de contexto", 
        message: "No se pudo determinar la empresa actual" 
      });
    }
    
    console.log(`Buscando pedidos pendientes para zona ${zoneId} y compañía ${companyId}`);
    
    // 3. Verificar si la zona existe y pertenece a la compañía actual
    const zonaExiste = await db
      .select()
      .from(zones)
      .where(
        and(
          eq(zones.id, zoneId),
          eq(zones.companyId, companyId)
        )
      );
    
    if (zonaExiste.length === 0) {
      console.log(`La zona ${zoneId} no existe para la compañía ${companyId}`);
      return res.status(404).json({ 
        error: "Zona no encontrada",
        message: "La zona especificada no existe o no pertenece a la empresa actual"
      });
    }
    
    // 4. Obtener los clientes de la zona
    const zoneCustomers = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.zoneid, zoneId),
          eq(customers.companyId, companyId)
        )
      );
    
    console.log(`Encontrados ${zoneCustomers.length} clientes en la zona ${zoneId}`);
    
    if (zoneCustomers.length === 0) {
      console.log(`No hay clientes en la zona ${zoneId} para la compañía ${companyId}`);
      return res.json([]);
    }
    
    // 5. Obtener IDs de clientes
    const customerIds = zoneCustomers.map(customer => customer.id);
    
    // 6. Buscar pedidos pendientes que no estén asignados a ninguna ruta
    const pendingOrders = await db
      .select({
        // Campos del pedido
        id: orders.id,
        status: orders.status,
        date: orders.date,
        total: orders.total,
        customerId: orders.customerId,
        paymentMethod: orders.paymentMethod,
        notes: orders.notes,
        // Agregamos los campos del cliente que necesita el frontend
        customerBusinessName: customers.businessname,
        customerStreet: customers.street,
        customerStreetNumber: customers.streetnumber,
        customerPhone: customers.phone,
        customerReference: customers.reference,
        customerCoordinates: customers.coordinates
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(
        and(
          inArray(orders.customerId, customerIds),
          eq(orders.status, "pending"),
          sql`${orders.routeId} IS NULL`,
          eq(orders.companyId, companyId)
        )
      );
    
    console.log(`Encontrados ${pendingOrders.length} pedidos pendientes para la zona ${zoneId}`);
    
    // 7. Transformar datos para el formato esperado por el frontend
    const formattedOrders = pendingOrders.map(order => ({
      id: order.id,
      status: order.status,
      date: order.date,
      total: order.total,
      customerId: order.customerId,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      // Datos del cliente
      customerName: order.customerBusinessName,
      customerAddress: order.customerStreet || "",
      customerAddressNumber: order.customerStreetNumber || "",
      customerPhone: order.customerPhone || "",
      customerReference: order.customerReference || "",
      // Coordenadas para el mapa
      coordinates: order.customerCoordinates || null,
      // Campo vacío de productos (se cargarán bajo demanda)
      products: []
    }));
    
    return res.json(formattedOrders);
    
  } catch (error) {
    console.error("Error al obtener pedidos pendientes por zona:", error);
    return res.status(500).json({ 
      error: "Error interno", 
      message: "Ocurrió un error al procesar la solicitud" 
    });
  }
});

// Export both the router and a registration function for better integration
export { zonesRouter };

export function registerZonesRoutes(app: express.Express) {
  // Importante: Aplicamos el middleware de contexto de compañía consolidado
  // para asegurar que se establezca correctamente el companyId en cada petición
  app.use('/api/zones', consolidatedCompanyMiddleware, zonesRouter);
}