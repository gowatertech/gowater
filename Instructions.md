# Análisis y Solución: Implementación y Corrección de Rutas y Pedidos Pendientes por Zona en Sistema Multi-Tenant

## 1. Análisis del Problema

Después de un análisis exhaustivo del código, he identificado los siguientes problemas que están afectando la obtención de pedidos pendientes por zona en el sistema multi-tenant:

### 1.1. Problemas en la Obtención de CompanyId

1. **Inconsistencia en la Obtención del CompanyId:** 
   - En el endpoint `/api/zones/:id/pending-orders`, el sistema intenta recuperar el `companyId` de múltiples fuentes pero puede fallar si el contexto se pierde:
     ```javascript
     let companyId = getCurrentCompanyId();
     if (!companyId && req.session?.companyId) {
       companyId = req.session.companyId;
     }
     ```
   - Si no se encuentra el `companyId`, devuelve un error: "Acceso denegado" sin ofrecer alternativas.

2. **Problemas con el Ciclo de Vida del Contexto:**
   - El middleware `consolidatedCompanyMiddleware` está configurado para establecer el `companyId` en el contexto, pero cuando hay múltiples peticiones simultáneas, el contexto puede perderse o mezclarse.
   - Los logs muestran: "Limpiando companyId del contexto" frecuentemente, lo que indica que hay problemas con la persistencia del contexto.

3. **Debug Mode Inconsistente:**
   - El modo debug para desarrollo no está completamente implementado, lo que dificulta las pruebas.

### 1.2. Problemas con el Filtrado de Datos por Zona

1. **Filtrado Incompleto por Compañía:**
   - Al recuperar los clientes de una zona, se aplica el filtro `companyId` correctamente, pero podría mejorarse:
     ```javascript
     const zoneCustomers = await db
       .select({
         id: customers.id,
         name: customers.businessname
       })
       .from(customers)
       .where(
         and(
           eq(customers.zoneid, zoneId),
           eq(customers.companyId, companyId)
         )
       );
     ```

2. **Verificación de Zonas por Compañía:**
   - La verificación de que la zona pertenezca a la compañía es correcta, pero la respuesta cuando no pertenece es un array vacío en lugar de un error más descriptivo.

## 2. Solución Propuesta

### 2.1. Mejora del Middleware Multi-tenant

1. **Reforzar el `consolidatedCompanyMiddleware`:**
   - Agregar logs más detallados para diagnosticar problemas.
   - Mejorar el manejo de casos especiales como la ruta de pedidos pendientes.

   ```javascript
   // En server/middleware/consolidated-company.middleware.ts
   export function consolidatedCompanyMiddleware(req: Request, res: Response, next: NextFunction) {
     // Log para depuración
     console.log(`[Company Middleware] Procesando ruta: ${req.path}`);
     
     // Para rutas de plataforma, no alteramos nada
     if (req.path.startsWith('/api/platform') || req.path === '/api/login' || req.path === '/api/logout') {
       console.log(`[Company Middleware] Ruta excluida: ${req.path}`);
       return next();
     }

     // Resto del código actual...

     // Mejorar el manejo del modo debug
     const isDebugMode = (
       req.path.includes('/zones/') && 
       req.path.includes('/pending-orders') && 
       (req.query.debug === 'true' || process.env.NODE_ENV === 'development')
     );
     
     if (isDebugMode && !companyId) {
       console.log(`[Company Middleware] Modo debug activado para ${req.path}. Buscando compañía alternativa...`);
       
       // En modo debug, intentar obtener una compañía válida para pruebas
       // pero SOLO si estamos en entorno de desarrollo
       if (process.env.NODE_ENV === 'development') {
         // No asignamos un valor hardcodeado, sino que dejamos que el endpoint
         // maneje la situación según sus propias reglas
         console.log(`[Company Middleware] En desarrollo, permitiendo continuar sin companyId para pruebas`);
       }
     }
     
     // Resto del código actual...
   }
   ```

### 2.2. Corrección del Endpoint de Pedidos Pendientes por Zona

