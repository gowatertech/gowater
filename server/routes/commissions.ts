import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  commissions, 
  commissionItems, 
  orders, 
  users,
  routes,
  orderItems,
  products
} from "../../shared/schema";
import { and, between, eq, gte, lte, sql } from 'drizzle-orm';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const router = Router();

// Get all commissions with optional filters
router.get("/", async (req, res) => {
  try {
    const { status, userId, userRole, startDate, endDate, routeId } = req.query;

    let query = db.select({
      commission: commissions,
      user: users,
      route: routes
    })
    .from(commissions)
    .leftJoin(users, eq(commissions.userId, users.id))
    .leftJoin(routes, eq(commissions.routeId, routes.id));

    // Apply filters if provided
    if (status && ['pending', 'paid', 'cancelled'].includes(status as string)) {
      query = query.where(eq(commissions.status, status as string));
    }

    if (userId) {
      query = query.where(eq(commissions.userId, Number(userId)));
    }

    if (userRole && ['driver', 'helper'].includes(userRole as string)) {
      query = query.where(eq(commissions.userRole, userRole as string));
    }

    if (routeId) {
      query = query.where(eq(commissions.routeId, Number(routeId)));
    }

    // Date range filtering
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(commissions.weekStartDate, startDate as string),
          lte(commissions.weekEndDate, endDate as string)
        )
      );
    } else if (startDate) {
      query = query.where(gte(commissions.weekStartDate, startDate as string));
    } else if (endDate) {
      query = query.where(lte(commissions.weekEndDate, endDate as string));
    }

    const results = await query;

    // Map results to a more frontend-friendly format
    const formattedResults = results.map(result => ({
      id: result.commission.id,
      userId: result.commission.userId,
      userName: result.user ? `${result.user.name}` : 'Usuario Desconocido',
      userRole: result.commission.userRole,
      routeId: result.commission.routeId,
      routeName: result.route ? result.route.name : null,
      weekStartDate: result.commission.weekStartDate,
      weekEndDate: result.commission.weekEndDate,
      productCount: result.commission.productCount,
      totalAmount: result.commission.totalAmount,
      status: result.commission.status,
      paymentDate: result.commission.paymentDate,
      paymentReference: result.commission.paymentReference,
      notes: result.commission.notes,
      createdAt: result.commission.createdAt
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ error: "Error al obtener las comisiones" });
  }
});

// Get specific commission by ID with its items
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const commissionId = Number(id);

    // First get the commission details
    const commissionResult = await db.select({
      commission: commissions,
      user: users,
      route: routes
    })
    .from(commissions)
    .leftJoin(users, eq(commissions.userId, users.id))
    .leftJoin(routes, eq(commissions.routeId, routes.id))
    .where(eq(commissions.id, commissionId))
    .limit(1);

    if (commissionResult.length === 0) {
      return res.status(404).json({ error: "Comisión no encontrada" });
    }

    // Get all commission items
    const commissionItemsResult = await db.select({
      item: commissionItems,
      product: products,
      order: orders
    })
    .from(commissionItems)
    .leftJoin(products, eq(commissionItems.productId, products.id))
    .leftJoin(orders, eq(commissionItems.orderId, orders.id))
    .where(eq(commissionItems.commissionId, commissionId));

    // Format the commission details
    const commissionData = commissionResult[0];
    const formattedCommission = {
      id: commissionData.commission.id,
      userId: commissionData.commission.userId,
      userName: commissionData.user ? `${commissionData.user.name}` : 'Usuario Desconocido',
      userRole: commissionData.commission.userRole,
      routeId: commissionData.commission.routeId,
      routeName: commissionData.route ? commissionData.route.name : null,
      weekStartDate: commissionData.commission.weekStartDate,
      weekEndDate: commissionData.commission.weekEndDate,
      productCount: commissionData.commission.productCount,
      totalAmount: commissionData.commission.totalAmount,
      status: commissionData.commission.status,
      paymentDate: commissionData.commission.paymentDate,
      paymentReference: commissionData.commission.paymentReference,
      notes: commissionData.commission.notes,
      createdAt: commissionData.commission.createdAt,
      items: commissionItemsResult.map(item => ({
        id: item.item.id,
        orderId: item.item.orderId,
        orderNumber: item.order ? `#${item.order.id}` : null,
        productId: item.item.productId,
        productName: item.product ? item.product.name : 'Producto Desconocido',
        quantity: item.item.quantity,
        commissionValue: item.item.commissionValue,
        commissionAmount: item.item.commissionAmount,
        deliveryDate: item.item.deliveryDate
      }))
    };

    res.json(formattedCommission);
  } catch (error) {
    console.error("Error fetching commission details:", error);
    res.status(500).json({ error: "Error al obtener los detalles de la comisión" });
  }
});

