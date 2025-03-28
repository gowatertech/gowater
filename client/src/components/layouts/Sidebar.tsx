import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Users,
  Route,
  Package,
  FileText,
  Settings,
  Droplet,
  ChevronRight,
  BookOpen,
  LayoutDashboard,
  BarChart2,
  Box,
  Warehouse,
  ClipboardList,
  RefreshCcw,
  CreditCard,
  Calculator,
  Building2,
  Truck,
  AreaChart,
  Calendar,
  TrendingUp,
  MapPin,
  ReceiptText,
  List,
  CircleDot,
  UserCircle,
  Home,
  CircleDollarSign,
  Landmark,
  FileStack,
  Factory,
  CircleUser,
  BarChart3,
  ScrollText,
  LucideProps,
} from "lucide-react";

// Colores más modernos con un esquema basado en tonos gradientes
const menuColors = {
  dashboard: "#4F46E5", // Indigo 600
  inventory: "#059669", // Emerald 600
  routes: "#F59E0B", // Amber 500
  operaciones: "#F59E0B", // Amber 500 - mismo color que routes
  bottles: "#3B82F6", // Blue 500
  payments: "#8B5CF6", // Violet 500
  finanzas: "#8B5CF6", // Violet 500 - mismo color que payments
  admin: "#EC4899", // Pink 500
  administración: "#EC4899", // Pink 500 - mismo color que admin
  settings: "#6366F1", // Indigo 500
};

// Categorías reorganizadas y más descriptivas
const sidebarItems = [
  { 
    icon: Home, 
    label: "Panel Principal", 
    href: "/",
    description: "Vista general"
  },
  {
    icon: Truck,
    label: "Operaciones",
    href: "/routes",
    description: "Logística y distribución", 
    subItems: [
      { icon: MapPin, label: "Rutas", href: "/routes" },
      { icon: CircleUser, label: "Vista del Chofer", href: "/drivers" },
      { icon: Truck, label: "Vehículos", href: "/routes/trucks" },
      { icon: FileStack, label: "Carga de Vehículo", href: "/routes/vehicle-loading" },
      { icon: ScrollText, label: "Cuadre de Vehículo", href: "/routes/vehicle-settlement" },
      { icon: Calendar, label: "Pedidos Recurrentes", href: "/routes/recurring-orders" },
      { icon: ReceiptText, label: "Pedidos", href: "/orders" },
    ],
  },
  {
    icon: Warehouse,
    label: "Inventario",
    href: "/inventory",
    description: "Gestión de almacén", 
    subItems: [
      { icon: Warehouse, label: "Almacén", href: "/inventory/warehouses" },
      { icon: Package, label: "Productos", href: "/inventory/products" },
      { icon: Factory, label: "Registrar Producción", href: "/inventory/production" },
    ],
  },
  {
    icon: RefreshCcw,
    label: "Envases",
    href: "/bottles",
    description: "Control de retornables", 
    subItems: [
      { icon: CircleDot, label: "Registrar Devolución", href: "/bottles/return" },
      { icon: BarChart3, label: "Balance de Envases", href: "/bottles/balance" },
      { icon: CircleDollarSign, label: "Cobrar Faltantes", href: "/bottles/missing" },
    ],
  },
  {
    icon: Landmark,
    label: "Finanzas",
    href: "/payments",
    description: "Gestión financiera", 
    subItems: [
      { icon: CreditCard, label: "Pagos", href: "/payments" },
      { icon: FileText, label: "Facturación", href: "/billing" },
      { icon: TrendingUp, label: "Comisiones", href: "/payments/commissions" },
    ],
  },
  {
    icon: Building2,
    label: "Administración",
    href: "/admin",
    description: "Gestión empresarial", 
    subItems: [
      { icon: Users, label: "Usuarios", href: "/users" },
      { icon: UserCircle, label: "Clientes", href: "/customers" },
      { icon: AreaChart, label: "Reportes", href: "/reports" },
    ],
  },

  { 
    icon: Settings, 
    label: "Configuración", 
    href: "/settings",
    description: "Opciones del sistema"
  },
];

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Sidebar as UISidebar,
  SidebarContent as UISidebarContent,
  SidebarHeader as UISidebarHeader,
  SidebarMenu as UISidebarMenu,
  SidebarMenuItem as UISidebarMenuItem,
  SidebarMenuButton as UISidebarMenuButton,
} from "@/components/ui/sidebar";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

// Componente de ícono con efecto de animación
const AnimatedIcon = ({ icon: Icon, color, isActive, className, ...props }: { 
  icon: React.ComponentType<LucideProps>; 
  color: string; 
  isActive?: boolean;
  className?: string;
} & LucideProps) => (
  <div className={cn("transition-all duration-200 relative", className)}>
    <Icon 
      className={cn(
        "transition-all duration-200",
        isActive ? "scale-110" : "scale-100",
      )} 
      style={{ 
        color: color,
        filter: isActive ? `drop-shadow(0 0 4px ${color}40)` : 'none'
      }} 
      {...props} 
    />
    {isActive && (
      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
    )}
  </div>
);

