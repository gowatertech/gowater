import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
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
  Target,
  LogOut,
} from "lucide-react";

const menuColors = {
  dashboard: "#4F46E5",
  inventory: "#059669",
  routes: "#F59E0B",
  operaciones: "#F59E0B",
  bottles: "#3B82F6",
  payments: "#8B5CF6",
  finanzas: "#8B5CF6",
  admin: "#EC4899",
  administración: "#EC4899",
  settings: "#6366F1",
};

const sidebarItems = [
  { 
    icon: LayoutDashboard, 
    label: "Panel de Control", 
    href: "/dashboard",
    description: "Vista general del sistema"
  },
  { 
    icon: ClipboardList, 
    label: "Pedidos", 
    href: "/orders",
    description: "Gestión de pedidos"
  },
  { 
    icon: FileText, 
    label: "Facturación", 
    href: "/billing",
    description: "Facturas y comprobantes"
  },
  { 
    icon: CreditCard, 
    label: "Pagos", 
    href: "/payments",
    description: "Gestión de pagos"
  },
  { 
    icon: Users, 
    label: "Clientes", 
    href: "/customers",
    description: "Base de datos de clientes"
  },
  { 
    icon: Route, 
    label: "Rutas", 
    href: "/routes",
    description: "Planificación de rutas"
  },
  { 
    icon: MapPin, 
    label: "Zonas", 
    href: "/zones",
    description: "Gestión de zonas de entrega"
  },
  {
    icon: Truck,
    label: "Operaciones",
    href: "/operations",
    description: "Logística y distribución", 
    subItems: [
      { icon: Truck, label: "Vehículos", href: "/routes/trucks" },
      { icon: FileStack, label: "Carga de Vehículo", href: "/vehicle-loading" },
      { icon: ScrollText, label: "Cuadre de Vehículo", href: "/vehicle-settlement" },
      { icon: Calendar, label: "Pedidos Recurrentes", href: "/recurring-orders" },
      { icon: CircleUser, label: "Vista del Chofer", href: "/drivers" },
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
      { icon: Target, label: "Pendientes de Retorno", href: "/bottles/pending" },
    ],
  },
  {
    icon: Calculator,
    label: "Finanzas",
    href: "/finance",
    description: "Gestión financiera", 
    subItems: [
      { 
        icon: TrendingUp, 
        label: "Comisiones", 
        href: "/commissions",
        subItems: [
          { icon: TrendingUp, label: "Comisiones", href: "/commissions" },
          { icon: TrendingUp, label: "Vista Simple", href: "/commissions/simple" },
        ],
      },
      { icon: AreaChart, label: "Reportes", href: "/reports" },
    ],
  },
  {
    icon: Building2,
    label: "Administración",
    href: "/admin",
    description: "Gestión empresarial", 
    subItems: [
      { icon: UserCircle, label: "Usuarios", href: "/users" },
    ],
  },

  { 
    icon: BookOpen, 
    label: "Manual de Usuario", 
    href: "/manual",
    description: "Guía completa del sistema"
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
import { useCompanySettings } from "@/hooks/use-company-settings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";
import { isSidebarItemVisible, type UserRole } from "@shared/permissions";

interface SidebarProps {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

export function Sidebar({ openMobile, setOpenMobile }: SidebarProps) {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [activeItems, setActiveItems] = useState<string[]>([]);
  const { toast } = useToast();
  const { settings } = useCompanySettings();
  const { user } = useAuth();
  const userRole = (user?.role || "admin") as UserRole;

  const filteredSidebarItems = sidebarItems.filter(item => isSidebarItemVisible(userRole, item.label));
  
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Error al cerrar sesión");
      }
      
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  const handleItemClick = (label: string) => {
    if (activeItems.includes(label)) {
      setActiveItems([]);
    } else {
      setActiveItems([label]);
    }
  };

  useEffect(() => {
    const activeMainItem = filteredSidebarItems.find(item => 
      location === item.href || (item.subItems?.some(sub => location === sub.href))
    );
    
    if (activeMainItem) {
      if (activeMainItem.subItems?.some(sub => location === sub.href)) {
        setActiveItems([activeMainItem.label]);
      } else {
        setActiveItems([]);
      }
    } else {
      setActiveItems([]);
    }
  }, [location]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]">
      <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {settings?.logo ? (
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img 
                src={settings.logo.startsWith('data:') ? settings.logo : `data:image/png;base64,${settings.logo}`}
                alt={settings?.name || 'Logo'}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-white/20">
              <Droplet className="h-6 w-6 text-white" />
            </div>
          )}
          <span className="text-xl font-bold text-white tracking-tight">
            {settings?.name || 'GoWater'}
          </span>
        </div>
      </div>

      <div className="px-3 mt-4 flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 space-y-0.5">
          {filteredSidebarItems.map((item) => {
            const isActive = location === item.href || (item.subItems?.some(sub => location === sub.href));
            const itemColor = menuColors[item.label.toLowerCase().split('/')[0] as keyof typeof menuColors] || menuColors.dashboard;
            const isExpanded = isActive || activeItems.includes(item.label);
          
            return (
              <div key={item.href} className="relative">
                {!item.subItems ? (
                  <Link href={item.href}>
                    <button
                      onClick={() => setOpenMobile(false)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                        isActive
                          ? "bg-blue-50 border-l-[3px] border-blue-600"
                          : "hover:bg-gray-100 border-l-[3px] border-transparent"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${itemColor}26` }}
                      >
                        <item.icon
                          className="h-4.5 w-4.5"
                          style={{ color: itemColor }}
                          size={18}
                        />
                      </div>
                      <span className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-blue-600" : "text-gray-700"
                      )}>
                        {t(item.label)}
                      </span>
                    </button>
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => handleItemClick(item.label)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                        isActive
                          ? "bg-blue-50 border-l-[3px] border-blue-600"
                          : isExpanded
                            ? "bg-gray-50 border-l-[3px] border-transparent"
                            : "hover:bg-gray-100 border-l-[3px] border-transparent"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${itemColor}26` }}
                      >
                        <item.icon
                          className="h-4.5 w-4.5"
                          style={{ color: itemColor }}
                          size={18}
                        />
                      </div>
                      <span className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-blue-600" : "text-gray-700"
                      )}>
                        {t(item.label)}
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 ml-auto text-gray-400 transition-transform duration-200 flex-shrink-0",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="py-1 ml-6 pl-4 space-y-0.5 border-l border-gray-200">
                        {item.subItems.map((subItem) => {
                          const isSubActive = location === subItem.href;
                          return (
                            <Link key={subItem.href} href={subItem.href}>
                              <button
                                onClick={() => setOpenMobile(false)}
                                className={cn(
                                  "w-full py-2 px-3 text-left text-sm rounded-lg flex items-center gap-2.5",
                                  "hover:bg-gray-100 transition-colors duration-200",
                                  isSubActive ? "bg-blue-50/60 text-blue-600 font-medium" : "text-gray-500"
                                )}
                              >
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: isSubActive ? itemColor : '#d1d5db' }}
                                />
                                <span>{t(subItem.label)}</span>
                              </button>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-auto pt-4 pb-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-all duration-200 group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100">
              <LogOut className="h-4.5 w-4.5 text-red-500" size={18} />
            </div>
            <span className="text-sm font-medium text-red-600">
              {t("Cerrar Sesión")}
            </span>
          </button>
        </div>
      </div>
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
