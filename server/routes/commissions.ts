import express, { Router, Request, Response } from 'express';
import { db } from '../db';
import { commissions, commissionItems, users, products, orders, routes, orderItems } from '@shared/schema';
import { z } from 'zod';
import { eq, and, between, like, sql, asc, desc, or, inArray } from 'drizzle-orm';

const router = Router();

// Esquema para generar comisiones
const generateCommissionsSchema = z.object({
  weekStartDate: z.string(), // formato YYYY-MM-DD
  weekEndDate: z.string(),   // formato YYYY-MM-DD
  userId: z.number().optional(),
  userRole: z.enum(['driver', 'helper']),
});

// Esquema para actualizar el estado de la comisión
const updateCommissionStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled']),
  paymentDate: z.string().optional(),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

// Obtener comisiones con filtros
router.get('/', async (req, res) => {
  try {
    // Parsear parámetros de consulta
    const { status, userRole, startDate, endDate, userId } = req.query;
    
    // Construir query dinámicamente con filtros
    let query = db.select({
      id: commissions.id,
      userId: commissions.userId,
      userName: users.name,
      userRole: commissions.userRole,
      weekStartDate: commissions.weekStartDate,
      weekEndDate: commissions.weekEndDate,
      productCount: commissions.productCount,
      totalAmount: commissions.totalAmount,
      status: commissions.status,
      paymentDate: commissions.paymentDate,
      routeName: routes.name,
      routeId: commissions.routeId,
      createdAt: commissions.createdAt,
    })
    .from(commissions)
    .leftJoin(users, eq(commissions.userId, users.id))
    .leftJoin(routes, eq(commissions.routeId, routes.id));
    
    // Aplicar filtros según los parámetros recibidos
    const conditions = [];
    
    if (status) {
      conditions.push(eq(commissions.status, status as "pending" | "paid" | "cancelled"));
    }
    
    if (userRole) {
      conditions.push(eq(commissions.userRole, userRole as "driver" | "helper"));
    }
    
    if (userId) {
      conditions.push(eq(commissions.userId, parseInt(userId as string)));
    }
    
    if (startDate) {
      conditions.push(sql`${commissions.weekStartDate} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${commissions.weekEndDate} <= ${endDate}`);
    }
    
    // Aplicar condiciones a la consulta
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Ejecutar consulta con ordenamiento por fecha descendente
    const result = await query.orderBy(desc(commissions.weekStartDate));
    
    res.json(result);
  } catch (error) {
    console.error('Error al obtener comisiones:', error);
    res.status(500).json({ error: 'Error al obtener comisiones' });
  }
});

// Obtener detalle de una comisión específica
router.get('/:id', async (req, res) => {
  try {
    const commissionId = parseInt(req.params.id);
    
    // Obtener datos de la comisión
    const [commission] = await db.select({
      id: commissions.id,
      userId: commissions.userId,
      userName: users.name,
      userRole: commissions.userRole,
      weekStartDate: commissions.weekStartDate,
      weekEndDate: commissions.weekEndDate,
      productCount: commissions.productCount,
      totalAmount: commissions.totalAmount,
      status: commissions.status,
      paymentDate: commissions.paymentDate,
      paymentReference: commissions.paymentReference,
      routeName: routes.name,
      routeId: commissions.routeId,
      notes: commissions.notes,
    })
    .from(commissions)
    .leftJoin(users, eq(commissions.userId, users.id))
    .leftJoin(routes, eq(commissions.routeId, routes.id))
    .where(eq(commissions.id, commissionId));
    
    if (!commission) {
      return res.status(404).json({ error: 'Comisión no encontrada' });
    }
    
    // Obtener los ítems de la comisión con sus detalles
    const items = await db.select({
      id: commissionItems.id,
      productId: commissionItems.productId,
      productName: products.name,
      orderId: commissionItems.orderId,
      orderNumber: orders.id, // Usar como referencia
      quantity: commissionItems.quantity,
      commissionValue: commissionItems.commissionValue,
      commissionAmount: commissionItems.commissionAmount,
      deliveryDate: orders.actualDeliveryTime,
    })
    .from(commissionItems)
    .leftJoin(products, eq(commissionItems.productId, products.id))
    .leftJoin(orders, eq(commissionItems.orderId, orders.id))
    .where(eq(commissionItems.commissionId, commissionId))
    .orderBy(asc(commissionItems.id));
    
    // Crear objeto de respuesta completo
    const commissionDetails = {
      ...commission,
      items,
    };
    
    res.json(commissionDetails);
  } catch (error) {
    console.error('Error al obtener detalle de comisión:', error);
    res.status(500).json({ error: 'Error al obtener detalle de comisión' });
  }
});

