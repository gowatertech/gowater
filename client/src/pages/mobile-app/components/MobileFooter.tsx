import React from "react";
import { useLocation } from "wouter";
import {
  Home,
  Navigation,
  Package,
  Recycle,
  BarChart3,
  ListChecks,
  Play
} from "lucide-react";

interface MobileFooterProps {
  darkMode: boolean;
}

export function MobileFooter({ darkMode }: MobileFooterProps) {
  const [location, setLocation] = useLocation();
  
  const navItems = [
    {
      icon: Home,
      label: "Inicio",
      href: "/mobile-app"
    },
    {
      icon: ListChecks,
      label: "Rutas",
      href: "/mobile-app/rutas-pendientes"
    },
    {
      icon: Play,
      label: "En Curso",
      href: "/mobile-app/rutas-en-progreso"
    },
    {
      icon: Package,
      label: "Entregas",
      href: "/mobile-app/entregas"
    },
    {
      icon: Recycle,
      label: "Envases",
      href: "/mobile-app/envases"
    }
  ];
  
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-10 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'} border-t shadow-lg`}>
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <button
              key={item.href}
              className={`flex flex-col items-center justify-center py-1 relative ${
                isActive 
                  ? `text-primary ${darkMode ? 'bg-primary/10' : ''}`
                  : 'text-muted-foreground'
              }`}
              onClick={() => setLocation(item.href)}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}