// Create a new commission (usually through a scheduled job or admin action)
router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      userId: z.number(),
      userRole: z.enum(["driver", "helper"]),
      routeId: z.number().optional(),
      weekStartDate: z.string(),
      weekEndDate: z.string(),
      items: z.array(z.object({
        orderId: z.number(),
        productId: z.number(),
        quantity: z.number(),
        commissionValue: z.string(),
        commissionAmount: z.string(),
        deliveryDate: z.string()
      })).optional()
    });

    const data = schema.parse(req.body);

    // Calculate product count and total amount if items are provided
    let productCount = 0;
    let totalAmount = 0;

    if (data.items && data.items.length > 0) {
      productCount = data.items.reduce((sum, item) => sum + item.quantity, 0);
      totalAmount = data.items.reduce((sum, item) => sum + parseFloat(item.commissionAmount), 0);
    }

    // Create the commission record
    const [commission] = await db.insert(commissions).values({
      userId: data.userId,
      userRole: data.userRole,
      routeId: data.routeId,
      weekStartDate: new Date(data.weekStartDate),
      weekEndDate: new Date(data.weekEndDate),
      productCount,
      totalAmount: totalAmount.toFixed(2),
      status: "pending"
    }).returning();

    // If items are provided, create commission items
    if (data.items && data.items.length > 0 && commission) {
      const commissionItemsValues = data.items.map(item => ({
        commissionId: commission.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        commissionValue: item.commissionValue,
        commissionAmount: item.commissionAmount,
        deliveryDate: new Date(item.deliveryDate)
      }));

      await db.insert(commissionItems).values(commissionItemsValues);
    }

    res.status(201).json(commission);
  } catch (error) {
    console.error("Error creating commission:", error);
    res.status(500).json({ error: "Error al crear la comisión" });
  }
});

// Update commission status (pay or cancel)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(["pending", "paid", "cancelled"]),
      paymentDate: z.string().optional(),
      paymentReference: z.string().optional(),
      notes: z.string().optional()
    });

    const { status, paymentDate, paymentReference, notes } = schema.parse(req.body);

    const updateData: any = { status };

    if (status === "paid") {
      // If marking as paid, require payment date and reference
      if (!paymentDate) {
        return res.status(400).json({ error: "La fecha de pago es requerida para marcar como pagada" });
      }
      updateData.paymentDate = new Date(paymentDate);
      updateData.paymentReference = paymentReference;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const result = await db.update(commissions)
      .set(updateData)
      .where(eq(commissions.id, Number(id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Comisión no encontrada" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating commission status:", error);
    res.status(500).json({ error: "Error al actualizar el estado de la comisión" });
  }
});

