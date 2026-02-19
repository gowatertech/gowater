import { Router } from "express";
import { db } from "../../db";
import { companyLeads, insertCompanyLeadSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { ZodError } from "zod";

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

// Obtener una empresa interesada específica por ID
router.get("/interested-companies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const lead = await db
      .select()
      .from(companyLeads)
      .where(eq(companyLeads.id, Number(id)))
      .limit(1);
    
    if (lead.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Empresa no encontrada"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: lead[0]
    });
  } catch (error) {
    console.error(`Error al obtener la empresa con ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener información de la empresa"
    });
  }
});

// Crear una nueva empresa interesada
router.post("/interested-companies", async (req, res) => {
  try {
    // Validar los datos de entrada utilizando el esquema
    const validatedData = insertCompanyLeadSchema.parse(req.body);
    
    // Insertar los datos en la base de datos
    const [newLead] = await db
      .insert(companyLeads)
      .values(validatedData)
      .returning();
    
    return res.status(201).json({
      success: true,
      data: newLead,
      message: "Empresa registrada exitosamente"
    });
  } catch (error) {
    console.error("Error al registrar empresa interesada:", error);
    
    // Manejar errores de validación específicamente
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors,
        message: "Por favor, verifica los datos ingresados."
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Error al registrar la empresa interesada"
    });
  }
});

// Actualizar una empresa interesada completamente
router.put("/interested-companies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar los datos de entrada utilizando el esquema
    const validatedData = insertCompanyLeadSchema.parse(req.body);
    
    // Actualizar los datos en la base de datos
    const [updatedLead] = await db
      .update(companyLeads)
      .set(validatedData)
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
      message: "Empresa actualizada exitosamente"
    });
  } catch (error) {
    console.error(`Error al actualizar la empresa con ID ${req.params.id}:`, error);
    
    // Manejar errores de validación específicamente
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors,
        message: "Por favor, verifica los datos ingresados."
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Error al actualizar la empresa interesada"
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

router.delete("/interested-companies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await db
      .delete(companyLeads)
      .where(eq(companyLeads.id, Number(id)))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Empresa no encontrada"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Empresa eliminada correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar empresa interesada:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar la empresa"
    });
  }
});

export default router;