import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Package, 
  MapPin, 
  Users, 
  DollarSign, 
  BarChart3, 
  Truck, 
  Smartphone,
  ClipboardList,
  RefreshCw,
  Workflow,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Navigation,
  Warehouse,
  FileText,
  CreditCard,
  AlertCircle,
  Activity
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";

export default function DemoPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-4xl mx-auto">
              <Badge className="mb-4 text-sm px-4 py-1">Demo Interactiva del Sistema</Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                GoWater: Sistema Completo de Gestión
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Descubre cómo GoWater transforma la gestión de tu empresa de distribución de agua con tecnología de última generación
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register-interest">
                  <Button size="lg" className="w-full sm:w-auto">
                    Solicitar Acceso <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Agendar Demostración
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Estadísticas clave */}
        <section className="py-12 border-b bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCard icon={<TrendingUp className="h-8 w-8 text-blue-600" />} value="40%" label="Aumento en eficiencia" />
              <StatCard icon={<Users className="h-8 w-8 text-green-600" />} value="100+" label="Empresas activas" />
              <StatCard icon={<Package className="h-8 w-8 text-purple-600" />} value="50K+" label="Entregas/mes" />
              <StatCard icon={<Activity className="h-8 w-8 text-orange-600" />} value="99.9%" label="Tiempo activo" />
            </div>
          </div>
        </section>

        {/* Módulo de Gestión de Clientes */}
        <section className="py-16 bg-gradient-to-br from-white to-blue-50">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4" variant="outline">
                  <Users className="h-3 w-3 mr-1" /> Gestión de Clientes
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Base de Datos Completa de Clientes
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Administra toda la información de tus clientes en un solo lugar con búsqueda avanzada y geolocalización.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Información completa: RNC, dirección, límite de crédito" />
                  <FeatureItem text="Sistema de zonas: provincias, municipios, sectores" />
                  <FeatureItem text="Captura de ubicación vía WhatsApp" />
                  <FeatureItem text="Historial completo de pedidos y pagos" />
                  <FeatureItem text="Balance de botellones retornables" />
                </ul>
              </div>
              <div className="relative">
                <MockupCard 
                  title="Panel de Clientes"
                  icon={<Users className="h-6 w-6 text-blue-600" />}
                  features={[
                    { label: "Total Clientes", value: "1,234" },
                    { label: "Activos", value: "1,156" },
                    { label: "Nuevos (mes)", value: "45" }
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Módulo de Órdenes */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative">
                <MockupCard 
                  title="Gestión de Órdenes"
                  icon={<ClipboardList className="h-6 w-6 text-green-600" />}
                  features={[
                    { label: "Pendientes", value: "87" },
                    { label: "En tránsito", value: "45" },
                    { label: "Completadas hoy", value: "156" }
                  ]}
                />
              </div>
              <div className="order-1 md:order-2">
                <Badge className="mb-4" variant="outline">
                  <ClipboardList className="h-3 w-3 mr-1" /> Órdenes y Pedidos
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Control Total de Pedidos
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Gestiona pedidos regulares, mayoristas y especiales con seguimiento en tiempo real.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Creación rápida de órdenes con validación automática" />
                  <FeatureItem text="Pedidos recurrentes (diario, semanal, quincenal, mensual)" />
                  <FeatureItem text="Diferentes métodos de pago: efectivo, crédito, tarjeta, transferencia" />
                  <FeatureItem text="Estados en tiempo real: pendiente, en tránsito, entregado" />
                  <FeatureItem text="Impresión automática de facturas y recibos" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Módulo de Rutas */}
        <section className="py-16 bg-gradient-to-br from-blue-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4" variant="outline">
                  <MapPin className="h-3 w-3 mr-1" /> Optimización de Rutas
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Rutas Inteligentes con IA
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Optimiza las rutas de entrega automáticamente para reducir costos y tiempo de entrega.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Optimización automática con algoritmos geoespaciales" />
                  <FeatureItem text="Asignación de conductores, vehículos y ayudantes" />
                  <FeatureItem text="Tracking en tiempo real vía GPS" />
                  <FeatureItem text="Notificaciones automáticas a clientes" />
                  <FeatureItem text="Reportes de rendimiento de conductores" />
                </ul>
              </div>
              <div className="relative">
                <MockupCard 
                  title="Rutas Activas"
                  icon={<Navigation className="h-6 w-6 text-purple-600" />}
                  features={[
                    { label: "Rutas hoy", value: "12" },
                    { label: "En progreso", value: "8" },
                    { label: "Completadas", value: "4" }
                  ]}
                  showMap
                />
              </div>
            </div>
          </div>
        </section>

        {/* Módulo de Inventario */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative">
                <MockupCard 
                  title="Control de Inventario"
                  icon={<Warehouse className="h-6 w-6 text-orange-600" />}
                  features={[
                    { label: "Productos", value: "24" },
                    { label: "Stock total", value: "8,456" },
                    { label: "Bajo stock", value: "3" }
                  ]}
                />
              </div>
              <div className="order-1 md:order-2">
                <Badge className="mb-4" variant="outline">
                  <Package className="h-3 w-3 mr-1" /> Inventario
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Gestión Completa de Inventario
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Controla tu inventario, productos y envases retornables desde una sola plataforma.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Seguimiento de stock en tiempo real" />
                  <FeatureItem text="Gestión de productos retornables con depósito" />
                  <FeatureItem text="Registro de lotes de producción" />
                  <FeatureItem text="Múltiples almacenes" />
                  <FeatureItem text="Alertas de stock bajo automáticas" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Módulo de Pagos y Facturación */}
        <section className="py-16 bg-gradient-to-br from-green-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4" variant="outline">
                  <DollarSign className="h-3 w-3 mr-1" /> Pagos y Facturación
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Sistema Financiero Completo
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Gestiona pagos, facturas y comisiones de forma automática y segura.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Múltiples métodos de pago integrados" />
                  <FeatureItem text="Generación automática de facturas NCF" />
                  <FeatureItem text="Cálculo automático de comisiones para conductores" />
                  <FeatureItem text="Reportes financieros en tiempo real" />
                  <FeatureItem text="Gestión de cuentas por cobrar" />
                </ul>
              </div>
              <div className="relative">
                <MockupCard 
                  title="Resumen Financiero"
                  icon={<CreditCard className="h-6 w-6 text-green-600" />}
                  features={[
                    { label: "Ventas hoy", value: "RD$45,678" },
                    { label: "Por cobrar", value: "RD$23,450" },
                    { label: "Comisiones", value: "RD$8,900" }
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Módulo de Envases Retornables */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative">
                <MockupCard 
                  title="Control de Botellones"
                  icon={<RefreshCw className="h-6 w-6 text-teal-600" />}
                  features={[
                    { label: "Entregados", value: "1,234" },
                    { label: "Devueltos", value: "1,089" },
                    { label: "Pendientes", value: "145" }
                  ]}
                />
              </div>
              <div className="order-1 md:order-2">
                <Badge className="mb-4" variant="outline">
                  <RefreshCw className="h-3 w-3 mr-1" /> Envases Retornables
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Gestión de Botellones
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Control total sobre botellones entregados, devueltos y pendientes por cliente.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Tracking de botellones por cliente" />
                  <FeatureItem text="Balance automático de depósitos" />
                  <FeatureItem text="Asignación de responsabilidad por faltantes" />
                  <FeatureItem text="Reportes de devoluciones" />
                  <FeatureItem text="Cobro automático de envases no devueltos" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* App Móvil para Conductores */}
        <section className="py-16 bg-gradient-to-br from-purple-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4" variant="outline">
                  <Smartphone className="h-3 w-3 mr-1" /> App Móvil PWA
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  App Móvil para Conductores
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Una aplicación móvil completa para que tus conductores gestionen entregas desde cualquier lugar.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Funciona 100% offline con sincronización automática" />
                  <FeatureItem text="Navegación GPS integrada" />
                  <FeatureItem text="Registro de pagos en campo" />
                  <FeatureItem text="Gestión de devoluciones de botellones" />
                  <FeatureItem text="Firma digital de clientes" />
                  <FeatureItem text="Carga de productos al vehículo" />
                </ul>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <Smartphone className="h-8 w-8" />
                    <h3 className="text-2xl font-bold">GoWater Driver</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">Ruta Activa</span>
                        <Badge className="bg-green-500">En progreso</Badge>
                      </div>
                      <div className="text-2xl font-bold">Ruta #45 - Zona Norte</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                        <div className="text-sm opacity-90">Entregas</div>
                        <div className="text-xl font-bold">12/25</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                        <div className="text-sm opacity-90">Cobrado</div>
                        <div className="text-xl font-bold">RD$8.5K</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                        <div className="text-sm opacity-90">Botellones</div>
                        <div className="text-xl font-bold">45</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reportes y Analytics */}
        <section className="py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative">
                <MockupCard 
                  title="Dashboard de Reportes"
                  icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
                  features={[
                    { label: "Ventas del mes", value: "RD$456K" },
                    { label: "Crecimiento", value: "+24%" },
                    { label: "Clientes nuevos", value: "67" }
                  ]}
                  showChart
                />
              </div>
              <div className="order-1 md:order-2">
                <Badge className="mb-4" variant="outline">
                  <BarChart3 className="h-3 w-3 mr-1" /> Reportes y Analytics
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Análisis y Reportes Avanzados
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Toma decisiones informadas con reportes detallados y visualización de datos en tiempo real.
                </p>
                <ul className="space-y-3 mb-6">
                  <FeatureItem text="Dashboard con métricas clave en tiempo real" />
                  <FeatureItem text="Reportes de ventas por período, producto y cliente" />
                  <FeatureItem text="Análisis de rendimiento de conductores" />
                  <FeatureItem text="Reportes de inventario y stock" />
                  <FeatureItem text="Exportación a Excel/PDF" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Comienza a Optimizar tu Negocio Hoy
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Únete a las empresas que ya están revolucionando su operación con GoWater
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register-interest">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Solicitar Acceso Gratuito
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-white hover:bg-white/10 text-white w-full sm:w-auto">
                  Hablar con Ventas
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-muted/30">
        <div className="container px-4 md:px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GoWater. Sistema de Gestión para Empresas de Distribución de Agua.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Componente de estadística
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">
        {icon}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// Componente de feature item
function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </li>
  );
}

// Componente de mockup card
function MockupCard({ 
  title, 
  icon, 
  features,
  showMap = false,
  showChart = false
}: { 
  title: string; 
  icon: React.ReactNode; 
  features: { label: string; value: string }[];
  showMap?: boolean;
  showChart?: boolean;
}) {
  return (
    <Card className="shadow-2xl border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          {icon}
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {showMap && (
          <div className="mb-6 h-48 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Mapa interactivo de rutas</p>
            </div>
          </div>
        )}
        {showChart && (
          <div className="mb-6 h-48 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Gráficos y análisis</p>
            </div>
          </div>
        )}
        <div className="grid gap-4">
          {features.map((feature, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{feature.label}</span>
              <span className="font-bold text-lg">{feature.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
