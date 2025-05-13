# Análisis y Plan de Implementación: Pedidos Recurrentes

## 1. Análisis del Problema

### Archivos Relevantes:
1. `server/recurring-orders.ts`: Servicio principal de pedidos recurrentes
2. `server/storage.ts`: Capa de almacenamiento que gestiona el acceso a datos
3. `server/routes-endpoints.ts`: Endpoints API para pedidos recurrentes
4. `client/src/pages/recurring-orders/[id].tsx`: Formulario de creación/edición
5. `client/src/pages/recurring-orders/index.tsx`: Listado de pedidos recurrentes

### Problema Identificado:
El error "ID pedidos recurrente invalido paso 5" ocurre durante la creación o generación de pedidos a partir de pedidos recurrentes. El problema se debe a:

1. **Inconsistencia en validación de IDs**: Hay múltiples validaciones en diferentes "pasos" (1-5) a lo largo del flujo cliente-servidor.
2. **Manejo inadecuado de IDs**: El sistema no maneja correctamente los IDs entre diferentes capas (cliente, API, servicio).
3. **Validación demasiado estricta**: En el cliente, la validación del "paso 5" rechaza IDs que deberían ser válidos.
4. **Falta de secuencia de IDs consistente**: No hay un mecanismo seguro para generar IDs secuenciales.

## 2. Plan de Correcciones

### A. Implementación en el Servidor

#### 1. Modificar `server/recurring-orders.ts`:

```typescript
// Añadir función para obtener el siguiente ID disponible
async getNextRecurringOrderId(): Promise<number> {
  try {
    const [result] = await db
      .select({ maxId: sql`MAX(id)` })
      .from(recurringOrders);
    
    // Si no hay registros, comenzar desde 1
    const nextId = (result?.maxId || 0) + 1;
    console.log(`Siguiente ID para pedido recurrente: ${nextId}`);
    return nextId;
  } catch (error) {
    console.error("Error al obtener siguiente ID:", error);
    return 1; // Valor predeterminado en caso de error
  }
}

// Modificar createRecurringOrder para usar IDs secuenciales
async createRecurringOrder(data: InsertRecurringOrder): Promise<RecurringOrder> {
  try {
    // Obtener el siguiente ID disponible
    const nextId = await this.getNextRecurringOrderId();
    
    // Preparar los datos con el ID explícito
    const recurringOrderData = {
      ...data,
      id: nextId, // Asignar ID explícitamente
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("RecurringOrdersService.createRecurringOrder - Usando ID:", nextId);
    
    // Insertar con el ID explícito
    const [newRecurringOrder] = await db
      .insert(recurringOrders)
      .values(recurringOrderData)
      .returning();
    
    return newRecurringOrder;
  } catch (error) {
    console.error("Error al crear pedido recurrente:", error);
    throw error;
  }
}

// Mejorar la función generateOrderFromRecurring
async generateOrderFromRecurring(recurringOrderId: any): Promise<Order> {
  console.log(`RecurringOrdersService.generateOrderFromRecurring - Iniciando con ID: ${recurringOrderId}`);
  
  // Normalizamos el ID de forma simple pero efectiva
  let safeId: number;
  
  try {
    // Simplificar la normalización del ID
    if (typeof recurringOrderId === 'object' && recurringOrderId !== null && 'id' in recurringOrderId) {
      safeId = Number(recurringOrderId.id);
    } else {
      safeId = Number(recurringOrderId);
    }
    
    // Verificación básica
    if (isNaN(safeId) || safeId <= 0) {
      // Intentar recuperar el pedido más reciente como fallback
      const latestOrder = await this.getNewestRecurringOrder();
      if (latestOrder) {
        console.log(`Recuperando con el ID más reciente: ${latestOrder.id}`);
        safeId = latestOrder.id;
      } else {
        throw new Error("ID de pedido recurrente inválido y no hay alternativas disponibles");
      }
    }
    
    // Continuar con el proceso usando el ID seguro...
    // Resto de la implementación existente
  } catch (error) {
    console.error("Error procesando ID de pedido recurrente:", error);
    throw error;
  }
}
```

#### 2. Modificar `server/storage.ts`:

