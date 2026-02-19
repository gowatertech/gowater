import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Settings,
  Briefcase,
  Menu,
  X,
  Video,
  Banknote
} from "lucide-react";

interface PlatformLayoutProps {
  children: React.ReactNode;
}

export function PlatformLayout({ children }: PlatformLayoutProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on initial load
    checkMobile();
    
    // Add listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

      // Limpiar el historial actual para prevenir navegación hacia atrás después de cerrar sesión
      // Primero reemplazar la entrada actual
      window.history.replaceState(null, "", "/platform/login");
      
      // Redireccionar a la página de login reemplazando la entrada en el historial
      setLocation("/platform/login", { replace: true });
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

  // Navigation links component to avoid duplication
  const NavigationLinks = ({ onLinkClick = () => {} }) => (
    <ul className="space-y-1">
      <li>
        <Link href="/platform/dashboard">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/dashboard') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/companies">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/companies') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <Building2 size={18} />
            <span>Empresas</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/empresas-interesadas">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/empresas-interesadas') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <Briefcase size={18} />
            <span>Empresas Interesadas</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/plans">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/plans') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <Package size={18} />
            <span>Planes</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/users">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/users') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <Users size={18} />
            <span>Usuarios</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/invoices">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/invoices') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <CreditCard size={18} />
            <span>Facturas</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/cobros">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/cobros') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <Banknote size={18} />
            <span>Cobros</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/videos-prom">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/videos-prom') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <Video size={18} />
            <span>Videos Prom</span>
          </a>
        </Link>
      </li>
      <li>
        <Link href="/platform/settings">
          <a 
            className={`flex items-center gap-2 p-2 rounded-md ${
              isActive('/platform/settings') 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-primary/10'
            }`}
            onClick={onLinkClick}
          >
            <Settings size={18} />
            <span>Configuración</span>
          </a>
        </Link>
      </li>
      <li className="mt-6">
        <button
          onClick={() => {
            handleLogout();
            onLinkClick();
          }}
          className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-destructive/10 text-destructive"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </li>
    </ul>
  );

  const Logo = () => (
    <div className="flex items-center gap-2">
      <div className="bg-primary p-1.5 rounded-full">
        <LogOut className="h-4 w-4 text-white rotate-180" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-primary">GOWater</h1>
        <p className="text-xs text-muted-foreground">Plataforma Administrativa</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-muted/20 md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block md:w-64 bg-card shadow-md h-full">
        <div className="p-4 border-b">
          <Logo />
        </div>
        <nav className="p-2">
          <NavigationLinks />
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-10 bg-card shadow-sm p-3 flex justify-between items-center">
        <Logo />
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-0">
            <div className="p-4 border-b flex justify-between items-center">
              <Logo />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="p-2">
              <NavigationLinks onLinkClick={() => setIsMobileMenuOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}