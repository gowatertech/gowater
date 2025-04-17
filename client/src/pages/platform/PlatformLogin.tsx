import React, { useState } from "react";
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
      email: "",
      password: "",
    },
  });

  // Mutación para el login
  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) =>
      apiRequest("/api/platform/platform-login", {
        method: "POST",
        data,
      }),
    onSuccess: (response) => {
      toast({
        title: "Inicio de sesión exitoso",
        description: response.message || "Bienvenido a la plataforma",
      });
      // Redireccionar al dashboard de la plataforma
      setLocation("/platform/dashboard");
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

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Plataforma Administrativa</CardTitle>
          <CardDescription className="text-center">
            Inicia sesión en tu cuenta de administrador
          </CardDescription>
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