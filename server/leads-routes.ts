import { Router } from "express";
import { db } from "./db";
import { companyLeads, insertCompanyLeadSchema } from "@shared/schema";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";

// Crear el router
const router = Router();

// Endpoint para crear una nueva empresa interesada
router.post("/register-interest", async (req, res) => {
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
      message: "Registro exitoso. Nos pondremos en contacto pronto."
    });
  } catch (error) {
    console.error("Error al registrar interés:", error);
    
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
      message: "Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente."
    });
  }
});

// Endpoint para obtener todas las empresas interesadas (protegido, solo para administradores)
router.get("/interested-companies", async (req, res) => {
  try {
    // En un entorno real, aquí iría la verificación de autenticación y autorización
    // if (!req.session.user || req.session.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: "No autorizado" });
    // }
    
    const leads = await db.select().from(companyLeads).orderBy(companyLeads.createdAt, "desc");
    
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

// Endpoint para actualizar el estado de una empresa interesada
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