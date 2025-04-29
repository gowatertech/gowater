import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { trucks } from '../../../shared/schema';
import { getCurrentCompanyId } from '../../company-db';

// Router para los vehículos disponibles
export const trucksRouter = Router();

// Endpoint para obtener todos los vehículos
trucksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ 
        error: "No se encontró ID de compañía en el contexto" 
      });
    }
    
    // Obtener vehículos disponibles
    const availableTrucks = await db
      .select({
        id: trucks.id,
        plate: trucks.plate,
        brand: trucks.brand,
        model: trucks.model
      })
      .from(trucks)
      .where(
        eq(trucks.companyId, companyId)
      );
    
    return res.json(availableTrucks);
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    return res.status(500).json({ 
      error: 'Error al obtener vehículos',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default trucksRouter;