# Análisis y Solución para la Implementación Multi-Tenant con companyId

## Problemas Identificados

### 1. Error Principal: Uso incorrecto del objeto `app` en `server/routes.ts`

El error que está deteniendo el inicio del servidor es:
```
ReferenceError: app is not defined
    at registerRoutes (/home/runner/workspace/server/routes.ts:1796:3)
```

Este error ocurre porque dentro de la función `registerRoutes` se está intentando usar un objeto `app` que no está definido dentro de ese contexto. La función recibe un `router` como parámetro, pero luego intenta usar `app` para definir rutas en múltiples lugares a partir de la línea 1796.

Analizando el código, encontramos que hay muchos endpoints que están definidos usando `app.METHOD()` en lugar de `router.METHOD()`. Esto está causando el error porque `app` no existe en el contexto de la función `registerRoutes`.

### 2. Problemas con la Implementación Multi-Tenant

1. **Filtrado de companyId**: El código intenta implementar un filtrado automático para todas las consultas basado en el `companyId` del tenant actual, pero hay inconsistencias en su aplicación. Algunas operaciones usan `db` directamente en lugar de usar `companyDb`.

2. **Modificación de Tablas**: Es necesario asegurar que todas las tablas relevantes tengan la columna `companyId`. Basado en el análisis del código, parece que varias tablas ya tienen este campo, pero es posible que algunas no lo tengan o que no se esté verificando adecuadamente.

3. **Contexto del Tenant**: La gestión del contexto del tenant actual se realiza a través de `getCurrentCompanyId()` y `setCurrentCompanyId()`. En el middleware actual, se está estableciendo un valor fijo (`req.session.companyId = 1`) para demostración, lo cual es adecuado para desarrollo pero será problemático en producción.

4. **Filtrado Inconsistente**: La función `withCompany()` intenta añadir un filtro de `companyId` a las consultas, pero podría fallar con consultas complejas o joins.

## Plan de Solución

### 1. Corregir el Error de Definición de Rutas

El problema más urgente a resolver es el uso incorrecto de `app` dentro de la función `registerRoutes`. Identificamos los siguientes lugares donde se usa `app` incorrectamente:

- Línea 1796: `app.patch("/api/invoices/:id", async (req, res) => {...`
- Línea 1823: `app.patch("/api/invoices/:invoiceId/items/:itemId", async (req, res) => {...`
- Línea 1851: `app.get("/api/products", async (req, res) =>{...`
- Línea 1875: `app.post("/api/products", async (req, res) => {...`
- Línea 1896: `app.patch("/api/products/:id", async (req, res) => {...`
- Línea 1930: `app.delete("/api/products/:id", async (req, res) => {...`
- Línea 1958: `app.post("/api/products/update-all-commission", async (req, res) => {...`
- Línea 2009: `app.get("/api/payments", async (req, res) => {...`
- Línea 2035: `app.post("/api/payments", async (req, res) => {...`
- Línea 2057: `app.get("/api/orders", async (req, res) => {...`
- Línea 2081: `app.post("/api/orders", async (req, res) => {...`
- Línea 2151: `app.get("/api/orders/:id/items", async (req, res) => {...`
- Y muchos más a lo largo del archivo...

Todos estos deben ser reemplazados por `router.METHOD()` y además se debe quitar el prefijo `/api/` de las rutas porque el router ya está montado en `/api` en `server/index.ts`.

### 2. Implementar Correctamente el Filtrado Multi-Tenant

1. **Mejorar `withCompany`**: La función actual en `server/company-db.ts` intenta añadir un filtro de `companyId` a las consultas, pero puede fallar en algunos casos. Actualmente está implementada para usar SQL directo (`sql`company_id = ${companyId}``) pero esto puede causar problemas con la tipado en TypeScript y no funciona correctamente con joins complejos.

   Modificaciones sugeridas:
   ```typescript
   // En server/company-db.ts
   import { eq, and, sql } from 'drizzle-orm';

   export function withCompany(query: any): any {
     const companyId = getCurrentCompanyId();
     
     if (!companyId) {
       console.warn("No se encontró companyId en el contexto para la consulta SELECT");
       return query;
     }
     
     try {
       // Obtener información de las tablas involucradas
       let tableName = 'unknown_table';
       let tableConfig = null;
       
       try {
         if (query.config && query.config.tableName) {
           tableName = query.config.tableName;
           tableConfig = query.config;
         } else if (query.from && query.from.config) {
           tableName = query.from.config.name;
           tableConfig = query.from.config;
         }
       } catch (tableError) {
         console.warn("No se pudo determinar el nombre de la tabla:", tableError);
       }
       
       console.log(`SELECT en tabla ${tableName} - Aplicando filtro companyId = ${companyId}`);
       
       // Verificar si la consulta tiene el método where
       if (typeof query.where !== 'function') {
         console.warn(`Advertencia: La consulta no tiene método where() disponible. Tipo de consulta: ${typeof query}`);
         return query;
       }
       
       if (tableConfig && tableConfig.columns && tableConfig.columns.companyId) {
         // Si la tabla tiene una columna companyId, usarla directamente
         const companyIdColumn = tableConfig.columns.companyId;
         return query.where(eq(companyIdColumn, companyId));
       } else {
         // Usar SQL genérico para tablas que no podemos analizar
         return query.where(sql`company_id = ${companyId}`);
       }
     } catch (error) {
       console.error("Error al aplicar filtro de companyId:", error);
       return query;
     }
   }
   ```

