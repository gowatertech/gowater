import { Link } from "wouter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  Droplet,
  Shield,
  MapPin,
  CreditCard,
  Cookie,
  Lock,
  Users,
  Trash2,
  Eye,
  Server,
  Mail,
  ArrowRight,
  FileText,
  Globe,
  Smartphone,
} from "lucide-react";

const sections = [
  { id: "informacion-general", label: "Información General" },
  { id: "datos-recopilados", label: "Datos que Recopilamos" },
  { id: "uso-datos", label: "Uso de los Datos" },
  { id: "base-legal", label: "Base Legal" },
  { id: "ubicacion", label: "Geolocalización" },
  { id: "seguridad", label: "Seguridad" },
  { id: "cookies", label: "Cookies" },
  { id: "terceros", label: "Servicios de Terceros" },
  { id: "retencion", label: "Retención de Datos" },
  { id: "derechos", label: "Tus Derechos" },
  { id: "contacto", label: "Contacto" },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <LandingHeader />

      <main className="flex-1">
        <section className="relative py-16 md:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/4" />
          </div>
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
          </div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
                <Shield className="h-4 w-4 text-blue-200" />
                <span className="text-sm text-blue-100 font-medium">Tu privacidad es nuestra prioridad</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Política de Privacidad
              </h1>
              <p className="text-lg text-blue-100/90 max-w-xl mx-auto leading-relaxed">
                Conoce cómo GoWater recopila, utiliza y protege tu información personal.
              </p>
              <p className="text-sm text-blue-200/70 mt-4">
                Última actualización: Febrero 2026
              </p>
            </div>
          </div>
        </section>

        <div className="container px-4 md:px-6 py-12 md:py-16">
          <div className="flex flex-col lg:flex-row gap-10 max-w-6xl mx-auto">
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Contenido</h3>
                <nav className="space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg px-3 py-2 transition-colors"
                    >
                      {s.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="flex-1 max-w-3xl">
              <Section id="informacion-general" icon={<FileText className="h-5 w-5 text-blue-600" />} title="1. Información General">
                <p>
                  GoWater ("nosotros", "nuestro" o "la Plataforma") es un sistema de gestión de distribución de agua 
                  que opera como una plataforma SaaS (Software como Servicio) multi-tenant. Esta política de privacidad 
                  describe cómo recopilamos, usamos, almacenamos y protegemos la información personal de nuestros usuarios, 
                  incluyendo administradores de empresas, supervisores, cajeros, conductores y asistentes.
                </p>
                <p>
                  Al utilizar GoWater, ya sea a través del panel administrativo web, la aplicación móvil para conductores, 
                  o la plataforma de administración, usted acepta las prácticas descritas en esta política.
                </p>
              </Section>

              <Section id="datos-recopilados" icon={<Eye className="h-5 w-5 text-emerald-600" />} title="2. Datos que Recopilamos">
                <p>Recopilamos diferentes tipos de información según el uso que haga de nuestra plataforma:</p>
                
                <DataCategory
                  icon={<Users className="h-4 w-4 text-blue-600" />}
                  bg="bg-blue-50"
                  title="Datos de Cuenta y Perfil"
                  items={[
                    "Nombre completo y nombre de usuario",
                    "Correo electrónico",
                    "Número de teléfono",
                    "Rol asignado (administrador, supervisor, cajero, conductor, asistente)",
                    "Empresa asociada",
                  ]}
                />

                <DataCategory
                  icon={<Globe className="h-4 w-4 text-indigo-600" />}
                  bg="bg-indigo-50"
                  title="Datos de Clientes"
                  items={[
                    "Nombre del cliente o razón social",
                    "Dirección de entrega (calle, sector, ciudad, coordenadas GPS)",
                    "Teléfono de contacto",
                    "Historial de pedidos y entregas",
                    "Balance de cuenta y transacciones",
                    "Registro de botellones entregados y devueltos",
                  ]}
                />

                <DataCategory
                  icon={<CreditCard className="h-4 w-4 text-amber-600" />}
                  bg="bg-amber-50"
                  title="Datos Financieros"
                  items={[
                    "Historial de pagos y facturas",
                    "Montos de anticipos y abonos a cuenta",
                    "Información de comisiones de personal",
                    "Registros de conciliación de caja diaria",
                    "Datos de membresía y suscripción (procesados por Stripe)",
                  ]}
                />

                <DataCategory
                  icon={<MapPin className="h-4 w-4 text-red-600" />}
                  bg="bg-red-50"
                  title="Datos de Ubicación"
                  items={[
                    "Ubicación GPS en tiempo real de conductores durante rutas activas",
                    "Coordenadas geográficas de direcciones de entrega",
                    "Zonas geográficas y polígonos de cobertura",
                    "Datos de optimización de rutas",
                  ]}
                />

                <DataCategory
                  icon={<Smartphone className="h-4 w-4 text-purple-600" />}
                  bg="bg-purple-50"
                  title="Datos Técnicos"
                  items={[
                    "Información del dispositivo y navegador",
                    "Datos de sesión y autenticación",
                    "Registros de actividad en la plataforma",
                    "Datos almacenados localmente para funcionamiento offline",
                  ]}
                />
              </Section>

              <Section id="uso-datos" icon={<Server className="h-5 w-5 text-indigo-600" />} title="3. Cómo Usamos los Datos">
                <p>Utilizamos la información recopilada para los siguientes fines:</p>
                <ul className="space-y-3 mt-4">
                  {[
                    "Gestión operativa: Administración de pedidos, entregas, rutas e inventario de su empresa.",
                    "Optimización de rutas: Cálculo de rutas eficientes para conductores utilizando datos de ubicación.",
                    "Facturación y pagos: Generación de facturas, procesamiento de pagos y gestión de balances.",
                    "Seguimiento en tiempo real: Monitoreo de ubicación de conductores durante entregas activas.",
                    "Comunicaciones: Envío de notificaciones por correo electrónico relacionadas con el servicio.",
                    "Reportes y análisis: Generación de estadísticas operativas y financieras para su empresa.",
                    "Comisiones: Cálculo automático de comisiones para personal de entrega.",
                    "Mejora del servicio: Análisis de uso para mejorar la funcionalidad de la plataforma.",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section id="base-legal" icon={<FileText className="h-5 w-5 text-gray-600" />} title="4. Base Legal del Tratamiento">
                <p>El tratamiento de datos personales se fundamenta en:</p>
                <div className="grid gap-4 mt-4">
                  <LegalBasis
                    title="Ejecución contractual"
                    description="El tratamiento es necesario para la prestación de los servicios contratados por su empresa a través de GoWater."
                  />
                  <LegalBasis
                    title="Interés legítimo"
                    description="Para la mejora de nuestros servicios, seguridad de la plataforma y prevención de fraude."
                  />
                  <LegalBasis
                    title="Consentimiento"
                    description="Para el envío de comunicaciones comerciales y el uso de cookies no esenciales."
                  />
                  <LegalBasis
                    title="Obligación legal"
                    description="Para el cumplimiento de obligaciones fiscales y regulatorias aplicables."
                  />
                </div>
              </Section>

              <Section id="ubicacion" icon={<MapPin className="h-5 w-5 text-red-600" />} title="5. Geolocalización y Seguimiento">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
                  <p className="text-amber-800 text-sm leading-relaxed">
                    <strong>Aviso importante:</strong> GoWater utiliza servicios de geolocalización para la funcionalidad 
                    de seguimiento de rutas y optimización de entregas. Estos datos se recopilan únicamente durante el 
                    horario laboral activo y las rutas de entrega asignadas.
                  </p>
                </div>
                <p>Utilizamos datos de ubicación para:</p>
                <ul className="space-y-2 mt-3">
                  {[
                    "Rastreo en tiempo real de conductores durante rutas activas mediante WebSockets.",
                    "Optimización de rutas de entrega utilizando algoritmos geoespaciales (Turf.js).",
                    "Visualización de rutas y zonas de cobertura en mapas interactivos (Leaflet/OpenStreetMap).",
                    "Asignación de clientes a zonas geográficas de distribución.",
                    "Registro de ubicaciones de entrega para verificación del servicio.",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                      <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-gray-500">
                  Los conductores pueden gestionar los permisos de ubicación desde la configuración de su dispositivo móvil. 
                  Sin embargo, desactivar la ubicación puede limitar funcionalidades esenciales de la aplicación de entregas.
                </p>
              </Section>

              <Section id="seguridad" icon={<Lock className="h-5 w-5 text-green-600" />} title="6. Seguridad de los Datos">
                <p>
                  Implementamos medidas técnicas y organizativas robustas para proteger su información:
                </p>
                <div className="grid gap-4 mt-4 sm:grid-cols-2">
                  <SecurityCard
                    icon={<Lock className="h-4 w-4 text-green-600" />}
                    title="Cifrado de contraseñas"
                    description="Todas las contraseñas se almacenan cifradas con bcrypt, un algoritmo de hash seguro."
                  />
                  <SecurityCard
                    icon={<Server className="h-4 w-4 text-blue-600" />}
                    title="Aislamiento multi-tenant"
                    description="Cada empresa tiene sus datos completamente aislados. Ninguna empresa puede acceder a datos de otra."
                  />
                  <SecurityCard
                    icon={<Shield className="h-4 w-4 text-indigo-600" />}
                    title="Control de acceso RBAC"
                    description="Sistema de roles y permisos que garantiza que cada usuario solo accede a la información autorizada."
                  />
                  <SecurityCard
                    icon={<Globe className="h-4 w-4 text-amber-600" />}
                    title="Sesiones seguras"
                    description="Autenticación basada en sesiones con expiración automática y protección contra accesos no autorizados."
                  />
                </div>
              </Section>

              <Section id="cookies" icon={<Cookie className="h-5 w-5 text-amber-600" />} title="7. Cookies y Almacenamiento Local">
                <p>GoWater utiliza las siguientes tecnologías de almacenamiento:</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-3 font-semibold text-gray-700 border-b">Tipo</th>
                        <th className="text-left p-3 font-semibold text-gray-700 border-b">Propósito</th>
                        <th className="text-left p-3 font-semibold text-gray-700 border-b">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-3 text-gray-600">Cookie de sesión</td>
                        <td className="p-3 text-gray-600">Mantener su sesión activa y autenticada</td>
                        <td className="p-3 text-gray-600">Sesión del navegador</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-gray-600">IndexedDB</td>
                        <td className="p-3 text-gray-600">Almacenamiento offline para la app móvil de conductores</td>
                        <td className="p-3 text-gray-600">Persistente hasta limpieza</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-gray-600">Service Worker</td>
                        <td className="p-3 text-gray-600">Caché de recursos para funcionamiento sin conexión (PWA)</td>
                        <td className="p-3 text-gray-600">Hasta actualización</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-gray-600">LocalStorage</td>
                        <td className="p-3 text-gray-600">Preferencias de usuario e idioma</td>
                        <td className="p-3 text-gray-600">Persistente</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section id="terceros" icon={<Globe className="h-5 w-5 text-purple-600" />} title="8. Servicios de Terceros">
                <p>GoWater integra los siguientes servicios externos para su funcionamiento:</p>
                <div className="grid gap-4 mt-4">
                  <ThirdPartyCard
                    name="Stripe"
                    purpose="Procesamiento de pagos de membresía y suscripciones"
                    data="Datos de pago (tarjetas) procesados directamente por Stripe. GoWater no almacena datos de tarjetas."
                    link="https://stripe.com/privacy"
                  />
                  <ThirdPartyCard
                    name="Resend"
                    purpose="Envío de correos electrónicos transaccionales y notificaciones"
                    data="Dirección de correo electrónico del destinatario y contenido del mensaje."
                    link="https://resend.com/legal/privacy-policy"
                  />
                  <ThirdPartyCard
                    name="OpenStreetMap"
                    purpose="Renderizado de mapas interactivos y tiles de mapas"
                    data="Coordenadas geográficas para visualización. No se comparten datos personales."
                    link="https://wiki.osmfoundation.org/wiki/Privacy_Policy"
                  />
                </div>
              </Section>

              <Section id="retencion" icon={<Trash2 className="h-5 w-5 text-gray-600" />} title="9. Retención de Datos">
                <p>
                  Conservamos sus datos personales mientras sea necesario para la prestación de los servicios contratados 
                  y según las obligaciones legales aplicables:
                </p>
                <ul className="space-y-2 mt-4">
                  {[
                    "Datos de cuenta: Mientras la cuenta esté activa y durante el período de retención legal aplicable tras su cancelación.",
                    "Datos de transacciones y facturas: Mínimo 5 años según requisitos fiscales y contables.",
                    "Datos de ubicación de rutas: 90 días tras la finalización de cada ruta.",
                    "Registros de auditoría: 1 año para fines de seguridad y cumplimiento.",
                    "Datos offline (IndexedDB): Hasta que el usuario limpie los datos del navegador o la aplicación.",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                      <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-gray-500">
                  GoWater emplea eliminación lógica (soft delete) en lugar de eliminación permanente para mantener 
                  la integridad de los registros históricos. Los datos marcados como eliminados no son accesibles 
                  desde la interfaz de usuario.
                </p>
              </Section>

              <Section id="derechos" icon={<Shield className="h-5 w-5 text-blue-600" />} title="10. Tus Derechos">
                <p>Como usuario de GoWater, usted tiene derecho a:</p>
                <div className="grid gap-3 mt-4">
                  {[
                    { title: "Acceso", desc: "Solicitar una copia de los datos personales que tenemos sobre usted." },
                    { title: "Rectificación", desc: "Corregir datos personales inexactos o incompletos." },
                    { title: "Eliminación", desc: "Solicitar la eliminación de sus datos personales, sujeto a obligaciones legales de retención." },
                    { title: "Portabilidad", desc: "Recibir sus datos en un formato estructurado y de uso común." },
                    { title: "Oposición", desc: "Oponerse al tratamiento de sus datos para fines específicos." },
                    { title: "Limitación", desc: "Solicitar la limitación del tratamiento de sus datos en determinadas circunstancias." },
                  ].map((right, i) => (
                    <div key={i} className="flex items-start gap-3 bg-blue-50/50 rounded-xl p-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-600">{i + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{right.title}</h4>
                        <p className="text-gray-500 text-sm">{right.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  Para ejercer cualquiera de estos derechos, contacte al administrador de su empresa o comuníquese 
                  directamente con nuestro equipo a través del canal de soporte.
                </p>
              </Section>

              <Section id="contacto" icon={<Mail className="h-5 w-5 text-blue-600" />} title="11. Contacto">
                <p>
                  Si tiene preguntas, comentarios o solicitudes relacionadas con esta política de privacidad 
                  o el tratamiento de sus datos personales, puede contactarnos a través de:
                </p>
                <div className="mt-4 bg-gray-50 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-700">soporte@gowater.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <Link href="/contact" className="text-sm text-blue-600 hover:underline">
                      Formulario de contacto
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <Link href="/soporte" className="text-sm text-blue-600 hover:underline">
                      Centro de soporte
                    </Link>
                  </div>
                </div>
              </Section>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-400 text-center">
                  Esta política de privacidad puede ser actualizada periódicamente. Le notificaremos sobre cambios 
                  significativos a través de la plataforma o por correo electrónico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

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
                <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Características</Link></li>
                <li><Link href="/planes" className="text-gray-400 hover:text-white transition-colors">Planes y precios</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Solicitar demo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-5">Soporte</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/soporte" className="text-gray-400 hover:text-white transition-colors">Centro de ayuda</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contacto</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-5">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Política de privacidad</Link></li>
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Términos de servicio</span></li>
                <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Cookies</span></li>
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

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3 pl-[52px]">
        {children}
      </div>
    </section>
  );
}

function DataCategory({ icon, bg, title, items }: { icon: React.ReactNode; bg: string; title: string; items: string[] }) {
  return (
    <div className="mt-4 border border-gray-100 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
      </div>
      <ul className="space-y-1.5 pl-11">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
            <span className="text-gray-300 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegalBasis({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-semibold text-gray-900 text-sm mb-1">{title}</h4>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}

function SecurityCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">{icon}</div>
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
      </div>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}

function ThirdPartyCard({ name, purpose, data, link }: { name: string; purpose: string; data: string; link: string }) {
  return (
    <div className="border border-gray-100 rounded-xl p-5">
      <h4 className="font-semibold text-gray-900 mb-1">{name}</h4>
      <p className="text-gray-500 text-sm mb-1"><strong>Propósito:</strong> {purpose}</p>
      <p className="text-gray-500 text-sm mb-2"><strong>Datos compartidos:</strong> {data}</p>
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline inline-flex items-center gap-1">
        Ver política de privacidad <ArrowRight className="h-3 w-3" />
      </a>
    </div>
  );
}
