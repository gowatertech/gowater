import React from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  LogOut, 
  Building2, 
  Users, 
  Package, 
  Clock, 
  CreditCard,
  LayoutDashboard, 
  Settings 
} from "lucide-react";

interface PlatformLayoutProps {
  children: React.ReactNode;
}

export function PlatformLayout({ children }: PlatformLayoutProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await apiRequest({
        url: "/api/platform/platform-logout", 
        method: "POST" 
      });
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      
      // Redireccionar a la página de login
      setLocation("/platform/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  // Determinar la ruta activa para resaltar el elemento de navegación
  const isActive = (path: string) => {
    // Para las rutas exactas
    if (path === location) return true;
    
    // Para las rutas que comienzan con el path (pero asegurarse de que sea la carpeta completa)
    if (path !== '/platform/dashboard' && location.startsWith(path)) {
      // Verificar que sea una ruta completa, por ejemplo:
      // /platform/companies debe coincidir con /platform/companies/1
      // pero no debe coincidir con /platform/companies-other
      const nextChar = location.charAt(path.length);
      return nextChar === '' || nextChar === '/';
    }
    
    return false;
  };

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 bg-card shadow-md">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-full">
              <LogOut className="h-4 w-4 text-white rotate-180" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">GOWater</h1>
              <p className="text-xs text-muted-foreground">Plataforma Administrativa</p>
            </div>
          </div>
        </div>
        <nav className="p-2">
          <ul className="space-y-1">
            <li>
              <Link href="/platform/dashboard">
                <a className={`flex items-center gap-2 p-2 rounded-md ${
                  isActive('/platform/dashboard') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/10'
                }`}>
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/companies">
                <a className={`flex items-center gap-2 p-2 rounded-md ${
                  isActive('/platform/companies') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/10'
                }`}>
                  <Building2 size={18} />
                  <span>Empresas</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/plans">
                <a className={`flex items-center gap-2 p-2 rounded-md ${
                  isActive('/platform/plans') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/10'
                }`}>
                  <Package size={18} />
                  <span>Planes</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/users">
                <a className={`flex items-center gap-2 p-2 rounded-md ${
                  isActive('/platform/users') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/10'
                }`}>
                  <Users size={18} />
                  <span>Usuarios</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/invoices">
                <a className={`flex items-center gap-2 p-2 rounded-md ${
                  isActive('/platform/invoices') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/10'
                }`}>
                  <CreditCard size={18} />
                  <span>Facturas</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/settings">
                <a className={`flex items-center gap-2 p-2 rounded-md ${
                  isActive('/platform/settings') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/10'
                }`}>
                  <Settings size={18} />
                  <span>Configuración</span>
                </a>
              </Link>
            </li>
            <li className="mt-6">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-destructive/10 text-destructive"
              >
                <LogOut size={18} />
                <span>Cerrar sesión</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}