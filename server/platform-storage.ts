import { eq, and, sql, desc, gte, lte, inArray } from "drizzle-orm";
import { platformDb, platformPool } from "./platform-db";
import {
  companies,
  plans,
  membershipInvoices,
  userCompanies,
  companySettings,
  companyStatusHistory,
  platformNotifications,
  platformMetrics,
  Company,
  InsertCompany,
  Plan,
  InsertPlan,
  MembershipInvoice,
  InsertMembershipInvoice,
  UserCompany,
  InsertUserCompany,
  CompanySettings,
  InsertCompanySettings,
  CompanyStatusHistory,
  InsertCompanyStatusHistory,
  PlatformNotification,
  InsertPlatformNotification,
  PlatformMetrics,
  InsertPlatformMetrics,
  CompanyStatus,
} from "../shared/platform-schema";
import {
  platformUsers,
  PlatformUser,
  InsertPlatformUser,
} from "../shared/platform-users-schema";

// Interfaz para el almacenamiento de la plataforma
export interface IPlatformStorage {
  // Gestión de empresas
  createCompany(data: InsertCompany): Promise<Company>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyBySubdomain(subdomain: string): Promise<Company | undefined>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;
  listCompanies(): Promise<Company[]>;
  
  // Gestión de planes
  createPlan(data: InsertPlan): Promise<Plan>;
  getPlan(id: number): Promise<Plan | undefined>;
  updatePlan(id: number, data: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: number): Promise<void>;
  listPlans(): Promise<Plan[]>;
  
  // Gestión de facturas de membresía
  createMembershipInvoice(data: InsertMembershipInvoice): Promise<MembershipInvoice>;
  getMembershipInvoice(id: number): Promise<MembershipInvoice | undefined>;
  updateMembershipInvoice(id: number, data: Partial<InsertMembershipInvoice>): Promise<MembershipInvoice>;
  deleteMembershipInvoice(id: number): Promise<void>;
  listMembershipInvoices(companyId?: number): Promise<MembershipInvoice[]>;
  
  // Gestión de usuarios de plataforma
  createPlatformUser(data: InsertPlatformUser): Promise<PlatformUser>;
  getPlatformUser(id: number): Promise<PlatformUser | undefined>;
  getPlatformUserByEmail(email: string): Promise<PlatformUser | undefined>;
  updatePlatformUser(id: number, data: Partial<InsertPlatformUser>): Promise<PlatformUser>;
  deletePlatformUser(id: number): Promise<void>;
  listPlatformUsers(role?: string, companyId?: number): Promise<PlatformUser[]>;
  
  // Configuraciones de empresa
  createCompanySettings(data: InsertCompanySettings): Promise<CompanySettings>;
  getCompanySettings(companyId: number): Promise<CompanySettings | undefined>;
  updateCompanySettings(companyId: number, data: Partial<InsertCompanySettings>): Promise<CompanySettings>;
  
  // Gestión de usuarios por empresa
  assignUserToCompany(userId: number, companyId: number): Promise<void>;
  removeUserFromCompany(userId: number, companyId: number): Promise<void>;
  getUsersByCompany(companyId: number): Promise<number[]>;
  
  // Gestión de historial de estados
  createStatusHistory(data: InsertCompanyStatusHistory): Promise<CompanyStatusHistory>;
  getStatusHistoryByCompany(companyId: number): Promise<CompanyStatusHistory[]>;
  
  // Gestión de notificaciones
  createNotification(data: InsertPlatformNotification): Promise<PlatformNotification>;
  getNotification(id: number): Promise<PlatformNotification | undefined>;
  updateNotification(id: number, data: Partial<InsertPlatformNotification>): Promise<PlatformNotification>;
  listNotificationsByCompany(companyId: number): Promise<PlatformNotification[]>;
  listPendingNotifications(): Promise<PlatformNotification[]>;
  