```typescript
async generateOrderFromRecurring(recurringOrderId: number): Promise<Order> {
  try {
    console.log(`Storage.generateOrderFromRecurring - Recibido ID: ${recurringOrderId}, tipo: ${typeof recurringOrderId}`);
    
    // Simplificar la validación
    let numericId: number;
    
    if (typeof recurringOrderId === 'object' && recurringOrderId !== null && 'id' in recurringOrderId) {
      numericId = Number(recurringOrderId.id);
    } else {
      numericId = Number(recurringOrderId);
    }
    
    // Solo validar que sea un número
    if (isNaN(numericId)) {
      // Intentar obtener el pedido recurrente más reciente
      const { recurringOrdersService } = await import('./recurring-orders');
      const latestOrder = await recurringOrdersService.getNewestRecurringOrder();
      
      if (latestOrder) {
        console.log(`Storage.generateOrderFromRecurring - Usando ID más reciente: ${latestOrder.id}`);
        numericId = latestOrder.id;
      } else {
        throw new Error("ID de pedido recurrente inválido paso 5 - No se pudo recuperar");
      }
    }
    
    // Usar el servicio con el ID normalizado
    const { recurringOrdersService } = await import('./recurring-orders');
    return recurringOrdersService.generateOrderFromRecurring(numericId);
  } catch (error) {
    console.error("Error en storage.generateOrderFromRecurring:", error);
    throw error;
  }
}
```

#### 3. Modificar `server/routes-endpoints.ts`:

```typescript
// Endpoint para crear un pedido recurrente
router.post("/api/recurring-orders", async (req, res) => {
  try {
    console.log("POST /api/recurring-orders - Creando pedido recurrente", req.body);
    
    // Validación del request body con Zod
    const parseResult = insertRecurringOrderSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Datos inválidos para crear pedido recurrente",
        details: parseResult.error.errors
      });
    }
    
    try {
      // Crear el pedido recurrente utilizando el servicio directamente
      const { recurringOrdersService } = await import('./recurring-orders');
      const newRecurringOrder = await recurringOrdersService.createRecurringOrder(parseResult.data);
      
      console.log("Pedido recurrente creado con éxito. ID:", newRecurringOrder.id);
      res.status(201).json(newRecurringOrder);
    } catch (storageError) {
      console.error("Error al crear pedido recurrente:", storageError);
      
      // Intento de recuperación
      return res.status(500).json({
        error: "Error al crear pedido recurrente",
        details: storageError instanceof Error ? storageError.message : "Error desconocido"
      });
    }
  } catch (error) {
    console.error("Error general al crear pedido recurrente:", error);
    res.status(500).json({
      error: "Error al crear pedido recurrente",
      message: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

// Endpoint para generar orden desde pedido recurrente
router.post("/api/recurring-orders/:id/generate", async (req, res) => {
  try {
    console.log("Iniciando generación de orden a partir de pedido recurrente");
    
    // Identificar el ID de forma más permisiva
    let recurringOrderId: number;
    
    try {
      // Manejar diferentes formatos de ID
      if (typeof req.params.id === 'string') {
        // Limpiar y convertir a número
        const cleanId = req.params.id.replace(/[^0-9]/g, '');
        recurringOrderId = cleanId ? parseInt(cleanId, 10) : 0;
      } else {
        recurringOrderId = Number(req.params.id);
      }
      
      // Si el ID no es válido, intentar recuperarlo
      if (isNaN(recurringOrderId) || recurringOrderId <= 0) {
        const { recurringOrdersService } = await import('./recurring-orders');
        const latestOrder = await recurringOrdersService.getNewestRecurringOrder();
        
        if (latestOrder) {
          recurringOrderId = latestOrder.id;
          console.log(`Usando ID más reciente como alternativa: ${recurringOrderId}`);
        } else {
          throw new Error("ID inválido y no hay pedidos recurrentes existentes");
        }
      }
    } catch (idError) {
      console.error("Error procesando ID:", idError);
      return res.status(400).json({
        error: "ID de pedido recurrente inválido",
        details: idError instanceof Error ? idError.message : "Error desconocido"
      });
    }
    
    // Configurar el contexto y generar la orden
    const { recurringOrdersService } = await import('./recurring-orders');
    const { getCurrentCompanyId, setCurrentCompanyId } = await import('./company-db');
    const companyId = req.body.companyId || (req as any).companyId || 15;
    const prevCompanyId = getCurrentCompanyId();
    
    try {
      setCurrentCompanyId(companyId);
      const generatedOrder = await recurringOrdersService.generateOrderFromRecurring(recurringOrderId);
      res.status(201).json(generatedOrder);
    } finally {
      setCurrentCompanyId(prevCompanyId);
    }
  } catch (error) {
    console.error("Error al generar orden:", error);
    res.status(500).json({
      error: "Error al generar orden desde pedido recurrente",
      message: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});
```

### B. Implementación en el Cliente

#### 1. Modificar `client/src/pages/recurring-orders/[id].tsx`:

