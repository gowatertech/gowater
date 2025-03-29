import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Moon,
  Sun,
  RotateCcw,
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  Home,
  Droplet,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeThumbnail } from "@/components/theme/ThemeThumbnail";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";

interface MobileHeaderProps {
  title?: string;
  user?: any;
  darkMode: boolean;
  onToggleDarkMode?: () => void;
  onSyncData?: () => void;
}

export function MobileHeader({ title = "GoWater Driver", user, darkMode, onToggleDarkMode, onSyncData }: MobileHeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Función para cerrar sesión
  const handleLogout = () => {
    toast({
      title: "Cerrando sesión",
      description: "Hasta pronto"
    });
    
    // Redireccionar al inicio de sesión después de un breve retraso
    setTimeout(() => {
      setLocation("/");
    }, 1000);
  };
  
  return (
    <header className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'} border-b shadow-sm`}>
      <div className="container mx-auto max-w-md flex items-center justify-between p-3">
        {/* Logo y título */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
            <Droplet className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
        
        {/* Acciones rápidas */}
        <div className="flex items-center gap-1">
          {/* Botón de sincronización */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9" 
            onClick={onSyncData}
            title="Sincronizar datos"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          
          {/* Selector de tema */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                title="Cambiar tema"
              >
                <Palette className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="end">
              <ThemeSwitcher />
            </PopoverContent>
          </Popover>
          
          {/* Botón para alternar modo oscuro/claro */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9" 
            onClick={onToggleDarkMode}
            title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          {/* Menú de notificaciones */}
          <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 relative" 
                title="Notificaciones"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <SheetHeader>
                <SheetTitle>Notificaciones</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-3">
                <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <p className="font-medium">Nueva entrega asignada</p>
                  <p className="text-xs text-muted-foreground">Hace 10 minutos</p>
                </div>
                <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <p className="font-medium">Ruta actualizada</p>
                  <p className="text-xs text-muted-foreground">Hace 30 minutos</p>
                </div>
                <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <p className="font-medium">Pedido cancelado: #12345</p>
                  <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Menú de usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9" 
                title="Menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <DropdownMenuLabel>{user?.name || 'Usuario'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/mobile-app")}>
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/mobile-app/perfil")}>
                <User className="h-4 w-4 mr-2" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/mobile-app/configuracion")}>
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}