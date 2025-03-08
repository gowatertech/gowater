import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Home, Users, Route, Package, FileText, UserCog, Settings } from "lucide-react";

const TutorialPage = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Bienvenido a GoWater",
      description: "Sistema de gestión de entregas de agua con optimización de rutas y administración zonal.",
      content: (
        <div className="space-y-4">
          <p>Esta guía interactiva te ayudará a familiarizarte con las principales características de GoWater.</p>
          <p>Navega por los pasos para aprender a utilizar cada módulo del sistema.</p>
          <div className="flex justify-center my-8">
            <div className="p-6 bg-blue-50 rounded-full">
              <Home className="h-16 w-16 text-blue-500" />
            </div>
          </div>
        </div>
      ),
      icon: <Home className="h-6 w-6" />
    },
    {
      title: "Panel de Control",
      description: "Centro de información centralizado",
      content: (
        <div className="space-y-4">
          <p>El panel de control te proporciona una visión general de:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Entregas pendientes del día</li>
            <li>Estadísticas de ventas</li>
            <li>Mapa de rutas activas</li>
            <li>Alertas de inventario bajo</li>
            <li>Actividad reciente en el sistema</li>
          </ul>
          <p className="mt-4">Es tu punto de partida para tomar decisiones informadas sobre la operación diaria.</p>
          <div className="my-4 p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-600">Consejo: Personaliza los widgets de tu panel arrastrándolos a la posición deseada.</p>
          </div>
        </div>
      ),
      icon: <Home className="h-6 w-6" />
    },
    {
      title: "Gestión de Clientes",
      description: "Administra tu cartera de clientes",
      content: (
        <div className="space-y-4">
          <p>En este módulo puedes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Registrar nuevos clientes con todos sus datos comerciales</li>
            <li>Asignar clientes a zonas específicas</li>
            <li>Configurar condiciones de crédito personalizadas</li>
            <li>Visualizar historial de pedidos y pagos</li>
            <li>Actualizar información de contacto y ubicación/li>
          </ul>

          <div className="flex justify-center my-6">
            <div className="p-4 bg-indigo-50 rounded-full">
              <Users className="h-12 w-12 text-indigo-500" />
            </div>
          </div>

          <div className="my-4 p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-600">Recuerda: Los datos de ubicación precisa son esenciales para la optimización de rutas.</p>
          </div>
        </div>
      ),
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Rutas y Entregas",
      description: "Optimiza tus recorridos de entrega",
      content: (
        <div className="space-y-4">
          <p>El sistema de rutas permite:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Crear rutas optimizadas basadas en la ubicación de los clientes</li>
            <li>Asignar vehículos y personal a cada ruta</li>
            <li>Programar entregas por horarios y prioridades</li>
            <li>Seguimiento en tiempo real de los vehículos</li>
            <li>Notificaciones automáticas de entregas completadas</li>
          </ul>

          <div className="flex justify-center my-6">
            <div className="p-4 bg-green-50 rounded-full">
              <Route className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="my-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <p className="text-sm text-yellow-700">Importante: Los choferes pueden actualizar el estado de entrega desde la aplicación móvil.</p>
          </div>
        </div>
      ),
      icon: <Route className="h-6 w-6" />
    },
    {
      title: "Inventario",
      description: "Control de productos y existencias",
      content: (
        <div className="space-y-4">
          <p>La gestión de inventario te permite:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Registrar entradas y salidas de productos</li>
            <li>Monitorear niveles de stock en tiempo real</li>
            <li>Configurar alertas de stock mínimo</li>
            <li>Registrar lotes de producción con trazabilidad</li>
            <li>Generar reportes de rotación de inventario</li>
          </ul>

          <div className="flex justify-center my-6">
            <div className="p-4 bg-purple-50 rounded-full">
              <Package className="h-12 w-12 text-purple-500" />
            </div>
          </div>

          <div className="my-4 p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-600">Consejo: Revisa el inventario al final del día para planificar la producción del día siguiente.</p>
          </div>
        </div>
      ),
      icon: <Package className="h-6 w-6" />
    },
    {
      title: "Facturación",
      description: "Gestión de ventas y pagos",
      content: (
        <div className="space-y-4">
          <p>El módulo de facturación permite:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Generar facturas con validez fiscal (NCF)</li>
            <li>Aplicar diferentes métodos de pago</li>
            <li>Gestionar cuentas por cobrar</li>
            <li>Emitir notas de crédito o débito</li>
            <li>Generar reportes de ventas por periodo</li>
          </ul>

          <div className="flex justify-center my-6">
            <div className="p-4 bg-red-50 rounded-full">
              <FileText className="h-12 w-12 text-red-500" />
            </div>
          </div>

          <div className="my-4 p-4 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700">Importante: Todas las facturas pueden exportarse en formato PDF o enviarse por correo electrónico.</p>
          </div>
        </div>
      ),
      icon: <FileText className="h-6 w-6" />
    },
    {
      title: "Usuarios y Permisos",
      description: "Administra el acceso al sistema",
      content: (
        <div className="space-y-4">
          <p>La gestión de usuarios permite:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Crear usuarios con diferentes roles y permisos</li>
            <li>Asignar zonas de operación específicas</li>
            <li>Monitorear la actividad de cada usuario</li>
            <li>Configurar políticas de seguridad</li>
            <li>Restablecer contraseñas</li>
          </ul>

          <div className="flex justify-center my-6">
            <div className="p-4 bg-orange-50 rounded-full">
              <UserCog className="h-12 w-12 text-orange-500" />
            </div>
          </div>

          <div className="my-4 p-4 bg-red-50 rounded-md border border-red-200">
            <p className="text-sm text-red-700">Advertencia: Solo los administradores pueden crear nuevos usuarios y asignar permisos.</p>
          </div>
        </div>
      ),
      icon: <UserCog className="h-6 w-6" />
    },
    {
      title: "Uso Local de la Aplicación",
      description: "Instalación y configuración",
      content: (
        <div className="space-y-4">
          <p>Para utilizar GoWater localmente:</p>

          <div className="bg-gray-50 p-4 rounded-md font-mono text-sm">
            <p className="font-semibold mb-2">Descarga del código:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Desde Replit: Menu → Download as zip</li>
              <li>Con Git: git clone [repositorio]</li>
            </ul>

            <p className="font-semibold mt-4 mb-2">Requisitos:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Node.js (versión 20.x)</li>
              <li>PostgreSQL (versión 16)</li>
            </ul>

            <p className="font-semibold mt-4 mb-2">Comandos:</p>
            <div className="bg-gray-800 text-white p-3 rounded-md">
              <p># Instalar dependencias</p>
              <p>npm install</p>
              <p className="mt-2"># Iniciar en desarrollo</p>
              <p>npm run dev</p>
              <p className="mt-2"># Compilar</p>
              <p>npm run build</p>
              <p className="mt-2"># Iniciar en producción</p>
              <p>npm run start</p>
            </div>
          </div>

          <div className="my-4 p-4 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm text-green-700">La aplicación estará disponible en http://localhost:5000</p>
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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">{t("Tutorial Interactivo - GoWater")}</h1>

      <div className="flex mb-6 overflow-x-auto pb-2 no-scrollbar">
        {tutorialSteps.map((step, index) => (
          <div
            key={index}
            onClick={() => handleStepClick(index)}
            className={`flex items-center justify-center min-w-[40px] h-10 mx-1 rounded-full cursor-pointer transition-all
              ${currentStep === index
                ? "bg-blue-500 text-white"
                : index < currentStep
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-gray-100 text-gray-500"}
            `}
          >
            <div className="flex items-center justify-center w-full h-full px-3">
              {step.icon}
            </div>
          </div>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{tutorialSteps[currentStep].title}</CardTitle>
          <CardDescription>{tutorialSteps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {tutorialSteps[currentStep].content}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> {t("Anterior")}
        </Button>

        <div className="text-sm text-gray-500 self-center">
          {currentStep + 1} / {tutorialSteps.length}
        </div>

        <Button
          onClick={handleNext}
          disabled={currentStep === tutorialSteps.length - 1}
        >
          {t("Siguiente")} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TutorialPage;