import express, { Router, Request, Response } from 'express';
import { db } from '../db';
import { getCurrentCompanyId } from '../company-db';
import { commissions, commissionItems, users, products, orders, routes, orderItems } from '@shared/schema';
import { z } from 'zod';
import { eq, and, between, like, sql, asc, desc, or, inArray } from 'drizzle-orm';
import { format } from 'date-fns';

const router = Router();

// Esquema para generar comisiones diarias
const generateCommissionsSchema = z.object({
  date: z.string(), // formato YYYY-MM-DD para comisión diaria
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

// Obtener comisiones calculadas en tiempo real desde órdenes delivered (por día)
router.get('/', async (req, res) => {
  try {
    // Get company ID from context for multi-tenant security
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
    }
    
    // Parsear parámetros de consulta
    const { userRole, startDate, endDate, userId } = req.query;
    
    // Generar lista de días a consultar (por defecto hoy)
    let dateRangeStart: Date;
    let dateRangeEnd: Date;
    
    if (startDate && endDate) {
      dateRangeStart = new Date(startDate as string);
      dateRangeEnd = new Date(endDate as string);
    } else {
      // Por defecto usar hoy
      const today = new Date();
      dateRangeStart = new Date(today);
      dateRangeStart.setHours(0, 0, 0, 0);
      dateRangeEnd = new Date(today);
      dateRangeEnd.setHours(23, 59, 59, 999);
    }
    
    console.log('Calculando comisiones diarias desde', dateRangeStart, 'hasta', dateRangeEnd);
    
    // Obtener todos los empleados (choferes y ayudantes) filtrados según los parámetros
    // IMPORTANTE: Solo incluir usuarios con hasCommission = true
    const roleFilter = userRole ? (userRole === 'helper' ? 'assistant' : userRole as string) : null;
    
    // Construir condiciones de filtro
    const baseConditions = [
      eq(users.companyId, companyId),
      eq(users.active, true),
      eq(users.hasCommission, true) // Solo usuarios con comisión habilitada
    ];
    
    // Filtrar por rol si se especifica
    if (roleFilter) {
      baseConditions.push(eq(users.role, roleFilter));
    } else {
      // Si no se especifica rol, buscar solo choferes y ayudantes
      baseConditions.push(
        inArray(users.role, ['driver', 'assistant'] as const)
      );
    }
    
    // Filtrar por userId si se especifica
    if (userId) {
      baseConditions.push(eq(users.id, parseInt(userId as string)));
    }
    
    const employeesList = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(and(...baseConditions));
    
    console.log(`Encontrados ${employeesList.length} empleados`);
    
    // Array para almacenar comisiones calculadas por usuario/día
    const calculatedCommissions: any[] = [];
    
    // Generar lista de días en el rango
    const daysToProcess: Date[] = [];
    let currentDate = new Date(dateRangeStart);
    while (currentDate <= dateRangeEnd) {
      daysToProcess.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Para cada empleado, calcular comisiones por día
    for (const employee of employeesList) {
      const employeeRole = employee.role === 'driver' ? 'driver' : 'helper';
      
      // Para cada día en el rango
      for (const targetDate of daysToProcess) {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Buscar órdenes entregadas en este día por este empleado
        // Incluir tanto órdenes de ruta como órdenes asignadas directamente vía salespersonId
        let deliveredOrders;
        
        if (employee.role === 'driver') {
          deliveredOrders = await db
            .select({
              id: orders.id,
              routeId: orders.routeId,
              actualDeliveryTime: orders.actualDeliveryTime,
            })
            .from(orders)
            .leftJoin(routes, eq(orders.routeId, routes.id))
            .where(
              and(
                eq(orders.status, 'delivered'),
                eq(orders.companyId, companyId),
                sql`${orders.actualDeliveryTime} >= ${startOfDay}`,
                sql`${orders.actualDeliveryTime} <= ${endOfDay}`,
                or(
                  // Órdenes de ruta donde es el driver
                  and(
                    eq(routes.companyId, companyId),
                    eq(routes.driverId, employee.id)
                  ),
                  // Órdenes directas donde es el salesperson
                  eq(orders.salespersonId, employee.id)
                )
              )
            );
        } else {
          // Para ayudantes
          deliveredOrders = await db
            .select({
              id: orders.id,
              routeId: orders.routeId,
              actualDeliveryTime: orders.actualDeliveryTime,
            })
            .from(orders)
            .leftJoin(routes, eq(orders.routeId, routes.id))
            .where(
              and(
                eq(orders.status, 'delivered'),
                eq(orders.companyId, companyId),
                sql`${orders.actualDeliveryTime} >= ${startOfDay}`,
                sql`${orders.actualDeliveryTime} <= ${endOfDay}`,
                or(
                  // Órdenes de ruta donde es el assistant
                  and(
                    eq(routes.companyId, companyId),
                    eq(routes.assistantId, employee.id),
                    sql`${routes.assistantId} IS NOT NULL`
                  ),
                  // Órdenes directas donde es el salesperson
                  eq(orders.salespersonId, employee.id)
                )
              )
            );
        }
        
        if (deliveredOrders.length === 0) {
          continue; // Sin órdenes para este empleado en este día
        }
        
        const orderIds = deliveredOrders.map(o => o.id);
        
        // Buscar productos comisionables en esas órdenes
        let commissionableItems;
        
        if (employee.role === 'driver') {
          commissionableItems = await db
            .select({
              productId: orderItems.productId,
              productName: products.name,
              quantity: orderItems.quantity,
              commissionValue: products.driverCommissionValue,
              actualDeliveryTime: orders.actualDeliveryTime,
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .leftJoin(orders, eq(orderItems.orderId, orders.id))
            .where(
              and(
                inArray(orderItems.orderId, orderIds),
                eq(products.companyId, companyId),
                eq(products.isCommissionable, true),
                sql`COALESCE(${products.driverCommissionValue}, 0) > 0`
              )
            );
        } else {
          commissionableItems = await db
            .select({
              productId: orderItems.productId,
              productName: products.name,
              quantity: orderItems.quantity,
              commissionValue: products.helperCommissionValue,
              actualDeliveryTime: orders.actualDeliveryTime,
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .leftJoin(orders, eq(orderItems.orderId, orders.id))
            .where(
              and(
                inArray(orderItems.orderId, orderIds),
                eq(products.companyId, companyId),
                eq(products.isCommissionable, true),
                sql`${products.helperCommissionValue} IS NOT NULL`,
                sql`CAST(${products.helperCommissionValue} AS DECIMAL) > 0`
              )
            );
        }
        
        if (commissionableItems.length === 0) {
          continue; // Sin productos comisionables para este empleado en este día
        }
        
        // Calcular total de comisiones y cantidad de productos
        let totalAmount = 0;
        let productCount = 0;
        
        for (const item of commissionableItems) {
          const commissionValue = parseFloat(item.commissionValue || '0');
          const quantity = item.quantity || 0;
          totalAmount += commissionValue * quantity;
          productCount += quantity;
        }
        
        // Crear registro de comisión calculada para este usuario/día
        calculatedCommissions.push({
          id: null, // No es un registro en BD, es calculado
          userId: employee.id,
          userName: employee.name,
          userRole: employeeRole,
          date: startOfDay.toISOString().split('T')[0], // Formato YYYY-MM-DD
          productCount,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          status: 'calculated', // Estado especial para indicar que es calculado, no generado
          paymentDate: null,
          createdAt: null,
        });
      }
    }
    
    console.log(`Comisiones calculadas: ${calculatedCommissions.length} registros (${employeesList.length} empleados x ${daysToProcess.length} días)`);
    
    res.json(calculatedCommissions);
  } catch (error) {
    console.error('Error al calcular comisiones:', error);
    res.status(500).json({ error: 'Error al calcular comisiones' });
  }
});

// Obtener detalle de una comisión específica
router.get('/:id', async (req, res) => {
  try {
    const commissionId = parseInt(req.params.id);
    
    // Get company ID from context for multi-tenant security
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
    }
    
    // Obtener datos de la comisión (filtrada por compañía)
    const [commission] = await db.select({
      id: commissions.id,
      userId: commissions.userId,
      userName: users.name,
      userRole: commissions.userRole,
      date: commissions.date,
      productCount: commissions.productCount,
      totalAmount: commissions.totalAmount,
      status: commissions.status,
      paymentDate: commissions.paymentDate,
      paymentReference: commissions.paymentReference,
      notes: commissions.notes,
    })
    .from(commissions)
    .leftJoin(users, eq(commissions.userId, users.id))
    .where(and(
      eq(commissions.id, commissionId),
      eq(commissions.companyId, companyId)
    ));
    
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
    
    // Get company ID from context for multi-tenant security
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
    }
    
    // Verificar que la comisión existe (filtrada por compañía)
    const [existingCommission] = await db
      .select()
      .from(commissions)
      .where(and(
        eq(commissions.id, commissionId),
        eq(commissions.companyId, companyId)
      ));
    
    if (!existingCommission) {
      return res.status(404).json({ error: 'Comisión no encontrada' });
    }
    
    // Primero eliminar todos los items relacionados (filtrados por compañía)
    await db
      .delete(commissionItems)
      .where(and(
        eq(commissionItems.commissionId, commissionId),
        eq(commissionItems.companyId, companyId)
      ));
    
    // Luego eliminar la comisión (filtrada por compañía)
    const [deletedCommission] = await db
      .delete(commissions)
      .where(and(
        eq(commissions.id, commissionId),
        eq(commissions.companyId, companyId)
      ))
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
    
    // Get company ID from context for multi-tenant security
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
    }
    
    // Validar los datos de entrada
    const result = updateCommissionStatusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos para actualizar estado',
        details: result.error.format()
      });
    }
    
    const { status, paymentDate, paymentReference, notes } = result.data;
    
    // Verificar que la comisión existe (filtrada por compañía)
    const [existingCommission] = await db
      .select()
      .from(commissions)
      .where(and(
        eq(commissions.id, commissionId),
        eq(commissions.companyId, companyId)
      ));
    
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
    
    // Actualizar la comisión (filtrada por compañía)
    const [updatedCommission] = await db
      .update(commissions)
      .set(updateData)
      .where(and(
        eq(commissions.id, commissionId),
        eq(commissions.companyId, companyId)
      ))
      .returning();
    
    res.json(updatedCommission);
  } catch (error) {
    console.error('Error al actualizar estado de comisión:', error);
    res.status(500).json({ error: 'Error al actualizar estado de comisión' });
  }
});

