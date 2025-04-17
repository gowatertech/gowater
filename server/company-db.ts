import { Request } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Contexto para guardar el companyId de la sesión actual
const asyncLocalStorage = new Map<string, number>();

// Helper para obtener el companyId del contexto actual
export function getCurrentCompanyId(): number | undefined {
  return asyncLocalStorage.get('companyId');
}

// Helper para configurar el companyId en el contexto
export function setCurrentCompanyId(companyId: number): void {
  console.log(`Configurando companyId=${companyId} en el contexto`);
  asyncLocalStorage.set('companyId', companyId);
}

// Helper para usar companyDb solo cuando sea necesario, durante la fase de migración
export function useCompanyDb(func: Function): void {
  // Guardar referencia a db en caso de que sea necesario volver a ella
  const originalDb = db;
  
  // Reemplazar globalmente db con companyDb
  // @ts-ignore - Ignorar errores de tipo para esta operación
  global.db = companyDb;
  
  // Ejecutar la función pasada
  try {
    func();
  } finally {
    // Restaurar la referencia original
    // @ts-ignore - Ignorar errores de tipo para esta operación
    global.db = originalDb;
  }
}

// Función para inicializar el middleware de Express que configura el companyId
export function companyDbMiddleware(req: Request, res: any, next: any) {
  // Obtener el companyId de la sesión
  const companyId = req.session?.companyId;
  
  if (companyId) {
    // Configurar el companyId en el contexto
    setCurrentCompanyId(companyId);
  }
  
  next();
}

// Función para aplicar el companyId a una consulta de selección
export function withCompany(query: any): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la consulta");
    return query;
  }
  
  try {
    console.log("Aplicando filtro companyId =", companyId, "a consulta");
    // En Drizzle ORM, el método where siempre está disponible para los objetos de consulta
    return query.where(sql`company_id = ${companyId}`);
  } catch (error) {
    console.error("Error al aplicar filtro de companyId:", error);
    return query; // Retornar la consulta original si hay error
  }
}

// Funciones helper para incluir automáticamente el companyId en inserciones
export function withCompanyInsert(table: any, values: any | any[]): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la inserción");
    return db.insert(table).values(values);
  }
  
  // Añadir companyId a cada valor a insertar
  if (Array.isArray(values)) {
    const valuesWithCompany = values.map(value => ({ ...value, companyId }));
    return db.insert(table).values(valuesWithCompany);
  } else {
    return db.insert(table).values({ ...values, companyId });
  }
}

// Función helper para incluir automáticamente el companyId en actualizaciones
export function withCompanyUpdate(table: any, values: any): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la actualización");
    return db.update(table).set(values);
  }
  
  // Retornar la consulta de actualización, pero limitada a la compañía actual
  return db.update(table).set(values).where(sql`company_id = ${companyId}`);
}

// Función helper para incluir automáticamente el companyId en eliminaciones
export function withCompanyDelete(table: any): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la eliminación");
    return db.delete(table);
  }
  
  // Retornar la consulta de eliminación, pero limitada a la compañía actual
  return db.delete(table).where(sql`company_id = ${companyId}`);
}

// Cliente de DB adaptado para multi-tenant
export const companyDb = {
  ...db,
  // Sobreescribir funciones select, insert, update, delete
  
  // Select con filtro automático por companyId
  select: function() {
    try {
      // Capturar los argumentos y pasarlos a db.select
      const args = Array.from(arguments);
      console.log("companyDb.select - argumentos:", args.length);
      
      // Implementar lógicamente el método select para evitar errores
      let query;
      if (args.length === 0) {
        query = db.select();
      } else if (args.length === 1) {
        query = db.select(args[0]);
      } else {
        // Convertir arguments a array explícito para pasar multiple args
        query = db.select(...args);
      }
      
      return withCompany(query);
    } catch (error) {
      console.error("Error en companyDb.select:", error);
      // En caso de error, usar el método original sin filtrado
      return db.select(...Array.from(arguments));
    }
  },
  
  // Insert con companyId añadido automáticamente
  insert: function(table: any) {
    return {
      values: function(values: any | any[]) {
        return withCompanyInsert(table, values);
      }
    };
  },
  
  // Update con filtro automático por companyId
  update: function(table: any) {
    return {
      set: function(values: any) {
        return withCompanyUpdate(table, values);
      }
    };
  },
  
  // Delete con filtro automático por companyId
  delete: function(table: any) {
    return withCompanyDelete(table);
  }
};