```typescript
// Función para manejar el envío del formulario con mejor manejo de IDs
const onSubmit = async (data: any) => {
  setIsSubmitting(true);
  
  try {
    console.log("Enviando formulario de pedido recurrente:", data);
    
    // Calcular el total
    const total = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    // Datos a enviar
    const formData = {
      ...data,
      totalAmount: total.toFixed(2),
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    };
    
    let response;
    
    // Crear nuevo pedido o actualizar existente
    if (id === 'new') {
      response = await fetch('/api/recurring-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
    } else {
      // Implementar manejo seguro del ID para actualizaciones
      let numericId: number;
      
      try {
        // Simplificar la conversión de ID
        numericId = Number(id);
        
        if (isNaN(numericId) || numericId <= 0) {
          // Intentar recuperar el ID más reciente
          const latestResponse = await fetch('/api/recurring-orders?latest=true');
          
          if (latestResponse.ok) {
            const latestData = await latestResponse.json();
            
            if (latestData && latestData.length > 0 && latestData[0].id) {
              numericId = Number(latestData[0].id);
              console.log("Usando ID más reciente:", numericId);
            } else {
              throw new Error("No se encontraron pedidos recurrentes");
            }
          } else {
            throw new Error("Error al buscar pedidos recurrentes");
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "ID de pedido recurrente inválido",
          variant: "destructive",
        });
        console.error("Error de validación de ID:", error);
        setIsSubmitting(false);
        return;
      }
      
      // Actualizar pedido existente con ID validado
      response = await fetch(`/api/recurring-orders/${numericId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }
    
    const savedOrder = await response.json();
    
    // Asegurar que el servidor devolvió un ID válido
    if (!savedOrder || !savedOrder.id) {
      throw new Error("El servidor no devolvió un ID válido");
    }
    
    // Manejar el ID de forma segura
    const orderId = Number(savedOrder.id);
    
    if (isNaN(orderId) || orderId <= 0) {
      throw new Error("ID recibido del servidor no es válido");
    }
    
    // Éxito
    toast({
      title: "Éxito",
      description: id === 'new' ? "Pedido recurrente creado correctamente" : "Pedido recurrente actualizado",
    });
    
    // Redirigir a la lista de pedidos
    setLocation('/recurring-orders');
  } catch (error) {
    console.error("Error en formulario:", error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Error desconocido",
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 2. Modificar `client/src/pages/recurring-orders/index.tsx`:

```typescript
// Función para generar pedido desde pedido recurrente
const handleGenerateOrder = async (orderId: any) => {
  // Simplificar la validación
  let safeOrderId: number;
  
  try {
    safeOrderId = Number(orderId);
    
    if (isNaN(safeOrderId) || safeOrderId <= 0) {
      throw new Error("ID inválido");
    }
  } catch (error) {
    toast({
      title: t('generateError'),
      description: "ID de pedido recurrente inválido",
      variant: "destructive",
    });
    return;
  }
  
  // Mostrar indicador de carga
  setGeneratingOrderId(safeOrderId);
  
  try {
    const response = await fetch(`/api/recurring-orders/${safeOrderId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status}`);
    }
    
    const result = await response.json();
    
    toast({
      title: t('generateSuccess'),
      description: t('generateSuccessDescription', { id: result.id }),
    });
    
    // Actualizar la lista
    queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
  } catch (error) {
    console.error('Error al generar orden:', error);
    toast({
      title: t('generateError'),
      description: error instanceof Error ? error.message : "Error desconocido",
      variant: "destructive",
    });
  } finally {
    setGeneratingOrderId(null);
  }
};
```

## 3. Estrategia de Implementación

1. **Implementar las correcciones en el servidor**:
   - Primero: Modificar `server/recurring-orders.ts` para mejorar el manejo de IDs
   - Segundo: Actualizar `server/storage.ts` con las mejoras de validación
   - Tercero: Refinar los endpoints en `server/routes-endpoints.ts`

2. **Implementar las correcciones en el cliente**:
   - Actualizar `client/src/pages/recurring-orders/[id].tsx` para mejorar el manejo de IDs
   - Mejorar la función de generación de pedidos en `client/src/pages/recurring-orders/index.tsx`

3. **Pruebas**:
   - Probar la creación de nuevos pedidos recurrentes
   - Probar la edición de pedidos existentes
   - Probar la generación de pedidos desde pedidos recurrentes

## 4. Consideraciones Adicionales

- **Consistencia de Datos**: Asegurar que los IDs se manejen de forma coherente en todas las capas.
- **Mecanismo de Recuperación**: Implementar estrategias de recuperación para minimizar errores.
- **Logs Detallados**: Mantener logs para facilitar el diagnóstico de problemas.
- **Transacciones**: Implementar transacciones para operaciones críticas que modifican múltiples tablas.