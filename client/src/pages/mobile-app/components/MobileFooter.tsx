import React from "react";
import { useLocation } from "wouter";
import { Home, Truck, FileText, Map, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileFooterProps {
  darkMode?: boolean;
}

export const MobileFooter: React.FC<MobileFooterProps> = ({ darkMode = false }) => {
  const [location, setLocation] = useLocation();

  const isActivePath = (path: string) => {
    return location.startsWith(path);
  };

  return (
    <footer className={`fixed bottom-0 left-0 right-0 w-full border-t shadow-sm py-2 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <nav className="flex justify-around items-center px-2">
        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            isActivePath("/mobile-app") && !isActivePath("/mobile-app/") ? "text-primary" : ""
          }`}
          onClick={() => setLocation("/mobile-app")}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Inicio</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            isActivePath("/mobile-app/rutas") || isActivePath("/mobile-app/ruta") ? "text-primary" : ""
          }`}
          onClick={() => setLocation("/mobile-app/rutas-pendientes")}
        >
          <Truck className="h-5 w-5" />
          <span className="text-xs">Rutas</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            isActivePath("/mobile-app/entregas") ? "text-primary" : ""
          }`}
          onClick={() => setLocation("/mobile-app/entregas")}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">Entregas</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            isActivePath("/mobile-app/mapa") ? "text-primary" : ""
          }`}
          onClick={() => setLocation("/mobile-app/mapa")}
        >
          <Map className="h-5 w-5" />
          <span className="text-xs">Mapa</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center gap-1 h-auto py-2 ${
            isActivePath("/mobile-app/perfil") ? "text-primary" : ""
          }`}
          onClick={() => setLocation("/mobile-app/perfil")}
        >
          <User className="h-5 w-5" />
          <span className="text-xs">Perfil</span>
        </Button>
      </nav>
    </footer>
  );
};