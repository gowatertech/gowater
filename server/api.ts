import { Router } from 'express';
import { db } from './db';
import multer from 'multer';
import { trucks } from "@shared/schema";
import { storage } from "./storage";

// Configurar multer para manejar la carga de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const router = Router();

// Truck endpoints
router.get("/trucks", async (req, res) => {
  try {
    const allTrucks = await db
      .select()
      .from(trucks)
      .orderBy(trucks.plate);

    console.log("GET /api/trucks - Retornando:", allTrucks.length, "camiones");
    res.json(allTrucks);
  } catch (error) {
    console.error("Error al obtener camiones:", error);
    res.status(500).json({ error: String(error) });
  }
});

router.post("/trucks", async (req, res) => {
  try {
    console.log("POST /api/trucks - Datos recibidos:", req.body);

    // Validar los datos del camión
    const truckData = {
      brand: req.body.brand,
      model: req.body.model,
      year: Number(req.body.year),
      plate: req.body.plate.toUpperCase(),
      color: req.body.color,
      capacity: Number(req.body.capacity),
      status: req.body.status || "disponible"
    };

    console.log("POST /api/trucks - Datos procesados:", truckData);

    const [truck] = await db
      .insert(trucks)
      .values(truckData)
      .returning();

    console.log("POST /api/trucks - Camión creado:", truck);
    res.json(truck);
  } catch (error) {
    console.error("Error al crear camión:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
