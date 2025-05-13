import { Request, Response, Router } from "express";
import { users } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { setCurrentCompanyId } from "./company-db";

export function registerTestAPIRoutes(router: Router) {
  // Solo habilitado en desarrollo
  if (process.env.NODE_ENV !== "production") {
    console.log("Registrando endpoints de prueba...");
    
    // Endpoint para iniciar sesión de prueba automáticamente (admin@gowater.com)
    router.get("/test/login", async (req: Request, res: Response) => {
      try {
        // Buscar usuario admin
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, 'admin@gowater.com'));
        
        if (!user) {
          return res.status(404).json({ 
            success: false, 
            message: "Usuario administrador no encontrado" 
          });
        }
        
        // Preparar el objeto de usuario sin la contraseña
        const { password: _pwd, ...userWithoutPassword } = user;
        
        // Usar el método login de Passport para autenticar correctamente
        req.login(userWithoutPassword, (err) => {
          if (err) {
            console.error("Error al iniciar sesión de prueba:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Error al iniciar sesión de prueba" 
            });
          }
          
          // Establecer companyId en la sesión
          req.session.companyId = user.companyId;
          
          // También configurar el companyId en el contexto
          setCurrentCompanyId(user.companyId);
          
          console.log(`[TEST] Login de prueba exitoso para admin@gowater.com (ID: ${user.id}, Empresa: ${user.companyId})`);
          
          res.json({ 
            success: true, 
            message: "Login de prueba exitoso",
            user: userWithoutPassword,
            companyId: user.companyId
          });
        });
      } catch (error) {
        console.error("Error en login de prueba:", error);
        res.status(500).json({ success: false, message: String(error) });
      }
    });
    
    // Endpoint para probar la actualización de estado de un pedido
    router.get("/test/order/:id/status/:status", async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id);
        const status = req.params.status;
        
        // Validar estado
        if (!['pending', 'in_transit', 'delivered', 'cancelled'].includes(status)) {
          return res.status(400).json({ 
            success: false, 
            message: "Estado inválido. Valores permitidos: pending, in_transit, delivered, cancelled" 
          });
        }
        
        // Verificar si tenemos una sesión activa
        if (!req.session || !req.session.user) {
          return res.status(401).json({ 
            success: false, 
            message: "No autenticado. Primero debes usar /test/login" 
          });
        }
        
        // Hacer la solicitud a la API real para actualizar el estado
        const result = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.cookie || ''
          },
          body: JSON.stringify({ status })
        });
        
        try {
          const responseText = await result.text();
          console.log('Respuesta recibida:', responseText);
          
          // Intentar parsear como JSON si es posible
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            data = { error: 'No es un JSON válido', text: responseText };
          }
          
          res.json({
            success: result.ok,
            statusCode: result.status,
            data
          });
        } catch (err) {
          res.status(500).json({
            success: false,
            message: `Error procesando respuesta: ${err}`,
            statusCode: result.status
          });
        }
      } catch (error) {
        console.error("Error en test de actualización de estado:", error);
        res.status(500).json({ success: false, message: String(error) });
      }
    });
  }
}