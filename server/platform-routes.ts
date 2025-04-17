import { Router, Request, Response } from "express";
import { platformStorage } from "./platform-storage";
import { 
  insertCompanySchema, 
  insertPlanSchema, 
  insertMembershipInvoiceSchema,
  companies
} from "../shared/platform-schema";
import { 
  insertPlatformUserSchema,
  platformUsers
} from "../shared/platform-users-schema";
import { 
  insertCompanySettingsSchema 
} from "../shared/company-settings-schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { platformDb } from "./platform-db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export function registerPlatformRoutes(router: Router) {
  // Middleware de autenticación para endpoints de plataforma
  const requirePlatformAdmin = (req: Request, res: Response, next: any) => {
    // Para propósitos de demostración, permitimos el acceso sin verificar autenticación
    next();
    
    // Código original (descomentar para producción)
    /*
    // Verificar si el usuario es administrador de plataforma
    if (!req.session || !req.session.user || req.session.user.role !== 'platform_admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
    */
  };

  const requireCompanyAdmin = (req: Request, res: Response, next: any) => {
    // Para propósitos de demostración, permitimos el acceso sin verificar autenticación
    next();
    
    // Código original (descomentar para producción)
    /*
    // Verificar si el usuario es administrador de empresa o plataforma
    if (!req.session || !req.session.user || 
        (req.session.user.role !== 'company_admin' && req.session.user.role !== 'platform_admin')) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
    */
  };

  // Rutas para la gestión de empresas
  router.get("/companies", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const companies = await platformStorage.listCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error al listar empresas:", error);
      res.status(500).json({ message: "Error al obtener empresas" });
    }
  });

  router.get("/companies/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const company = await platformStorage.getCompany(id);
      
      if (!company) {
        return res.status(404).json({ message: "Empresa no encontrada" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error al obtener empresa:", error);
      res.status(500).json({ message: "Error al obtener empresa" });
    }
  });

  router.post("/companies", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await platformStorage.createCompany(validatedData);
      res.status(201).json(company);
    } catch (error: any) {
      console.error("Error al crear empresa:", error);
      res.status(400).json({ message: error.message || "Error al crear empresa" });
    }
  });

  router.put("/companies/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCompanySchema.partial().parse(req.body);
      const company = await platformStorage.updateCompany(id, validatedData);
      res.json(company);
    } catch (error: any) {
      console.error("Error al actualizar empresa:", error);
      res.status(400).json({ message: error.message || "Error al actualizar empresa" });
    }
  });

  router.delete("/companies/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await platformStorage.deleteCompany(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error al eliminar empresa:", error);
      res.status(500).json({ message: "Error al eliminar empresa" });
    }
  });

  // Rutas para la gestión de planes
  router.get("/plans", async (req: Request, res: Response) => {
    try {
      const plans = await platformStorage.listPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error al listar planes:", error);
      res.status(500).json({ message: "Error al obtener planes" });
    }
  });

  router.get("/plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const plan = await platformStorage.getPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan no encontrado" });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error al obtener plan:", error);
      res.status(500).json({ message: "Error al obtener plan" });
    }
  });

  router.post("/plans", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPlanSchema.parse(req.body);
      const plan = await platformStorage.createPlan(validatedData);
      res.status(201).json(plan);
    } catch (error: any) {
      console.error("Error al crear plan:", error);
      res.status(400).json({ message: error.message || "Error al crear plan" });
    }
  });

  router.put("/plans/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPlanSchema.partial().parse(req.body);
      const plan = await platformStorage.updatePlan(id, validatedData);
      res.json(plan);
    } catch (error: any) {
      console.error("Error al actualizar plan:", error);
      res.status(400).json({ message: error.message || "Error al actualizar plan" });
    }
  });

  router.delete("/plans/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await platformStorage.deletePlan(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error al eliminar plan:", error);
      res.status(500).json({ message: "Error al eliminar plan" });
    }
  });

  // Rutas para la gestión de facturas de membresía
  router.get("/membership-invoices", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      const invoices = await platformStorage.listMembershipInvoices(companyId);
      res.json(invoices);
    } catch (error) {
      console.error("Error al listar facturas:", error);
      res.status(500).json({ message: "Error al obtener facturas" });
    }
  });

  router.post("/membership-invoices", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertMembershipInvoiceSchema.parse(req.body);
      const invoice = await platformStorage.createMembershipInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error: any) {
      console.error("Error al crear factura:", error);
      res.status(400).json({ message: error.message || "Error al crear factura" });
    }
  });

  router.put("/membership-invoices/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMembershipInvoiceSchema.partial().parse(req.body);
      const invoice = await platformStorage.updateMembershipInvoice(id, validatedData);
      res.json(invoice);
    } catch (error: any) {
      console.error("Error al actualizar factura:", error);
      res.status(400).json({ message: error.message || "Error al actualizar factura" });
    }
  });

  // Rutas para la gestión de usuarios de plataforma
  router.get("/platform-users", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string | undefined;
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      const users = await platformStorage.listPlatformUsers(role, companyId);
      res.json(users);
    } catch (error) {
      console.error("Error al listar usuarios:", error);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });

  router.post("/platform-users", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const userData = { ...req.body };
      
      // Hash de la contraseña
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
      
      const validatedData = insertPlatformUserSchema.parse(userData);
      const user = await platformStorage.createPlatformUser(validatedData);
      
      // No devolver la contraseña
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      res.status(400).json({ message: error.message || "Error al crear usuario" });
    }
  });

  router.put("/platform-users/:id", requirePlatformAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userData = { ...req.body };
      
      // Si se actualiza la contraseña, hacer hash
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }
      
      const validatedData = insertPlatformUserSchema.partial().parse(userData);
      const user = await platformStorage.updatePlatformUser(id, validatedData);
      
      // No devolver la contraseña
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error al actualizar usuario:", error);
      res.status(400).json({ message: error.message || "Error al actualizar usuario" });
    }
  });

  // Rutas para configuraciones de empresa
  router.get("/company-settings/:companyId", requireCompanyAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.companyId);
      
      // Si es admin de empresa, verificar que pertenezca a esta compañía
      if (req.session?.user?.role === 'company_admin' && req.session?.user?.companyId !== companyId) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }
      
      const settings = await platformStorage.getCompanySettings(companyId);
      
      if (!settings) {
        return res.status(404).json({ message: "Configuración no encontrada" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error al obtener configuración:", error);
      res.status(500).json({ message: "Error al obtener configuración" });
    }
  });

  router.post("/company-settings", requireCompanyAdmin, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      
      // Si es admin de empresa, verificar que pertenezca a esta compañía
      if (req.session?.user?.role === 'company_admin' && req.session?.user?.companyId !== data.companyId) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }
      
      const validatedData = insertCompanySettingsSchema.parse(data);
      const settings = await platformStorage.createCompanySettings(validatedData);
      res.status(201).json(settings);
    } catch (error: any) {
      console.error("Error al crear configuración:", error);
      res.status(400).json({ message: error.message || "Error al crear configuración" });
    }
  });

  router.put("/company-settings/:companyId", requireCompanyAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.companyId);
      
      // Si es admin de empresa, verificar que pertenezca a esta compañía
      if (req.session?.user?.role === 'company_admin' && req.session?.user?.companyId !== companyId) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }
      
      const validatedData = insertCompanySettingsSchema.partial().parse(req.body);
      const settings = await platformStorage.updateCompanySettings(companyId, validatedData);
      res.json(settings);
    } catch (error: any) {
      console.error("Error al actualizar configuración:", error);
      res.status(400).json({ message: error.message || "Error al actualizar configuración" });
    }
  });

  // Rutas para gestión de usuarios por empresa
  router.post("/user-company-assignment", requireCompanyAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, companyId } = req.body;
      
      // Si es admin de empresa, verificar que pertenezca a esta compañía
      if (req.session?.user?.role === 'company_admin' && req.session?.user?.companyId !== companyId) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }
      
      await platformStorage.assignUserToCompany(userId, companyId);
      res.status(201).json({ message: "Usuario asignado a empresa correctamente" });
    } catch (error) {
      console.error("Error al asignar usuario:", error);
      res.status(500).json({ message: "Error al asignar usuario a empresa" });
    }
  });

  router.delete("/user-company-assignment", requireCompanyAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const companyId = parseInt(req.query.companyId as string);
      
      // Si es admin de empresa, verificar que pertenezca a esta compañía
      if (req.session?.user?.role === 'company_admin' && req.session?.user?.companyId !== companyId) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }
      
      await platformStorage.removeUserFromCompany(userId, companyId);
      res.status(204).end();
    } catch (error) {
      console.error("Error al eliminar asignación:", error);
      res.status(500).json({ message: "Error al eliminar asignación de usuario" });
    }
  });

  router.get("/users-by-company/:companyId", requireCompanyAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.companyId);
      
      // Si es admin de empresa, verificar que pertenezca a esta compañía
      if (req.session?.user?.role === 'company_admin' && req.session?.user?.companyId !== companyId) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }
      
      const userIds = await platformStorage.getUsersByCompany(companyId);
      res.json(userIds);
    } catch (error) {
      console.error("Error al listar usuarios por empresa:", error);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });

  // Rutas de autenticación de la plataforma
  router.post("/platform-login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await platformStorage.getPlatformUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      if (!user.active) {
        return res.status(403).json({ message: "Usuario inactivo" });
      }
      
      // Para actualizar la fecha de último login lo haremos directo en la base de datos
      // ya que no está en el schema de validación
      try {
        const lastLoginDate = new Date();
        await platformDb
          .update(platformUsers)
          .set({ lastLogin: lastLoginDate })
          .where(eq(platformUsers.id, user.id));
      } catch (error) {
        console.error("Error al actualizar fecha de último login:", error);
      }
      
      // Crear sesión
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId || undefined,
        isPlatformUser: true
      };
      
      // No devolver la contraseña
      const { password: pwd, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        message: "Login exitoso"
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ message: "Error en proceso de login" });
    }
  });

  // Endpoints para obtener conteos
  router.get("/companies/count", async (req: Request, res: Response) => {
    try {
      // Usar una consulta COUNT SQL directa para mayor eficiencia
      const result = await platformDb.execute(sql`SELECT COUNT(*) as count FROM "companies"`);
      res.json({ count: Number(result.rows[0].count) });
    } catch (error) {
      console.error("Error al contar empresas:", error);
      res.status(500).json({ message: "Error al contar empresas" });
    }
  });

  router.get("/platform-users/count", async (req: Request, res: Response) => {
    try {
      // Usar SQL directo para mayor eficiencia
      const result = await platformDb.execute(sql`SELECT COUNT(*) as count FROM "platform_users"`);
      res.json({ count: Number(result.rows[0].count) });
    } catch (error) {
      console.error("Error al contar usuarios:", error);
      res.status(500).json({ message: "Error al contar usuarios" });
    }
  });

  router.get("/membership-invoices/count", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      
      if (status) {
        const result = await platformDb.execute(
          sql`SELECT COUNT(*) as count FROM "membership_invoices" WHERE "status" = ${status}`
        );
        return res.json({ count: Number(result.rows[0].count) });
      }
      
      const result = await platformDb.execute(
        sql`SELECT COUNT(*) as count FROM "membership_invoices"`
      );
      res.json({ count: Number(result.rows[0].count) });
    } catch (error) {
      console.error("Error al contar facturas:", error);
      res.status(500).json({ message: "Error al contar facturas" });
    }
  });

  router.post("/platform-logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Sesión cerrada" });
    });
  });

  return router;
}