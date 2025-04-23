import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Droplet, 
  Map, 
  Package, 
  ShieldCheck, 
  MessageSquareHeart, 
  LifeBuoy, 
  ChevronRight, 
  Phone,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import MobileAppShowcase from "@/components/landing/MobileAppShowcase";
import { LandingHeader } from "@/components/landing/LandingHeader";

// Componente de la landing page
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col justify-center items-center text-center max-w-3xl mx-auto">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-primary">
                  Gestión de rutas y productos para su empresa de agua
                </h1>
                <p className="text-muted-foreground md:text-xl">
                  Optimice sus operaciones, mejore la eficiencia y aumente la satisfacción del cliente con nuestra plataforma especializada.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row mt-4">
                <Link href="/register-interest">
                  <Button size="lg" className="w-full">
                    Registrar interés
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="w-full">
                    Solicitar demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-10 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Características principales</h2>
              <p className="mt-2 text-muted-foreground md:text-xl">
                Todo lo que necesita para gestionar eficientemente su negocio de distribución de agua
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                icon={<Map className="h-12 w-12 text-primary" />}
                title="Gestión de rutas inteligente"
                description="Optimice las rutas de entrega con nuestro sistema inteligente que reduce tiempos y costos de transporte."
              />
              <FeatureCard 
                icon={<Package className="h-12 w-12 text-emerald-600" />}
                title="Control de inventario"
                description="Mantenga un registro preciso de su inventario, productos y envases retornables."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-12 w-12 text-amber-600" />}
                title="Seguridad avanzada"
                description="Sus datos siempre protegidos con nuestro sistema de seguridad de nivel empresarial."
              />
              <FeatureCard 
                icon={<MessageSquareHeart className="h-12 w-12 text-pink-600" />}
                title="Gestión de clientes"
                description="Mantenga un historial completo de sus clientes y mejore su relación con ellos."
              />
              <FeatureCard 
                icon={<LifeBuoy className="h-12 w-12 text-purple-600" />}
                title="Soporte 24/7"
                description="Nuestro equipo de soporte está disponible para ayudarle en cualquier momento que lo necesite."
              />
              <FeatureCard 
                icon={<Phone className="h-12 w-12 text-blue-600" />}
                title="Aplicación móvil"
                description="Acceda a toda la información desde cualquier lugar con nuestra aplicación móvil optimizada."
              />
            </div>
          </div>
        </section>

        {/* Mobile App Showcase */}
        <MobileAppShowcase />

        {/* Call to action */}
        <section className="py-10 md:py-16 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-2">
              ¿Listo para optimizar su negocio?
            </h2>
            <p className="mt-2 mb-4 text-primary-foreground/80 md:text-xl max-w-[700px] mx-auto">
              Únase a cientos de empresas que ya están mejorando su eficiencia con GoWater
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register-interest">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Registrar mi interés
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                  Contactar ventas
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 md:py-12 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
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
              <h3 className="text-lg font-medium mb-3">Producto</h3>
              <ul className="space-y-1 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Características</span></li>
                <li><Link href="/planes" className="text-muted-foreground hover:text-foreground">Planes y precios</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Solicitar demo</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Seguridad</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Soporte</h3>
              <ul className="space-y-1 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Centro de ayuda</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Documentación</span></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contacto</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Estado del sistema</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Empresa</h3>
              <ul className="space-y-1 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Acerca de nosotros</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Blog</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Trabaja con nosotros</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Política de privacidad</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} GoWater. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componente para las tarjetas de características
function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background p-6 shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}