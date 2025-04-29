import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { zones } from '../../../shared/schema';
import { getCurrentCompanyId } from '../../company-db';

// Router para las zonas disponibles
export const zonesRouter = Router();

// Endpoint para obtener todas las zonas
zonesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ 
        error: "No se encontró ID de compañía en el contexto" 
      });
    }
    
    // Obtener zonas disponibles
    const availableZones = await db
      .select({
        id: zones.id,
        name: zones.name,
        color: zones.color
      })
      .from(zones)
      .where(
        eq(zones.companyId, companyId)
      );
    
    return res.json(availableZones);
  } catch (error) {
    console.error('Error al obtener zonas:', error);
    return res.status(500).json({ 
      error: 'Error al obtener zonas',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default zonesRouter;