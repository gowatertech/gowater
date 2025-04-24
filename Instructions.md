# Instrucciones para implementar autenticación por email en panel principal de compañía multitenant

## Análisis del problema

Después de una revisión exhaustiva del código fuente, he identificado que actualmente el sistema tiene implementada la autenticación de usuarios para:

1. **Panel de Plataforma**: Usuarios administradores de la plataforma y compañías, que inician sesión con email.
2. **API Móvil**: Conductores y asistentes que inician sesión con nombre de usuario.

Sin embargo, falta la implementación del sistema de autenticación para el panel principal de la compañía usando email como método de login.

## Estructura actual de usuarios

El sistema maneja dos tipos de usuarios:

1. **Usuarios de plataforma** (`platformUsers`):
   - Roles: `platform_admin` y `company_admin`
   - Autenticación: Usa email (endpoint `/api/platform/platform-login`)
   - Base de datos: Tabla `platform_users`

2. **Usuarios regulares** (`users`):
   - Roles: `admin`, `supervisor`, `cashier`, `driver`, `assistant`
   - Autenticación: Actualmente solo por username para la app móvil
   - Base de datos: Tabla `users`
   - Incluye campo `email` opcional, que debemos hacer obligatorio

Para implementar la autenticación por email en el panel principal de compañía, necesitamos:

1. Crear un endpoint para autenticación de usuarios de compañía con email
2. Actualizar el esquema de usuarios para garantizar que email sea requerido
3. Implementar el frontend para el formulario de login
4. Actualizar middleware para manejar sesiones correctamente

## Plan de implementación

### 1. Modificar el esquema de usuarios para hacer email obligatorio

Actualmente, en `shared/schema.ts`, el campo email de usuarios es opcional. Necesitamos modificarlo para que sea obligatorio y único.

### 2. Agregar la función getUserByEmail en storage

Necesitamos añadir esta función al `IStorage` para buscar usuarios por email en lugar de por nombre de usuario.

### 3. Crear el endpoint de autenticación para compañía

Necesitamos implementar un endpoint `/api/login` específico para usuarios de compañía que use email en lugar de username.

### 4. Implementar o adaptar el componente de login

Crear un componente de login para el panel de compañía siguiendo el mismo patrón que el login de plataforma pero adaptado a usuarios regulares.

### 5. Actualizar el middleware para gestionar sesiones

Asegurar que el middleware `tenantMiddleware` y `companyFilterMiddleware` manejen correctamente el `companyId` para los usuarios autenticados.

## Cambios necesarios en archivos específicos

### 1. Modificar `shared/schema.ts`

Actualizar el esquema de usuarios para hacer email requerido:

```typescript
// Users (drivers, admins, etc.)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(), // Cambiar a notNull()
  password: text("password").notNull(),
  // ... resto del esquema
});

// Actualizar esquema de inserción
export const insertUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  username: z.string().min(1, "El nombre de usuario es requerido"),
  email: z.string().email("El email debe ser válido").min(1, "El email es requerido"), // Cambiar a requerido
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  // ... resto del esquema
});
```

### 2. Actualizar `server/storage.ts`

Agregar la función para buscar usuarios por email:

```typescript
export interface IStorage {
  // ... funciones existentes
  getUserByEmail(email: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ... métodos existentes
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
}
```

### 3. Crear endpoint de login en `server/routes.ts`

Agregar el siguiente endpoint para autenticación por email:

```typescript
// Endpoint para login de usuarios de compañía (usando email)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email y contraseña son requeridos" 
      });
    }
    
    // Buscar usuario por email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Credenciales inválidas" 
      });
    }
    
    // Verificar contraseña
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
    
    // Verificar roles permitidos para panel de compañía
    const allowedRoles = ['admin', 'supervisor', 'cashier'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "No tienes permiso para acceder al panel de compañía" 
      });
    }
    
    // Crear objeto de usuario sin la contraseña para la sesión
    const { password: pwd, ...userWithoutPassword } = user;
    
    // Guardar información del usuario y companyId en la sesión
    req.session.user = userWithoutPassword;
    req.session.companyId = user.companyId;
    
    console.log(`Login exitoso - Usuario: ${email}, ID: ${user.id}, Empresa: ${req.session.companyId}`);
    
    // Responder con éxito y los datos del usuario
    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Error en login de compañía:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error de servidor al procesar el login" 
    });
  }
});

// Endpoint para logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error al cerrar sesión:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Error al cerrar sesión" 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: "Sesión cerrada correctamente" 
    });
  });
});
```

