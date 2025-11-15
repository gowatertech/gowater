import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, LogIn } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from '@/hooks/use-current-user';

// Esquema de validación para el formulario de login
const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function MobileAppLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, login } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (user && !isLoading) {
      console.log("MobileLogin - Usuario ya autenticado, redirigiendo al dashboard:", user.username);
      setLocation('/mobile-app', { replace: true });
    }
  }, [user, isLoading, setLocation]);

  // Inicializar el formulario con react-hook-form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Función para manejar el envío del formulario
  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    
    try {
      const result = await login(data.username, data.password);
      
      if (result.success) {
        toast({
          title: "Login exitoso",
          description: "Bienvenido a GoWater Driver",
        });
        // Esperar un momento para que las queries invalidadas se refresquen
        await new Promise(resolve => setTimeout(resolve, 300));
        // Usar replace para que no se pueda volver atrás
        setLocation('/mobile-app', { replace: true });
      } else {
        toast({
          title: "Error de autenticación",
          description: result.message || "Credenciales inválidas",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al intentar iniciar sesión",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary/5">
      {/* Header con logo */}
      <div className="bg-primary p-4 text-white text-center">
        <h1 className="text-xl font-bold">GoWater Driver</h1>
      </div>
      
      {/* Contenido principal */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Formulario de login */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Iniciar Sesión</h2>
              <p className="text-sm text-muted-foreground">
                Ingresa tus credenciales para acceder
              </p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ingresa tu nombre de usuario" 
                          {...field} 
                          autoComplete="username"
                          disabled={isSubmitting}
                        />
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
                        <Input 
                          type="password" 
                          placeholder="Ingresa tu contraseña" 
                          {...field} 
                          autoComplete="current-password"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full py-5" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Iniciar sesión
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
        
        {/* Banner informativo */}
        <div className="hidden md:flex flex-1 bg-gradient-to-r from-primary to-primary-dark text-white p-10 items-center justify-center">
          <div className="max-w-lg">
            <h2 className="text-3xl font-bold mb-4">
              Aplicación para Conductores
            </h2>
            <p className="mb-6">
              Gestiona tus rutas, entregas y devoluciones de envases de forma 
              eficiente con nuestra aplicación móvil diseñada para conductores.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="h-5 w-5 rounded-full bg-white/90 text-primary flex items-center justify-center text-xs mr-2">✓</span>
                Ver rutas asignadas
              </li>
              <li className="flex items-center">
                <span className="h-5 w-5 rounded-full bg-white/90 text-primary flex items-center justify-center text-xs mr-2">✓</span>
                Gestionar entregas y pagos
              </li>
              <li className="flex items-center">
                <span className="h-5 w-5 rounded-full bg-white/90 text-primary flex items-center justify-center text-xs mr-2">✓</span>
                Registrar devoluciones de envases
              </li>
              <li className="flex items-center">
                <span className="h-5 w-5 rounded-full bg-white/90 text-primary flex items-center justify-center text-xs mr-2">✓</span>
                Sincronización automática de datos
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 text-center text-sm text-muted-foreground bg-white">
        <p>© {new Date().getFullYear()} GoWater. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}