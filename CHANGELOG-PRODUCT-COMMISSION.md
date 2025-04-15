# Cambios para el Campo de Comisión de Productos

## Resumen

Se ha añadido un campo `hasCommission` (S/N) a los productos, donde:
- "S" (true) indica que el producto tiene comisión 
- "N" (false) indica que el producto no tiene comisión

Todos los productos existentes han sido actualizados con el valor predeterminado "S" (true).

## Cambios realizados

### 1. Modificación de la base de datos

Se añadió la columna `has_commission` a la tabla `products`:

```sql
ALTER TABLE products ADD COLUMN has_commission BOOLEAN NOT NULL DEFAULT true;
```

### 2. Actualización del endpoint GET /api/products

Se modificó el endpoint para incluir el campo `hasCommission` en la respuesta:

```javascript
app.get("/api/products", async (req, res) =>{
  try {
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        stock: products.stock,
        icon: products.icon,
        isReturnable: products.isReturnable,
        depositAmount: products.depositAmount,
        hasCommission: products.hasCommission  // Campo añadido
      })
      .from(products)
      .orderBy(products.name);

    console.log("GET /api/products - Retornando:", allProducts.length, "productos");
    res.json(allProducts);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: String(error) });
  }
});
```

### 3. Endpoint para actualizar todos los productos

Se utilizó el endpoint existente `/api/products/update-all-commission` para actualizar todos los productos con `hasCommission = true`:

```javascript
// Endpoint para actualizar todos los productos existentes, estableciendo hasCommission = true
app.post("/api/products/update-all-commission", async (req, res) => {
  try {
    console.log("POST /api/products/update-all-commission - Iniciando actualización de comisiones");
    
    // Obtener todos los productos
    const allProducts = await db.select().from(products);
    console.log(`Encontrados ${allProducts.length} productos para actualizar.`);
    
    // Contador para productos actualizados
    let updatedCount = 0;
    let alreadyUpdatedCount = 0;
    
    // Actualizar cada producto
    for (const product of allProducts) {
      // Solo actualizar si hasCommission no está establecido como true
      if (product.hasCommission !== true) {
        const result = await db
          .update(products)
          .set({ hasCommission: true })
          .where(eq(products.id, product.id))
          .returning();
        
        if (result.length > 0) {
          updatedCount++;
          console.log(`Producto ID ${product.id} (${product.name}) actualizado a hasCommission = true (S)`);
        }
      } else {
        alreadyUpdatedCount++;
        console.log(`Producto ID ${product.id} (${product.name}) ya tiene hasCommission = true (S)`);
      }
    }
    
    console.log(`Proceso completado. Se actualizaron ${updatedCount} productos. ${alreadyUpdatedCount} productos ya tenían hasCommission = true`);
    
    res.json({ 
      success: true, 
      message: `Se actualizaron ${updatedCount} productos. ${alreadyUpdatedCount} productos ya tenían hasCommission = true`,
      totalProducts: allProducts.length,
      updatedProducts: updatedCount,
      alreadyUpdatedProducts: alreadyUpdatedCount
    });
  } catch (error) {
    console.error("Error durante la actualización de comisiones:", error);
    res.status(500).json({ 
      success: false,
      error: String(error) 
    });
  }
});
```

## Verificación

Se verificó que:
1. El endpoint GET `/api/products` devuelve correctamente el campo `hasCommission`
2. Todos los productos tienen ahora `hasCommission = true`
3. La interfaz de usuario muestra correctamente el campo de comisión (S/N) en los productos

## Próximos pasos

- Implementar filtrado de productos por comisión en la interfaz de usuario (si se requiere)
- Añadir reportes o análisis basados en productos con comisión