  // Gestión de métricas
  createMetrics(data: InsertPlatformMetrics): Promise<PlatformMetrics>;
  getLatestMetrics(): Promise<PlatformMetrics | undefined>;
  getMetricsByDateRange(startDate: Date, endDate: Date): Promise<PlatformMetrics[]>;
  
  // Métodos de suspensión
  suspendCompany(companyId: number, reason: string, changedBy?: number): Promise<Company>;
  reactivateCompany(companyId: number, changedBy?: number): Promise<Company>;
  getCompaniesNearExpiration(daysAhead: number): Promise<Company[]>;
  getOverdueCompanies(): Promise<Company[]>;
  getSuspendedCompanies(): Promise<Company[]>;
  
  // Métricas calculadas
  calculatePlatformMetrics(): Promise<PlatformMetrics>;
}

export class PlatformStorage implements IPlatformStorage {
  // Implementación de empresas
  async createCompany(data: InsertCompany): Promise<Company> {
    // Preparar datos para inserción
    const companyData: any = {
      name: data.name,
      subdomain: data.subdomain,
      logo: data.logo,
      active: data.active ?? true,
      status: data.status || "active",
      planId: data.planId,
      expirationDate: new Date(data.expirationDate),
    };
    
    // Campos opcionales de suspensión y membresía
    if (data.suspendedAt) companyData.suspendedAt = new Date(data.suspendedAt);
    if (data.suspensionReason) companyData.suspensionReason = data.suspensionReason;
    if (data.gracePeriodEnds) companyData.gracePeriodEnds = new Date(data.gracePeriodEnds);
    if (data.trialEndsAt) companyData.trialEndsAt = new Date(data.trialEndsAt);
    if (data.lastPaymentDate) companyData.lastPaymentDate = new Date(data.lastPaymentDate);
    
    const [created] = await platformDb.insert(companies).values(companyData).returning();
    return created;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const results = await platformDb.select().from(companies).where(eq(companies.id, id));
    return results[0];
  }