1. **Mejorar el manejo de errores y el modo debug:**
   ```javascript
   // En server/routes.ts, endpoint /api/zones/:id/pending-orders
   router.get("/api/zones/:id/pending-orders", async (req, res) => {
     try {
       console.log("🔍 Iniciando búsqueda de pedidos pendientes por zona...");
       
       const zoneId = parseInt(req.params.id);
       if (isNaN(zoneId)) {
         return res.status(400).json({ error: "ID de zona inválido" });
       }
       
       // Intentar obtener companyId con mejor manejo de errores
       let companyId = getCurrentCompanyId();
       let companyIdSource = "contexto";
       console.log("🔄 CompanyId del contexto:", companyId);
       
       // Verificar si es una solicitud en modo debug
       const isDebugMode = req.query.debug === 'true' || process.env.NODE_ENV === 'development';
       
       if (!companyId) {
         // Si no está en el contexto, intentar obtenerlo de la sesión
         if (req.session?.companyId) {
           companyId = req.session.companyId;
           companyIdSource = "sesión";
           console.log("🔄 CompanyId obtenido de la sesión:", companyId);
         } 
         // Si no está en la sesión, intentar obtenerlo del usuario en sesión
         else if (req.session?.user?.companyId) {
           companyId = req.session.user.companyId;
           companyIdSource = "usuario en sesión";
           console.log("🔄 CompanyId obtenido del usuario en sesión:", companyId);
         }
       }
       
       // Si aún no tenemos companyId y estamos en modo de depuración
       if (!companyId && isDebugMode) {
         console.log("🔧 MODO DEBUG: No se encontró companyId. Intentando obtenerlo de los parámetros de consulta...");
         
         // Intentar obtener de query params para pruebas
         if (req.query.companyId) {
           companyId = parseInt(req.query.companyId as string);
           if (!isNaN(companyId)) {
             companyIdSource = "parámetros de consulta (debug)";
             console.log(`🔧 MODO DEBUG: Usando companyId=${companyId} de los parámetros de consulta`);
           }
         }
       }
       
       if (!companyId) {
         console.error("❌ Error: No se encontró companyId en ninguna fuente para obtener pedidos pendientes por zona");
         
         if (isDebugMode) {
           // En modo debug, mostrar información detallada pero no devolver datos sensibles
           return res.status(403).json({
             error: "Acceso denegado (modo debug)",
             message: "No se ha encontrado un contexto de compañía válido incluso en modo debug.",
             debug: {
               isDebugMode,
               session: req.session ? true : false,
               user: req.session?.user ? true : false
             }
           });
         }
         
         return res.status(403).json({ 
           error: "Acceso denegado", 
           message: "No se ha encontrado un contexto de compañía válido. Por favor inicie sesión nuevamente."
         });
       }
       
       // Resto del código actual para buscar pedidos...
     } catch (error) {
       console.error("Error al obtener pedidos pendientes por zona:", error);
       res.status(500).json({ error: String(error) });
     }
   });
   ```

2. **Mejorar la respuesta cuando no hay zonas o clientes:**
   ```javascript
   // En la verificación de zona existente
   if (zonaExiste.length === 0) {
     console.error(`❌ La zona ${zoneId} no pertenece a la compañía ${companyId}`);
     return res.status(404).json({ 
       error: "Zona no encontrada", 
       message: `La zona con ID ${zoneId} no existe o no pertenece a la compañía actual.`
     });
   }
   
   // En la verificación de clientes en la zona
   if (zoneCustomers.length === 0) {
     console.log(`⚠️ No hay clientes en la zona ${zoneId} para la compañía ${companyId}`);
     return res.status(200).json({ 
       message: "No hay clientes en esta zona", 
       data: []
     });
   }
   ```

### 2.3. Mejoras en el Componente Frontend

