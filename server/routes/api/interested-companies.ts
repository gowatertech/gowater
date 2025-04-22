import { Router } from "express";
import { db } from "../../db";
import { companyLeads } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Obtener todas las empresas interesadas
router.get("/interested-companies", async (req, res) => {
  try {
    // En un entorno real, aquí iría verificación de autenticación y autorización
    
    const leads = await db.select().from(companyLeads).orderBy(desc(companyLeads.createdAt));
    
    return res.status(200).json({
      success: true,
      data: leads
    });
  } catch (error) {
    console.error("Error al obtener empresas interesadas:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener la lista de empresas interesadas."
    });
  }
});

// Actualizar el estado de una empresa interesada
router.patch("/interested-companies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validar que el status sea uno de los valores permitidos
    if (!["new", "contacted", "converted", "declined"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Estado no válido"
      });
    }
    
    const [updatedLead] = await db
      .update(companyLeads)
      .set({ status })
      .where(eq(companyLeads.id, Number(id)))
      .returning();
    
    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: "Empresa no encontrada"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedLead,
      message: "Estado actualizado correctamente"
    });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar el estado"
    });
  }
});

export default router;