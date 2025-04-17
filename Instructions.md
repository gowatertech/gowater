# Diagnóstico y Solución para el Problema de Visualización de Productos en Facturas

## Problema Identificado

Se ha detectado un problema en la vista de facturación donde los productos asociados a las facturas de las empresas no se están mostrando correctamente. El análisis del código muestra varios problemas potenciales:

### 1. Problema Principal: Falta de filtrado correcto por Company ID

El principal problema identificado es que la consulta que obtiene los items de una factura no está correctamente aplicando el filtro por `companyId`. En la tabla `invoiceItems`, cada registro tiene un campo `companyId` que debe filtrarse adecuadamente para el tenant (empresa) actual.

### 2. Inconsistencias en la Implementación Multi-Tenant

- La ruta `/api/invoices/:id/items` utiliza el objeto `db` directamente en lugar de usar `companyDb` para las consultas.
- Las consultas no aplican correctamente el filtro `withCompany()` al realizar joins entre tablas.
- Cuando se crean nuevos items para una factura, no se está incluyendo el campo `companyId` en los datos insertados.

### 3. Otros Problemas Identificados

- El sistema multi-tenant utiliza un enfoque de bases de datos compartidas (shared database) donde cada tabla tiene un campo `companyId` para filtrar los datos por empresa.
- La implementación del middleware `companyDbMiddleware` configura el companyId en el contexto, pero algunas operaciones SQL directas no lo están utilizando.

## Plan de Solución

### 1. Corregir la consulta GET de items de factura

La ruta actual GET `/api/invoices/:id/items` debe modificarse para incluir el filtro de `companyId`:

```typescript
router.get("/invoices/:id/items", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    // Obtener el companyId del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ error: "ID de empresa no encontrado en el contexto" });
    }
    
    const items = await db
      .select({
        id: invoiceItems.id,
        invoiceId: invoiceItems.invoiceId,
        productId: invoiceItems.productId,
        quantity: invoiceItems.quantity,
        price: invoiceItems.price,
        total: invoiceItems.total,
        productName: products.name,
        isReturnable: products.isReturnable,
        depositAmount: products.depositAmount,
        productIcon: products.icon
      })
      .from(invoiceItems)
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .where(and(
        eq(invoiceItems.invoiceId, invoiceId),
        eq(invoiceItems.companyId, companyId)
      ));

    res.json(items);
  } catch (error) {
    console.error("Error al obtener items de factura:", error);
    res.status(500).json({ error: String(error) });
  }
});
```

### 2. Corregir la creación de items de factura

La ruta POST `/api/invoices/:id/items` debe incluir el `companyId` al crear nuevos items:

```typescript
router.post("/invoices/:id/items", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { productId, quantity, price } = req.body;
    // Obtener el companyId del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ error: "ID de empresa no encontrado en el contexto" });
    }

    // Validar datos básicos
    if (!productId || !quantity || !price) {
      return res.status(400).json({ error: "Faltan datos requeridos: productId, quantity, price" });
    }

    // Convertir a valores numéricos
    const numPrice = parseFloat(price);
    const numQuantity = parseInt(quantity);
    
    // Calcular el total
    const total = (numPrice * numQuantity).toFixed(2);
    
    // Guardar directamente en la base de datos, incluyendo companyId
    const [item] = await db
      .insert(invoiceItems)
      .values({
        invoiceId,
        productId,
        quantity: numQuantity,
        price,
        total,
        companyId // Añadir companyId
      })
      .returning();

    // Actualizar el total de la factura
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, companyId)
      ));

    if (invoice) {
      const newTotal = (parseFloat(invoice.total) + parseFloat(total)).toFixed(2);
      await db
        .update(invoices)
        .set({ total: newTotal })
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.companyId, companyId)
        ));
    }

    console.log("Item de factura creado:", item);
    res.json(item);
  } catch (error) {
    console.error("Error al crear item de factura:", error);
    res.status(500).json({ error: String(error) });
  }
});
```

### 3. Mejora del Middleware Multi-Tenant

Si bien esto no es estrictamente necesario para resolver el problema inmediato, podemos mejorar la función `withCompany()` para manejar mejor los joins:

```typescript
// Mejora en company-db.ts
export function withCompany(query: any): any {
  const companyId = getCurrentCompanyId();
  
  if (!companyId) {
    console.warn("No se encontró companyId en el contexto para la consulta");
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
      console.warn(`La consulta no tiene método where() disponible. Tipo de consulta: ${typeof query}`);
      return query;
    }
    
    // En Drizzle ORM, aplicar el filtro
    return query.where(eq(`${tableName}.companyId`, companyId));
  } catch (error) {
    console.error("Error al aplicar filtro de companyId:", error);
    // Como último recurso, devolver la consulta sin filtro
    return query;
  }
}
```

### 4. Verificar la Creación de Facturas

Asegurarnos de que todas las inserciones en la tabla de facturas incluyan el `companyId`:

```typescript
// Ejemplo de corrección para la creación de facturas
router.post("/invoices", async (req, res) => {
  try {
    // Obtener companyId del contexto
    const companyId = getCurrentCompanyId();
    
    if (!companyId) {
      return res.status(400).json({ error: "ID de empresa no encontrado en el contexto" });
    }
    
    // Validar datos con Zod
    const validationResult = insertInvoiceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    
    // Crear factura incluyendo companyId
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...validationResult.data,
        companyId, // Añadir companyId
        date: new Date(),
      })
      .returning();
    
    res.status(201).json(invoice);
  } catch (error) {
    console.error("Error al crear factura:", error);
    res.status(500).json({ error: String(error) });
  }
});
```

## Implementación del Plan

Para implementar esta solución, debemos:

1. Modificar la ruta GET `/api/invoices/:id/items` para incluir el filtro por `companyId`.
2. Actualizar la ruta POST `/api/invoices/:id/items` para incluir `companyId` al crear nuevos items.
3. Opcionalmente, mejorar la función `withCompany()` para manejar mejor los joins entre tablas.
4. Revisar todas las inserciones en la tabla de facturas para asegurarse de que incluyan el `companyId`.

Esta solución debería permitir que los productos asociados a las facturas se muestren correctamente en la vista de facturación, respetando la separación de datos entre empresas en el sistema multi-tenant.