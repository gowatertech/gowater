import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import asadiherLogo from "../../../../attached_assets/IMG_2126_1770597759704.png";
import { 
  Droplet, 
  Map, 
  Package, 
  ShieldCheck, 
  MessageSquareHeart, 
  LifeBuoy, 
  Phone,
  TrendingUp,
  Users,
  Truck,
  Clock,
  ArrowRight,
  Zap,
  BarChart3,
  Star,
} from "lucide-react";
import MobileAppShowcase from "@/components/landing/MobileAppShowcase";
import { LandingHeader } from "@/components/landing/LandingHeader";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/4" />
            <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
          </div>
          
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
                <Zap className="h-4 w-4 text-yellow-300" />
                <span className="text-sm text-blue-100 font-medium">Plataforma #1 en gestión de distribución de agua</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                Gestione su empresa de agua con{" "}
                <span className="relative">
                  <span className="relative z-10 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">inteligencia</span>
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-blue-100/90 max-w-2xl mx-auto mb-10 leading-relaxed">
                Optimice rutas, controle inventario, gestione pagos y aumente la productividad de su equipo con una sola plataforma.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link href="/register-interest">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 rounded-full shadow-xl shadow-blue-900/20 font-semibold h-14 px-8 text-base">
                    Comenzar gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/25 text-white hover:bg-white/10 rounded-full bg-white/5 backdrop-blur-sm h-14 px-8 text-base">
                    Ver demostración
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto">
                <StatBadge number="100+" label="Empresas activas" />
                <StatBadge number="100k+" label="Entregas realizadas" />
                <StatBadge number="99.9%" label="Tiempo activo" />
                <StatBadge number="4.8" label="Valoración" icon={<Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />} />
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </section>

        {/* Trusted By / Social Proof */}
        <section className="py-12 bg-white border-b border-gray-100">
          <div className="container px-4 md:px-6">
            <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-widest mb-8">Empresas que confían en nosotros</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-60">
              <div className="flex items-center gap-2">
                <img src={asadiherLogo} alt="Agua ASADIHER" className="h-12 w-12 rounded-full object-cover" />
                <span className="text-lg font-bold text-gray-600 tracking-tight">Agua ASADIHER</span>
              </div>
              {["AquaPura", "HidroMax", "CrystalWater", "AguaVida", "PureFlow"].map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <Droplet className="h-5 w-5" />
                  <span className="text-lg font-bold text-gray-600 tracking-tight">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-1.5 mb-4">
                <span className="text-sm font-semibold text-blue-600">Funcionalidades</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                Todo lo que necesita para{" "}
                <span className="text-blue-600">crecer</span>
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Herramientas poderosas diseñadas para empresas de distribución de agua de cualquier tamaño
              </p>
            </div>
            
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                icon={<Map className="h-6 w-6" />}
                gradient="from-blue-500 to-blue-600"
                title="Rutas inteligentes"
                description="Algoritmos que optimizan automáticamente las rutas de entrega para reducir tiempo y combustible."
              />
              <FeatureCard 
                icon={<Package className="h-6 w-6" />}
                gradient="from-emerald-500 to-emerald-600"
                title="Control de inventario"
                description="Gestión precisa de productos, envases retornables y almacenes en tiempo real."
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-6 w-6" />}
                gradient="from-amber-500 to-orange-500"
                title="Facturación automática"
                description="Genere facturas, reciba pagos y concilie cuentas sin esfuerzo manual."
              />
              <FeatureCard 
                icon={<MessageSquareHeart className="h-6 w-6" />}
                gradient="from-pink-500 to-rose-500"
                title="Gestión de clientes"
                description="Historial completo, balances, pedidos recurrentes y comunicación por WhatsApp."
              />
              <FeatureCard 
                icon={<LifeBuoy className="h-6 w-6" />}
                gradient="from-purple-500 to-violet-600"
                title="Reportes avanzados"
                description="Dashboards con métricas de ventas, operaciones y rendimiento en tiempo real."
              />
              <FeatureCard 
                icon={<Phone className="h-6 w-6" />}
                gradient="from-cyan-500 to-blue-500"
                title="App móvil nativa"
                description="Aplicación para conductores con GPS, cámara, modo offline y notificaciones push."
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 md:py-24 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-1.5 mb-4">
                  <span className="text-sm font-semibold text-blue-600">Resultados reales</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-6">
                  Resultados que impulsan su negocio
                </h2>
                <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                  Nuestros clientes experimentan mejoras significativas en eficiencia operativa desde el primer mes de uso.
                </p>
                
                <div className="space-y-5">
                  <BenefitItem 
                    icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                    bg="bg-emerald-100"
                    title="40% más eficiencia"
                    description="Reducción promedio en tiempo de entrega y costos operativos"
                  />
                  <BenefitItem 
                    icon={<Users className="h-5 w-5 text-blue-600" />}
                    bg="bg-blue-100"
                    title="3x más clientes"
                    description="Capacidad de atender más clientes con el mismo equipo"
                  />
                  <BenefitItem 
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                    bg="bg-amber-100"
                    title="2 horas menos al día"
                    description="Tiempo ahorrado en tareas administrativas y planificación"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <MetricCard 
                  icon={<Truck className="h-6 w-6 text-blue-600" />}
                  number="50K+"
                  label="Rutas optimizadas"
                  bg="bg-blue-50"
                />
                <MetricCard 
                  icon={<Users className="h-6 w-6 text-emerald-600" />}
                  number="25K+"
                  label="Clientes gestionados"
                  bg="bg-emerald-50"
                />
                <MetricCard 
                  icon={<BarChart3 className="h-6 w-6 text-purple-600" />}
                  number="$2M+"
                  label="Facturado por clientes"
                  bg="bg-purple-50"
                />
                <MetricCard 
                  icon={<Package className="h-6 w-6 text-amber-600" />}
                  number="100K+"
                  label="Envases rastreados"
                  bg="bg-amber-50"
                />
              </div>
            </div>
          </div>
        </section>

        <MobileAppShowcase />

        {/* How it works */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-1.5 mb-4">
                <span className="text-sm font-semibold text-blue-600">Cómo funciona</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                Comience en minutos
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Poner en marcha su operación con GoWater es rápido y sencillo
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StepCard 
                step="01"
                title="Registre su empresa"
                description="Cree su cuenta, configure sus productos, precios y zonas de entrega en minutos."
              />
              <StepCard 
                step="02"
                title="Agregue su equipo"
                description="Invite a sus conductores y personal. Cada uno recibe acceso personalizado según su rol."
              />
              <StepCard 
                step="03"
                title="Comience a entregar"
                description="Cree rutas, asigne pedidos y observe cómo su operación se optimiza automáticamente."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20 md:py-28 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
          </div>
          
          <div className="container px-4 md:px-6 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
                ¿Listo para transformar su negocio?
              </h2>
              <p className="text-lg md:text-xl text-blue-100/90 mb-10 leading-relaxed max-w-xl mx-auto">
                Únase a cientos de empresas que ya optimizan sus operaciones con GoWater
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register-interest">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 rounded-full shadow-xl shadow-blue-900/20 font-semibold h-14 px-8 text-base">
                    Comenzar ahora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/5 border-white/25 text-white hover:bg-white/10 rounded-full backdrop-blur-sm h-14 px-8 text-base">
                    Hablar con ventas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-14 md:py-20 bg-gray-950">
        <div className="container px-4 md:px-6">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Droplet className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">GoWater</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                La plataforma líder en gestión de distribución de agua. Optimice su operación desde el primer día.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-5">Producto</h3>
              <ul className="space-y-3 text-sm">
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Características</span></li>
                <li><Link href="/planes" className="text-gray-400 hover:text-white transition-colors">Planes y precios</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Solicitar demo</Link></li>
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Seguridad</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-5">Soporte</h3>
              <ul className="space-y-3 text-sm">
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Centro de ayuda</span></li>
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Documentación</span></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contacto</Link></li>
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Estado del sistema</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-5">Empresa</h3>
              <ul className="space-y-3 text-sm">
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Acerca de nosotros</span></li>
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Blog</span></li>
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Trabaja con nosotros</span></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Política de privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-14 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} GoWater. Todos los derechos reservados.</p>
            <div className="flex gap-6 text-sm text-gray-500">
              <span className="hover:text-gray-300 cursor-pointer transition-colors">Términos</span>
              <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacidad</Link>
              <span className="hover:text-gray-300 cursor-pointer transition-colors">Cookies</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBadge({ number, label, icon }: { number: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        <span className="text-2xl md:text-3xl font-bold text-white">{number}</span>
        {icon}
      </div>
      <span className="text-xs md:text-sm text-blue-200 mt-1">{label}</span>
    </div>
  );
}

function FeatureCard({ icon, gradient, title, description }: { 
  icon: React.ReactNode;
  gradient: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-7 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-gray-200">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 text-white shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function BenefitItem({ icon, bg, title, description }: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-0.5">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function MetricCard({ icon, number, label, bg }: {
  icon: React.ReactNode;
  number: string;
  label: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-6 text-center`}>
      <div className="flex justify-center mb-3">{icon}</div>
      <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{number}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function StepCard({ step, title, description }: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
        <span className="text-xl font-bold text-white">{step}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
