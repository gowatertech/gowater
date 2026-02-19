import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Droplets, Mail, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from '@/hooks/use-current-user';

const loginSchema = z.object({
  email: z.string().min(1, "El email o usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function MobileAppLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, login } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      setLocation('/mobile-app', { replace: true });
    }
  }, [user, isLoading, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        toast({
          title: "Login exitoso",
          description: "Bienvenido a GoWater Driver",
        });
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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:30px_30px]" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg border border-white/30">
            <Droplets className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GoWater</h1>
          <p className="text-blue-200 text-sm mt-1 font-medium">Driver App</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/50">
            <h2 className="text-lg font-semibold text-gray-800 text-center mb-1">Iniciar Sesión</h2>
            <p className="text-xs text-gray-500 text-center mb-6">Ingresa tus credenciales para continuar</p>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            placeholder="Email" 
                            {...field} 
                            autoComplete="email"
                            type="email"
                            disabled={isSubmitting}
                            className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            type="password" 
                            placeholder="Contraseña" 
                            {...field} 
                            autoComplete="current-password"
                            disabled={isSubmitting}
                            className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-200" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar sesión"
                  )}
                </Button>
              </form>
            </Form>
          </div>
          
          <p className="text-center text-blue-200/70 text-xs mt-6">
            © {new Date().getFullYear()} GoWater. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
