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
  userRole: z.enum(['driver', 'helper']), // Nota: 'helper' es el valor que viene del frontend, pero internamente usamos 'assistant'
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
      query = query.where(and(...conditions)) as any;
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

// Eliminar una comisión
router.delete('/:id', async (req, res) => {
  try {
    const commissionId = parseInt(req.params.id);
    
    // Verificar que la comisión existe
    const [existingCommission] = await db
      .select()
      .from(commissions)
      .where(eq(commissions.id, commissionId));
    
    if (!existingCommission) {
      return res.status(404).json({ error: 'Comisión no encontrada' });
    }
    
    // Primero eliminar todos los items relacionados
    await db
      .delete(commissionItems)
      .where(eq(commissionItems.commissionId, commissionId));
    
    // Luego eliminar la comisión
    const [deletedCommission] = await db
      .delete(commissions)
      .where(eq(commissions.id, commissionId))
      .returning();
    
    res.json({ 
      message: 'Comisión eliminada correctamente',
      deletedCommission 
    });
  } catch (error) {
    console.error('Error al eliminar comisión:', error);
    res.status(500).json({ error: 'Error al eliminar comisión' });
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
    // Vamos a mapear los roles del frontend a los roles de la base de datos
    
    // Si viene el rol "helper" del frontend, buscar usuarios con rol "assistant" en BD
    // Aquí definimos el mapeo entre roles del frontend y roles de la BD
    // Mantener consistencia usando 'helper' en toda la aplicación
    const roleValue = userRole;
    console.log(`Rol a usar: "${roleValue}"`);
    
    // Consulta inicial con tipado seguro
    let usersQuery;
    
    // Mapear 'helper' a 'assistant' para la consulta en BD
    const dbRole = roleValue === 'helper' ? 'assistant' : roleValue;
    console.log(`Rol para consulta en BD: "${dbRole}"`);
    
    usersQuery = db
      .select()
      .from(users)
      .where(eq(users.role, dbRole));
    
    // Filtrar por ID de usuario si se proporciona
    if (userId) {
      console.log(`Buscando específicamente usuario con ID: ${userId}`);
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
      let deliveredOrders;
      
      // Consulta personalizada según el rol del usuario
      if (userRole === 'driver') {
        // Para conductores, buscar órdenes donde son conductores
        deliveredOrders = await db
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
              // Ajustamos el rango para incluir todo el día de la fecha final
              sql`${orders.actualDeliveryTime} >= ${startDate} AND ${orders.actualDeliveryTime} < ${endDate}::timestamp + INTERVAL '1 day'`,
              eq(routes.driverId, user.id)
            )
          );
      } else {
        // Para ayudantes, buscar órdenes donde son ayudantes y el campo no es nulo
        deliveredOrders = await db
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
              // Ajustamos el rango para incluir todo el día de la fecha final
              sql`${orders.actualDeliveryTime} >= ${startDate} AND ${orders.actualDeliveryTime} < ${endDate}::timestamp + INTERVAL '1 day'`,
              and(
                eq(routes.assistantId, user.id),
                sql`${routes.assistantId} IS NOT NULL`
              )
            )
          );
      }
      
      // Log específico para ayudantes
      if (userRole === 'helper') {
        console.log(`Consultando órdenes para ayudante ${user.name} (ID: ${user.id}) entre ${startDate} y ${endDate}`);
        // Construir fecha fin para incluir el día completo
        const endDatePlusDay = new Date(endDate);
        endDatePlusDay.setDate(endDatePlusDay.getDate() + 1);
        
        // No construir consulta SQL directa, solo mostrar información básica para depuración
        console.log(`Consultando órdenes entre: 
           Inicio: ${startDate.toISOString()} 
           Fin: ${endDatePlusDay.toISOString()}
           Para ayudante con ID: ${user.id}`);
      }
      
      console.log(`Usuario ${user.id} (${user.name}): ${deliveredOrders.length} órdenes entregadas encontradas`);
      
      if (deliveredOrders.length === 0) {
        // Si no hay órdenes para este usuario en este período, continuar con el siguiente
        console.log(`Sin órdenes para el usuario ${user.id} (${user.name}) en el período seleccionado`);
        continue;
      }
      
      // Obtener los IDs de las órdenes entregadas
      const orderIds = deliveredOrders.map(order => order.id);
      console.log(`IDs de órdenes entregadas para ${user.name}:`, orderIds);
      
      console.log("Buscando productos comisionables para órdenes:", orderIds);
      
      console.log(`Buscando productos comisionables para el usuario ${user.name} con rol ${userRole}`);
      
      // Ejecutar la consulta para productos comisionables
      let orderProductItems: any[] = [];
      
      // Consultas separadas para cada rol
      if (userRole === 'driver') {
        // Si no hay orderIds, devolvemos un array vacío directamente
        if (orderIds.length === 0) {
          orderProductItems = [];
        } else {
          orderProductItems = await db
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
                eq(products.isCommissionable, true),
                sql`COALESCE(${products.driverCommissionValue}, 0) > 0`
              )
            );
        }
      } else {
        // Para ayudantes, mostrar información básica de depuración
        console.log(`Detalles para consulta de productos comisionables para ayudante:`);
        console.log(`  - Número de orderIds: ${orderIds.length}`);
        if (orderIds.length > 0) {
          console.log(`  - Primer orderId: ${orderIds[0]}`);
        } else {
          console.log(`  - No hay orderIds disponibles`);
        }
           
        // Si no hay orderIds, devolvemos un array vacío directamente
        if (orderIds.length === 0) {
          orderProductItems = [];
        } else {
          orderProductItems = await db
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
                eq(products.isCommissionable, true),
                sql`${products.helperCommissionValue} IS NOT NULL`,
                sql`CAST(${products.helperCommissionValue} AS DECIMAL) > 0`
              )
            );
        }
      }
        
      console.log(`Productos comisionables para ${userRole} encontrados:`, orderProductItems.length);
      
      // Mostrar detalles de los productos encontrados para depuración
      if (orderProductItems.length > 0) {
        for (const item of orderProductItems) {
          console.log(`Producto ${item.productId}: ` +
            `driverCommissionValue=${item.product?.driverCommissionValue}, ` +
            `helperCommissionValue=${item.product?.helperCommissionValue}, ` +
            `isCommissionable=${item.product?.isCommissionable}`);
        }
      }
      
      // Si no hay productos comisionables, continuar con el siguiente usuario
      if (orderProductItems.length === 0) {
        console.log(`No se encontraron productos comisionables para ${user.name} con rol ${userRole}`);
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
        if (!commissionValue || parseFloat(commissionValue.toString()) === 0) {
          console.log("Sin valor de comisión válido para producto:", item.productId);
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
        console.log(`No se generaron ítems de comisión para ${user.name} con rol ${userRole}`);
        continue;
      }
      
      console.log(`Usuario ${user.name}: ${commissionItemsData.length} ítems de comisión generados con un total de $${totalCommissionAmount.toFixed(2)}`);
      
      
      // Verificar si ya existe una comisión para este usuario en este período
      // Usar el rol correcto para la base de datos
      // Para búsquedas en la BD, se mantiene el rol "helper" o "driver"
      // sin hacer el mapeo automático a "assistant"
      const searchRoleValue = userRole;
      
      console.log(`Buscando comisión existente para usuario ${user.name} con rol ${searchRoleValue} entre ${startDate} y ${endDate}`);
      
      const [existingCommission] = await db
        .select()
        .from(commissions)
        .where(
          and(
            eq(commissions.userId, user.id),
            eq(commissions.userRole, searchRoleValue),
            sql`${commissions.weekStartDate} = ${startDate}`,
            sql`${commissions.weekEndDate} = ${endDate}`
          )
        );
      
      // Para propósitos de registro y depuración
      const existingRoleValue = userRole;
      
      if (existingCommission) {
        console.log(`Comisión existente encontrada para ${user.name} con rol ${existingRoleValue}`);
        // Si ya existe, no crear una nueva
        generatedCommissions.push(existingCommission);
        continue;
      }
      
      // Crear una nueva comisión
      // Mantener el rol del frontend para comisiones en BD
      const commissionRole = userRole;
      
      const [newCommission] = await db
        .insert(commissions)
        .values({
          userId: user.id,
          userRole: commissionRole, // Guardamos el rol como lo espera la BD
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
    
    // Obtener comisiones para asegurar que se devuelven con todos los datos relacionados
    let generatedCommissionsWithDetails = [];
    
    if (generatedCommissions.length > 0) {
      generatedCommissionsWithDetails = await db.select({
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
      .leftJoin(routes, eq(commissions.routeId, routes.id))
      .where(
        inArray(
          commissions.id, 
          generatedCommissions.map(c => c.id)
        )
      );
    } else {
      console.log("No se generaron comisiones nuevas, devolviendo lista vacía");
    }
    
    res.status(201).json({ 
      message: `Se generaron ${generatedCommissions.length} comisiones correctamente`,
      commissions: generatedCommissionsWithDetails
    });
  } catch (error) {
    console.error('Error al generar comisiones:', error);
    res.status(500).json({ error: 'Error al generar comisiones' });
  }
});

export default router;