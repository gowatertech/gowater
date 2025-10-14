import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Droplet, 
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Definir el esquema de validación basado en el esquema del servidor
const formSchema = z.object({
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  address: z.string().min(1, "La dirección es requerida"),
  country: z.string().default("República Dominicana"),
  managerName: z.string().min(1, "El nombre del encargado es requerido"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Correo electrónico inválido").optional().or(z.literal("")),
  approximateClients: z.coerce.number().int().nonnegative().default(0),
  vehicleCount: z.coerce.number().int().nonnegative().default(0),
  comments: z.string().optional().or(z.literal("")),
  interestedInPlan: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

// Componente de la página de registro de interés
export default function RegisterInterestPage() {
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "República Dominicana",
      approximateClients: 0,
      vehicleCount: 0,
    }
  });

  const onSubmit = async (data: FormData) => {
    console.log('[RegisterInterest] onSubmit called with data:', data);
    setSubmitting(true);
    try {
      const response = await apiRequest('/api/leads/register-interest', {
        method: 'POST',
        data: data,
      });
      console.log('[RegisterInterest] Response received:', response);

      setSubmissionSuccess(true);
      reset();
      toast({
        title: "¡Registro exitoso!",
        description: "Nos pondremos en contacto contigo pronto.",
      });
    } catch (error) {
      console.error('[RegisterInterest] Error:', error);
      toast({
        title: "Error al enviar el formulario",
        description: "Por favor, verifica tus datos e intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero section */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col justify-center items-center text-center max-w-3xl mx-auto">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-primary">
                  Registro de Interés
                </h1>
                <p className="text-muted-foreground md:text-xl max-w-[700px] mx-auto">
                  Complete el formulario para registrar su interés en nuestros servicios y un representante se pondrá en contacto con usted.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Formulario de registro */}
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6 max-w-4xl mx-auto">
            {submissionSuccess ? (
              <Card className="w-full">
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">¡Registro Exitoso!</h2>
                  <p className="text-muted-foreground mb-6">
                    Hemos recibido su solicitud. Un representante de nuestro equipo se pondrá en contacto con usted a la brevedad para discutir cómo podemos ayudar a su empresa.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => setLocation('/')} variant="outline">
                      Volver al inicio
                    </Button>
                    <Button onClick={() => setSubmissionSuccess(false)}>
                      Registrar otra empresa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full">
                <CardContent className="p-6 sm:p-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Información de la empresa */}
                      <div className="space-y-4 sm:col-span-2">
                        <h3 className="text-xl font-semibold flex items-center">
                          <Building className="h-5 w-5 mr-2 text-primary" />
                          Información de la Empresa
                        </h3>
                        
                        <div>
                          <Label htmlFor="companyName">
                            Nombre de la Empresa <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="companyName"
                            {...register("companyName")}
                            className={errors.companyName ? "border-red-500" : ""}
                          />
                          {errors.companyName && (
                            <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address">
                          Dirección <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="address"
                          {...register("address")}
                          className={errors.address ? "border-red-500" : ""}
                        />
                        {errors.address && (
                          <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="country">País</Label>
                        <Input 
                          id="country"
                          {...register("country")}
                          defaultValue="República Dominicana"
                        />
                      </div>

                      {/* Información de contacto */}
                      <div className="space-y-4 sm:col-span-2 pt-4">
                        <h3 className="text-xl font-semibold flex items-center">
                          <User className="h-5 w-5 mr-2 text-primary" />
                          Información de Contacto
                        </h3>
                        
                        <div>
                          <Label htmlFor="managerName">
                            Nombre del Encargado <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="managerName"
                            {...register("managerName")}
                            className={errors.managerName ? "border-red-500" : ""}
                          />
                          {errors.managerName && (
                            <p className="text-red-500 text-sm mt-1">{errors.managerName.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="phone">
                          Teléfono <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="phone"
                          {...register("phone")}
                          className={errors.phone ? "border-red-500" : ""}
                          placeholder="Ej: +1809XXXXXXX"
                        />
                        {errors.phone && (
                          <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input 
                          id="email"
                          type="email"
                          {...register("email")}
                          className={errors.email ? "border-red-500" : ""}
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                        )}
                      </div>

                      {/* Detalles de operación */}
                      <div className="space-y-4 sm:col-span-2 pt-4">
                        <h3 className="text-xl font-semibold flex items-center">
                          <Truck className="h-5 w-5 mr-2 text-primary" />
                          Detalles de Operación
                        </h3>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="approximateClients">
                              Cantidad aproximada de clientes
                            </Label>
                            <Input 
                              id="approximateClients"
                              type="number"
                              min="0"
                              {...register("approximateClients")}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="vehicleCount">
                              Cantidad de vehículos
                            </Label>
                            <Input 
                              id="vehicleCount"
                              type="number"
                              min="0"
                              {...register("vehicleCount")}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Plan de interés */}
                      <div className="sm:col-span-2 pt-4">
                        <h3 className="text-xl font-semibold flex items-center mb-4">
                          <Users className="h-5 w-5 mr-2 text-primary" />
                          Plan de Interés
                        </h3>
                        
                        <RadioGroup defaultValue="" className="flex flex-wrap gap-6" {...register("interestedInPlan")}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Básico" id="basic-plan" />
                            <Label htmlFor="basic-plan" className="cursor-pointer">Plan Básico</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Estándar" id="standard-plan" />
                            <Label htmlFor="standard-plan" className="cursor-pointer">Plan Estándar</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Premium" id="premium-plan" />
                            <Label htmlFor="premium-plan" className="cursor-pointer">Plan Premium</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Personalizado" id="custom-plan" />
                            <Label htmlFor="custom-plan" className="cursor-pointer">Plan Personalizado</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Comentarios adicionales */}
                      <div className="sm:col-span-2 pt-4">
                        <Label htmlFor="comments">Comentarios adicionales</Label>
                        <Textarea 
                          id="comments"
                          {...register("comments")}
                          placeholder="Comparta información adicional o requerimientos específicos"
                          className="h-32"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        size="lg" 
                        disabled={submitting} 
                        className="gap-2"
                        data-testid="button-submit-lead"
                      >
                        {submitting ? 'Enviando...' : 'Enviar registro'}
                        {!submitting && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* CTA section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
              ¿Necesitas más información?
            </h2>
            <p className="mt-4 mb-8 text-primary-foreground/80 md:text-xl max-w-[700px] mx-auto">
              Contacta con nuestro equipo de ventas para recibir una demostración personalizada de nuestro sistema
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Contactar ventas
                </Button>
              </Link>
              <Link href="/planes">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                  Ver planes
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 md:py-16 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-blue-50">
                  <Droplet className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  GoWater
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Soluciones de gestión de rutas y productos para empresas de distribución de agua.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Producto</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="text-muted-foreground hover:text-foreground">Características</Link></li>
                <li><Link href="/planes" className="text-muted-foreground hover:text-foreground">Planes y Precios</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Solicitar Demo</Link></li>
                <li><Link href="/security" className="text-muted-foreground hover:text-foreground">Seguridad</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Soporte</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/soporte" className="text-muted-foreground hover:text-foreground">Centro de Ayuda</Link></li>
                <li><Link href="/documentation" className="text-muted-foreground hover:text-foreground">Documentación</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contacto</Link></li>
                <li><Link href="/status" className="text-muted-foreground hover:text-foreground">Estado del Sistema</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground">Acerca de Nosotros</Link></li>
                <li><Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="text-muted-foreground hover:text-foreground">Trabaja con Nosotros</Link></li>
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Política de Privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} GoWater. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}