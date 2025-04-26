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
export function setCurrentCompanyId(companyId: number | undefined): void {
  if (companyId === undefined) {
    console.log(`Limpiando companyId del contexto`);
    asyncLocalStorage.delete('companyId');
  } else {
    console.log(`Configurando companyId=${companyId} en el contexto`);
    asyncLocalStorage.set('companyId', companyId);
  }
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
  } else {
    // Si no hay companyId en la sesión, limpiar el contexto
    setCurrentCompanyId(undefined);
  }
  
  next();
}

// Función para aplicar el companyId a una consulta de selección
export function withCompany(query: any): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la consulta SELECT");
    return query;
  }
  
  try {
    // Intentar obtener información de las tablas involucradas
    let tableName = 'unknown_table';
    try {
      if (query.config && query.config.tableName) {
        tableName = query.config.tableName;
      } else if (query.from && query.from.config && query.from.config.name) {
        tableName = query.from.config.name;
      }
    } catch (tableError) {
      console.warn("No se pudo determinar el nombre de la tabla:", tableError);
    }
    
    console.log(`SELECT en tabla ${tableName} - Aplicando filtro companyId = ${companyId}`);
    
    // Verificar si la consulta tiene el método where
    if (typeof query.where !== 'function') {
      console.warn(`Advertencia: La consulta no tiene método where() disponible. Tipo de consulta: ${typeof query}`);
      
      // Si no tiene where, verificar si es un objeto de Drizzle para SQL
      if (query.$dynamic && query.driver) {
        // Intento alternativo para queries SQL dinámicas
        try {
          return query.where(eq(sql`company_id`, companyId));
        } catch (innerError) {
          console.warn("No se pudo aplicar filtro alternativo:", innerError);
        }
      }
      
      // Si no se pudo aplicar ningún filtro, devolver la consulta original
      return query;
    }

    try {
      // Intenta obtener la tabla principal para usar eq()
      if (query.from && query.from.companyId) {
        // El enfoque ideal usando eq()
        const mainTable = query.from;
        return query.where(eq(mainTable.companyId, companyId));
      } else {
        // Fallback usando sql raw
        return query.where(sql`company_id = ${companyId}`);
      }
    } catch (whereError) {
      console.warn("No se pudo aplicar el filtro ideal, usando SQL genérico:", whereError);
      // En Drizzle ORM, aplicar el filtro genérico como último recurso
      return query.where(sql`company_id = ${companyId}`);
    }
  } catch (error) {
    console.error("Error al aplicar filtro de companyId:", error);
    console.error("Detalles:", String(error));
    
    // Como último recurso, devolver la consulta sin filtro
    return query;
  }
}

// Funciones helper para incluir automáticamente el companyId en inserciones
export function withCompanyInsert(table: any, values: any | any[]): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la inserción");
    return db.insert(table).values(values);
  }
  
  // Obtener el nombre de la tabla para los logs
  const tableName = table?.config?.name || 'unknown_table';
  console.log(`INSERT en tabla ${tableName} - Aplicando companyId = ${companyId}`);
  
  try {
    // Añadir companyId a cada valor a insertar
    if (Array.isArray(values)) {
      // Para inserciones múltiples
      console.log(`Inserción múltiple (${values.length} registros) con companyId = ${companyId}`);
      const valuesWithCompany = values.map(value => {
        // No sobrescribir companyId si ya viene en los datos
        if (value.companyId !== undefined) {
          console.log(`AVISO: companyId ya viene en los datos de inserción: ${value.companyId}`);
          return value;
        }
        return { ...value, companyId };
      });
      return db.insert(table).values(valuesWithCompany);
    } else {
      // Para inserción simple
      // No sobrescribir companyId si ya viene en los datos
      if (values.companyId !== undefined) {
        console.log(`AVISO: companyId ya viene en los datos de inserción: ${values.companyId}`);
        return db.insert(table).values(values);
      }
      console.log(`Inserción simple con companyId = ${companyId}`);
      return db.insert(table).values({ ...values, companyId });
    }
  } catch (error) {
    console.error(`Error en withCompanyInsert para tabla ${tableName}:`, error);
    // En caso de error, intentar la inserción sin modificar
    return db.insert(table).values(values);
  }
}

// Función helper para incluir automáticamente el companyId en actualizaciones
export function withCompanyUpdate(table: any, values: any): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la actualización");
    return db.update(table).set(values);
  }
  
  // Obtener el nombre de la tabla para los logs
  const tableName = table?.config?.name || 'unknown_table';
  console.log(`UPDATE en tabla ${tableName} - Aplicando filtro companyId = ${companyId}`);
  
  try {
    // No sobrescribir companyId si ya viene en los datos (generalmente no debería ocurrir en updates)
    if (values.companyId !== undefined && values.companyId !== companyId) {
      console.warn(`ADVERTENCIA: El UPDATE intenta modificar companyId de ${companyId} a ${values.companyId}`);
      // Eliminar companyId de los valores a actualizar para evitar cambios no deseados
      const { companyId: _, ...valuesWithoutCompanyId } = values;
      return db.update(table).set(valuesWithoutCompanyId).where(sql`company_id = ${companyId}`);
    }
    
    // Retornar la consulta de actualización, pero limitada a la compañía actual
    return db.update(table).set(values).where(sql`company_id = ${companyId}`);
  } catch (error) {
    console.error(`Error en withCompanyUpdate para tabla ${tableName}:`, error);
    // En caso de error, intentar la actualización sin filtro
    return db.update(table).set(values);
  }
}

// Función helper para incluir automáticamente el companyId en eliminaciones
export function withCompanyDelete(table: any): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la eliminación");
    return db.delete(table);
  }
  
  // Obtener el nombre de la tabla para los logs
  const tableName = table?.config?.name || 'unknown_table';
  console.log(`DELETE en tabla ${tableName} - Aplicando filtro companyId = ${companyId}`);
  
  try {
    // Retornar la consulta de eliminación, pero limitada a la compañía actual
    return db.delete(table).where(sql`company_id = ${companyId}`);
  } catch (error) {
    console.error(`Error en withCompanyDelete para tabla ${tableName}:`, error);
    // En caso de error, intentar la eliminación sin filtro
    return db.delete(table);
  }
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
        // Usar apply() en lugar de spread para evitar errores de tipo
        query = db.select.apply(db, args);
      }
      
      return withCompany(query);
    } catch (error) {
      console.error("Error en companyDb.select:", error);
      // En caso de error, usar el método original sin filtrado pero con apply
      return db.select.apply(db, Array.from(arguments));
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

