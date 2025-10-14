import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  BookOpen,
  Users,
  Package,
  Truck,
  MapPin,
  FileText,
  Settings,
  Smartphone,
  BarChart3,
  CreditCard,
  Repeat,
  Warehouse,
  Droplet,
  Shield,
  Search,
  Home,
  ShoppingCart,
  Calendar,
  UserCog,
  Building2,
  DollarSign,
  Route,
  Navigation,
  ClipboardList,
  Boxes,
  FilePlus,
  ArrowLeftRight,
  CheckCircle2,
  Activity,
  Download,
  ChevronRight,
  Menu
} from "lucide-react";

interface Feature {
  icon: any;
  title: string;
  description: string;
  path?: string;
  subFeatures?: { name: string; description: string }[];
}

interface Section {
  id: string;
  title: string;
  icon: any;
  color: string;
  features: Feature[];
}

export default function ManualPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const sections: Section[] = [
    {
      id: "dashboard",
      title: "Panel Principal",
      icon: Home,
      color: "bg-primary",
      features: [
        {
          icon: BarChart3,
          title: "Dashboard",
          description: "Vista general del sistema con métricas clave, estadísticas de ventas, pedidos pendientes y resumen de operaciones diarias.",
          path: "/dashboard",
          subFeatures: [
            { name: "Métricas en Tiempo Real", description: "Visualiza ventas, pedidos y entregas del día" },
            { name: "Gráficos y Estadísticas", description: "Tendencias de ventas y rendimiento operativo" },
            { name: "Alertas y Notificaciones", description: "Notificaciones de pedidos urgentes y problemas" }
          ]
        }
      ]
    },
    {
      id: "customers",
      title: "Clientes",
      icon: Users,
      color: "bg-green-500",
      features: [
        {
          icon: Users,
          title: "Gestión de Clientes",
          description: "Administra la información completa de tus clientes, incluyendo datos de contacto, direcciones, historial de compras y balance de crédito.",
          path: "/customers",
          subFeatures: [
            { name: "Registro de Clientes", description: "Crea nuevos clientes con toda su información" },
            { name: "Direcciones y Ubicación", description: "Guarda múltiples direcciones y ubicación GPS" },
            { name: "Balance de Crédito", description: "Controla el crédito otorgado a cada cliente" },
            { name: "Historial de Pedidos", description: "Revisa todos los pedidos de un cliente" },
            { name: "Zonas de Entrega", description: "Asigna clientes a zonas específicas" }
          ]
        }
      ]
    },
    {
      id: "orders",
      title: "Pedidos",
      icon: ShoppingCart,
      color: "bg-purple-500",
      features: [
        {
          icon: FileText,
          title: "Gestión de Pedidos",
          description: "Crea, visualiza y administra todos los pedidos de agua. Controla el estado de cada pedido desde su creación hasta la entrega.",
          path: "/orders",
          subFeatures: [
            { name: "Crear Pedido", description: "Registra nuevos pedidos de forma rápida" },
            { name: "Seguimiento de Estado", description: "Pendiente, En Tránsito, Entregado, Cancelado" },
            { name: "Detalles del Pedido", description: "Productos, cantidades, cliente y dirección" },
            { name: "Historial", description: "Consulta todos los pedidos históricos" },
            { name: "Impresión", description: "Genera recibos y comprobantes" }
          ]
        },
        {
          icon: Repeat,
          title: "Pedidos Recurrentes",
          description: "Configura pedidos que se generan automáticamente según una frecuencia definida (diario, semanal, mensual).",
          path: "/recurring-orders",
          subFeatures: [
            { name: "Configuración de Frecuencia", description: "Diario, semanal, quincenal, mensual" },
            { name: "Generación Automática", description: "Los pedidos se crean automáticamente" },
            { name: "Gestión de Recurrencias", description: "Activa, pausa o cancela recurrencias" },
            { name: "Historial de Generación", description: "Revisa qué pedidos se han generado" }
          ]
        }
      ]
    },
    {
      id: "routes",
      title: "Rutas y Entregas",
      icon: Route,
      color: "bg-orange-500",
      features: [
        {
          icon: MapPin,
          title: "Gestión de Rutas",
          description: "Planifica y optimiza rutas de entrega para maximizar la eficiencia. Asigna conductores y vehículos a cada ruta.",
          path: "/routes",
          subFeatures: [
            { name: "Creación de Rutas", description: "Define rutas con múltiples paradas" },
            { name: "Optimización Automática", description: "Calcula la ruta más eficiente" },
            { name: "Asignación de Conductores", description: "Asigna conductores y vehículos" },
            { name: "Visualización en Mapa", description: "Ve las rutas en un mapa interactivo" },
            { name: "Seguimiento en Tiempo Real", description: "Rastrea la ubicación del conductor" }
          ]
        },
        {
          icon: Navigation,
          title: "Zonas de Entrega",
          description: "Define y administra zonas geográficas para organizar mejor las entregas y asignación de rutas.",
          path: "/zones",
          subFeatures: [
            { name: "Crear Zonas", description: "Define áreas geográficas específicas" },
            { name: "Asignar Clientes", description: "Asigna clientes a cada zona" },
            { name: "Rutas por Zona", description: "Organiza rutas según las zonas" }
          ]
        },
        {
          icon: CheckCircle2,
          title: "Entregas",
          description: "Registra y controla las entregas realizadas, incluyendo confirmación, pagos y devoluciones de envases.",
          path: "/entregas",
          subFeatures: [
            { name: "Confirmar Entrega", description: "Marca pedidos como entregados" },
            { name: "Registro de Pago", description: "Registra el pago recibido" },
            { name: "Devolución de Envases", description: "Controla envases devueltos" },
            { name: "Firma Digital", description: "Captura firma del cliente" }
          ]
        }
      ]
    },
    {
      id: "inventory",
      title: "Inventario",
      icon: Package,
      color: "bg-cyan-500",
      features: [
        {
          icon: Package,
          title: "Gestión de Productos",
          description: "Administra tu catálogo de productos, precios, costos y disponibilidad. Controla botellones, bidones y otros productos.",
          subFeatures: [
            { name: "Catálogo de Productos", description: "Lista completa de productos disponibles" },
            { name: "Control de Precios", description: "Actualiza precios y costos" },
            { name: "Stock Disponible", description: "Consulta existencias en tiempo real" },
            { name: "Productos Retornables", description: "Marca productos que requieren devolución" }
          ]
        },
        {
          icon: Warehouse,
          title: "Almacenes",
          description: "Gestiona múltiples almacenes, controla el inventario en cada ubicación y realiza transferencias entre almacenes.",
          path: "/inventory/warehouses",
          subFeatures: [
            { name: "Múltiples Almacenes", description: "Administra varios puntos de almacenamiento" },
            { name: "Stock por Almacén", description: "Inventario específico de cada ubicación" },
            { name: "Transferencias", description: "Mueve productos entre almacenes" }
          ]
        },
        {
          icon: FilePlus,
          title: "Registro de Producción",
          description: "Registra la producción de agua purificada y actualiza automáticamente el inventario disponible.",
          path: "/inventory/production",
          subFeatures: [
            { name: "Producción Diaria", description: "Registra la producción del día" },
            { name: "Actualización de Stock", description: "El inventario se actualiza automáticamente" },
            { name: "Historial de Producción", description: "Consulta producción histórica" }
          ]
        },
        {
          icon: Boxes,
          title: "Carga de Vehículos",
          description: "Controla la carga de productos en los vehículos antes de iniciar las rutas de entrega.",
          path: "/vehicle-loading",
          subFeatures: [
            { name: "Asignar Productos", description: "Carga productos al vehículo" },
            { name: "Control de Salida", description: "Registra la salida de inventario" },
            { name: "Liquidación de Ruta", description: "Concilia productos entregados vs cargados" }
          ]
        }
      ]
    },
    {
      id: "bottles",
      title: "Envases",
      icon: Droplet,
      color: "bg-teal-500",
      features: [
        {
          icon: ArrowLeftRight,
          title: "Balance de Envases",
          description: "Controla el balance de envases (botellones) que los clientes tienen en su poder y los que deben devolver.",
          path: "/bottles/balance",
          subFeatures: [
            { name: "Balance por Cliente", description: "Cuántos envases tiene cada cliente" },
            { name: "Envases Pendientes", description: "Lista de clientes con envases por devolver" },
            { name: "Historial de Movimientos", description: "Registro de entradas y salidas" }
          ]
        },
        {
          icon: Droplet,
          title: "Devolución de Envases",
          description: "Registra la devolución de envases cuando los clientes los regresan al momento de una entrega.",
          path: "/bottles/return",
          subFeatures: [
            { name: "Registro de Devolución", description: "Marca envases como devueltos" },
            { name: "Actualización de Balance", description: "El balance se actualiza automáticamente" },
            { name: "Validación", description: "Verifica que el cliente tenga envases por devolver" }
          ]
        },
        {
          icon: ClipboardList,
          title: "Envases Faltantes",
          description: "Identifica y da seguimiento a envases que no han sido devueltos o están extraviados.",
          path: "/bottles/missing",
          subFeatures: [
            { name: "Lista de Faltantes", description: "Envases no devueltos a tiempo" },
            { name: "Asignar Responsabilidad", description: "Determina quién es responsable" },
            { name: "Acciones de Recuperación", description: "Gestiona la recuperación de envases" }
          ]
        }
      ]
    },
    {
      id: "financial",
      title: "Finanzas",
      icon: DollarSign,
      color: "bg-emerald-500",
      features: [
        {
          icon: CreditCard,
          title: "Facturación",
          description: "Genera facturas, controla pagos y gestiona la facturación de clientes.",
          path: "/billing",
          subFeatures: [
            { name: "Generar Facturas", description: "Crea facturas para clientes" },
            { name: "Registro de Pagos", description: "Marca facturas como pagadas" },
            { name: "Estado de Cuenta", description: "Visualiza el estado de cuenta del cliente" },
            { name: "Métodos de Pago", description: "Efectivo, transferencia, crédito" }
          ]
        },
        {
          icon: DollarSign,
          title: "Comisiones",
          description: "Calcula y gestiona las comisiones de conductores y vendedores basadas en ventas y entregas.",
          path: "/commissions",
          subFeatures: [
            { name: "Cálculo Automático", description: "Calcula comisiones según reglas definidas" },
            { name: "Por Producto", description: "Comisiones específicas por producto" },
            { name: "Reportes de Comisiones", description: "Genera reportes detallados" },
            { name: "Liquidación", description: "Proceso de pago de comisiones" }
          ]
        }
      ]
    },
    {
      id: "reports",
      title: "Reportes",
      icon: BarChart3,
      color: "bg-primary",
      features: [
        {
          icon: Activity,
          title: "Reportes del Sistema",
          description: "Genera reportes detallados de ventas, operaciones, clientes, inventario y más para análisis y toma de decisiones.",
          path: "/reports",
          subFeatures: [
            { name: "Reporte de Ventas", description: "Ventas por período, producto y cliente" },
            { name: "Reporte de Entregas", description: "Análisis de entregas y eficiencia" },
            { name: "Reporte de Clientes", description: "Análisis de comportamiento de clientes" },
            { name: "Reporte de Inventario", description: "Movimientos y stock actual" },
            { name: "Reporte Financiero", description: "Ingresos, costos y utilidades" },
            { name: "Exportar a Excel/PDF", description: "Descarga reportes en diversos formatos" }
          ]
        }
      ]
    },
    {
      id: "fleet",
      title: "Flota",
      icon: Truck,
      color: "bg-red-500",
      features: [
        {
          icon: Truck,
          title: "Gestión de Vehículos",
          description: "Administra tu flota de vehículos de reparto, incluyendo información de camiones, mantenimiento y asignación.",
          path: "/routes/trucks",
          subFeatures: [
            { name: "Registro de Vehículos", description: "Datos completos de cada vehículo" },
            { name: "Asignación a Rutas", description: "Asigna vehículos a rutas específicas" },
            { name: "Mantenimiento", description: "Control de mantenimiento preventivo" },
            { name: "Capacidad de Carga", description: "Define la capacidad de cada vehículo" }
          ]
        },
        {
          icon: UserCog,
          title: "Conductores",
          description: "Gestiona los conductores de tu flota, sus rutas asignadas y rendimiento.",
          path: "/drivers",
          subFeatures: [
            { name: "Registro de Conductores", description: "Información completa de conductores" },
            { name: "Rutas Asignadas", description: "Visualiza rutas de cada conductor" },
            { name: "Rendimiento", description: "Análisis de entregas y eficiencia" },
            { name: "Ubicación en Tiempo Real", description: "Rastrea ubicación actual" }
          ]
        }
      ]
    },
    {
      id: "mobile",
      title: "App Móvil (Conductores)",
      icon: Smartphone,
      color: "bg-pink-500",
      features: [
        {
          icon: Smartphone,
          title: "Aplicación Móvil",
          description: "App PWA para conductores que permite gestionar entregas, cobros y devoluciones desde cualquier dispositivo móvil.",
          path: "/mobile-app",
          subFeatures: [
            { name: "Rutas del Día", description: "Ve las rutas asignadas al conductor" },
            { name: "Lista de Entregas", description: "Pedidos pendientes por entregar" },
            { name: "Confirmar Entregas", description: "Marca pedidos como entregados" },
            { name: "Registro de Pagos", description: "Registra pagos recibidos" },
            { name: "Devolución de Envases", description: "Registra envases devueltos" },
            { name: "Mapa de Ruta", description: "Navegación GPS a cada cliente" },
            { name: "Modo Offline", description: "Funciona sin conexión a internet" },
            { name: "Nuevo Pedido", description: "Crea pedidos desde el móvil" }
          ]
        }
      ]
    },
    {
      id: "users",
      title: "Usuarios y Configuración",
      icon: Settings,
      color: "bg-slate-500",
      features: [
        {
          icon: Users,
          title: "Gestión de Usuarios",
          description: "Administra usuarios del sistema con diferentes roles: Administradores, Conductores y Asistentes.",
          path: "/users",
          subFeatures: [
            { name: "Crear Usuarios", description: "Agrega nuevos usuarios al sistema" },
            { name: "Roles y Permisos", description: "Asigna roles específicos" },
            { name: "Control de Acceso", description: "Define qué puede hacer cada usuario" },
            { name: "Usuarios Activos/Inactivos", description: "Activa o desactiva cuentas" }
          ]
        },
        {
          icon: Settings,
          title: "Configuración",
          description: "Configura parámetros del sistema, preferencias de la empresa y ajustes generales.",
          path: "/settings",
          subFeatures: [
            { name: "Datos de la Empresa", description: "Logo, nombre, información fiscal" },
            { name: "Configuración de Precios", description: "Precios y comisiones" },
            { name: "Preferencias", description: "Idioma, moneda, formato de fecha" },
            { name: "Notificaciones", description: "Configura alertas del sistema" }
          ]
        }
      ]
    },
    {
      id: "platform",
      title: "Administración de Plataforma",
      icon: Shield,
      color: "bg-amber-500",
      features: [
        {
          icon: Building2,
          title: "Gestión de Empresas",
          description: "Panel de administración para gestionar todas las empresas registradas en la plataforma (Multi-tenant).",
          path: "/platform/companies",
          subFeatures: [
            { name: "Registro de Empresas", description: "Da de alta nuevas empresas" },
            { name: "Planes y Suscripciones", description: "Asigna planes a cada empresa" },
            { name: "Facturación de Membresías", description: "Controla pagos de suscripción" },
            { name: "Configuración por Empresa", description: "Ajustes específicos de cada tenant" }
          ]
        },
        {
          icon: FileText,
          title: "Empresas Interesadas",
          description: "Gestiona leads y solicitudes de empresas interesadas en usar la plataforma.",
          path: "/platform/interested-companies",
          subFeatures: [
            { name: "Lista de Interesados", description: "Empresas que solicitaron información" },
            { name: "Seguimiento", description: "Estado de cada solicitud" },
            { name: "Conversión a Cliente", description: "Convierte leads en empresas activas" }
          ]
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    features: section.features.filter(feature =>
      feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.subFeatures?.some(sf =>
        sf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sf.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  })).filter(section => section.features.length > 0);

  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Manual de Usuario - GoWater", margin, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Guía completa del sistema de gestión de distribución de agua", margin, yPosition);
    yPosition += 20;

    // Iterate through all sections
    sections.forEach((section, sectionIndex) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Section title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`${sectionIndex + 1}. ${section.title}`, margin, yPosition);
      yPosition += 10;

      // Features
      section.features.forEach((feature, featureIndex) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Feature title
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`${sectionIndex + 1}.${featureIndex + 1} ${feature.title}`, margin + 5, yPosition);
        yPosition += 7;

        // Feature description
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const descriptionLines = doc.splitTextToSize(feature.description, pageWidth - 2 * margin - 10);
        doc.text(descriptionLines, margin + 5, yPosition);
        yPosition += descriptionLines.length * 5 + 3;

        // Sub-features
        if (feature.subFeatures && feature.subFeatures.length > 0) {
          feature.subFeatures.forEach((subFeature) => {
            if (yPosition > 260) {
              doc.addPage();
              yPosition = 20;
            }

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`• ${subFeature.name}:`, margin + 10, yPosition);
            yPosition += 5;

            doc.setFont("helvetica", "normal");
            const subDescLines = doc.splitTextToSize(subFeature.description, pageWidth - 2 * margin - 15);
            doc.text(subDescLines, margin + 12, yPosition);
            yPosition += subDescLines.length * 4 + 2;
          });
        }

        yPosition += 5;
      });

      yPosition += 5;
    });

    // Save the PDF
    doc.save("Manual-GoWater.pdf");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary/10 to-primary/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-primary rounded-xl">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                Manual de Usuario
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 hidden sm:block">
                Guía completa del sistema de gestión de distribución de agua
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            <Input
              placeholder="Buscar funcionalidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 bg-white dark:bg-slate-800 text-sm sm:text-base"
              data-testid="input-search-manual"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-32">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Menu className="h-5 w-5" />
                    Secciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-250px)]">
                    <div className="space-y-1">
                      {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                          <Button
                            key={section.id}
                            variant={activeSection === section.id ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3 h-auto py-3"
                            onClick={() => setActiveSection(section.id)}
                            data-testid={`button-section-${section.id}`}
                          >
                            <div className={`p-2 rounded-lg ${section.color} bg-opacity-10`}>
                              <Icon className={`h-5 w-5 text-${section.color.replace('bg-', '')}`} />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{section.title}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {section.features.length} funcionalidades
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile Section Selector */}
          <div className="lg:hidden mb-6">
            <Select value={activeSection} onValueChange={setActiveSection}>
              <SelectTrigger className="w-full h-12" data-testid="select-section-mobile">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const section = sections.find(s => s.id === activeSection);
                      if (!section) return null;
                      const Icon = section.icon;
                      return (
                        <>
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{section.title}</span>
                        </>
                      );
                    })()}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <SelectItem 
                      key={section.id} 
                      value={section.id}
                      data-testid={`option-section-${section.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{section.title}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {searchQuery ? (
              // Search Results
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Resultados de búsqueda
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400" data-testid="text-search-results-count">
                    {filteredSections.reduce((acc, s) => acc + s.features.length, 0)} resultados encontrados
                  </p>
                </div>

                {filteredSections.length === 0 ? (
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Search className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No se encontraron resultados
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-center" data-testid="text-no-results">
                        No se encontraron funcionalidades que coincidan con "{searchQuery}". Intenta con otros términos de búsqueda.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredSections.map((section) => (
                    <div key={section.id} className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${section.color} bg-opacity-10`}>
                          {<section.icon className="h-6 w-6" />}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                          {section.title}
                        </h3>
                      </div>

                      <div className="grid gap-4">
                        {section.features.map((feature, idx) => (
                          <FeatureCard key={idx} feature={feature} sectionColor={section.color} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Section Content
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className={`p-2 sm:p-3 rounded-xl ${currentSection.color} bg-opacity-10`}>
                    {<currentSection.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${currentSection.color.replace('bg-', 'text-')}`} />}
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                      {currentSection.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      {currentSection.features.length} funcionalidades disponibles
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:gap-6">
                  {currentSection.features.map((feature, idx) => (
                    <FeatureCard key={idx} feature={feature} sectionColor={currentSection.color} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm mt-8 sm:mt-12">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left">
              <BookOpen className="h-4 w-4 hidden sm:block" />
              <span>¿Necesitas ayuda adicional? Contacta a soporte técnico</span>
            </div>
            <Button variant="outline" size="sm" data-testid="button-download-manual" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Descargar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature, sectionColor }: { feature: Feature; sectionColor: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = feature.icon;

  return (
    <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
            <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${sectionColor} bg-opacity-10 shrink-0`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${sectionColor.replace('bg-', 'text-')}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg lg:text-xl mb-1 sm:mb-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="break-words">{feature.title}</span>
                {feature.path && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">
                    {feature.path}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {feature.description}
              </CardDescription>
            </div>
          </div>
          {feature.subFeatures && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 h-8 w-8 p-0"
              aria-label={isExpanded ? "Ocultar detalles" : "Ver detalles"}
              data-testid={`button-expand-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <ChevronRight className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      {feature.subFeatures && isExpanded && (
        <CardContent className="pt-0 border-t border-slate-100 dark:border-slate-800 p-4 sm:p-6">
          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
            {feature.subFeatures.map((subFeature, idx) => (
              <div
                key={idx}
                className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base text-slate-900 dark:text-white break-words">
                    {subFeature.name}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 break-words">
                    {subFeature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
