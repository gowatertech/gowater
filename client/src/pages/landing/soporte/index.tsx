import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Droplet, 
  LifeBuoy, 
  MessageSquare, 
  HelpCircle, 
  BookOpen, 
  Video, 
  HeadphonesIcon,
  PhoneCall,
  Mail,
  Users,
  Globe,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LandingHeader } from "@/components/landing/LandingHeader";

// Componente de la página de soporte
export default function SoportePage() {
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
                  Centro de Soporte
                </h1>
                <p className="text-muted-foreground md:text-xl max-w-[700px] mx-auto">
                  Estamos aquí para ayudarle con todas sus dudas y necesidades relacionadas con nuestra plataforma de gestión de distribución de agua.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services grid */}
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold sm:text-3xl">Nuestros Servicios de Soporte</h2>
              <p className="mt-2 text-muted-foreground">Ofrecemos múltiples canales de ayuda para garantizar su éxito</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <SupportCard 
                icon={<HeadphonesIcon className="h-10 w-10 text-primary" />}
                title="Soporte Técnico"
                description="Resolución de problemas técnicos, errores de la plataforma, y asistencia con configuraciones del sistema."
                action={<Button variant="outline" className="w-full">Contactar Soporte</Button>}
              />
              
              <SupportCard 
                icon={<BookOpen className="h-10 w-10 text-emerald-600" />}
                title="Documentación"
                description="Guías detalladas, tutoriales paso a paso y manuales de usuario para aprovechar al máximo nuestra plataforma."
                action={<Button variant="outline" className="w-full">Ver Documentación</Button>}
              />
              
              <SupportCard 
                icon={<Video className="h-10 w-10 text-amber-600" />}
                title="Tutoriales en Video"
                description="Videotutoriales explicativos sobre las principales funcionalidades y procesos de la plataforma."
                action={<Button variant="outline" className="w-full">Ver Tutoriales</Button>}
              />
              
              <SupportCard 
                icon={<Users className="h-10 w-10 text-pink-600" />}
                title="Capacitación"
                description="Sesiones de entrenamiento personalizadas para su equipo, ya sea de forma remota o presencial según sus necesidades."
                action={<Button variant="outline" className="w-full">Solicitar Capacitación</Button>}
              />
              
              <SupportCard 
                icon={<Globe className="h-10 w-10 text-violet-600" />}
                title="Comunidad"
                description="Foro de usuarios donde puede compartir experiencias, hacer preguntas y obtener consejos de otros clientes."
                action={<Button variant="outline" className="w-full">Unirse a la Comunidad</Button>}
              />
              
              <SupportCard 
                icon={<Clock className="h-10 w-10 text-blue-600" />}
                title="Soporte 24/7"
                description="Asistencia las 24 horas todos los días para clientes con planes Empresariales, garantizando soporte cuando lo necesite."
                action={<Button variant="outline" className="w-full">Ver Planes Premium</Button>}
              />
            </div>
          </div>
        </section>

        {/* Contact options */}
        <section className="py-12 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <ContactCard 
                icon={<PhoneCall className="h-6 w-6 text-primary" />}
                title="Teléfono"
                description="Lunes a Viernes: 8am - 6pm"
                contact="+1 (555) 123-4567"
              />
              
              <ContactCard 
                icon={<Mail className="h-6 w-6 text-primary" />}
                title="Email"
                description="Respuesta en 24 horas"
                contact="soporte@gowater.com"
              />
              
              <ContactCard 
                icon={<MessageSquare className="h-6 w-6 text-primary" />}
                title="Chat en vivo"
                description="Disponible 24/7"
                contact="Iniciar chat"
                isButton
              />
            </div>
          </div>
        </section>

        {/* FAQ section */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Preguntas Frecuentes</h2>
              <p className="mt-2 text-muted-foreground">Respuestas a las dudas más comunes</p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>¿Cómo puedo configurar las rutas de entrega?</AccordionTrigger>
                  <AccordionContent>
                    Para configurar las rutas de entrega, vaya a la sección "Rutas" en el panel de control. Allí puede crear nuevas rutas, asignar conductores y vehículos, y establecer horarios. Nuestra plataforma también ofrece optimización automática de rutas para reducir tiempos y costos de operación.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>¿Cómo gestionar el inventario de envases retornables?</AccordionTrigger>
                  <AccordionContent>
                    La gestión de envases retornables se realiza desde la sección "Inventario". Puede registrar la entrega de envases a los clientes y su posterior devolución. El sistema mantiene un registro de balance por cliente y genera alertes cuando hay anomalías en los retornos.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>¿La aplicación funciona sin conexión a internet?</AccordionTrigger>
                  <AccordionContent>
                    Sí, nuestra aplicación móvil para conductores funciona en modo offline. Los datos se sincronizan automáticamente cuando recupera la conexión. Esto permite a sus conductores seguir trabajando en áreas con cobertura limitada sin perder información.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger>¿Cómo facturar a mis clientes?</AccordionTrigger>
                  <AccordionContent>
                    El sistema permite generar facturas electrónicas desde la sección "Ventas". Puede configurar diferentes métodos de pago, aplicar descuentos, y enviar las facturas por email. También tenemos integración con diversas pasarelas de pago para facilitar la cobranza.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger>¿Puedo personalizar los reportes?</AccordionTrigger>
                  <AccordionContent>
                    Absolutamente. En la sección de "Reportes" puede configurar reportes personalizados según sus necesidades específicas. Defina las métricas, periodos y formato de visualización que prefiera. También puede programar el envío automático de reportes a su email.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-6">
                  <AccordionTrigger>¿Cómo puedo cambiar de plan?</AccordionTrigger>
                  <AccordionContent>
                    Para cambiar su plan actual, vaya a la sección de "Configuración" y luego a "Facturación" donde podrá ver las opciones disponibles para su cuenta. Los cambios de plan se aplican al inicio del siguiente periodo de facturación, y puede solicitar ayuda a nuestro equipo para una transición sin problemas.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="text-center mt-12">
              <h3 className="text-xl font-medium mb-4">¿No encuentra respuesta a su pregunta?</h3>
              <Link href="/contact">
                <Button className="px-8">Contáctenos</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
              Estamos aquí para ayudarle a crecer
            </h2>
            <p className="mt-4 mb-8 text-primary-foreground/80 md:text-xl max-w-[700px] mx-auto">
              Más que un proveedor de software, somos su socio en la optimización de operaciones de distribución de agua
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register-interest">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Registrar interés
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                  Solicitar demostración
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
                <li><Link href="/planes" className="text-muted-foreground hover:text-foreground">Planes y precios</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Solicitar demo</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Seguridad</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Soporte</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/soporte" className="text-muted-foreground hover:text-foreground">Centro de ayuda</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Documentación</span></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contacto</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Estado del sistema</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Acerca de nosotros</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Blog</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Trabaja con nosotros</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Política de privacidad</span></li>
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

// Card de servicio de soporte
function SupportCard({ icon, title, description, action }: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="mb-4">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow"></CardContent>
      <CardFooter>
        {action}
      </CardFooter>
    </Card>
  );
}

// Card de contacto
function ContactCard({ icon, title, description, contact, isButton = false }: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  contact: string;
  isButton?: boolean;
}) {
  return (
    <Card className="flex flex-col items-center text-center p-6">
      <div className="bg-primary/10 p-3 rounded-full mb-3">
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      {isButton ? (
        <Button variant="outline" size="sm">{contact}</Button>
      ) : (
        <p className="font-medium text-primary">{contact}</p>
      )}
    </Card>
  );
}