// Actualizar el estado de una comisión
router.patch('/:id/status', async (req, res) => {
  try {
    const commissionId = parseInt(req.params.id);
    
    // Validar los datos de entrada
    const result = updateCommissionStatusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos para actualizar estado',
        details: result.error.format()
      });
    }
    
    const { status, paymentDate, paymentReference, notes } = result.data;
    
    // Verificar que la comisión existe
    const [existingCommission] = await db
      .select()
      .from(commissions)
      .where(eq(commissions.id, commissionId));
    
    if (!existingCommission) {
      return res.status(404).json({ error: 'Comisión no encontrada' });
    }
    
    // Preparar los datos para actualizar
    const updateData: Record<string, any> = { status };
    
    if (status === 'paid' && paymentDate) {
      updateData.paymentDate = new Date(paymentDate);
    }
    
    if (paymentReference !== undefined) {
      updateData.paymentReference = paymentReference;
    }
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    // Actualizar la comisión
    const [updatedCommission] = await db
      .update(commissions)
      .set(updateData)
      .where(eq(commissions.id, commissionId))
      .returning();
    
    res.json(updatedCommission);
  } catch (error) {
    console.error('Error al actualizar estado de comisión:', error);
    res.status(500).json({ error: 'Error al actualizar estado de comisión' });
  }
});

