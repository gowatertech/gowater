import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Smartphone,
  Navigation,
  Package,
  CreditCard,
  Calendar,
  ArrowLeft,
  Moon,
  Sun,
  RotateCcw,
  Bell,
  LogOut,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentUser } from "@/hooks/use-current-user";

// Componentes que crearemos a continuación
import { MobileHeader } from "./components/MobileHeader";
import { MobileFooter } from "./components/MobileFooter";
import { InstallPrompt } from "./components/InstallPrompt";

export default function GoWaterDriverApp() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  // Verificar si el usuario es un chofer
  useEffect(() => {
    if (!isLoading && user && user.role !== "driver") {
      toast({
        title: "Acceso denegado",
        description: "Sólo los choferes pueden acceder a esta aplicación",
        variant: "destructive"
      });
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation, toast]);

  // Detectar si la PWA puede ser instalada
  useEffect(() => {
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir que Chrome muestre la instalación automáticamente
      e.preventDefault();
      // Guardar el evento para usarlo después
      deferredPrompt = e;
      // Mostrar nuestro propio prompt
      setShowInstallPrompt(true);
    });

    window.addEventListener('appinstalled', () => {
      // Cuando la PWA se haya instalado, ocultar el prompt
      setShowInstallPrompt(false);
      deferredPrompt = null;
    });

    // Comprobar si ya está en modo standalone (ya instalada)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }
  }, []);

  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
    toast({
      title: darkMode ? "Modo claro activado" : "Modo oscuro activado",
      description: "La configuración se ha guardado"
    });
  };

  // Simular actualización de datos
  const syncData = () => {
    toast({
      title: "Sincronizando datos",
      description: "Actualizando información..."
    });
    
    // Simular una petición de sincronización
    setTimeout(() => {
      toast({
        title: "Sincronización completada",
        description: "Datos actualizados correctamente",
        variant: "default"
      });
    }, 1500);
  };

  // Si el usuario no es un chofer o está cargando, mostrar pantalla de carga
  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary/5">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="font-medium text-primary">Cargando GoWater Driver...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
      {/* Prompt de instalación */}
      {showInstallPrompt && <InstallPrompt onClose={() => setShowInstallPrompt(false)} />}
      
      {/* Cabecera móvil */}
      <MobileHeader 
        user={user} 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode} 
        onSyncData={syncData}
      />

      {/* Contenido principal */}
      <main className="container max-w-md mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* Sección de bienvenida */}
          <Card className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <h1 className="text-xl font-bold">{`¡Bienvenido, ${user.name}!`}</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('es-DO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </CardContent>
          </Card>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="default" 
              className={`h-24 flex flex-col items-center justify-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => setLocation("/mobile-app/entregas")}
            >
              <Package className="h-6 w-6" />
              <span>Mis Entregas</span>
            </Button>
            
            <Button 
              variant="default" 
              className={`h-24 flex flex-col items-center justify-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => setLocation("/mobile-app/ruta")}
            >
              <Navigation className="h-6 w-6" />
              <span>Mi Ruta</span>
            </Button>
            
            <Button 
              variant="default" 
              className={`h-24 flex flex-col items-center justify-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => setLocation("/mobile-app/pagos")}
            >
              <CreditCard className="h-6 w-6" />
              <span>Pagos</span>
            </Button>
            
            <Button 
              variant="default" 
              className={`h-24 flex flex-col items-center justify-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => setLocation("/mobile-app/pedidos")}
            >
              <Calendar className="h-6 w-6" />
              <span>Crear Pedido</span>
            </Button>
          </div>

          {/* Estadísticas del día */}
          <Card className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <h2 className="font-medium mb-3">Estadísticas de hoy</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Entregas Pendientes</p>
                  <p className="text-xl font-bold text-primary">8</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Entregas Completadas</p>
                  <p className="text-xl font-bold text-green-500">4</p>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pagos Recibidos</p>
                  <p className="text-xl font-bold text-yellow-500">$1,240</p>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Envases Devueltos</p>
                  <p className="text-xl font-bold text-purple-500">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Último punto de ruta */}
          <Card className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <h2 className="font-medium mb-2">Próxima Entrega</h2>
              <div className="bg-primary/5 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">Juan Pérez</p>
                  <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">10:30 AM</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Calle Principal #45, Las Terrenas</p>
                <p className="text-xs bg-yellow-500/20 text-yellow-700 inline-block px-2 py-0.5 rounded-full">4 Botellones de Agua</p>
                <div className="flex justify-end mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                    onClick={() => setLocation("/mobile-app/entregas/1")}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Barra de navegación inferior */}
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}