// Verificar si ya existe una comisión para un rango de fechas
router.post('/check-existing', async (req, res) => {
  try {
    // Get company ID from context for multi-tenant security
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
    }
    
    // Validar los datos de entrada
    const result = generateCommissionsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos para verificar comisiones',
        details: result.error.format()
      });
    }
    
    const { date: commissionDate, userId, userRole } = result.data;
    
    // Convertir fecha a objeto Date
    const targetDate = new Date(commissionDate);

    // Construir la consulta para buscar comisiones existentes (filtradas por compañía)
    const conditions = [
      eq(commissions.companyId, companyId),
      eq(commissions.userRole, userRole),
      sql`DATE(${commissions.date}) = DATE(${targetDate})`
    ];
    
    // Filtrar por userId si se proporciona
    if (userId) {
      conditions.push(eq(commissions.userId, userId));
    }
    
    let query = db.select({
      id: commissions.id,
      status: commissions.status,
      date: commissions.date,
      userRole: commissions.userRole,
      userName: users.name,
      totalAmount: commissions.totalAmount,
      paymentDate: commissions.paymentDate
    })
    .from(commissions)
    .leftJoin(users, eq(commissions.userId, users.id))
    .where(and(...conditions));
    
    const existingCommissions = await query;
    
    if (existingCommissions.length > 0) {
      // Hay comisiones existentes, devolver información sobre ellas
      return res.status(200).json({ 
        exists: true, 
        commissions: existingCommissions,
        message: existingCommissions[0].status === 'paid' 
          ? `Ya existe una comisión pagada para esta fecha (${format(targetDate, 'dd/MM/yyyy')}).`
          : `Ya existe una comisión pendiente para esta fecha (${format(targetDate, 'dd/MM/yyyy')}).`
      });
    } else {
      // No hay comisiones existentes
      return res.status(200).json({ 
        exists: false, 
        message: "No existen comisiones para esta fecha. Puede generar nuevas comisiones."
      });
    }
  } catch (error) {
    console.error('Error al verificar comisiones existentes:', error);
    return res.status(500).json({ error: 'Error al verificar comisiones existentes' });
  }
});

