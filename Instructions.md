# Instrucciones para implementar Login Móvil con soporte Multi-Tenant

## Análisis del problema

Después de una revisión a fondo del código fuente, he identificado que el sistema necesita implementar una funcionalidad de autenticación específica para la aplicación móvil que respete la arquitectura multi-tenant (multi-empresa).

### Problemas encontrados

1. **Ausencia de endpoint de login móvil**: Existe un endpoint `/api/platform/platform-login` para autenticar usuarios de la plataforma, pero no hay un endpoint específico para que los usuarios móviles (conductores, asistentes) inicien sesión.

2. **Gestión de tenant en sesiones móviles**: El middleware `mobileApiTenantMiddleware` asigna por defecto el `companyId = 1` para desarrollo, pero necesitamos una solución real que asigne correctamente la empresa basada en el usuario autenticado.

3. **Interfaz de login en app móvil**: No hay una interfaz de usuario para que los conductores inicien sesión en la aplicación móvil.

4. **Manejo del contexto de autenticación**: Necesitamos un mecanismo para mantener la sesión en la aplicación móvil y manejar adecuadamente el `companyId`.

## Plan de implementación

### 1. Crear endpoint de autenticación móvil

Añadir un nuevo endpoint en `server/routes/mobile-api.ts` para manejar la autenticación de usuarios móviles, extrayendo la empresa del usuario y configurando la sesión correctamente.

```typescript
// En el archivo server/routes/mobile-api.ts, dentro de createMobileApiEndpoints()

/**
 * POST /api/mobile/login
 * Endpoint para autenticar usuarios en la app móvil
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, companyId } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Usuario y contraseña son requeridos" 
      });
    }
    
    // Si se proporciona companyId, usarlo para filtrar
    let userQuery = db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    if (companyId) {
      userQuery = userQuery.where(eq(users.companyId, companyId));
    }
    
    const [user] = await userQuery;
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Credenciales inválidas" 
      });
    }
    
    // Verificar contraseña con bcrypt
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        message: "Credenciales inválidas" 
      });
    }
    
    if (!user.active) {
      return res.status(403).json({ 
        success: false,
        message: "Usuario inactivo" 
      });
    }
    
    // Verificar roles permitidos para la app móvil (driver, assistant)
    const allowedRoles = ['driver', 'assistant', 'admin', 'supervisor'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Este usuario no tiene permiso para acceder a la app móvil"
      });
    }
    
    // Establecer la sesión
    req.session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      companyId: user.companyId, // Aseguramos que companyId está en la sesión
    };
    
    // También establecemos el companyId a nivel de sesión para el middleware
    req.session.companyId = user.companyId;
    
    // No devolver la contraseña en la respuesta
    const { password: pwd, ...userWithoutPassword } = user;
    
    console.log(`MobileAPI - Login exitoso para usuario ${username} (ID: ${user.id}, Empresa: ${user.companyId})`);
    
    res.json({
      success: true,
      message: "Login exitoso",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Error en login móvil:", error);
    res.status(500).json({ 
      success: false,
      message: "Error de servidor al procesar el login",
      details: String(error)
    });
  }
});

/**
 * POST /api/mobile/logout
 * Endpoint para cerrar sesión en la app móvil
 */
router.post('/logout', (req, res) => {
  // Destruir la sesión
  req.session.destroy((err) => {
    if (err) {
      console.error("Error al cerrar sesión:", err);
      return res.status(500).json({ 
        success: false,
        message: "Error al cerrar sesión" 
      });
    }
    
    res.json({ 
      success: true,
      message: "Sesión cerrada correctamente" 
    });
  });
});

/**
 * GET /api/mobile/me
 * Obtener información del usuario autenticado
 */
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ 
      success: false,
      message: "No autenticado" 
    });
  }
  
  res.json({
    success: true,
    user: req.session.user
  });
});
```

### 2. Modificar el middleware tenant para usar la sesión correctamente

Modificar el middleware `mobileApiTenantMiddleware` para que respete la sesión del usuario autenticado:

```typescript
// En el archivo server/routes/mobile-api.ts

const mobileApiTenantMiddleware = (req: Request, res: Response, next: any) => {
  // Si el usuario está autenticado, usar su companyId
  if (req.session.user && req.session.user.companyId) {
    req.session.companyId = req.session.user.companyId;
    console.log(`MobileAPI - Usando companyId del usuario autenticado: ${req.session.companyId}`);
  } 
  // Si hay un companyId en la solicitud, usarlo
  else if (req.query.companyId) {
    req.session.companyId = parseInt(req.query.companyId as string);
    console.log(`MobileAPI - Usando companyId de query parameter: ${req.session.companyId}`);
  }
  else if (req.body && req.body.companyId) {
    req.session.companyId = req.body.companyId;
    console.log(`MobileAPI - Usando companyId de body: ${req.session.companyId}`);
  }
  // Modo desarrollo/demostración
  else if (!req.session.companyId) {
    // En entorno de producción, esto debería redirigir a la página de login
    // pero para desarrollo asignamos un valor predeterminado
    req.session.companyId = 1;
    console.log(`MobileAPI - ADVERTENCIA: Asignando companyId por defecto: ${req.session.companyId}`);
  }
  
  next();
};
```

### 3. Crear componente de Login para la aplicación móvil

Vamos a crear un componente de login para la aplicación móvil:

1. Crear el archivo `client/src/pages/mobile-app/login/index.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2, LogIn } from "lucide-react";

// Esquema de validación para el formulario
const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
  companyId: z.number().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function MobileAppLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, fetchUser } = useCurrentUser();
  
  // Redireccionar si ya hay un usuario autenticado
  useEffect(() => {
    if (user) {
      setLocation("/mobile-app");
    }
  }, [user, setLocation]);
  
  // Configurar el formulario
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Manejar el envío del formulario
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/mobile/login', data);
      
      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido, ${result.user.name}`,
        });
        
        // Actualizar el estado del usuario actual
        await fetchUser();
        
        // Redireccionar al dashboard móvil
        setLocation("/mobile-app");
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: error.message || "Credenciales inválidas",
        });
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al intentar iniciar sesión",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 text-white border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-2xl font-bold">
            Iniciar Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Usuario</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ingrese su usuario"
                        className="bg-gray-700 border-gray-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Ingrese su contraseña"
                        className="bg-gray-700 border-gray-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center pt-0 pb-4">
          <p className="text-sm text-gray-400">
            Acceso exclusivo para conductores y personal autorizado
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### 4. Actualizar el componente App.tsx para incluir la ruta de login móvil

Modificar el archivo `client/src/App.tsx` para incluir la ruta de login:

```tsx
// En la sección de rutas móviles
if (isMobileApp) {
  return (
    <Switch>
      <Route path="/mobile-app/login" component={MobileAppLogin} />
      <Route path="/mobile-app" component={MobileApp} />
      <Route path="/mobile-app/rutas-pendientes" component={MobilePendingRoutes} />
      <Route path="/mobile-app/ruta" component={MobileRoute} />
      <Route path="/mobile-app/entregas" component={MobileDeliveries} />
      <Route path="/mobile-app/envases" component={MobileBottleReturns} />
      <Route path="/mobile-app/pagos" component={MobilePayments} />
      <Route path="/mobile-app/payments" component={MobilePayments} />
      <Route path="/mobile-app/mapa">
        <Suspense fallback={<div className="loading">Cargando...</div>}>
          <MobileMap />
        </Suspense>
      </Route>
    </Switch>
  );
}
```

### 5. Actualizar el hook useCurrentUser para mejor gestión de sesiones

Modificar `client/src/hooks/use-current-user.ts` para asegurar que funcione correctamente con el nuevo endpoint:

```typescript
// Añadir esta función para cerrar sesión
logout: async () => {
  set({ isLoading: true, error: null });
  try {
    // Intentar primero con el endpoint móvil, si falla probar con el endpoint regular
    try {
      await apiRequest('POST', '/api/mobile/logout');
    } catch {
      await apiRequest('POST', '/api/logout');
    }
    set({ user: null, isLoading: false });
  } catch (error) {
    set({ error: error as Error, isLoading: false });
  }
},

// Modificar la función fetchUser para intentar ambos endpoints
fetchUser: async () => {
  set({ isLoading: true, error: null });
  try {
    // Intentar primero con el endpoint móvil
    let response = await apiRequest('GET', '/api/mobile/me');
    
    // Si el endpoint móvil falla, intentar con el endpoint regular
    if (!response.ok) {
      response = await apiRequest('GET', '/api/me');
    }
    
    if (response.ok) {
      const result = await response.json();
      set({ user: result.success ? result.user : result, isLoading: false });
    } else {
      console.error('Error al obtener usuario:', response.status);
      set({ 
        user: null, 
        isLoading: false,
        error: new Error(`Error al obtener usuario: ${response.status}`)
      });
    }
  } catch (error) {
    console.error('Error en fetch usuario:', error);
    set({ 
      user: null, 
      isLoading: false,
      error: error as Error 
    });
  }
}
```