  async getCompanyBySubdomain(subdomain: string): Promise<Company | undefined> {
    const results = await platformDb.select().from(companies).where(eq(companies.subdomain, subdomain));
    return results[0];
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
    // Preparar los datos para actualizar
    const updateData: any = { ...data };
    
    // Convertir expirationDate a Date si está presente
    if (updateData.expirationDate) {
      updateData.expirationDate = new Date(updateData.expirationDate);
    }
    
    const [updated] = await platformDb
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async deleteCompany(id: number): Promise<void> {
    await platformDb.delete(companies).where(eq(companies.id, id));
  }

  async listCompanies(): Promise<Company[]> {
    console.log("Ejecutando listCompanies en PlatformStorage");
    try {
      const results = await platformDb.select().from(companies).orderBy(companies.name);
      console.log("Empresas encontradas:", results);
      return results;
    } catch (error) {
      console.error("Error al listar empresas en PlatformStorage:", error);
      throw error;
    }
  }

  // Implementación de planes
  async createPlan(data: InsertPlan): Promise<Plan> {
    // Preparar datos para inserción
    const planData: any = {
      name: data.name,
      price: data.price.toString(),
      description: data.description,
      maxUsers: data.maxUsers,
      maxTrucks: data.maxTrucks,
      features: data.features,
      isActive: data.isActive ?? true,
      billingCycle: data.billingCycle || "monthly",
      trialDays: data.trialDays || 0,
      quarterlyDiscount: data.quarterlyDiscount?.toString() || "0",
      yearlyDiscount: data.yearlyDiscount?.toString() || "0",
      gracePeriodDays: data.gracePeriodDays || 7,
    };
    
    const [created] = await platformDb.insert(plans).values(planData).returning();
    return created;
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const results = await platformDb.select().from(plans).where(eq(plans.id, id));
    return results[0];
  }

  async updatePlan(id: number, data: Partial<InsertPlan>): Promise<Plan> {
    const updateData: any = { ...data };
    
    // Convertir valores decimales a string para la base de datos
    if (updateData.price !== undefined) {
      updateData.price = updateData.price.toString();
    }
    if (updateData.quarterlyDiscount !== undefined) {
      updateData.quarterlyDiscount = updateData.quarterlyDiscount.toString();
    }
    if (updateData.yearlyDiscount !== undefined) {
      updateData.yearlyDiscount = updateData.yearlyDiscount.toString();
    }
    
    const [updated] = await platformDb
      .update(plans)
      .set(updateData)
      .where(eq(plans.id, id))
      .returning();
    return updated;
  }

  async deletePlan(id: number): Promise<void> {
    await platformDb.delete(plans).where(eq(plans.id, id));
  }

  async listPlans(): Promise<Plan[]> {
    console.log("Ejecutando listPlans en PlatformStorage");
    try {
      const results = await platformDb.select().from(plans).orderBy(plans.price);
      console.log("Planes encontrados:", results);
      return results;
    } catch (error) {
      console.error("Error al listar planes en PlatformStorage:", error);
      throw error;
    }
  }

  // Implementación de facturas de membresía
  async createMembershipInvoice(data: InsertMembershipInvoice): Promise<MembershipInvoice> {
    // Convertir datos necesarios
    const invoiceData = {
      ...data,
      amount: data.amount.toString(),
      dueDate: new Date(data.dueDate)
    };
    
    const [created] = await platformDb.insert(membershipInvoices).values(invoiceData).returning();
    return created;
  }

  async getMembershipInvoice(id: number): Promise<MembershipInvoice | undefined> {
    const results = await platformDb.select().from(membershipInvoices).where(eq(membershipInvoices.id, id));
    return results[0];
  }

  async updateMembershipInvoice(id: number, data: Partial<InsertMembershipInvoice>): Promise<MembershipInvoice> {
    // Preparar los datos para actualizar
    const updateData: any = { ...data };
    
    // Convertir amount a string si está presente
    if (updateData.amount !== undefined) {
      updateData.amount = updateData.amount.toString();
    }
    
    // Convertir dueDate a Date si está presente
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    
    const [updated] = await platformDb
      .update(membershipInvoices)
      .set(updateData)
      .where(eq(membershipInvoices.id, id))
      .returning();
    return updated;
  }

  async deleteMembershipInvoice(id: number): Promise<void> {
    await platformDb.delete(membershipInvoices).where(eq(membershipInvoices.id, id));
  }

  async listMembershipInvoices(companyId?: number): Promise<MembershipInvoice[]> {
    if (companyId) {
      return await platformDb
        .select()
        .from(membershipInvoices)
        .where(eq(membershipInvoices.companyId, companyId))
        .orderBy(membershipInvoices.invoiceDate);
    }
    return await platformDb.select().from(membershipInvoices).orderBy(membershipInvoices.invoiceDate);
  }

  // Implementación de usuarios de plataforma
  async createPlatformUser(data: InsertPlatformUser): Promise<PlatformUser> {
    const [created] = await platformDb.insert(platformUsers).values(data).returning();
    return created;
  }

  async getPlatformUser(id: number): Promise<PlatformUser | undefined> {
    const results = await platformDb.select().from(platformUsers).where(eq(platformUsers.id, id));
    return results[0];
  }

  async getPlatformUserByEmail(email: string): Promise<PlatformUser | undefined> {
    const results = await platformDb.select().from(platformUsers).where(eq(platformUsers.email, email));
    return results[0];
  }

  async updatePlatformUser(id: number, data: Partial<InsertPlatformUser>): Promise<PlatformUser> {
    const [updated] = await platformDb
      .update(platformUsers)
      .set(data)
      .where(eq(platformUsers.id, id))
      .returning();
    return updated;
  }

  async deletePlatformUser(id: number): Promise<void> {
    await platformDb.delete(platformUsers).where(eq(platformUsers.id, id));
  }

  async listPlatformUsers(role?: string, companyId?: number): Promise<PlatformUser[]> {
    try {
      // Usamos el enfoque básico sin filtros
      if (!role && companyId === undefined) {
        return await platformDb.select().from(platformUsers).orderBy(platformUsers.name);
      }
      
      // Para filtros, usamos SQL directo con el pool
      let sqlQuery = `SELECT * FROM platform_users`;
      const params: any[] = [];
      let paramIndex = 1;
      let whereClauseAdded = false;
      
      // Construir la cláusula WHERE según los filtros proporcionados
      if (role) {
        sqlQuery += ` WHERE role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
        whereClauseAdded = true;
      }
      
      if (companyId !== undefined) {
        if (whereClauseAdded) {
          sqlQuery += ` AND company_id = $${paramIndex}`;
        } else {
          sqlQuery += ` WHERE company_id = $${paramIndex}`;
        }
        params.push(companyId);
        paramIndex++;
      }
      
      // Ordenar por nombre
      sqlQuery += ` ORDER BY name`;
      
      // Ejecutar query nativo usando el pool directamente
      const { rows } = await platformPool.query(sqlQuery, params);
      
      // Convertir filas a PlatformUser[] (TypeScript)
      return rows as PlatformUser[];
    } catch (error) {
      console.error("Error al listar usuarios de plataforma:", error);
      return [];
    }
  }

  // Implementación de configuraciones de empresa
  async createCompanySettings(data: InsertCompanySettings): Promise<CompanySettings> {
    try {
      // Insertar en la base de datos usando el esquema actualizado
      const [result] = await platformDb
        .insert(companySettings)
        .values({
          companyId: data.companyId,
          settings: data.settings,
          theme: data.theme,
          currency: data.currency,
          timezone: data.timezone,
          language: data.language,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          address: data.address,
          logoUrl: data.logoUrl
        })
        .returning();
      
      return result;
    } catch (error) {
      console.error("Error al crear configuración de empresa:", error);
      throw new Error("No se pudo crear la configuración de empresa");
    }
  }

  async getCompanySettings(companyId: number): Promise<CompanySettings | undefined> {
    const results = await platformDb
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, companyId));
    return results[0];
  }

  async updateCompanySettings(companyId: number, data: Partial<InsertCompanySettings>): Promise<CompanySettings> {
    // Preparar los datos para actualizar
    const updateData: any = { ...data };
    
    // Convertir tax a string si está presente
    if (updateData.tax !== undefined) {
      updateData.tax = updateData.tax.toString();
    }
    
    const [updated] = await platformDb
      .update(companySettings)
      .set(updateData)
      .where(eq(companySettings.companyId, companyId))
      .returning();
    return updated;
  }

  // Implementación de relación usuario-empresa
  async assignUserToCompany(userId: number, companyId: number): Promise<void> {
    await platformDb.insert(userCompanies).values({ 
      userId, 
      companyId,
      role: "standard" 
    });
  }

  async removeUserFromCompany(userId: number, companyId: number): Promise<void> {
    await platformDb
      .delete(userCompanies)
      .where(
        and(
          eq(userCompanies.userId, userId),
          eq(userCompanies.companyId, companyId)
        )
      );
  }

  async getUsersByCompany(companyId: number): Promise<number[]> {
    const results = await platformDb
      .select({ userId: userCompanies.userId })
      .from(userCompanies)
      .where(eq(userCompanies.companyId, companyId));
    
    return results.map((r: { userId: number }) => r.userId);
  }

  // =============================================
  // HISTORIAL DE ESTADOS DE EMPRESA
  // =============================================
  
  async createStatusHistory(data: InsertCompanyStatusHistory): Promise<CompanyStatusHistory> {
    const historyData: any = {
      companyId: data.companyId,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      reason: data.reason,
      changedBy: data.changedBy,
      metadata: data.metadata,
    };
    
    const [created] = await platformDb.insert(companyStatusHistory).values(historyData).returning();
    return created;
  }

  async getStatusHistoryByCompany(companyId: number): Promise<CompanyStatusHistory[]> {
    return await platformDb
      .select()
      .from(companyStatusHistory)
      .where(eq(companyStatusHistory.companyId, companyId))
      .orderBy(desc(companyStatusHistory.changedAt));
  }

  // =============================================
  // NOTIFICACIONES DE PLATAFORMA
  // =============================================
  
  async createNotification(data: InsertPlatformNotification): Promise<PlatformNotification> {
    const notifData: any = {
      companyId: data.companyId,
      type: data.type,
      title: data.title,
      message: data.message,
      status: data.status || "pending",
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      metadata: data.metadata,
    };
    
    const [created] = await platformDb.insert(platformNotifications).values(notifData).returning();
    return created;
  }

  async getNotification(id: number): Promise<PlatformNotification | undefined> {
    const results = await platformDb.select().from(platformNotifications).where(eq(platformNotifications.id, id));
    return results[0];
  }

  async updateNotification(id: number, data: Partial<InsertPlatformNotification>): Promise<PlatformNotification> {
    const updateData: any = { ...data };
    
    if (updateData.scheduledFor) {
      updateData.scheduledFor = new Date(updateData.scheduledFor);
    }
    
    const [updated] = await platformDb
      .update(platformNotifications)
      .set(updateData)
      .where(eq(platformNotifications.id, id))
      .returning();
    return updated;
  }

  async listNotificationsByCompany(companyId: number): Promise<PlatformNotification[]> {
    return await platformDb
      .select()
      .from(platformNotifications)
      .where(eq(platformNotifications.companyId, companyId))
      .orderBy(desc(platformNotifications.createdAt));
  }

  async listPendingNotifications(): Promise<PlatformNotification[]> {
    return await platformDb
      .select()
      .from(platformNotifications)
      .where(eq(platformNotifications.status, "pending"))
      .orderBy(platformNotifications.scheduledFor);
  }

  // =============================================
  // MÉTRICAS DE PLATAFORMA
  // =============================================
  
  async createMetrics(data: InsertPlatformMetrics): Promise<PlatformMetrics> {
    const metricsData: any = {
      metricDate: new Date(data.metricDate),
      mrr: data.mrr?.toString() || "0",
      totalCompanies: data.totalCompanies || 0,
      activeCompanies: data.activeCompanies || 0,
      trialCompanies: data.trialCompanies || 0,
      suspendedCompanies: data.suspendedCompanies || 0,
      cancelledCompanies: data.cancelledCompanies || 0,
      totalRevenue: data.totalRevenue?.toString() || "0",
      pendingInvoices: data.pendingInvoices || 0,
      overdueInvoices: data.overdueInvoices || 0,
      overdueAmount: data.overdueAmount?.toString() || "0",
      newCompaniesThisMonth: data.newCompaniesThisMonth || 0,
      churnedCompaniesThisMonth: data.churnedCompaniesThisMonth || 0,
    };
    
    const [created] = await platformDb.insert(platformMetrics).values(metricsData).returning();
    return created;
  }

  async getLatestMetrics(): Promise<PlatformMetrics | undefined> {
    const results = await platformDb
      .select()
      .from(platformMetrics)
      .orderBy(desc(platformMetrics.metricDate))
      .limit(1);
    return results[0];
  }

  async getMetricsByDateRange(startDate: Date, endDate: Date): Promise<PlatformMetrics[]> {
    return await platformDb
      .select()
      .from(platformMetrics)
      .where(and(
        gte(platformMetrics.metricDate, startDate),
        lte(platformMetrics.metricDate, endDate)
      ))
      .orderBy(platformMetrics.metricDate);
  }

  // =============================================
  // MÉTODOS DE SUSPENSIÓN
  // =============================================
  
  // Transiciones de estado válidas
  private validStatusTransitions: Record<CompanyStatus, CompanyStatus[]> = {
    'active': ['suspended', 'grace_period', 'cancelled'],
    'trial': ['active', 'suspended', 'cancelled'],
    'grace_period': ['active', 'suspended', 'cancelled'],
    'suspended': ['active', 'cancelled'],
    'cancelled': ['active', 'trial'],
  };
  
  private isValidTransition(from: CompanyStatus, to: CompanyStatus): boolean {
    const allowedTransitions = this.validStatusTransitions[from] || [];
    return allowedTransitions.includes(to);
  }
  
  async suspendCompany(companyId: number, reason: string, changedBy?: number): Promise<Company> {
    // Obtener la empresa actual
    const company = await this.getCompany(companyId);
    if (!company) {
      throw new Error("Empresa no encontrada");
    }
    
    const previousStatus = (company.status as CompanyStatus) || "active";
    
    // Validar transición de estado
    if (previousStatus === "suspended") {
      throw new Error("La empresa ya está suspendida");
    }
    
    if (!this.isValidTransition(previousStatus, "suspended")) {
      throw new Error(`No se puede suspender una empresa con estado '${previousStatus}'`);
    }
    
    const now = new Date();
    
    // Ejecutar todas las operaciones en una transacción atómica
    const result = await platformDb.transaction(async (tx) => {
      // 1. Actualizar la empresa
      const [updated] = await tx
        .update(companies)
        .set({
          status: "suspended",
          active: false,
          suspendedAt: now,
          suspensionReason: reason,
        })
        .where(eq(companies.id, companyId))
        .returning();
      
      // 2. Registrar en historial
      await tx.insert(companyStatusHistory).values({
        companyId,
        previousStatus,
        newStatus: "suspended",
        reason,
        changedBy,
        metadata: JSON.stringify({ suspendedAt: now.toISOString() }),
        createdAt: now,
      });
      
      // 3. Crear notificación
      await tx.insert(platformNotifications).values({
        companyId,
        type: "company_suspended",
        title: "Cuenta Suspendida",
        message: `Su cuenta ha sido suspendida. Razón: ${reason}`,
        status: "pending",
        createdAt: now,
      });
      
      return updated;
    });
    
    // Limpiar caché de suspensión (fuera de la transacción)
    try {
      const { clearCompanySuspensionCache } = await import('./middleware/consolidated-company.middleware');
      clearCompanySuspensionCache(companyId);
    } catch (e) {
      console.log('[Platform Storage] No se pudo limpiar caché de suspensión');
    }
    
    return result;
  }

  async reactivateCompany(companyId: number, changedBy?: number): Promise<Company> {
    const company = await this.getCompany(companyId);
    if (!company) {
      throw new Error("Empresa no encontrada");
    }
    
    const previousStatus = (company.status as CompanyStatus) || "suspended";
    
    // Validar transición de estado
    if (previousStatus === "active") {
      throw new Error("La empresa ya está activa");
    }
    
    if (!this.isValidTransition(previousStatus, "active")) {
      throw new Error(`No se puede reactivar una empresa con estado '${previousStatus}'`);
    }
    
    const now = new Date();
    
    // Ejecutar todas las operaciones en una transacción atómica
    const result = await platformDb.transaction(async (tx) => {
      // 1. Actualizar la empresa
      const [updated] = await tx
        .update(companies)
        .set({
          status: "active",
          active: true,
          suspendedAt: null,
          suspensionReason: null,
          gracePeriodEnds: null,
          lastPaymentDate: now,
        })
        .where(eq(companies.id, companyId))
        .returning();
      
      // 2. Registrar en historial
      await tx.insert(companyStatusHistory).values({
        companyId,
        previousStatus,
        newStatus: "active",
        reason: "Cuenta reactivada",
        changedBy,
        metadata: JSON.stringify({ reactivatedAt: now.toISOString() }),
        createdAt: now,
      });
      
      // 3. Crear notificación
      await tx.insert(platformNotifications).values({
        companyId,
        type: "company_reactivated",
        title: "Cuenta Reactivada",
        message: "Su cuenta ha sido reactivada exitosamente.",
        status: "pending",
        createdAt: now,
      });
      
      return updated;
    });
    
    // Limpiar caché de suspensión (fuera de la transacción)
    try {
      const { clearCompanySuspensionCache } = await import('./middleware/consolidated-company.middleware');
      clearCompanySuspensionCache(companyId);
    } catch (e) {
      console.log('[Platform Storage] No se pudo limpiar caché de suspensión');
    }
    
    return result;
  }

  async getCompaniesNearExpiration(daysAhead: number): Promise<Company[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    return await platformDb
      .select()
      .from(companies)
      .where(and(
        eq(companies.status, "active"),
        lte(companies.expirationDate, futureDate),
        gte(companies.expirationDate, now)
      ))
      .orderBy(companies.expirationDate);
  }

  async getOverdueCompanies(): Promise<Company[]> {
    const now = new Date();
    
    return await platformDb
      .select()
      .from(companies)
      .where(and(
        eq(companies.status, "active"),
        lte(companies.expirationDate, now)
      ))
      .orderBy(companies.expirationDate);
  }

  async getSuspendedCompanies(): Promise<Company[]> {
    return await platformDb
      .select()
      .from(companies)
      .where(eq(companies.status, "suspended"))
      .orderBy(companies.suspendedAt);
  }

  // =============================================
  // MÉTRICAS CALCULADAS
  // =============================================
  
  async calculatePlatformMetrics(): Promise<PlatformMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Contar empresas por estado
    const companyCounts = await platformPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'trial') as trial,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE created_at >= $1) as new_this_month
      FROM companies
    `, [startOfMonth]);
    
    // Calcular ingresos desde facturas y pagos reales
    const revenueCounts = await platformPool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_invoices_amount,
        COUNT(*) FILTER (WHERE status IN ('pending', 'partial') AND due_date >= NOW()) as pending_invoices,
        COUNT(*) FILTER (WHERE status IN ('pending', 'partial') AND due_date < NOW()) as overdue_invoices,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'partial') AND due_date < NOW() THEN amount ELSE 0 END), 0) as overdue_amount
      FROM membership_invoices
    `);

    // Ingresos totales reales desde pagos confirmados
    const paymentsResult = await platformPool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_payments
      FROM platform_payments
      WHERE status = 'confirmed'
    `);
    
    // Calcular MRR basado en empresas activas y sus planes
    const mrrResult = await platformPool.query(`
      SELECT COALESCE(SUM(p.price), 0) as mrr
      FROM companies c
      JOIN plans p ON c.plan_id = p.id
      WHERE c.status = 'active'
    `);
    
    const counts = companyCounts.rows[0];
    const revenue = revenueCounts.rows[0];
    const payments = paymentsResult.rows[0];
    const mrr = mrrResult.rows[0];

    const paymentsTotal = parseFloat(payments.total_payments || "0");
    const paidInvoicesTotal = parseFloat(revenue.paid_invoices_amount || "0");
    const totalRevenue = paymentsTotal > 0 ? paymentsTotal : paidInvoicesTotal;
    
    // Crear y guardar las métricas
    return await this.createMetrics({
      metricDate: now.toISOString(),
      mrr: parseFloat(mrr.mrr || "0"),
      totalCompanies: parseInt(counts.total || "0"),
      activeCompanies: parseInt(counts.active || "0"),
      trialCompanies: parseInt(counts.trial || "0"),
      suspendedCompanies: parseInt(counts.suspended || "0"),
      cancelledCompanies: parseInt(counts.cancelled || "0"),
      totalRevenue: totalRevenue,
      pendingInvoices: parseInt(revenue.pending_invoices || "0"),
      overdueInvoices: parseInt(revenue.overdue_invoices || "0"),
      overdueAmount: parseFloat(revenue.overdue_amount || "0"),
      newCompaniesThisMonth: parseInt(counts.new_this_month || "0"),
      churnedCompaniesThisMonth: 0,
    });
  }

  // =============================================
  // SISTEMA DE RECORDATORIOS AUTOMÁTICOS
  // =============================================

  async generateExpirationReminders(): Promise<{ created: number; companies: number[] }> {
    const now = new Date();
    const reminderDays = [7, 3, 1]; // Días antes del vencimiento para enviar recordatorio
    const createdNotifications: number[] = [];
    const affectedCompanies: number[] = [];

    for (const daysAhead of reminderDays) {
      // Calcular la fecha exacta de vencimiento que corresponde a este recordatorio
      const targetDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Buscar empresas que vencen ese día específico
      const companiesExpiring = await platformDb
        .select()
        .from(companies)
        .where(and(
          eq(companies.status, "active"),
          gte(companies.expirationDate, startOfDay),
          lte(companies.expirationDate, endOfDay)
        ));

      for (const company of companiesExpiring) {
        // Verificar si ya existe una notificación similar pendiente
        const existingNotif = await platformDb
          .select()
          .from(platformNotifications)
          .where(and(
            eq(platformNotifications.companyId, company.id),
            eq(platformNotifications.type, "payment_reminder"),
            eq(platformNotifications.status, "pending")
          ))
          .limit(1);

        if (existingNotif.length === 0) {
          const [notification] = await platformDb
            .insert(platformNotifications)
            .values({
              companyId: company.id,
              type: "payment_reminder",
              title: `Recordatorio: Su membresía vence en ${daysAhead} día(s)`,
              message: `La membresía de ${company.name} vencerá el ${company.expirationDate?.toLocaleDateString('es-ES')}. Por favor, realice el pago para evitar la suspensión del servicio.`,
              status: "pending",
              scheduledFor: now,
              createdAt: now,
            })
            .returning();

          createdNotifications.push(notification.id);
          if (!affectedCompanies.includes(company.id)) {
            affectedCompanies.push(company.id);
          }
        }
      }
    }

    return { created: createdNotifications.length, companies: affectedCompanies };
  }

  async processOverdueCompanies(gracePeriodDays: number = 7): Promise<{ suspended: number; warned: number }> {
    const now = new Date();
    let suspendedCount = 0;
    let warnedCount = 0;

    // Obtener empresas con pagos vencidos
    const overdueCompanies = await this.getOverdueCompanies();

    for (const company of overdueCompanies) {
      if (!company.expirationDate) continue;

      const daysPastDue = Math.floor((now.getTime() - company.expirationDate.getTime()) / (24 * 60 * 60 * 1000));

      if (daysPastDue >= gracePeriodDays) {
        // Si ya pasó el período de gracia, suspender
        try {
          await this.suspendCompany(
            company.id,
            `Suspensión automática: ${daysPastDue} días de mora`,
            "Sistema Automático"
          );
          suspendedCount++;
        } catch (e) {
          console.error(`Error suspendiendo empresa ${company.id}:`, e);
        }
      } else {
        // Si está en período de gracia, enviar advertencia
        const existingWarning = await platformDb
          .select()
          .from(platformNotifications)
          .where(and(
            eq(platformNotifications.companyId, company.id),
            eq(platformNotifications.type, "suspension_warning"),
            eq(platformNotifications.status, "pending")
          ))
          .limit(1);

        if (existingWarning.length === 0) {
          await platformDb.insert(platformNotifications).values({
            companyId: company.id,
            type: "suspension_warning",
            title: "Advertencia: Su cuenta será suspendida",
            message: `Su membresía está vencida hace ${daysPastDue} día(s). Su cuenta será suspendida en ${gracePeriodDays - daysPastDue} día(s) si no realiza el pago.`,
            status: "pending",
            createdAt: now,
          });
          warnedCount++;
        }
      }
    }

    return { suspended: suspendedCount, warned: warnedCount };
  }

  async markNotificationsSent(companyId: number, types?: string[]): Promise<number> {
    const now = new Date();
    const conditions = [
      eq(platformNotifications.companyId, companyId),
      eq(platformNotifications.status, "pending")
    ];

    if (types && types.length > 0) {
      conditions.push(inArray(platformNotifications.type, types));
    }

    const result = await platformDb
      .update(platformNotifications)
      .set({ status: "sent", sentAt: now })
      .where(and(...conditions));

    return result.rowCount ?? 0;
  }
}

// Exportación de la instancia única
export const platformStorage = new PlatformStorage();