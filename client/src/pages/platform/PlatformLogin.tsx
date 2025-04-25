import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DropletIcon } from "lucide-react";

// Esquema de validación para el formulario de login
const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(5, "La contraseña debe tener al menos 5 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function PlatformLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Configuración del formulario
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@plataforma.com",
      password: "admin12345",
    },
  });

  // Mutación para el login
  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) =>
      apiRequest({
        url: "/api/platform/platform-login",
        method: "POST",
        data,
      }),
    onSuccess: (response: any) => {
      toast({
        title: "Inicio de sesión exitoso",
        description: response.message || "Bienvenido a la plataforma",
      });
      // Redireccionar al dashboard de la plataforma usando replace para evitar volver atrás
      setLocation("/platform/dashboard", { replace: true });
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || "Error en el inicio de sesión");
      toast({
        title: "Error",
        description: error.response?.data?.message || "Error en el inicio de sesión",
        variant: "destructive",
      });
    },
  });

  // Función que maneja el envío del formulario
  const onSubmit = (data: LoginForm) => {
    setError(null);
    loginMutation.mutate(data);
  };
  
  // Evitar que el usuario pueda volver a esta página si ya está autenticado
  useEffect(() => {
    // Verificar si hay un usuario ya autenticado en la plataforma
    const checkPlatformAuth = async () => {
      try {
        const response = await fetch('/api/platform/platform-user');
        if (response.ok) {
          // Usuario ya autenticado, redirigir al dashboard
          setLocation('/platform/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error verificando autenticación de plataforma:', error);
      }
    };
    
    checkPlatformAuth();
  }, [setLocation]);

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-2">
            <div className="bg-primary p-2 rounded-full">
              <DropletIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">GOWater</CardTitle>
            <CardDescription className="text-base mt-1">
              Plataforma Administrativa
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-1">
              Software Gestión de empresas de distribución de Agua
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 text-sm rounded-md bg-destructive/10 text-destructive">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@plataforma.com" {...field} />
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
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}