2. **Estandarizar el Uso de `companyDb`**: En todos los endpoints, especialmente en `server/routes.ts`, es necesario reemplazar las llamadas a `db` por `companyDb` para asegurar que todas las operaciones CRUD apliquen el filtrado por compañía.

   - En los lugares donde se realiza `db.select()` usar `companyDb.select()`
   - En los lugares donde se realiza `db.insert()` usar `companyDb.insert()`
   - En los lugares donde se realiza `db.update()` usar `companyDb.update()`
   - En los lugares donde se realiza `db.delete()` usar `companyDb.delete()`

3. **Validar Automáticamente `companyId`**: Verificar que la implementación actual de `withCompanyInsert()`, `withCompanyUpdate()` y `withCompanyDelete()` esté funcionando correctamente. Estas funciones ya están implementadas para añadir automáticamente el `companyId` a inserciones y aplicar el filtro por compañía en actualizaciones y eliminaciones.

### 3. Verificar y Actualizar el Esquema de Base de Datos

1. **Verificar `companyId` en Todas las Tablas**: Basado en el análisis del código y los errores actuales, es necesario asegurar que todas las tablas relevantes tengan la columna `companyId`. Las siguientes tablas parecen requerir comprobación:

   - **Tablas con errores actuales**:
     - `orderItems`: En línea 2135 hay un error porque falta `companyId` al insertar.
     - `vehicleLoadingItems`: En línea 2846-2850 hay un error porque falta `companyId` al insertar.
     - Varios formularios de inserción que intentan añadir campos que no están en el esquema.

   - **Esquema de Actualización**:
     Revisar el archivo `shared/schema.ts` para asegurarse de que todas las tablas relevantes incluyan el campo `companyId`. Ejemplo de definición correcta:

     ```typescript
     // En shared/schema.ts
     export const tableName = pgTable('table_name', {
       id: serial('id').primaryKey(),
       // Otras columnas...
       companyId: integer('company_id').notNull(), // Campo necesario para multi-tenant
     });
     ```

2. **Migrar Datos Existentes**: Utilizar el script `update-company-id.sql` para asegurar que todos los registros existentes tengan un `companyId` válido. Este script establece `company_id = 1` para todos los registros existentes en todas las tablas que tienen ese campo:

   ```sql
   -- update-company-id.sql
   DO $$
   DECLARE
       table_record RECORD;
   BEGIN
       FOR table_record IN 
           SELECT table_name 
           FROM information_schema.columns 
           WHERE column_name = 'company_id' 
           AND table_schema = 'public'
       LOOP
           EXECUTE format('UPDATE %I SET company_id = 1 WHERE TRUE', table_record.table_name);
           RAISE NOTICE 'Actualizada tabla: %', table_record.table_name;
       END LOOP;
   END $$;
   ```

   Para ejecutar este script, utilizar la herramienta de SQL proporcionada por Replit o ejecutar:
   
   ```bash
   psql $DATABASE_URL -f update-company-id.sql
   ```

### 4. Plan de Implementación Paso a Paso

#### Paso 1: Corregir el Error de `app is not defined`

1. Abrir `server/routes.ts`
2. Reemplazar todas las instancias de `app.METHOD("/api/ruta", ...)` por `router.METHOD("/ruta", ...)`
   
   Por ejemplo, la línea 1796:
   ```javascript
   // Cambiar esto:
   app.patch("/api/invoices/:id", async (req, res) => {
     // ...
   });
   
   // Por esto:
   router.patch("/invoices/:id", async (req, res) => {
     // ...
   });
   ```

   **Nota importante**: Observa que además de cambiar `app` por `router`, también se ha quitado el prefijo `/api/` de la ruta, ya que el router ya está montado en `/api` en `server/index.ts`.

3. Este cambio debe aplicarse a todas las rutas en el archivo que actualmente usan `app`, incluyendo:
   - Línea 1796: `app.patch("/api/invoices/:id", ...)`
   - Línea 1823: `app.patch("/api/invoices/:invoiceId/items/:itemId", ...)`
   - Línea 1851: `app.get("/api/products", ...)`
   - Línea 1875: `app.post("/api/products", ...)`
   - Y todas las demás instancias similares

4. Verificar que no queden referencias a `app` dentro de la función `registerRoutes`

#### Paso 2: Reforzar la Implementación de Filtrado Multi-Tenant

1. Mejorar la función `withCompany` en `server/company-db.ts` para:
   - Manejar correctamente diferentes tipos de consultas
   - Proporcionar mensajes de error más claros
   - Manejar joins y subconsultas

2. Verificar que todas las operaciones CRUD en los endpoints usen `companyDb` en lugar de `db` directamente

#### Paso 3: Probar y Validar

1. Usar el endpoint de prueba `/api/test-tenant/crud` para validar que:
   - Las inserciones incluyen automáticamente el `companyId`
   - Las consultas filtran correctamente por `companyId`
   - Las actualizaciones mantienen el `companyId`
   - Las eliminaciones solo afectan a los registros del tenant actual

## Conclusión

El sistema multi-tenant actual tiene una estructura sólida pero requiere correcciones específicas para funcionar correctamente. El error más urgente (uso de `app` en lugar de `router`) es relativamente simple de corregir pero hay que hacerlo de manera consistente en todo el archivo.

Una vez implementadas estas correcciones, el sistema podrá filtrar correctamente los datos por empresa (tenant), proporcionando el aislamiento de datos necesario en una aplicación multi-tenant.