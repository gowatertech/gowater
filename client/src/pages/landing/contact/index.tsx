import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Droplet, 
  PhoneCall, 
  Mail,
  Clock,
  MapPin,
  Loader2
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";

const contactFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("El email debe ser válido"),
  subject: z.string().min(1, "El asunto es requerido"),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
});

// Contact page component
export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof contactFormSchema>) => {
    setIsSubmitting(true);
    try {
      await apiRequest("/api/contact", {
        method: "POST",
        data: data,
      });

      toast({
        title: "¡Mensaje enviado!",
        description: "Te responderemos pronto a tu correo electrónico.",
      });

      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al enviar",
        description: "No se pudo enviar el mensaje. Por favor intenta nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
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
                  Contáctanos
                </h1>
                <p className="text-muted-foreground md:text-xl max-w-[700px] mx-auto">
                  Estamos aquí para responder tus preguntas y ayudarte con cualquier consulta sobre nuestros servicios.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact information */}
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Dominican Republic Phone */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <PhoneCall className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <img 
                          src="https://flagcdn.com/w40/do.png" 
                          alt="Dominican Republic Flag" 
                          className="h-5 mr-2"
                        />
                        <h3 className="font-medium">República Dominicana</h3>
                      </div>
                      <p className="text-xl font-medium text-primary">+1809-350-2237</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Horario: Lunes a Viernes 9am - 5pm
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* United States Phone */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <PhoneCall className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <img 
                          src="https://flagcdn.com/w40/us.png" 
                          alt="United States Flag" 
                          className="h-5 mr-2"
                        />
                        <h3 className="font-medium">Estados Unidos</h3>
                      </div>
                      <p className="text-xl font-medium text-primary">+1984-260-7447</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Horario: Lunes a Viernes 9am - 5pm
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium mb-2">Correo Electrónico</h3>
                      <p className="text-xl font-medium text-primary">gowatertech@gmail.com</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Respondemos dentro de 24 horas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact form section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter mb-4">
                  Envíanos un mensaje
                </h2>
                <p className="text-muted-foreground mb-4">
                  Completa el formulario y te responderemos lo antes posible.
                </p>
                
                <div className="space-y-6 mt-8">
                  <div className="flex items-start gap-4">
                    <Clock className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Horario de Atención</h3>
                      <p className="text-sm text-muted-foreground">
                        Lunes a Viernes: 9:00 AM - 5:00 PM
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <MapPin className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Oficina Principal</h3>
                      <p className="text-sm text-muted-foreground">
                        Santo Domingo, República Dominicana
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nombre</label>
                      <input 
                        {...form.register("name")}
                        type="text" 
                        className="w-full p-2 rounded-md border border-input bg-background"
                        placeholder="Tu nombre" 
                        data-testid="input-contact-name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Correo</label>
                      <input 
                        {...form.register("email")}
                        type="email" 
                        className="w-full p-2 rounded-md border border-input bg-background"
                        placeholder="tucorreo@ejemplo.com" 
                        data-testid="input-contact-email"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asunto</label>
                    <input 
                      {...form.register("subject")}
                      type="text" 
                      className="w-full p-2 rounded-md border border-input bg-background"
                      placeholder="Asunto de tu mensaje" 
                      data-testid="input-contact-subject"
                    />
                    {form.formState.errors.subject && (
                      <p className="text-sm text-red-500">{form.formState.errors.subject.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensaje</label>
                    <textarea 
                      {...form.register("message")}
                      className="w-full p-2 rounded-md border border-input bg-background min-h-[120px]"
                      placeholder="Escribe tu mensaje aquí" 
                      data-testid="textarea-contact-message"
                    />
                    {form.formState.errors.message && (
                      <p className="text-sm text-red-500">{form.formState.errors.message.message}</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                    data-testid="button-send-contact"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar mensaje"
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
              Comienza a optimizar tu distribución de agua hoy
            </h2>
            <p className="mt-4 mb-8 text-primary-foreground/80 md:text-xl max-w-[700px] mx-auto">
              Únete a cientos de empresas que ya confían en GoWater para gestionar sus operaciones
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register-interest">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Registrar interés
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
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Características</span></li>
                <li><Link href="/planes" className="text-muted-foreground hover:text-foreground">Planes y Precios</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Solicitar Demo</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Seguridad</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Soporte</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/soporte" className="text-muted-foreground hover:text-foreground">Centro de Ayuda</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Documentación</span></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contacto</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Estado del Sistema</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Sobre Nosotros</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Blog</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Empleo</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Política de Privacidad</span></li>
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