// Generar comisiones para un período
router.post('/generate', async (req, res) => {
  try {
    // Validar los datos de entrada
    const result = generateCommissionsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos para generar comisiones',
        details: result.error.format()
      });
    }
    
    const { weekStartDate, weekEndDate, userId, userRole } = result.data;
    
    // Convertir fechas a objetos Date
    const startDate = new Date(weekStartDate);
    const endDate = new Date(weekEndDate);
    
    // Verificar que la fecha de inicio es anterior a la fecha de fin
    if (startDate > endDate) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }
    
    // Construir la consulta para obtener usuarios según los filtros
    let usersQuery = db
      .select()
      .from(users)
      .where(eq(users.role, userRole === 'driver' ? 'driver' : 'assistant'));
    
    // Filtrar por ID de usuario si se proporciona
    if (userId) {
      usersQuery = usersQuery.where(eq(users.id, userId));
    }
    
    // Obtener la lista de usuarios
    const usersList = await usersQuery;
    
    if (usersList.length === 0) {
      return res.status(404).json({ error: 'No se encontraron usuarios para generar comisiones' });
    }
    
    // Array para almacenar las comisiones generadas
    const generatedCommissions = [];
    
    // Para cada usuario, generar su comisión
    for (const user of usersList) {
      // Buscar órdenes entregadas en el período especificado por este usuario
      const deliveredOrders = await db
        .select({
          id: orders.id,
          routeId: orders.routeId,
          actualDeliveryTime: orders.actualDeliveryTime,
          driverId: routes.driverId,
          assistantId: routes.assistantId,
        })
        .from(orders)
        .leftJoin(routes, eq(orders.routeId, routes.id))
        .where(
          and(
            eq(orders.status, 'delivered'),
            sql`${orders.actualDeliveryTime} BETWEEN ${startDate} AND ${endDate}`,
            userRole === 'driver' 
              ? eq(routes.driverId, user.id)
              : eq(routes.assistantId, user.id)
          )
        );
      
      if (deliveredOrders.length === 0) {
        // Si no hay órdenes para este usuario en este período, continuar con el siguiente
        continue;
      }
      
      // Obtener los IDs de las órdenes entregadas
      const orderIds = deliveredOrders.map(order => order.id);
      
      console.log("Buscando productos comisionables para órdenes:", orderIds);
      
      // Buscar productos comisionables en estas órdenes
      const orderProductItems = await db
        .select({
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          product: products,
          quantity: orderItems.quantity,
          order: orders,
          routeId: orders.routeId,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            inArray(orderItems.orderId, orderIds),
            eq(products.isCommissionable, true)
          )
        );
        
      console.log("Productos comisionables encontrados:", orderProductItems.length);
      
      // Si no hay productos comisionables, continuar con el siguiente usuario
      if (orderProductItems.length === 0) {
        continue;
      }
      
      // Calcular el monto total de comisiones
      let totalCommissionAmount = 0;
      const commissionItemsData = [];
      
      for (const item of orderProductItems) {
        // Obtener el valor de comisión según el rol (conductor o ayudante)
        let commissionValue;
        if (userRole === 'driver') {
          commissionValue = item.product?.driverCommissionValue;
          console.log("Valor de comisión para conductor:", commissionValue);
        } else {
          commissionValue = item.product?.helperCommissionValue;
          console.log("Valor de comisión para ayudante:", commissionValue);
        }
        
        // Verificar si el valor de comisión existe
        if (!commissionValue) {
          console.log("Sin valor de comisión para producto:", item.productId);
          continue;
        }
        
        // Convertir el valor de comisión a número para hacer cálculos
        let commissionValueNum = 0;
        try {
          // Intentar convertir el valor de la comisión a un número
          if (typeof commissionValue === 'string') {
            commissionValueNum = parseFloat(commissionValue);
          } else if (commissionValue !== null && commissionValue !== undefined) {
            // Si no es string pero existe, intentar convertirlo
            commissionValueNum = Number(commissionValue);
          }
        } catch (e) {
          console.error("Error al convertir valor de comisión:", commissionValue, e);
          // En caso de error, usar valor por defecto
          commissionValueNum = 0;
        }
        
        // Calcular el monto de comisión
        const commissionAmount = commissionValueNum * item.quantity;
        console.log(`Calculando comisión: ${commissionValueNum} * ${item.quantity} = ${commissionAmount}`);
        
        // Sumar al total
        totalCommissionAmount += commissionAmount;
        
        commissionItemsData.push({
          productId: item.productId,
          orderId: item.orderId,
          quantity: item.quantity,
          commissionValue: commissionValue,
          commissionAmount: commissionAmount.toFixed(2),
        });
      }
      
      // Si no hay montos de comisión, continuar con el siguiente usuario
      if (commissionItemsData.length === 0) {
        continue;
      }
      
      // Verificar si ya existe una comisión para este usuario en este período
      const [existingCommission] = await db
        .select()
        .from(commissions)
        .where(
          and(
            eq(commissions.userId, user.id),
            eq(commissions.userRole, userRole),
            sql`${commissions.weekStartDate} = ${startDate}`,
            sql`${commissions.weekEndDate} = ${endDate}`
          )
        );
      
      if (existingCommission) {
        // Si ya existe, no crear una nueva
        generatedCommissions.push(existingCommission);
        continue;
      }
      
      // Crear una nueva comisión
      const [newCommission] = await db
        .insert(commissions)
        .values({
          userId: user.id,
          userRole: userRole,
          weekStartDate: startDate,
          weekEndDate: endDate,
          productCount: commissionItemsData.length,
          totalAmount: totalCommissionAmount.toFixed(2),
          status: 'pending',
          routeId: deliveredOrders[0].routeId, // Usar el primer routeId encontrado
          createdAt: new Date(),
        })
        .returning();
      
      // Agregar ítems de comisión
      for (const itemData of commissionItemsData) {
        await db
          .insert(commissionItems)
          .values({
            ...itemData,
            commissionId: newCommission.id,
          });
      }
      
      generatedCommissions.push(newCommission);
    }
    
    res.status(201).json({ 
      message: `Se generaron ${generatedCommissions.length} comisiones correctamente`,
      commissions: generatedCommissions 
    });
  } catch (error) {
    console.error('Error al generar comisiones:', error);
    res.status(500).json({ error: 'Error al generar comisiones' });
  }
});

export default router;