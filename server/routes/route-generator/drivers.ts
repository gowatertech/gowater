import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { users } from '../../../shared/schema';
import { getCurrentCompanyId } from '../../company-db';

// Router para los conductores disponibles
export const driversRouter = Router();

// Endpoint para obtener todos los conductores
driversRouter.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ 
        error: "No se encontró ID de compañía en el contexto" 
      });
    }
    
    // Obtener usuarios con rol de conductor (puede variar según el esquema)
    const drivers = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(
        eq(users.companyId, companyId)
      );
    
    return res.json(drivers);
  } catch (error) {
    console.error('Error al obtener conductores:', error);
    return res.status(500).json({ 
      error: 'Error al obtener conductores',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default driversRouter;