1. **Mejorar el manejo de errores en `ZoneBasedRouteForm.tsx`:**
   ```javascript
   const {
     data: pendingOrders = [],
     isLoading: isLoadingPendingOrders,
     error: pendingOrdersError,
     refetch: refetchPendingOrders
   } = useQuery<PendingOrder[]>({
     queryKey: ["/api/zones", selectedZone, "pending-orders"],
     queryFn: async () => {
       if (!selectedZone) return [];
       
       setAuthError(null); // Limpiar errores anteriores
       
       try {
         // Primero verificar si hay sesión activa
         const userResponse = await apiRequest("GET", "/api/user");
         
         if (!userResponse.ok) {
           setAuthError("Error de autenticación: Por favor inicie sesión nuevamente.");
           throw new Error("No hay sesión activa");
         }
         
         // Si hay sesión, intentar obtener pedidos pendientes
         const response = await apiRequest("GET", `/api/zones/${selectedZone}/pending-orders`);
         
         if (!response.ok) {
           // Manejar diferentes tipos de errores
           const errorStatus = response.status;
           
           if (errorStatus === 403 || errorStatus === 401) {
             setAuthError("Error de autenticación: No tiene acceso a esta zona o la sesión ha expirado.");
             throw new Error("Error de autenticación");
           } else if (errorStatus === 404) {
             return []; // Zona no encontrada, devolver array vacío
           } else {
             throw new Error(`Error ${errorStatus} al obtener pedidos pendientes`);
           }
         }
         
         return await response.json();
       } catch (error) {
         console.error("Error obteniendo pedidos pendientes:", error);
         throw error;
       }
     },
     enabled: !!selectedZone
   });
   ```

## 3. Pasos para la Implementación

### 3.1 Mejorar el Middleware Consolidado

1. Actualizar `server/middleware/consolidated-company.middleware.ts` con las mejoras propuestas para el manejo del contexto multi-tenant.

### 3.2 Corregir el Endpoint de Pedidos Pendientes por Zona

1. Actualizar el endpoint `/api/zones/:id/pending-orders` en `server/routes.ts` con el manejo mejorado de errores y el modo debug.

### 3.3 Mejorar el Componente Frontend

1. Modificar `client/src/components/routes/ZoneBasedRouteForm.tsx` para manejar mejor los errores y proporcionar información clara al usuario.

## 4. Consideraciones Adicionales

1. **Herramienta de Diagnóstico:** Crear un endpoint de diagnóstico para verificar el estado del contexto multi-tenant:
   ```javascript
   // En server/routes.ts
   router.get("/api/diagnostic/context", (req, res) => {
     const companyId = getCurrentCompanyId();
     const sessionCompanyId = req.session?.companyId;
     const userCompanyId = req.session?.user?.companyId;
     
     res.json({
       contextCompanyId: companyId,
       sessionCompanyId: sessionCompanyId,
       userCompanyId: userCompanyId,
       isAuthenticated: !!req.session?.user,
       sessionExists: !!req.session
     });
   });
   ```

2. **Utilidades de Logging:** Implementar una función helper para logging consistente:
   ```javascript
   // En server/utils/logging.ts
   export function logCompanyContext(location: string, companyId: number | undefined, details: any = {}) {
     console.log(`[${location}] CompanyId=${companyId || 'NONE'}, Details:`, details);
   }
   ```

## 5. Pruebas y Validación

1. **Prueba 1: Verificar Contexto Multi-tenant**
   - Iniciar sesión como usuario de compañía
   - Acceder al endpoint de diagnóstico
   - Verificar que `contextCompanyId` coincide con `sessionCompanyId`

2. **Prueba 2: Obtener Pedidos Pendientes por Zona**
   - Iniciar sesión como usuario de compañía
   - Seleccionar una zona existente
   - Verificar que se muestran los pedidos pendientes correctamente

3. **Prueba 3: Manejo de Errores**
   - Intentar acceder a una zona inexistente
   - Verificar que se muestra un mensaje de error adecuado
   - Cerrar sesión y verificar que no se puede acceder a los pedidos pendientes

4. **Prueba 4: Modo Debug**
   - En entorno de desarrollo, acceder a `/api/zones/:id/pending-orders?debug=true`
   - Verificar que se proporciona información de diagnóstico útil