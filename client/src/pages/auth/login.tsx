import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Building2, Droplet, KeyRound, Mail, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Esquema de validación para el formulario
const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido").min(1, "El correo electrónico es requerido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  // Inicializar el formulario con react-hook-form
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Manejar la autenticación
  const loginMutation = useMutation({
    mutationFn: (data: LoginData) =>
      apiRequest({
        url: "/api/login",
        method: "POST",
        data,
      }),
    onSuccess: () => {
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al panel de control"
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Función que se ejecuta al enviar el formulario
  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col md:flex-row">
      {/* Panel izquierdo (formulario) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-blue-50">
                <Droplet className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                GoWater
              </span>
            </div>
            <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al panel de empresa
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
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            className="pl-10" 
                            placeholder="nombre@empresa.com" 
                            type="email" 
                            autoComplete="email"
                            {...field} 
                          />
                        </div>
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
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            className="pl-10" 
                            placeholder="Contraseña" 
                            type="password" 
                            autoComplete="current-password"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button variant="link" size="sm" className="px-0" type="button" onClick={() => navigate("/auth/forgot-password")}>
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
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
          <CardFooter className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2 w-full">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground px-2">Otros accesos</span>
              <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button 
                variant="outline"
                size="sm" 
                type="button" 
                onClick={() => navigate("/platform/login")}
                className="flex items-center justify-center gap-1"
              >
                <Building2 className="h-4 w-4" /> Administración
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                type="button" 
                onClick={() => navigate("/mobile-app/login")}
                className="flex items-center justify-center gap-1"
              >
                <Smartphone className="h-4 w-4" /> App Móvil
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Panel derecho (hero) */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-primary to-primary-foreground p-6 hidden md:flex flex-col justify-center items-center text-white">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold mb-6">Gestión eficiente para su empresa de agua</h1>
          <p className="opacity-90 mb-8">
            Optimice sus operaciones, mejore la eficiencia y aumente la satisfacción del cliente con nuestra plataforma especializada para empresas de distribución de agua.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-full bg-white/20">
                  <i className="h-5 w-5"></i>
                </div>
                <h3 className="font-medium">Gestión de rutas</h3>
              </div>
              <p className="text-sm opacity-80">Optimice las rutas de entrega con nuestro sistema inteligente.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-full bg-white/20">
                  <i className="h-5 w-5"></i>
                </div>
                <h3 className="font-medium">Control de inventario</h3>
              </div>
              <p className="text-sm opacity-80">Mantenga un registro preciso de sus productos y envases.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}