// Generate commissions for a specific week
router.post("/generate", async (req, res) => {
  try {
    const schema = z.object({
      weekStartDate: z.string(),
      weekEndDate: z.string(),
      userId: z.number().optional(),
      userRole: z.enum(["driver", "helper"]).optional()
    });

    const { weekStartDate, weekEndDate, userId, userRole } = schema.parse(req.body);
    
    // Convert dates to Date objects
    const startDate = new Date(weekStartDate);
    const endDate = new Date(weekEndDate);

    // Get all orders delivered in the date range
    const deliveredOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "delivered"),
          gte(orders.actualDeliveryTime, startDate),
          lte(orders.actualDeliveryTime, endDate)
        )
      );

    if (deliveredOrders.length === 0) {
      return res.status(400).json({ 
        error: "No hay pedidos entregados en el rango de fechas seleccionado" 
      });
    }

    // Get all order items with commissionable products
    const orderIds = deliveredOrders.map(order => order.id);
    
    // Get all driver or helper users if not specified
    let usersToProcess: { id: number, name: string, role: string }[] = [];
    
    if (userId) {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (user.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      usersToProcess = [{ 
        id: user[0].id, 
        name: user[0].name, 
        role: userRole || "driver" 
      }];
    } else {
      // Get all drivers or helpers
      const query = db.select()
        .from(users)
        .where(eq(users.role, userRole === "helper" ? "assistant" : "driver"));

      const userList = await query;
      usersToProcess = userList.map(u => ({ 
        id: u.id, 
        name: u.name, 
        role: userRole || (u.role === "driver" ? "driver" : "helper")
      }));
    }

    // Process each user
    const results = [];
    for (const user of usersToProcess) {
      // Find orders where this user was the driver or helper
      const userOrders = await db.select()
        .from(orders)
        .leftJoin(routes, eq(orders.routeId, routes.id))
        .where(
          and(
            eq(orders.status, "delivered"),
            gte(orders.actualDeliveryTime, startDate),
            lte(orders.actualDeliveryTime, endDate),
            user.role === "driver" 
              ? eq(routes.driverId, user.id)
              : eq(routes.assistantId, user.id)
          )
        );

      if (userOrders.length === 0) {
        continue; // Skip this user if no orders found
      }

      const userOrderIds = userOrders.map(order => order.orders.id);

      // Find commissionable order items for these orders
      const commissionableItems = await db.select({
        orderItem: orderItems,
        product: products,
        order: orders,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(products.isCommissionable, true),
          sql`${orderItems.orderId} IN (${userOrderIds.join(',')})`
        )
      );

      if (commissionableItems.length === 0) {
        continue; // Skip this user if no commissionable items found
      }

      // Calculate total commission amount
      let totalAmount = 0;
      let totalProducts = 0;
      const commissionItemsData = [];

      for (const item of commissionableItems) {
        const commissionValue = user.role === "driver" 
          ? item.product.driverCommissionValue 
          : item.product.helperCommissionValue;
        
        const commissionAmount = parseFloat(commissionValue.toString()) * item.orderItem.quantity;
        
        totalAmount += commissionAmount;
        totalProducts += item.orderItem.quantity;

        commissionItemsData.push({
          orderId: item.orderItem.orderId,
          productId: item.orderItem.productId,
          quantity: item.orderItem.quantity,
          commissionValue: commissionValue.toString(),
          commissionAmount: commissionAmount.toFixed(2),
          deliveryDate: item.order.actualDeliveryTime
        });
      }

      // Create a new commission record
      const [commission] = await db.insert(commissions).values({
        userId: user.id,
        userRole: user.role,
        weekStartDate: startDate,
        weekEndDate: endDate,
        productCount: totalProducts,
        totalAmount: totalAmount.toFixed(2),
        status: "pending"
      }).returning();

      if (commission) {
        // Create commission items
        const commissionItemsValues = commissionItemsData.map(item => ({
          commissionId: commission.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          commissionValue: item.commissionValue,
          commissionAmount: item.commissionAmount,
          deliveryDate: item.deliveryDate
        }));

        await db.insert(commissionItems).values(commissionItemsValues);
        
        results.push({
          id: commission.id,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          totalAmount: totalAmount.toFixed(2),
          productCount: totalProducts
        });
      }
    }

    res.status(201).json({
      message: `Se generaron ${results.length} comisiones`,
      commissions: results
    });

  } catch (error) {
    console.error("Error generating commissions:", error);
    res.status(500).json({ error: "Error al generar las comisiones" });
  }
});

export default router;