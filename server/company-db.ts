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
  asyncLocalStorage.set('companyId', companyId);
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
  
  // Verificar si la consulta tiene un filtro 'where' existente
  if (query.$hasWhere) {
    // En este caso, añadir companyId = X a la condición existente
    return query.where(sql`company_id = ${companyId}`);
  } else {
    // Si no hay filtro, crear uno con companyId = X
    return query.where(sql`company_id = ${companyId}`);
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
    // Capturar los argumentos y pasarlos a db.select
    const args = arguments;
    // @ts-ignore - Ignorar error de tipado para simplificar
    const query = db.select.apply(db, args);
    return withCompany(query);
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

