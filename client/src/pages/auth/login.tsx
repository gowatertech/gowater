import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
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
import { Building2, Droplets, KeyRound, Loader2, Mail, MapPin, Package, Smartphone, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido").min(1, "El correo electrónico es requerido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [_, navigate] = useLocation();
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const role = user.role;
      if (role !== "driver" && role !== "assistant") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const onSubmit = async (data: LoginData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Left Panel (Form) */}
      <div className="w-full md:w-1/2 relative flex flex-col items-center justify-center p-6 min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:30px_30px]" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg border border-white/30">
              <Droplets className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">GoWater</h1>
            <p className="text-blue-200 text-sm mt-1 font-medium">Panel de Control</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/50">
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-1">Iniciar Sesión</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Ingrese sus credenciales para acceder al sistema</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 text-sm font-medium">Correo electrónico</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm" 
                            placeholder="nombre@empresa.com" 
                            type="email" 
                            autoComplete="email"
                            {...field} 
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
                      <FormLabel className="text-gray-700 text-sm font-medium">Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm" 
                            placeholder="Contraseña" 
                            type="password" 
                            autoComplete="current-password"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button variant="link" size="sm" className="px-0 text-blue-600 hover:text-blue-700" type="button" onClick={() => navigate("/auth/forgot-password")}>
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
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

            <div className="mt-6">
              <div className="flex items-center space-x-3 w-full mb-4">
                <Separator className="flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 px-2 whitespace-nowrap">Otros accesos</span>
                <Separator className="flex-1 bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  type="button" 
                  onClick={() => navigate("/platform/login")}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  Administración
                </button>
                <button 
                  type="button" 
                  onClick={() => navigate("/mobile-app/login")}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                >
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  App Móvil
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-blue-200/70 text-xs mt-6">
            © {new Date().getFullYear()} GoWater. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Right Panel (Hero) */}
      <div className="w-full md:w-1/2 relative p-8 hidden md:flex flex-col justify-center items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-800 via-blue-800 to-blue-900" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:24px_24px]" />
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold mb-4 text-white leading-tight">Gestión eficiente para su empresa de agua</h1>
          <p className="text-blue-200 mb-10 text-lg leading-relaxed">
            Optimice sus operaciones, mejore la eficiencia y aumente la satisfacción del cliente con nuestra plataforma especializada.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-200" />
                </div>
                <h3 className="font-semibold text-white">Gestión de rutas</h3>
              </div>
              <p className="text-sm text-blue-200/80 leading-relaxed">Optimice las rutas de entrega con nuestro sistema inteligente.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                  <Package className="h-5 w-5 text-emerald-200" />
                </div>
                <h3 className="font-semibold text-white">Control de inventario</h3>
              </div>
              <p className="text-sm text-blue-200/80 leading-relaxed">Mantenga un registro preciso de sus productos y envases.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-200" />
                </div>
                <h3 className="font-semibold text-white">Clientes</h3>
              </div>
              <p className="text-sm text-blue-200/80 leading-relaxed">Gestione su cartera de clientes de forma centralizada.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-rose-200" />
                </div>
                <h3 className="font-semibold text-white">Reportes</h3>
              </div>
              <p className="text-sm text-blue-200/80 leading-relaxed">Analice datos y tome decisiones basadas en información real.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}