export function Sidebar({ openMobile, setOpenMobile }: SidebarProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [activeItems, setActiveItems] = useState<string[]>([]);

  // Manejador para abrir y cerrar menús al hacer clic
  const handleItemClick = (label: string) => {
    // Si el elemento ya está en activeItems, lo removemos (cerramos el submenú)
    if (activeItems.includes(label)) {
      setActiveItems([]);
    } else {
      // Si no está, lo agregamos (y quitamos todos los demás para cerrar otros submenús)
      setActiveItems([label]);
    }
  };

  // Al cambiar de ubicación, actualizar el ítem activo automáticamente
  useEffect(() => {
    // Encontrar el ítem principal activo basado en la ubicación actual
    const activeMainItem = sidebarItems.find(item => 
      location === item.href || (item.subItems?.some(sub => location === sub.href))
    );
    
    if (activeMainItem) {
      // Si tiene subitems y uno está activo, mantenerlo abierto
      if (activeMainItem.subItems?.some(sub => location === sub.href)) {
        setActiveItems([activeMainItem.label]);
      } else {
        // Si es un ítem principal sin subitems, cerrar todos los menús
        setActiveItems([]);
      }
    } else {
      // Si no hay ítem activo, limpiar la lista
      setActiveItems([]);
    }
  }, [location]);
  


  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background">
      <UISidebarHeader className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-50">
            <Droplet className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            GoWater
          </span>
        </div>
      </UISidebarHeader>

      {/* Botón de Tutorial */}
      <div className="mx-5 my-4">
        <Link href="/tutorial">
          <Button variant="outline" className="w-full flex items-center justify-center gap-2.5 border-blue-200 bg-gradient-to-r from-primary/10 to-blue-500/10 hover:from-primary/15 hover:to-blue-500/15 text-primary hover:text-primary/90 transition-all">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium">{t("Tutorial Interactivo")}</span>
          </Button>
        </Link>
      </div>

      <UISidebarMenu className="px-5 mt-2">
        {sidebarItems.map((item) => {
          const isActive = location === item.href || (item.subItems?.some(sub => location === sub.href));
          const itemColor = menuColors[item.label.toLowerCase().split('/')[0] as keyof typeof menuColors] || menuColors.dashboard;
          const isExpanded = isActive || activeItems.includes(item.label);
          
          return (
            <UISidebarMenuItem
              key={item.href}
              className="relative group mb-1.5"
            >
              {!item.subItems ? (
                <Link href={item.href}>
                  <UISidebarMenuButton
                    isActive={isActive}
                    tooltip={t(item.label)}
                    className={cn(
                      "w-full justify-start gap-4 rounded-lg hover:bg-primary/5 transition-all duration-200",
                      isActive && "bg-primary/10 shadow-sm font-medium text-primary"
                    )}
                    onClick={() => setOpenMobile(false)}
                  >
                    <AnimatedIcon 
                      icon={item.icon}
                      color={isActive ? itemColor : "#64748b"}
                      isActive={isActive} 
                      className="h-5 w-5" 
                    />
                    <div className="flex flex-col items-start">
                      <span className={cn(
                        "font-medium",
                        isActive ? "text-primary" : "text-foreground/80"
                      )}>
                        {t(item.label)}
                      </span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground hidden group-hover:block">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </UISidebarMenuButton>
                </Link>
              ) : (
                <>
                  <UISidebarMenuButton
                    isActive={isActive}
                    tooltip={t(item.label)}
                    className={cn(
                      "w-full justify-start gap-4 pr-8 rounded-lg transition-all duration-200",
                      isExpanded ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-primary/5",
                      isActive && "font-medium text-primary shadow-sm"
                    )}
                    onClick={() => handleItemClick(item.label)}
                  >
                    <AnimatedIcon 
                      icon={item.icon} 
                      color={isActive ? itemColor : "#64748b"}
                      isActive={isActive} 
                      className="h-5 w-5" 
                    />
                    <div className="flex flex-col items-start">
                      <span className={cn(
                        "font-medium",
                        isActive ? "text-primary" : "text-foreground/80"
                      )}>
                        {t(item.label)}
                      </span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground hidden group-hover:block">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 transition-transform text-muted-foreground",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </UISidebarMenuButton>

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out px-2",
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="py-1 space-y-1 ml-4 pl-2 border-l border-muted">
                      {item.subItems.map((subItem) => {
                        const isSubActive = location === subItem.href;
                        return (
                          <Link key={subItem.href} href={subItem.href}>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setOpenMobile(false)}
                                    className={cn(
                                      "w-full py-2 px-3 text-left text-sm rounded-md flex items-center gap-2.5 font-normal",
                                      "hover:bg-primary/5 transition-colors duration-200",
                                      isSubActive ? "bg-primary/5 text-primary" : "text-muted-foreground"
                                    )}
                                  >
                                    {subItem.icon && <subItem.icon className="h-3.5 w-3.5" />}
                                    <span>{t(subItem.label)}</span>
                                    {isSubActive && (
                                      <Badge variant="secondary" className="ml-auto text-[9px] py-0 px-1 h-auto">
                                        Actual
                                      </Badge>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {t(subItem.label)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </UISidebarMenuItem>
          );
        })}
      </UISidebarMenu>
    </div>
  );

  const MobileSidebar = () => (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="p-0 w-[280px]">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );

  const DesktopSidebar = () => (
    <UISidebar>
      <SidebarContent />
    </UISidebar>
  );

  return (
    <>
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>
      <div className="md:hidden">
        <MobileSidebar />
      </div>
    </>
  );
}