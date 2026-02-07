import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Droplet, 
  Map, 
  Package, 
  ShieldCheck, 
  MessageSquareHeart, 
  LifeBuoy, 
  Phone,
} from "lucide-react";
import MobileAppShowcase from "@/components/landing/MobileAppShowcase";
import { LandingHeader } from "@/components/landing/LandingHeader";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero section */}
        <section className="relative py-16 md:py-28 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:30px_30px]" />
          </div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col justify-center items-center text-center max-w-3xl mx-auto">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-white">
                  Gestión de rutas y productos para su empresa de agua
                </h1>
                <p className="text-blue-100 md:text-xl max-w-2xl mx-auto">
                  Optimice sus operaciones, mejore la eficiencia y aumente la satisfacción del cliente con nuestra plataforma especializada.
                </p>
              </div>
              <div className="flex flex-col gap-3 min-[400px]:flex-row mt-8">
                <Link href="/register-interest">
                  <Button size="lg" className="w-full bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-lg font-semibold">
                    Registrar interés
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent">
                    Ver Demo
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent">
                    Contactar ventas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Características principales</h2>
              <p className="mt-3 text-muted-foreground md:text-xl">
                Todo lo que necesita para gestionar eficientemente su negocio de distribución de agua
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                icon={<Map className="h-7 w-7 text-blue-600" />}
                iconBg="bg-blue-100"
                title="Gestión de rutas inteligente"
                description="Optimice las rutas de entrega con nuestro sistema inteligente que reduce tiempos y costos de transporte."
              />
              <FeatureCard 
                icon={<Package className="h-7 w-7 text-emerald-600" />}
                iconBg="bg-emerald-100"
                title="Control de inventario"
                description="Mantenga un registro preciso de su inventario, productos y envases retornables."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-7 w-7 text-amber-600" />}
                iconBg="bg-amber-100"
                title="Seguridad avanzada"
                description="Sus datos siempre protegidos con nuestro sistema de seguridad de nivel empresarial."
              />
              <FeatureCard 
                icon={<MessageSquareHeart className="h-7 w-7 text-pink-600" />}
                iconBg="bg-pink-100"
                title="Gestión de clientes"
                description="Mantenga un historial completo de sus clientes y mejore su relación con ellos."
              />
              <FeatureCard 
                icon={<LifeBuoy className="h-7 w-7 text-purple-600" />}
                iconBg="bg-purple-100"
                title="Soporte 24/7"
                description="Nuestro equipo de soporte está disponible para ayudarle en cualquier momento que lo necesite."
              />
              <FeatureCard 
                icon={<Phone className="h-7 w-7 text-blue-600" />}
                iconBg="bg-blue-100"
                title="Aplicación móvil"
                description="Acceda a toda la información desde cualquier lugar con nuestra aplicación móvil optimizada."
              />
            </div>
          </div>
        </section>

        <MobileAppShowcase />

        {/* Call to action */}
        <section className="relative py-12 md:py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:24px_24px]" />
          </div>
          <div className="container px-4 md:px-6 text-center relative z-10">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-3 text-white">
              ¿Listo para optimizar su negocio?
            </h2>
            <p className="mt-2 mb-6 text-blue-100 md:text-xl max-w-[700px] mx-auto">
              Únase a cientos de empresas que ya están mejorando su eficiencia con GoWater
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register-interest">
                <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-lg font-semibold">
                  Registrar mi interés
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 w-full sm:w-auto rounded-xl">
                  Contactar ventas
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 md:py-14 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700">
                  <Droplet className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  GoWater
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Soluciones de gestión de rutas y productos para empresas de distribución de agua.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4">Producto</h3>
              <ul className="space-y-2.5 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Características</span></li>
                <li><Link href="/planes" className="text-muted-foreground hover:text-blue-600 transition-colors">Planes y precios</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-blue-600 transition-colors">Solicitar demo</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Seguridad</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4">Soporte</h3>
              <ul className="space-y-2.5 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Centro de ayuda</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Documentación</span></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-blue-600 transition-colors">Contacto</Link></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Estado del sistema</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4">Empresa</h3>
              <ul className="space-y-2.5 text-sm">
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Acerca de nosotros</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Blog</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Trabaja con nosotros</span></li>
                <li><span className="text-muted-foreground cursor-not-allowed opacity-70">Política de privacidad</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-gray-200 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} GoWater. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, iconBg, title, description }: { 
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-background p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-5`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
