import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Users, 
  Route, 
  Package, 
  FileText, 
  UserCog, 
  Settings, 
  Map, 
  TruckIcon, 
  PhoneIcon, 
  Globe,
  Zap,
  BarChart3,
  CoinsIcon,
  LayoutDashboard,
  Info
} from "lucide-react";

const TutorialPage = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Este efecto evita que el componente haga llamadas constantes a la API
  useEffect(() => {
    // Simular carga de datos para evitar peticiones innecesarias
    setLoading(false);
    
    // Limpiar intentos innecesarios de llamadas API
    return () => {
      // Cleanup
    };
  }, []);

  const tutorialSteps = [
    {
      title: "Bienvenido a GoWater",
      description: "Sistema inteligente de gestión de entregas de agua con optimización de rutas",
      content: (
        <div className="space-y-4">
          <p>Esta guía interactiva te ayudará a familiarizarte con las principales características de GoWater.</p>
          <p>Navega por los pasos para aprender a utilizar cada módulo del sistema actualizado.</p>
          
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 my-4 md:my-6">
            <div className="p-2 md:p-4 bg-blue-50 rounded-lg flex flex-col items-center">
              <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-blue-500 mb-1 md:mb-3" />
              <span className="text-xs md:text-sm font-medium text-center">Estadísticas en tiempo real</span>
            </div>
            <div className="p-2 md:p-4 bg-green-50 rounded-lg flex flex-col items-center">
              <Map className="h-8 w-8 md:h-10 md:w-10 text-green-500 mb-1 md:mb-3" />
              <span className="text-xs md:text-sm font-medium text-center">Optimización de rutas</span>
            </div>
            <div className="p-2 md:p-4 bg-purple-50 rounded-lg flex flex-col items-center xs:col-span-2 md:col-span-1">
              <Zap className="h-8 w-8 md:h-10 md:w-10 text-purple-500 mb-1 md:mb-3" />
              <span className="text-xs md:text-sm font-medium text-center">Operación multi-idioma</span>
            </div>
          </div>
          
          <div className="my-4 p-4 bg-blue-50 rounded-md border border-blue-100">
            <p className="text-sm text-blue-700">Versión 2.5: Ahora incluye nuevas características como seguimiento en tiempo real, análisis predictivo y sincronización con la app móvil.</p>
          </div>
        </div>
      ),
      icon: <Home className="h-6 w-6" />
    },
    {
      title: "Panel de Control",
      description: "Centro de información centralizado con analítica avanzada",
      content: (
        <div className="space-y-4">
          <p>El nuevo panel de control te proporciona una visión general mejorada de:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Estadísticas de ventas y tendencias</li>
            <li>Entregas pendientes con priorización inteligente</li>
            <li>Mapa interactivo de rutas activas</li>
            <li>Control de devoluciones de envases</li>
            <li>Métricas de eficiencia operativa</li>
          </ul>
          
          <div className="border border-gray-200 rounded-md overflow-hidden my-4 md:my-6">
            <div className="bg-gray-100 p-2 text-xs md:text-sm font-medium">Dashboard actualizado</div>
            <div className="p-2 md:p-4 bg-white">
              <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="bg-blue-50 p-2 md:p-3 rounded-md">
                  <div className="text-xs md:text-sm text-gray-600">Ventas totales</div>
                  <div className="text-base md:text-xl font-bold text-blue-800">$0.00</div>
                </div>
                <div className="bg-green-50 p-2 md:p-3 rounded-md">
                  <div className="text-xs md:text-sm text-gray-600">Órdenes pendientes</div>
                  <div className="text-base md:text-xl font-bold text-green-800">2</div>
                </div>
                <div className="bg-yellow-50 p-2 md:p-3 rounded-md">
                  <div className="text-xs md:text-sm text-gray-600">Rutas activas</div>
                  <div className="text-base md:text-xl font-bold text-yellow-800">0</div>
                </div>
                <div className="bg-purple-50 p-2 md:p-3 rounded-md">
                  <div className="text-xs md:text-sm text-gray-600">Devoluciones</div>
                  <div className="text-base md:text-xl font-bold text-purple-800">0</div>
                </div>
              </div>
              <div className="h-16 md:h-20 bg-gray-100 rounded-md flex items-center justify-center">
                <span className="text-xs md:text-sm text-gray-500">Gráfico de tendencias</span>
              </div>
            </div>
          </div>
          
          <div className="my-4 p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-600">Nueva función: Filtra las estadísticas por rango de fechas personalizado para análisis más detallados.</p>
          </div>
        </div>
      ),
      icon: <LayoutDashboard className="h-6 w-6" />
    },
    {
      title: "Gestión de Clientes",
      description: "Administración avanzada de tu cartera de clientes",
      content: (
        <div className="space-y-4">
          <p>El módulo actualizado de clientes ahora incluye:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Registro de clientes con geolocalización precisa</li>
            <li>Categorización avanzada y segmentación</li>
            <li>Historial detallado de pedidos, pagos y devoluciones</li>
            <li>Asignación a zonas con optimización inteligente</li>
            <li>Gestión de múltiples ubicaciones por cliente</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-4 md:my-6">
            <div className="bg-gray-100 p-2 text-xs md:text-sm font-medium">Vista de cliente</div>
            <div className="p-2 md:p-3 bg-white">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-md">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Users className="h-3 w-3 md:h-4 md:w-4 text-indigo-500" />
                  </div>
                  <div>
                    <div className="text-xs md:text-sm font-medium">Cliente Ejemplo</div>
                    <div className="text-[10px] md:text-xs text-gray-500">Zona Central • Cliente Frecuente</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-1.5 md:p-2 bg-gray-50 rounded-md text-[10px] md:text-xs">
                    <div className="text-gray-500">Última compra</div>
                    <div className="font-medium">Hoy, 10:00 AM</div>
                  </div>
                  <div className="p-1.5 md:p-2 bg-gray-50 rounded-md text-[10px] md:text-xs">
                    <div className="text-gray-500">Devoluciones</div>
                    <div className="font-medium">0 envases</div>
                  </div>
                </div>
                <div className="p-1.5 md:p-2 bg-blue-50 rounded-md flex justify-between items-center">
                  <span className="text-[10px] md:text-xs font-medium text-blue-700">Ver detalles completos</span>
                  <ChevronRight className="h-3 w-3 text-blue-700" />
                </div>
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <p className="text-sm text-yellow-700">Nueva función: Ahora puedes ver todos los clientes en un mapa interactivo para mejor planificación de rutas.</p>
          </div>
        </div>
      ),
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Rutas y Entregas",
      description: "Sistema avanzado de optimización logística",
      content: (
        <div className="space-y-4">
          <p>El módulo de rutas actualizado ofrece:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Algoritmos avanzados de optimización de recorridos</li>
            <li>Asignación inteligente de vehículos según carga y eficiencia</li>
            <li>Seguimiento GPS en tiempo real de entregas</li>
            <li>Reprogramación dinámica ante imprevistos</li>
            <li>Alertas automáticas de retrasos y cambios</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-4 md:my-6">
            <div className="bg-gray-100 p-2 text-xs md:text-sm font-medium">Visor de rutas</div>
            <div className="p-2 md:p-3 bg-white">
              <div className="h-24 md:h-32 bg-blue-50 rounded-lg flex items-center justify-center mb-2 md:mb-3">
                <Map className="h-8 w-8 md:h-10 md:w-10 text-blue-300" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center gap-1 md:gap-1.5 p-1.5 md:p-2 bg-green-50 rounded-md">
                  <TruckIcon className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                  <span className="text-[10px] md:text-xs font-medium">2 rutas completadas</span>
                </div>
                <div className="flex items-center gap-1 md:gap-1.5 p-1.5 md:p-2 bg-yellow-50 rounded-md">
                  <Package className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
                  <span className="text-[10px] md:text-xs font-medium">8 pedidos entregados</span>
                </div>
              </div>
              <div className="p-1.5 md:p-2 bg-gray-50 rounded-md flex justify-between items-center">
                <span className="text-[10px] md:text-xs font-medium">Eficiencia promedio</span>
                <span className="text-[10px] md:text-xs font-bold">95%</span>
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm text-green-700">Nueva función: La app móvil para choferes ahora muestra navegación paso a paso y permite confirmación con firma digital del cliente.</p>
          </div>
        </div>
      ),
      icon: <Route className="h-6 w-6" />
    },
    {
      title: "Inventario y Envases",
      description: "Control integral de productos y retornables",
      content: (
        <div className="space-y-4">
          <p>La gestión mejorada de inventario ahora incluye:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Trazabilidad completa de productos y envases retornables</li>
            <li>Control automatizado de devoluciones pendientes</li>
            <li>Alertas predictivas de necesidades de stock</li>
            <li>Gestión de lotes con códigos QR para seguimiento</li>
            <li>Balance en tiempo real de inventario físico vs. sistema</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-4 md:my-6">
            <div className="bg-gray-100 p-2 text-xs md:text-sm font-medium">Control de envases</div>
            <div className="p-2 md:p-3 bg-white space-y-2 md:space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-1.5 md:p-2 bg-purple-50 rounded-md">
                  <div className="text-[10px] md:text-xs text-gray-600">Envases entregados</div>
                  <div className="text-base md:text-lg font-bold text-purple-700">248</div>
                </div>
                <div className="p-1.5 md:p-2 bg-blue-50 rounded-md">
                  <div className="text-[10px] md:text-xs text-gray-600">Devoluciones pendientes</div>
                  <div className="text-base md:text-lg font-bold text-blue-700">42</div>
                </div>
              </div>
              <div className="p-1.5 md:p-2 bg-yellow-50 rounded-md">
                <div className="text-[10px] md:text-xs text-gray-600">Devoluciones atrasadas (+30d)</div>
                <div className="text-xs md:text-sm font-bold text-yellow-700">12 envases (5 clientes)</div>
              </div>
              <div className="p-1.5 md:p-2 bg-green-50 rounded-md flex justify-between items-center">
                <span className="text-[10px] md:text-xs font-medium text-green-700">Generar reporte detallado</span>
                <FileText className="h-3 w-3 text-green-700" />
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-indigo-50 rounded-md border border-indigo-200">
            <p className="text-sm text-indigo-700">Nueva función: Sistema automático de recordatorios para devolución de envases con integración a WhatsApp Business.</p>
          </div>
        </div>
      ),
      icon: <Package className="h-6 w-6" />
    },
    {
      title: "Facturación y Pagos",
      description: "Sistema integral de gestión financiera",
      content: (
        <div className="space-y-4">
          <p>El módulo avanzado de facturación ofrece:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Facturación electrónica con validez fiscal (NCF)</li>
            <li>Múltiples métodos de pago con procesamiento integrado</li>
            <li>Gestión automatizada de cuentas por cobrar</li>
            <li>Facturación recurrente para clientes con contrato</li>
            <li>Reportes financieros detallados y exportables</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-6">
            <div className="bg-gray-100 p-2 text-sm font-medium">Resumen de pagos</div>
            <div className="p-3 bg-white space-y-3">
              <div className="flex items-center p-2 bg-green-50 rounded-md gap-3">
                <CoinsIcon className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Ingresos del mes</div>
                  <div className="text-lg font-bold text-green-700">RD$ 125,430.00</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-blue-50 rounded-md">
                  <div className="text-xs text-gray-600">Pagos pendientes</div>
                  <div className="text-sm font-bold text-blue-700">RD$ 18,500.00</div>
                </div>
                <div className="p-2 bg-yellow-50 rounded-md">
                  <div className="text-xs text-gray-600">Vencidos (+30 días)</div>
                  <div className="text-sm font-bold text-yellow-700">RD$ 3,200.00</div>
                </div>
              </div>
              <div className="p-2 bg-red-50 rounded-md flex justify-between items-center">
                <span className="text-xs font-medium text-red-700">Gestionar cobros pendientes</span>
                <ChevronRight className="h-3 w-3 text-red-700" />
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700">Nueva función: Ahora puedes generar facturas desde la aplicación móvil y enviarlas directamente por email o WhatsApp al cliente.</p>
          </div>
        </div>
      ),
      icon: <FileText className="h-6 w-6" />
    },
    {
      title: "Usuarios y Permisos",
      description: "Control de acceso avanzado y seguridad",
      content: (
        <div className="space-y-4">
          <p>El sistema actualizado de gestión de usuarios permite:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Roles personalizados con permisos granulares</li>
            <li>Autenticación de dos factores para mayor seguridad</li>
            <li>Registro detallado de actividades y auditoría</li>
            <li>Restricciones por zonas geográficas y horarios</li>
            <li>Integración con directorio corporativo (LDAP/AD)</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-6">
            <div className="bg-gray-100 p-2 text-sm font-medium">Vista de roles</div>
            <div className="p-3 bg-white space-y-2">
              <div className="p-2 bg-blue-50 rounded-md flex justify-between">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Administrador</span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Acceso total</span>
              </div>
              <div className="p-2 bg-green-50 rounded-md flex justify-between">
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Chofer</span>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Rutas y entregas</span>
              </div>
              <div className="p-2 bg-purple-50 rounded-md flex justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  <span className="text-sm font-medium">Almacén</span>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Inventario</span>
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-red-50 rounded-md border border-red-200">
            <p className="text-sm text-red-700">Nueva función: Sistema de alertas automáticas para accesos inusuales y actividades sospechosas en el sistema.</p>
          </div>
        </div>
      ),
      icon: <UserCog className="h-6 w-6" />
    },
    {
      title: "Aplicación Móvil",
      description: "Acceso completo desde cualquier dispositivo",
      content: (
        <div className="space-y-4">
          <p>La nueva aplicación móvil ofrece:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Funcionalidad completa adaptada para smartphones</li>
            <li>Modo offline con sincronización automática</li>
            <li>Captura de firmas de clientes y fotos de entregas</li>
            <li>Navegación GPS integrada para choferes</li>
            <li>Notificaciones en tiempo real de cambios en rutas</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-6">
            <div className="bg-gray-100 p-2 text-sm font-medium">Vista móvil</div>
            <div className="p-3 bg-white">
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col items-center">
                <div className="w-32 h-48 bg-blue-50 rounded-lg border border-blue-100 flex flex-col items-center justify-center mb-2">
                  <PhoneIcon className="h-8 w-8 text-blue-300 mb-2" />
                  <span className="text-xs text-blue-500">GoWater Mobile</span>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full mt-2">
                  <div className="p-1.5 bg-green-50 rounded text-xs text-center text-green-700">Android</div>
                  <div className="p-1.5 bg-gray-200 rounded text-xs text-center text-gray-700">iOS</div>
                </div>
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-indigo-50 rounded-md border border-indigo-200">
            <p className="text-sm text-indigo-700">Nueva función: Los clientes ahora pueden hacer pedidos y seguir sus entregas mediante un portal web dedicado.</p>
          </div>
        </div>
      ),
      icon: <PhoneIcon className="h-6 w-6" />
    },
    {
      title: "Multi-Tenancy",
      description: "Plataforma para múltiples empresas independientes",
      content: (
        <div className="space-y-4">
          <p>El nuevo sistema multi-tenant permite:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Gestión centralizada de múltiples empresas</li>
            <li>Aislamiento completo de datos entre empresas</li>
            <li>Personalización de marca y configuración por empresa</li>
            <li>Facturación automática por uso de la plataforma</li>
            <li>Estadísticas comparativas entre empresas (para administradores)</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-6">
            <div className="bg-gray-100 p-2 text-sm font-medium">Panel de empresas</div>
            <div className="p-3 bg-white space-y-3">
              <div className="p-2.5 bg-blue-50 rounded-md flex justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">Agua Moya</div>
                    <div className="text-xs text-gray-500">15 usuarios • Plan Empresarial</div>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full self-center">Activo</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-gray-50 rounded-md text-center">
                  <div className="text-xs text-gray-500">Clientes</div>
                  <div className="text-sm font-bold">124</div>
                </div>
                <div className="p-2 bg-gray-50 rounded-md text-center">
                  <div className="text-xs text-gray-500">Vehículos</div>
                  <div className="text-sm font-bold">8</div>
                </div>
                <div className="p-2 bg-gray-50 rounded-md text-center">
                  <div className="text-xs text-gray-500">Productos</div>
                  <div className="text-sm font-bold">12</div>
                </div>
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700">Nueva función: Los administradores de plataforma ahora pueden migrar datos entre empresas y crear plantillas predefinidas para nuevos tenants.</p>
          </div>
        </div>
      ),
      icon: <Globe className="h-6 w-6" />
    },
    {
      title: "Configuración Avanzada",
      description: "Personalización completa del sistema",
      content: (
        <div className="space-y-4">
          <p>Las nuevas opciones de configuración incluyen:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Personalización completa de interfaz y marca</li>
            <li>Configuración de impuestos y normativas locales</li>
            <li>Integración con servicios externos (APIs)</li>
            <li>Respaldo automático de datos en la nube</li>
            <li>Plantillas personalizables para documentos y reportes</li>
          </ul>

          <div className="border border-gray-200 rounded-md overflow-hidden my-6">
            <div className="bg-gray-100 p-2 text-sm font-medium">Panel de configuración</div>
            <div className="p-3 bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-blue-50 rounded-md flex flex-col items-center">
                  <Settings className="h-8 w-8 text-blue-500 mb-1" />
                  <span className="text-xs font-medium">General</span>
                </div>
                <div className="p-2 bg-green-50 rounded-md flex flex-col items-center">
                  <Globe className="h-8 w-8 text-green-500 mb-1" />
                  <span className="text-xs font-medium">Ubicación</span>
                </div>
                <div className="p-2 bg-yellow-50 rounded-md flex flex-col items-center">
                  <FileText className="h-8 w-8 text-yellow-500 mb-1" />
                  <span className="text-xs font-medium">Facturación</span>
                </div>
                <div className="p-2 bg-purple-50 rounded-md flex flex-col items-center">
                  <UserCog className="h-8 w-8 text-purple-500 mb-1" />
                  <span className="text-xs font-medium">Usuarios</span>
                </div>
              </div>
            </div>
          </div>

          <div className="my-4 p-4 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm text-green-700">Nueva función: Ahora puedes crear campos personalizados para clientes, productos y vehículos según las necesidades específicas de tu negocio.</p>
          </div>
        </div>
      ),
      icon: <Settings className="h-6 w-6" />
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  // Renderizar estado de carga si es necesario
  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-4 md:py-8 px-2 md:px-4 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-32 bg-gray-100 rounded-md"></div>
          <div className="h-64 w-full max-w-lg bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto py-2 md:py-8 px-2 md:px-4 overflow-hidden">
      <h1 className="text-xl md:text-3xl font-bold mb-3 md:mb-8 text-center">{t("Tutorial Interactivo - GoWater")}</h1>
      
      {/* Banner informativo sobre la versión de demostración */}
      <div className="mb-3 p-2 md:p-3 bg-yellow-50 rounded-md border border-yellow-200 flex items-center gap-2">
        <Info className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 shrink-0" />
        <p className="text-xs md:text-sm text-yellow-800">
          Este tutorial muestra ejemplos con datos demostrativos. La interfaz real reflejará tus datos reales.
        </p>
      </div>

      {/* Navegación de pasos mejorada para móviles - con scroll horizontal */}
      <div className="w-full overflow-x-auto pb-2 mb-3 md:mb-6 -mx-1 px-1 md:mx-0 scrollbar-hide">
        <div className="flex min-w-max">
          {tutorialSteps.map((step, index) => (
            <div
              key={index}
              onClick={() => handleStepClick(index)}
              className={`flex items-center justify-center h-8 md:h-10 mx-1 rounded-full cursor-pointer transition-all
                ${index === currentStep 
                  ? "bg-blue-500 text-white min-w-[36px] md:min-w-[40px] md:px-2"
                  : index < currentStep
                    ? "bg-green-100 text-green-800 border border-green-300 min-w-[30px] md:min-w-[40px]"
                    : "bg-gray-100 text-gray-500 min-w-[30px] md:min-w-[40px]"}
              `}
            >
              <div className="flex items-center justify-center w-full h-full px-2">
                <span className="md:hidden">{index + 1}</span>
                <span className="hidden md:block">{step.icon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card className="mb-4 md:mb-8 shadow-sm border-blue-100 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/30 p-3 md:p-6">
          <CardTitle className="text-base md:text-xl">{tutorialSteps[currentStep].title}</CardTitle>
          <CardDescription className="text-xs md:text-base">{tutorialSteps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 md:pt-6 p-3 md:p-6 overflow-x-auto max-w-full">
          {tutorialSteps[currentStep].content}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="border-blue-200 hover:bg-blue-50 px-2 md:px-4 h-8 md:h-9 text-xs md:text-sm"
          size="sm"
        >
          <ChevronLeft className="h-4 w-4" /> <span className="ml-0 md:ml-1">{t("Anterior")}</span>
        </Button>

        <div className="text-xs md:text-sm text-gray-500">
          {currentStep + 1} / {tutorialSteps.length}
        </div>

        <Button
          onClick={handleNext}
          disabled={currentStep === tutorialSteps.length - 1}
          className="bg-blue-600 hover:bg-blue-700 px-2 md:px-4 h-8 md:h-9 text-xs md:text-sm"
          size="sm"
        >
          <span className="mr-0 md:mr-1">{t("Siguiente")}</span> <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TutorialPage;