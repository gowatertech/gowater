import { Request, Response, Router } from "express";
import { getCurrentCompanyId, setCurrentCompanyId } from "./company-db";

export function registerTestSessionRoutes(router: Router) {
  // Solo habilitado en desarrollo
  if (process.env.NODE_ENV !== "production") {
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