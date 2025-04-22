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
  Menu,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Componente de la landing page
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header con menú de navegación */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50">
              <Droplet className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              GoWater
            </span>
          </div>

          {/* Menú de navegación principal */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" className="font-medium">Inicio</Button>
            </Link>
            <Link href="/planes">
              <Button variant="ghost" className="font-medium">Planes</Button>
            </Link>
            <Link href="/soporte">
              <Button variant="ghost" className="font-medium">Soporte</Button>
            </Link>
            <Link href="/demo">
              <Button variant="ghost" className="font-medium">Demo</Button>
            </Link>
            <Link href="/contacto">
              <Button variant="ghost" className="font-medium">Contáctanos</Button>
            </Link>
          </div>

          {/* Menú móvil (hamburguesa) */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="p-1.5 rounded-md bg-blue-50">
                      <Droplet className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      GoWater
                    </span>
                  </div>
                  <nav className="space-y-4">
                    <Link href="/">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Inicio</div>
                    </Link>
                    <Link href="/planes">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Planes</div>
                    </Link>
                    <Link href="/soporte">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Soporte</div>
                    </Link>
                    <Link href="/demo">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Demo</div>
                    </Link>
                    <Link href="/contacto">
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Contáctanos</div>
                    </Link>
                  </nav>
                  <div className="pt-6 border-t space-y-4">
                    <Link href="/platform/login">
                      <Button variant="outline" className="w-full">Iniciar sesión</Button>
                    </Link>
                    <Link href="/platform/register">
                      <Button className="w-full">Registrarse</Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Botones de acción */}
          <div className="hidden md:flex gap-4 items-center">
            <Link href="/platform/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/platform/register">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-blue-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-primary">
                    Gestión de rutas y productos para su empresa de agua
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Optimice sus operaciones, mejore la eficiencia y aumente la satisfacción del cliente con nuestra plataforma especializada.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/platform/register">
                    <Button size="lg" className="w-full">
                      Comenzar ahora
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button size="lg" variant="outline" className="w-full">
                      Solicitar demo
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mx-auto lg:mr-0 lg:ml-auto flex items-center justify-center">
                <div className="relative w-full max-w-[450px] aspect-square">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                  <div className="relative bg-white rounded-xl shadow-xl border overflow-hidden w-full h-full">
                    <div className="p-4 border-b bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <div className="ml-2 h-4 w-40 bg-muted rounded"></div>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="h-8 w-40 bg-muted/50 rounded"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-muted/50 rounded"></div>
                        <div className="h-4 w-full bg-muted/50 rounded"></div>
                        <div className="h-4 w-2/3 bg-muted/50 rounded"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-10 w-20 bg-primary/20 rounded"></div>
                        <div className="h-10 w-20 bg-muted/50 rounded"></div>
                      </div>
                      <div className="h-32 w-full bg-muted/30 rounded-lg border border-muted flex items-center justify-center">
                        <Map className="h-16 w-16 text-muted" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-blue-500/50"></div>
                        </div>
                        <div className="h-16 w-16 bg-green-100 rounded-lg flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-green-500/50"></div>
                        </div>
                        <div className="h-16 w-16 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-yellow-500/50"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Características principales</h2>
              <p className="mt-4 text-muted-foreground md:text-xl">
                Todo lo que necesita para gestionar eficientemente su negocio de distribución de agua
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Call to action */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
              ¿Listo para optimizar su negocio?
            </h2>
            <p className="mt-4 mb-8 text-primary-foreground/80 md:text-xl max-w-[700px] mx-auto">
              Únase a cientos de empresas que ya están mejorando su eficiencia con GoWater
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/platform/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Comenzar gratis
                </Button>
              </Link>
              <Link href="/contacto">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                  Contactar ventas
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
                <li><Link href="/planes" className="text-muted-foreground hover:text-foreground">Planes y precios</Link></li>
                <li><Link href="/demo" className="text-muted-foreground hover:text-foreground">Solicitar demo</Link></li>
                <li><Link href="/security" className="text-muted-foreground hover:text-foreground">Seguridad</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Soporte</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="text-muted-foreground hover:text-foreground">Centro de ayuda</Link></li>
                <li><Link href="/documentation" className="text-muted-foreground hover:text-foreground">Documentación</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contacto</Link></li>
                <li><Link href="/status" className="text-muted-foreground hover:text-foreground">Estado del sistema</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground">Acerca de nosotros</Link></li>
                <li><Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="text-muted-foreground hover:text-foreground">Trabaja con nosotros</Link></li>
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Política de privacidad</Link></li>
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