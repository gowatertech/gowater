import { Request, Response, Router } from "express";
import { getCurrentCompanyId, setCurrentCompanyId } from "./company-db";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerTestSessionRoutes(router: Router) {
  // Solo habilitado en desarrollo
  if (process.env.NODE_ENV !== "production") {
    // Endpoint alternativo que acepta email para buscar el usuario automáticamente
    router.post("/test-session/login-with-email", async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ success: false, message: "Email es requerido" });
        }
        
        console.log(`[TEST] Buscando usuario con email=${email}`);
        
        // Buscar usuario por email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        
        if (!user) {
          return res.status(404).json({ success: false, message: `Usuario con email ${email} no encontrado` });
        }
        
        console.log(`[TEST] Usuario encontrado: id=${user.id}, companyId=${user.companyId}, role=${user.role}`);
        
        // Configurar la sesión
        if (!req.session) {
          req.session = {} as any;
        }
        
        req.session.user = {
          id: user.id,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        };
        
        // IMPORTANTE: También establecer companyId directamente en la sesión
        req.session.companyId = user.companyId;
        
        // Configurar el companyId en el contexto
        setCurrentCompanyId(user.companyId);
        
        console.log(`[TEST] Sesión configurada: userId=${user.id}, companyId=${user.companyId}, role=${user.role}`);
        
        res.json({ 
          success: true, 
          message: `Sesión configurada con éxito para ${user.name}`,
          user: req.session.user
        });
      } catch (error) {
        console.error("Error al configurar sesión de prueba:", error);
        res.status(500).json({ success: false, message: String(error) });
      }
    });
    
    router.post("/test-session/login", (req: Request, res: Response) => {
      try {
        const { userId, companyId, username, role } = req.body;
        
        console.log(`[TEST] Configurando sesión con userId=${userId}, companyId=${companyId}, role=${role}`);
        
        // Configurar la sesión
        if (!req.session) {
          req.session = {} as any;
        }
        
        req.session.user = {
          id: userId,
          name: username || "Test User",
          role: role || "admin",
          companyId: companyId,
        };
        
        // IMPORTANTE: También establecer companyId directamente en la sesión
        // para que los middlewares de autenticación lo encuentren
        req.session.companyId = companyId;
        
        // También configurar el companyId en el contexto
        setCurrentCompanyId(companyId);
        
        res.json({ 
          success: true, 
          message: `Sesión configurada con éxito`,
          user: req.session.user
        });
      } catch (error) {
        console.error("Error al configurar sesión de prueba:", error);
        res.status(500).json({ success: false, message: String(error) });
      }
    });
    
    router.get("/test-session/status", (req: Request, res: Response) => {
      try {
        const user = req.session?.user;
        const companyId = getCurrentCompanyId();
        
        res.json({ 
          success: true, 
          loggedIn: !!user,
          user: user || null,
          companyId: companyId
        });
      } catch (error) {
        console.error("Error al obtener estado de sesión:", error);
        res.status(500).json({ success: false, message: String(error) });
      }
    });
    
    router.post("/test-session/logout", (req: Request, res: Response) => {
      try {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error al cerrar sesión:", err);
            res.status(500).json({ success: false, message: String(err) });
          } else {
            res.json({ success: true, message: "Sesión cerrada con éxito" });
          }
        });
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        res.status(500).json({ success: false, message: String(error) });
      }
    });
  }
}