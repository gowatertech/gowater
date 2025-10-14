import { Request, Response, Router } from "express";
import { getCurrentCompanyId, setCurrentCompanyId } from "./company-db";

export function registerTestSessionRoutes(router: Router) {
  // Solo habilitado en desarrollo
  if (process.env.NODE_ENV !== "production") {
    router.post("/test-session/login", async (req: Request, res: Response) => {
      try {
        const { userId, companyId: providedCompanyId, username, role } = req.body;
        
        // Si no se proporciona companyId, buscar en la base de datos
        let companyId = providedCompanyId;
        let userRole = role;
        let userName = username;
        
        if (!companyId && userId) {
          try {
            const { db } = await import('./db');
            const { users } = await import('../shared/schema');
            const { eq } = await import('drizzle-orm');
            
            const userRecord = await db.select()
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);
            
            if (userRecord && userRecord.length > 0) {
              companyId = userRecord[0].companyId;
              userRole = userRole || userRecord[0].role;
              userName = userName || userRecord[0].username;
              console.log(`[TEST] Usuario encontrado en DB: ${userName}, companyId=${companyId}, role=${userRole}`);
            }
          } catch (dbError) {
            console.error("[TEST] Error al buscar usuario en DB:", dbError);
          }
        }
        
        console.log(`[TEST] Configurando sesión con userId=${userId}, companyId=${companyId}, role=${userRole}`);
        
        // Configurar la sesión
        if (!req.session) {
          req.session = {} as any;
        }
        
        req.session.user = {
          id: userId,
          name: userName || "Test User",
          role: userRole || "admin",
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