// Generar comisiones para un período
router.post('/generate', async (req, res) => {
  try {
    // Get company ID from context for multi-tenant security
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(403).json({ error: 'No se pudo determinar el contexto de la empresa' });
    }
    
    // Validar los datos de entrada
    const result = generateCommissionsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos para generar comisiones',
        details: result.error.format()
      });
    }
    
    const { date: commissionDate, userId, userRole } = result.data;
    
    // Convertir fecha a objeto Date (inicio y fin del día)
    const targetDate = new Date(commissionDate);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Construir la consulta para obtener usuarios según los filtros (filtrados por compañía)
    // Mapear 'helper' a 'assistant' para la consulta en BD
    const dbRole = userRole === 'helper' ? 'assistant' : userRole;
    console.log(`Rol para consulta en BD: "${dbRole}" para compañía ${companyId}`);
    
    // Consulta para obtener usuarios con hasCommission = true
    const usersConditions = [
      eq(users.role, dbRole),
      eq(users.companyId, companyId),
      eq(users.hasCommission, true) // Solo usuarios con comisión habilitada
    ];
    
    // Filtrar por ID de usuario si se proporciona
    if (userId) {
      console.log(`Buscando específicamente usuario con ID: ${userId}`);
      usersConditions.push(eq(users.id, userId));
    }
    
    const usersQuery = db
      .select()
      .from(users)
      .where(and(...usersConditions));
    
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
      // Incluir tanto órdenes de ruta como órdenes asignadas directamente vía salespersonId
      let deliveredOrders;
      
      // Consulta personalizada según el rol del usuario (filtrada por compañía)
      if (userRole === 'driver') {
        // Para conductores, buscar órdenes donde son conductores (ruta o salesperson)
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
              eq(orders.companyId, companyId),
              // Ajustamos el rango para incluir todo el día de la fecha final
              sql`${orders.actualDeliveryTime} >= ${startOfDay} AND ${orders.actualDeliveryTime} <= ${endOfDay}`,
              or(
                // Órdenes de ruta donde es el driver
                and(
                  eq(routes.companyId, companyId),
                  eq(routes.driverId, user.id)
                ),
                // Órdenes directas donde es el salesperson
                eq(orders.salespersonId, user.id)
              )
            )
          );
      } else {
        // Para ayudantes, buscar órdenes donde son ayudantes (ruta o salesperson)
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
              eq(orders.companyId, companyId),
              // Ajustamos el rango para incluir todo el día de la fecha final
              sql`${orders.actualDeliveryTime} >= ${startOfDay} AND ${orders.actualDeliveryTime} <= ${endOfDay}`,
              or(
                // Órdenes de ruta donde es el assistant
                and(
                  eq(routes.companyId, companyId),
                  eq(routes.assistantId, user.id),
                  sql`${routes.assistantId} IS NOT NULL`
                ),
                // Órdenes directas donde es el salesperson
                eq(orders.salespersonId, user.id)
              )
            )
          );
      }
      
      // Log específico para ayudantes
      if (userRole === 'helper') {
        console.log(`Consultando órdenes para ayudante ${user.name} (ID: ${user.id}) para fecha ${commissionDate}`);
        
        // No construir consulta SQL directa, solo mostrar información básica para depuración
        console.log(`Consultando órdenes para: 
           Fecha: ${targetDate.toISOString()} 
           Inicio del día: ${startOfDay.toISOString()} 
           Fin del día: ${endOfDay.toISOString()}
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
      
      // Consultas separadas para cada rol (filtradas por compañía)
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
                eq(products.companyId, companyId),
                eq(orders.companyId, companyId),
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
                eq(products.companyId, companyId),
                eq(orders.companyId, companyId),
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
      
      console.log(`Buscando comisión existente para usuario ${user.name} con rol ${searchRoleValue} para fecha ${commissionDate}`);
      
      const [existingCommission] = await db
        .select()
        .from(commissions)
        .where(
          and(
            eq(commissions.userId, user.id),
            eq(commissions.userRole, searchRoleValue),
            eq(commissions.companyId, companyId),
            sql`DATE(${commissions.date}) = DATE(${targetDate})`
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
      
      // Crear una nueva comisión diaria (con companyId para multi-tenant security)
      // Mantener el rol del frontend para comisiones en BD
      const commissionRole = userRole;
      
      const [newCommission] = await db
        .insert(commissions)
        .values({
          userId: user.id,
          userRole: commissionRole, // Guardamos el rol como lo espera la BD
          companyId: companyId,
          date: targetDate, // Fecha de la comisión diaria
          productCount: commissionItemsData.length,
          totalAmount: totalCommissionAmount.toFixed(2),
          status: 'pending',
          createdAt: new Date(),
        })
        .returning();
      
      // Agregar ítems de comisión (con companyId)
      for (const itemData of commissionItemsData) {
        await db
          .insert(commissionItems)
          .values({
            ...itemData,
            commissionId: newCommission.id,
            companyId: companyId,
          });
      }
      
      generatedCommissions.push(newCommission);
    }
    
    // Obtener comisiones para asegurar que se devuelven con todos los datos relacionados (filtradas por compañía)
    let generatedCommissionsWithDetails: any[] = [];
    
    if (generatedCommissions.length > 0) {
      generatedCommissionsWithDetails = await db.select({
        id: commissions.id,
        userId: commissions.userId,
        userName: users.name,
        userRole: commissions.userRole,
        date: commissions.date,
        productCount: commissions.productCount,
        totalAmount: commissions.totalAmount,
        status: commissions.status,
        paymentDate: commissions.paymentDate,
        createdAt: commissions.createdAt,
      })
      .from(commissions)
      .leftJoin(users, eq(commissions.userId, users.id))
      .where(
        and(
          inArray(
            commissions.id, 
            generatedCommissions.map(c => c.id)
          ),
          eq(commissions.companyId, companyId)
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