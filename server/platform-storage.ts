import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
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
    const [created] = await db.insert(companies).values(data).returning();
    return created;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const results = await db.select().from(companies).where(eq(companies.id, id));
    return results[0];
  }

  async getCompanyBySubdomain(subdomain: string): Promise<Company | undefined> {
    const results = await db.select().from(companies).where(eq(companies.subdomain, subdomain));
    return results[0];
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async listCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.name);
  }

  // Implementación de planes
  async createPlan(data: InsertPlan): Promise<Plan> {
    const [created] = await db.insert(plans).values(data).returning();
    return created;
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const results = await db.select().from(plans).where(eq(plans.id, id));
    return results[0];
  }

  async updatePlan(id: number, data: Partial<InsertPlan>): Promise<Plan> {
    const [updated] = await db
      .update(plans)
      .set(data)
      .where(eq(plans.id, id))
      .returning();
    return updated;
  }

  async deletePlan(id: number): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  async listPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(plans.price);
  }

  // Implementación de facturas de membresía
  async createMembershipInvoice(data: InsertMembershipInvoice): Promise<MembershipInvoice> {
    const [created] = await db.insert(membershipInvoices).values(data).returning();
    return created;
  }

  async getMembershipInvoice(id: number): Promise<MembershipInvoice | undefined> {
    const results = await db.select().from(membershipInvoices).where(eq(membershipInvoices.id, id));
    return results[0];
  }

  async updateMembershipInvoice(id: number, data: Partial<InsertMembershipInvoice>): Promise<MembershipInvoice> {
    const [updated] = await db
      .update(membershipInvoices)
      .set(data)
      .where(eq(membershipInvoices.id, id))
      .returning();
    return updated;
  }

  async deleteMembershipInvoice(id: number): Promise<void> {
    await db.delete(membershipInvoices).where(eq(membershipInvoices.id, id));
  }

  async listMembershipInvoices(companyId?: number): Promise<MembershipInvoice[]> {
    if (companyId) {
      return await db
        .select()
        .from(membershipInvoices)
        .where(eq(membershipInvoices.companyId, companyId))
        .orderBy(membershipInvoices.invoiceDate);
    }
    return await db.select().from(membershipInvoices).orderBy(membershipInvoices.invoiceDate);
  }

  // Implementación de usuarios de plataforma
  async createPlatformUser(data: InsertPlatformUser): Promise<PlatformUser> {
    const [created] = await db.insert(platformUsers).values(data).returning();
    return created;
  }

  async getPlatformUser(id: number): Promise<PlatformUser | undefined> {
    const results = await db.select().from(platformUsers).where(eq(platformUsers.id, id));
    return results[0];
  }

  async getPlatformUserByEmail(email: string): Promise<PlatformUser | undefined> {
    const results = await db.select().from(platformUsers).where(eq(platformUsers.email, email));
    return results[0];
  }

  async updatePlatformUser(id: number, data: Partial<InsertPlatformUser>): Promise<PlatformUser> {
    const [updated] = await db
      .update(platformUsers)
      .set(data)
      .where(eq(platformUsers.id, id))
      .returning();
    return updated;
  }

  async deletePlatformUser(id: number): Promise<void> {
    await db.delete(platformUsers).where(eq(platformUsers.id, id));
  }

  async listPlatformUsers(role?: string, companyId?: number): Promise<PlatformUser[]> {
    let query = db.select().from(platformUsers);
    
    if (role) {
      query = query.where(eq(platformUsers.role, role));
    }
    
    if (companyId) {
      query = query.where(eq(platformUsers.companyId, companyId));
    }
    
    return await query.orderBy(platformUsers.name);
  }

  // Implementación de configuraciones de empresa
  async createCompanySettings(data: InsertCompanySettings): Promise<CompanySettings> {
    const [created] = await db.insert(companySettings).values(data).returning();
    return created;
  }

  async getCompanySettings(companyId: number): Promise<CompanySettings | undefined> {
    const results = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, companyId));
    return results[0];
  }

  async updateCompanySettings(companyId: number, data: Partial<InsertCompanySettings>): Promise<CompanySettings> {
    const [updated] = await db
      .update(companySettings)
      .set(data)
      .where(eq(companySettings.companyId, companyId))
      .returning();
    return updated;
  }

  // Implementación de relación usuario-empresa
  async assignUserToCompany(userId: number, companyId: number): Promise<void> {
    await db.insert(userCompany).values({ userId, companyId });
  }

  async removeUserFromCompany(userId: number, companyId: number): Promise<void> {
    await db
      .delete(userCompany)
      .where(
        and(
          eq(userCompany.userId, userId),
          eq(userCompany.companyId, companyId)
        )
      );
  }

  async getUsersByCompany(companyId: number): Promise<number[]> {
    const results = await db
      .select({ userId: userCompany.userId })
      .from(userCompany)
      .where(eq(userCompany.companyId, companyId));
    
    return results.map(r => r.userId);
  }
}

// Exportación de la instancia única
export const platformStorage = new PlatformStorage();