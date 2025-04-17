import { eq, and, sql } from "drizzle-orm";
import { platformDb } from "./platform-db";
import {
  companies,
  plans,
  membershipInvoices,
  Company,
  InsertCompany,
  Plan,
  InsertPlan,
  MembershipInvoice,
  InsertMembershipInvoice,
} from "../shared/platform-schema";
import {
  platformUsers,
  userCompany,
  PlatformUser,
  InsertPlatformUser,
} from "../shared/platform-users-schema";
import {
  companySettings,
  CompanySettings,
  InsertCompanySettings,
} from "../shared/company-settings-schema";

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
}

export class PlatformStorage implements IPlatformStorage {
  // Implementación de empresas
  async createCompany(data: InsertCompany): Promise<Company> {
    // Convertir la fecha de string a objeto Date para el timestamp
    const expirationDate = new Date(data.expirationDate);
    
    const [created] = await platformDb.insert(companies).values({
      ...data,
      expirationDate
    }).returning();
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
    return await platformDb.select().from(companies).orderBy(companies.name);
  }

  // Implementación de planes
  async createPlan(data: InsertPlan): Promise<Plan> {
    // Convertir price de number a string para decimal
    const planData = {
      ...data,
      price: data.price.toString()
    };
    
    const [created] = await platformDb.insert(plans).values(planData).returning();
    return created;
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const results = await platformDb.select().from(plans).where(eq(plans.id, id));
    return results[0];
  }

  async updatePlan(id: number, data: Partial<InsertPlan>): Promise<Plan> {
    // Preparar los datos para actualizar
    const updateData: any = { ...data };
    
    // Convertir price a string si está presente
    if (updateData.price !== undefined) {
      updateData.price = updateData.price.toString();
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
    return await platformDb.select().from(plans).orderBy(plans.price);
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
      // Los SQL queries directos para evitar problemas de tipo
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
      
      // Ejecutar query nativo
      const { rows } = await platformDb.connection.query(sqlQuery, params);
      
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
      // Preparar datos con las conversiones necesarias
      const settingsData: any = {
        companyId: data.companyId,
        name: data.name,
        street: data.street,
        streetNumber: data.streetNumber,
        provinceId: data.provinceId,
        municipalityId: data.municipalityId,
        contactPhone: data.contactPhone,
        country: data.country,
        currency: data.currency,
        // Campos opcionales
        logo: data.logo,
        rnc: data.rnc,
        email: data.email,
        // Campos numéricos que necesitan conversión
        tax: data.tax !== undefined ? data.tax.toString() : "0.00",
        latitude: data.latitude,
        longitude: data.longitude
      };
      
      // Insertar en la base de datos
      const [result] = await platformDb
        .insert(companySettings)
        .values(settingsData)
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
    await platformDb.insert(userCompany).values({ userId, companyId });
  }

  async removeUserFromCompany(userId: number, companyId: number): Promise<void> {
    await platformDb
      .delete(userCompany)
      .where(
        and(
          eq(userCompany.userId, userId),
          eq(userCompany.companyId, companyId)
        )
      );
  }

  async getUsersByCompany(companyId: number): Promise<number[]> {
    const results = await platformDb
      .select({ userId: userCompany.userId })
      .from(userCompany)
      .where(eq(userCompany.companyId, companyId));
    
    return results.map((r: { userId: number }) => r.userId);
  }
}

// Exportación de la instancia única
export const platformStorage = new PlatformStorage();