### 6. Proteger las rutas de la aplicación móvil

Crear un componente ProtectedMobileRoute para asegurar que solo usuarios autenticados puedan acceder:

Crear el archivo `client/src/components/mobile/ProtectedMobileRoute.tsx`:

```tsx
import React from "react";
import { Route, Redirect } from "wouter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Loader2 } from "lucide-react";

interface ProtectedMobileRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedMobileRoute({ path, component: Component }: ProtectedMobileRouteProps) {
  const { user, isLoading } = useCurrentUser();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/mobile-app/login" />;
        }

        return <Component />;
      }}
    </Route>
  );
}
```

Y luego actualizar el archivo `client/src/App.tsx` para usar las rutas protegidas:

```tsx
// En la sección de rutas móviles
if (isMobileApp) {
  return (
    <Switch>
      <Route path="/mobile-app/login" component={MobileAppLogin} />
      <ProtectedMobileRoute path="/mobile-app" component={MobileApp} />
      <ProtectedMobileRoute path="/mobile-app/rutas-pendientes" component={MobilePendingRoutes} />
      <ProtectedMobileRoute path="/mobile-app/ruta" component={MobileRoute} />
      <ProtectedMobileRoute path="/mobile-app/entregas" component={MobileDeliveries} />
      <ProtectedMobileRoute path="/mobile-app/envases" component={MobileBottleReturns} />
      <ProtectedMobileRoute path="/mobile-app/pagos" component={MobilePayments} />
      <ProtectedMobileRoute path="/mobile-app/payments" component={MobilePayments} />
      <ProtectedMobileRoute path="/mobile-app/mapa" component={MobileMap} />
    </Switch>
  );
}
```

### 7. Actualizar la cabecera móvil para mostrar información del usuario

Modificar el componente `MobileHeader` en `client/src/pages/mobile-app/components/MobileHeader.tsx` para mostrar información del usuario y un botón de logout:

```tsx
// Añadir un botón de logout en el menú
<DropdownMenuItem onSelect={() => onLogout?.()}>
  <LogOut className="mr-2 h-4 w-4" />
  <span>Cerrar Sesión</span>
</DropdownMenuItem>
```

Y añadir la función de logout en el componente principal `client/src/pages/mobile-app/index.tsx`:

```tsx
// Añadir esta función
const handleLogout = async () => {
  try {
    await logout();
    setLocation("/mobile-app/login");
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "No se pudo cerrar la sesión",
    });
  }
};

// Pasar la función al MobileHeader
<MobileHeader 
  user={user} 
  darkMode={darkMode} 
  onToggleDarkMode={toggleDarkMode} 
  onSyncData={refreshData}
  onLogout={handleLogout}
  companyName={companyName} 
/>
```

## Consideraciones adicionales

### Seguridad

1. Asegurarse de que las contraseñas estén hasheadas con bcrypt antes de almacenarlas.
2. Implementar HTTPS en producción para proteger las credenciales durante el inicio de sesión.
3. Considerar agregar rate limiting para prevenir ataques de fuerza bruta.

### Manejo de errores

1. Proporcionar mensajes de error claros para facilitar la depuración.
2. Implementar un sistema de registro (logging) detallado para monitorear intentos de inicio de sesión.

### Multi-tenant

1. Asegurarse de que todas las consultas de datos incluyan el filtro por `companyId`.
2. Validar que el usuario pertenezca a la empresa indicada durante el inicio de sesión.
3. Implementar un sistema para que los usuarios puedan seleccionar una empresa si están asociados a múltiples.

## Resumen de cambios necesarios

1. Crear endpoints de autenticación móvil
2. Modificar middleware de tenant para sesiones móviles
3. Desarrollar la interfaz de login móvil
4. Actualizar la navegación para incluir la ruta de login
5. Mejorar el hook useCurrentUser
6. Implementar protección de rutas móviles
7. Actualizar componentes para mostrar información del usuario y permitir cerrar sesión

Con estos cambios, la aplicación móvil tendrá un sistema de autenticación completo que respeta la arquitectura multi-tenant del sistema.