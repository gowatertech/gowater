import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  MapPin, 
  Package, 
  CreditCard, 
  Route,
  Check,
  Droplet,
  Navigation,
  ArrowRight,
  Wifi,
  WifiOff,
  Bell,
  Camera,
} from "lucide-react";

const features = [
  {
    id: "routes",
    title: "Gestión de rutas",
    description: "Los conductores ven sus rutas asignadas con paradas, direcciones y órdenes pendientes. Optimización automática del recorrido.",
    icon: <Route className="h-5 w-5" />,
    color: "blue",
  },
  {
    id: "deliveries",
    title: "Registro de entregas",
    description: "Registre entregas con un toque. Control de productos entregados, envases recogidos y firma del cliente.",
    icon: <Package className="h-5 w-5" />,
    color: "emerald",
  },
  {
    id: "navigation",
    title: "GPS y navegación",
    description: "Navegación en tiempo real hacia cada cliente con localización GPS precisa y seguimiento de la ruta.",
    icon: <Navigation className="h-5 w-5" />,
    color: "indigo",
  },
  {
    id: "payments",
    title: "Cobros en campo",
    description: "Registre pagos en efectivo o crédito, genere recibos digitales y actualice balances instantáneamente.",
    icon: <CreditCard className="h-5 w-5" />,
    color: "amber",
  },
  {
    id: "containers",
    title: "Control de envases",
    description: "Seguimiento de envases entregados y recogidos con balance actualizado por cliente en tiempo real.",
    icon: <Droplet className="h-5 w-5" />,
    color: "cyan",
  },
];

const colorMap: Record<string, { bg: string; text: string; activeBg: string; activeBorder: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", activeBg: "bg-blue-50", activeBorder: "border-blue-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", activeBg: "bg-emerald-50", activeBorder: "border-emerald-200" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", activeBg: "bg-indigo-50", activeBorder: "border-indigo-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", activeBg: "bg-amber-50", activeBorder: "border-amber-200" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", activeBg: "bg-cyan-50", activeBorder: "border-cyan-200" },
};