### 4. Crear un componente de login en `client/src/pages/login.tsx`

```tsx
import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Esquema de validación para el formulario
const loginSchema = z.object({
  email: z.string().email("Por favor, introduce un email válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { fetchUser, user } = useCurrentUser();

  // Redireccionar si el usuario ya está autenticado
  React.useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Configuración del formulario
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Función que maneja el envío del formulario
  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/login", data);
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Inicio de sesión exitoso",
          description: "Bienvenido al panel de compañía",
        });
        
        // Actualizar datos del usuario en el store
        await fetchUser();
        
        // Redireccionar al dashboard
        setLocation("/dashboard");
      } else {
        toast({
          title: "Error",
          description: result.message || "Error en el inicio de sesión",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error durante el login:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al procesar tu solicitud",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Formulario de login */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              Accede al panel de gestión de tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar sesión
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Sección informativa */}
        <div className="hidden md:block p-6 bg-primary/5 rounded-lg">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Sistema de Gestión de Agua
          </h2>
          <p className="text-muted-foreground mb-6">
            Plataforma integral para la gestión sostenible de distribución de agua.
            Controla rutas, inventario, clientes y finanzas en un solo lugar.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <div className="rounded-full bg-primary/10 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-5 w-5"><path d="M5 8h14"/><path d="M5 12h14"/><path d="M5 16h14"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Gestión integral</h3>
                <p className="text-sm text-muted-foreground">
                  Administra tu negocio completo desde un único panel de control.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="rounded-full bg-primary/10 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-5 w-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Multiusuario</h3>
                <p className="text-sm text-muted-foreground">
                  Diferentes niveles de acceso para administradores, supervisores y cajeros.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="rounded-full bg-primary/10 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary h-5 w-5"><path d="M3 7v2a3 3 0 1 0 6 0V7"/><path d="M9 17v2a3 3 0 1 0 6 0v-2"/><path d="M21 7v2a3 3 0 1 1-6 0V7"/><path d="M15 17v2a3 3 0 1 1-6 0v-2"/><path d="M3 10a7 7 0 0 0 7 7"/><path d="M14 3a7 7 0 0 1 7 7"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Aplicación móvil</h3>
                <p className="text-sm text-muted-foreground">
                  Integración con la app para conductores y asistentes en ruta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5. Actualizar `client/src/App.tsx` para incluir la ruta de login

```tsx
// Modificar el Router para incluir la ruta de login
function Router() {
  return (
    <Switch>
      {/* Página de login */}
      <Route path="/login" component={LoginPage} />
      
      {/* Rutas protegidas que requieren autenticación */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/billing" component={Billing} />
      {/* ... otras rutas protegidas ... */}
      
      {/* Redirección por defecto a login */}
      <Route path="/">
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}
```

### 6. Asegurarse de que el hook useCurrentUser maneja correctamente la autenticación

El hook `useCurrentUser` actual parece estar configurado correctamente para intentar obtener el usuario a través de `/api/me`, pero aún así deberíamos asegurarnos de que se actualice para manejar el inicio de sesión por email.

## Consideraciones adicionales

1. **Migración de usuarios existentes**:
   - Si hay usuarios existentes sin email, se debe proporcionar un procedimiento para actualizar sus datos.

2. **Seguridad**:
   - Implementar protección contra ataques de fuerza bruta (como rate limiting).
   - Asegurar que todas las contraseñas se almacenan con hash (ya se está usando bcrypt).

3. **UX/UI**:
   - El formulario de login debe ser intuitivo y proporcionar mensajes de error claros.
   - Considerar implementar recuperación de contraseña por email.

4. **Multi-tenant**:
   - Asegurar que el filtrado por compañía funcione correctamente después del login.
   - Validar que los usuarios solo puedan acceder a los datos de su propia empresa.

## Próximos pasos

1. Implementar estos cambios de forma incremental, comenzando por las modificaciones en la base de datos.
2. Probar exhaustivamente el flujo de autenticación completo.
3. Considerar agregar funcionalidades adicionales como recuperación de contraseña y bloqueo de cuentas después de varios intentos fallidos.