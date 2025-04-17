import express, { Router } from 'express';
import { companyDb } from '../company-db';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { products } from '@shared/schema';
import { getCurrentCompanyId } from '../company-db';

/**
 * Crea y registra un endpoint para probar la funcionalidad multi-tenant
 */
export function createMultiTenantTestEndpoint(): Router {
  const router = express.Router();

  /**
   * Endpoint para probar las operaciones CRUD con filtrado automático de companyId
   * GET /api/test-tenant/crud
   */
  router.get('/crud', async (req, res) => {
    try {
      const companyId = getCurrentCompanyId();
      console.log(`===== INICIANDO PRUEBA DE MULTI-TENANT CON COMPANY_ID = ${companyId} =====`);
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "No se encontró companyId en el contexto"
        });
      }
      
      // Producto de prueba para operaciones CRUD
      const testProductName = `Producto Test Multi-Tenant ${Date.now()}`;
      
      // 1. PRUEBA DE CREACIÓN (INSERT)
      console.log("\n----- PRUEBA DE INSERT -----");
      console.log(`Creando producto de prueba: ${testProductName}`);
      
      const [createdProduct] = await companyDb.insert(products).values({
        name: testProductName,
        description: "Producto para prueba de multi-tenant",
        price: "99.99",
        unit: "Unidad",
        active: true
      }).returning();
      
      console.log("Producto creado:", createdProduct);
      
      if (!createdProduct) {
        return res.status(500).json({
          success: false,
          message: "Error al crear producto de prueba"
        });
      }
      
      // Verificar que el producto tiene el companyId correcto
      if (createdProduct.companyId !== companyId) {
        console.error(`ERROR: El producto se creó con companyId=${createdProduct.companyId} en lugar de ${companyId}`);
        return res.status(500).json({
          success: false,
          message: `ERROR: El producto se creó con companyId=${createdProduct.companyId} en lugar de ${companyId}`
        });
      }
      
      // 2. PRUEBA DE LECTURA (SELECT) con companyDb
      console.log("\n----- PRUEBA DE SELECT CON companyDb -----");
      const productId = createdProduct.id;
      console.log(`Buscando producto con id=${productId} usando companyDb`);
      
      const foundWithCompanyDb = await companyDb
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      
      console.log(`Encontrados ${foundWithCompanyDb.length} productos con companyDb`);
      
      // 3. PRUEBA DE LECTURA (SELECT) con db normal - debería traer el producto solo si especificamos companyId
      console.log("\n----- PRUEBA DE SELECT CON db normal -----");
      console.log(`Buscando producto con id=${productId} usando db normal SIN filtro de companyId`);
      
      const foundWithDbNoFilter = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      
      console.log(`Encontrados ${foundWithDbNoFilter.length} productos con db sin filtro`);
      
      console.log(`Buscando producto con id=${productId} y companyId=${companyId} usando db normal CON filtro explícito`);
      
      const foundWithDbFiltered = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.companyId, companyId)
        ))
        .limit(1);
      
      console.log(`Encontrados ${foundWithDbFiltered.length} productos con db con filtro explícito`);
      
      // 4. PRUEBA DE ACTUALIZACIÓN (UPDATE)
      console.log("\n----- PRUEBA DE UPDATE -----");
      const newName = `${testProductName} (Actualizado)`;
      console.log(`Actualizando producto ${productId} a nombre: ${newName}`);
      
      const [updatedProduct] = await companyDb
        .update(products)
        .set({ name: newName })
        .where(eq(products.id, productId))
        .returning();
      
      console.log("Producto actualizado:", updatedProduct);
      
      // 5. PRUEBA DE ELIMINACIÓN (DELETE)
      console.log("\n----- PRUEBA DE DELETE -----");
      console.log(`Eliminando producto ${productId}`);
      
      const deletedCount = await companyDb
        .delete(products)
        .where(eq(products.id, productId))
        .returning();
      
      console.log(`Eliminados ${deletedCount.length} productos`);
      
      console.log("\n===== PRUEBA DE MULTI-TENANT COMPLETADA =====");
      
      // Devolver resultados
      return res.status(200).json({
        success: true,
        message: "Prueba de multi-tenant completada exitosamente",
        results: {
          companyId,
          created: createdProduct,
          foundWithCompanyDb: foundWithCompanyDb.length,
          foundWithDbNoFilter: foundWithDbNoFilter.length,
          foundWithDbFiltered: foundWithDbFiltered.length,
          updated: updatedProduct,
          deleted: deletedCount.length
        }
      });
    } catch (error) {
      console.error("Error en prueba de multi-tenant:", error);
      return res.status(500).json({
        success: false,
        message: "Error al ejecutar prueba de multi-tenant",
        error: String(error)
      });
    }
  });

  return router;
}

/**
 * Registra el endpoint de prueba de multi-tenant en la aplicación Express
 */
export function registerMultiTenantTestEndpoint(app: express.Express) {
  const testRouter = createMultiTenantTestEndpoint();
  app.use('/api/test-tenant', testRouter);
  console.log("Endpoint de prueba de multi-tenant registrado en /api/test-tenant/crud");
}