export default function MobileAppShowcase() {
  const [activeFeature, setActiveFeature] = useState("routes");

  return (
    <section id="app-mobile" className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-1.5 mb-4">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">App Móvil</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Su equipo en la palma de la mano
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Aplicación nativa para Android e iOS con todo lo que sus conductores necesitan para operar eficientemente
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Phone Mockup */}
          <div className="flex-shrink-0 order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-[3.5rem] blur-2xl" />
              <div className="relative w-[280px] h-[580px] bg-gray-900 rounded-[3rem] p-[10px] shadow-2xl">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[30px] bg-gray-900 rounded-b-2xl z-20" />
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                  <PhoneScreen activeFeature={activeFeature} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Features List */}
          <div className="flex-1 order-1 lg:order-2">
            <div className="space-y-3 max-w-lg">
              {features.map((feature) => {
                const colors = colorMap[feature.color];
                const isActive = activeFeature === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(feature.id)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                      isActive 
                        ? `${colors.activeBg} ${colors.activeBorder} shadow-sm` 
                        : 'border-transparent hover:bg-gray-50 hover:border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                        <p className={`text-sm leading-relaxed transition-all duration-300 ${isActive ? 'text-gray-600 max-h-20 opacity-100' : 'text-gray-400 max-h-0 opacity-0 overflow-hidden'}`}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <WifiOff className="h-4 w-4" />
                <span>Modo offline</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Bell className="h-4 w-4" />
                <span>Push notifications</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Camera className="h-4 w-4" />
                <span>Cámara integrada</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>GPS nativo</span>
              </div>
            </div>
            
            <div className="mt-8">
              <Link href="/contact">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-full h-12 px-6 font-semibold shadow-lg shadow-blue-500/20">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Solicitar demo de la app
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneScreen({ activeFeature }: { activeFeature: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 pt-10 pb-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-white" />
            <span className="text-white font-semibold text-sm">GoWater</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5 text-white/70" />
            <div className="text-xs text-white/70">9:41</div>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-blue-200 text-xs">Buenos días, Carlos</p>
          <p className="text-white font-semibold text-base">Ruta del día</p>
        </div>
      </div>
      
      <div className="flex-1 bg-gray-50 p-3 overflow-hidden">
        {activeFeature === "routes" && <RoutesScreen />}
        {activeFeature === "deliveries" && <DeliveriesScreen />}
        {activeFeature === "navigation" && <NavigationScreen />}
        {activeFeature === "payments" && <PaymentsScreen />}
        {activeFeature === "containers" && <ContainersScreen />}
      </div>
      
      <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-around">
        <div className="flex flex-col items-center gap-0.5">
          <Route className="h-4 w-4 text-blue-600" />
          <span className="text-[10px] text-blue-600 font-medium">Rutas</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="text-[10px] text-gray-400">Entregas</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <CreditCard className="h-4 w-4 text-gray-400" />
          <span className="text-[10px] text-gray-400">Pagos</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Droplet className="h-4 w-4 text-gray-400" />
          <span className="text-[10px] text-gray-400">Envases</span>
        </div>
      </div>
    </div>
  );
}

function RoutesScreen() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">3 rutas asignadas</span>
        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Hoy</span>
      </div>
      {[
        { name: "Ruta Norte #243", stops: 12, km: "3.2", status: "active" },
        { name: "Ruta Centro #244", stops: 8, km: "2.5", status: "pending" },
        { name: "Ruta Sur #245", stops: 15, km: "4.8", status: "pending" },
      ].map((route, i) => (
        <div key={i} className={`bg-white rounded-xl p-3 shadow-sm ${route.status === 'active' ? 'border-l-4 border-l-blue-500' : 'border border-gray-100'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-semibold text-gray-900">{route.name}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{route.stops} paradas · {route.km} km</div>
            </div>
            <div className={`text-[10px] px-2.5 py-1 rounded-lg font-medium ${
              route.status === 'active' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-500'
            }`}>
              {route.status === 'active' ? 'Iniciar' : 'Pendiente'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeliveriesScreen() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">Entregas pendientes</span>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">5 de 12</span>
      </div>
      {[
        { name: "Las Palmas #42", product: "2 × 5gal", price: "$250", done: true, time: "10:15" },
        { name: "Cafetería El Grano", product: "5 × 5gal", price: "$625", done: false },
        { name: "Oficina Ramírez", product: "3 × 5gal", price: "$375", done: false },
      ].map((d, i) => (
        <div key={i} className={`bg-white rounded-xl p-3 shadow-sm ${d.done ? 'border-l-4 border-l-emerald-500' : 'border border-gray-100'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-semibold text-gray-900">{d.name}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{d.product}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-900">{d.price}</div>
              {d.done && (
                <div className="flex items-center gap-0.5 text-[10px] text-emerald-600 mt-0.5">
                  <Check className="h-3 w-3" />
                  {d.time}
                </div>
              )}
            </div>
          </div>
          {!d.done && (
            <div className="mt-2 flex justify-end">
              <div className="text-[10px] px-3 py-1 rounded-lg bg-emerald-600 text-white font-medium">
                Entregar
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NavigationScreen() {
  return (
    <div className="relative h-full rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-0 right-0 h-[1px] bg-gray-200" />
          <div className="absolute top-[40%] left-0 right-0 h-[1px] bg-gray-200" />
          <div className="absolute top-[60%] left-0 right-0 h-[1px] bg-gray-200" />
          <div className="absolute top-[80%] left-0 right-0 h-[1px] bg-gray-200" />
          <div className="absolute left-[25%] top-0 bottom-0 w-[1px] bg-gray-200" />
          <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-gray-200" />
          <div className="absolute left-[75%] top-0 bottom-0 w-[1px] bg-gray-200" />
          
          <div className="absolute top-[30%] left-[40%] w-3 h-3 bg-blue-500 rounded-full shadow-md" />
          <div className="absolute top-[30%] left-[40%] w-6 h-6 bg-blue-500/20 rounded-full animate-ping" />
          <div className="absolute top-[55%] left-[65%] w-2.5 h-2.5 bg-red-500 rounded-full" />
          <div className="absolute top-[70%] left-[30%] w-2.5 h-2.5 bg-red-500 rounded-full" />
          <div className="absolute top-[45%] left-[20%] w-2.5 h-2.5 bg-red-500 rounded-full" />
        </div>
      </div>
      <div className="absolute bottom-2 left-2 right-2">
        <div className="bg-white rounded-xl p-2.5 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Próxima parada</div>
              <div className="text-xs font-semibold text-gray-900">Cafetería El Grano</div>
              <div className="text-[10px] text-blue-600 font-medium">2.3 km · 8 min</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentsScreen() {
  return (
    <div className="space-y-2.5">
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-semibold text-gray-900">Cobro - Cafetería El Grano</div>
          <div className="text-[10px] text-gray-400">#1254</div>
        </div>
        <div className="space-y-1.5 text-[11px] text-gray-500">
          <div className="flex justify-between">
            <span>5 × Botellón 5gal</span>
            <span className="text-gray-900">$500.00</span>
          </div>
          <div className="flex justify-between">
            <span>ITBIS 18%</span>
            <span className="text-gray-900">$90.00</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold text-gray-900">
            <span>Total</span>
            <span>$590.00</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 text-center text-[10px] py-2 rounded-lg bg-blue-600 text-white font-medium">
            Efectivo
          </div>
          <div className="flex-1 text-center text-[10px] py-2 rounded-lg bg-gray-100 text-gray-600 font-medium">
            Crédito
          </div>
        </div>
        <div className="mt-3 text-center text-[10px] py-2.5 rounded-lg bg-emerald-600 text-white font-semibold">
          Confirmar Cobro
        </div>
      </div>
    </div>
  );
}

function ContainersScreen() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">Balance de envases</span>
      </div>
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div className="text-xs font-semibold text-gray-900 mb-2">Cafetería El Grano</div>
        <div className="space-y-2">
          {[
            { name: "Botellón 5gal", delivered: 5, returned: 3, balance: 2 },
            { name: "Botellón 3gal", delivered: 2, returned: 2, balance: 0 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-1.5">
                <Droplet className="h-3 w-3 text-blue-400" />
                <span className="text-[11px] text-gray-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">+{item.delivered}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">-{item.returned}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">{item.balance}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 text-center text-[10px] py-2 rounded-lg bg-blue-600 text-white font-medium">
            Entregar
          </div>
          <div className="flex-1 text-center text-[10px] py-2 rounded-lg bg-gray-100 text-gray-600 font-medium">
            Recoger
          </div>
        </div>
      </div>
    </div>
  );
}
