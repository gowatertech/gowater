import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Users,
  Truck,
  Route,
  Package,
  FileText,
  Settings,
  Droplet,
  ChevronRight,
  BookOpen,
  LayoutDashboard,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Sidebar as UISidebar,
  SidebarContent as UISidebarContent,
  SidebarHeader as UISidebarHeader,
  SidebarMenu as UISidebarMenu,
  SidebarMenuItem as UISidebarMenuItem,
  SidebarMenuButton as UISidebarMenuButton,
} from "@/components/ui/sidebar";

import { Sheet, SheetContent } from "@/components/ui/sheet";

const menuColors = {
  dashboard: "#0088FE",   // Azul brillante para dashboard
  facturacion: "#00C49F", // Verde turquesa para facturación
  pagos: "#00C49F",      // Verde turquesa para pagos
  usuarios: "#0088FE",   // Azul brillante
  clientes: "#00C49F",   // Verde turquesa
  inventario: "#FFBB28", // Amarillo cálido
  rutas: "#FF8042",      // Naranja
  vehiculos: "#00C49F",  // Verde turquesa
  pedidos: "#FFBB28",    // Amarillo
  reportes: "#FF8042",   // Naranja para reportes
  settings: "#8884d8",   // Púrpura para configuración
};

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Facturación", href: "/billing" },
  { icon: FileText, label: "Pagos", href: "/payments" },
  { icon: Users, label: "Usuarios", href: "/users" },
  { icon: Users, label: "Clientes", href: "/customers" },
  {
    icon: Package,
    label: "Inventario",
    href: "/inventario/productos",
    subItems: [
      { label: "Productos", href: "/inventario/productos" },
      { label: "Carga de Productos", href: "/inventario/carga" },
    ],
  },
  { icon: Route, label: "Rutas", href: "/routes" },
  { icon: Truck, label: "Vehículos", href: "/trucks" },
  { icon: FileText, label: "Pedidos", href: "/orders" },
  {
    icon: BarChart2,
    label: "Reportes",
    href: "/reports",
    subItems: [
      { label: "Ventas", href: "/reports/sales" },
      { label: "Operaciones", href: "/reports/operations" },
      { label: "Clientes", href: "/reports/customers" },
    ],
  },
  { icon: Settings, label: "Configuración", href: "/settings" },
];

interface SidebarProps {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

export function Sidebar({ openMobile, setOpenMobile }: SidebarProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <UISidebarHeader className="px-8 py-4">
        <div className="flex items-center gap-2">
          <Droplet className="h-6 w-6" style={{ color: "#0088FE" }} />
          <span className="text-xl font-bold" style={{ color: "#0088FE" }}>GoWater</span>
        </div>
      </UISidebarHeader>

      {/* Botón de Tutorial */}
      <div className="mx-5 mb-4">
        <Link href="/tutorial">
          <Button variant="outline" className="w-full flex items-center justify-center gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
            <BookOpen className="h-4 w-4" />
            <span>{t("Tutorial Interactivo")}</span>
          </Button>
        </Link>
      </div>

      <UISidebarMenu className="px-5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.subItems?.some(sub => location === sub.href));
          const itemColor = menuColors[item.label.toLowerCase() as keyof typeof menuColors];
          const isHovered = hoveredItem === item.label;

          return (
            <UISidebarMenuItem
              key={item.href}
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
              className="relative group"
            >
              {!item.subItems ? (
                <Link href={item.href}>
                  <UISidebarMenuButton
                    isActive={isActive}
                    tooltip={t(item.label)}
                    className={cn(
                      "w-full justify-start gap-4 hover:bg-blue-50/50",
                      isActive && "bg-blue-50 shadow-sm"
                    )}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Icon className="h-4 w-4" style={{ color: itemColor }} />
                    <span style={{ color: isActive ? itemColor : "#64748b" }}>{t(item.label)}</span>
                  </UISidebarMenuButton>
                </Link>
              ) : (
                <>
                  <UISidebarMenuButton
                    isActive={isActive}
                    tooltip={t(item.label)}
                    className={cn(
                      "w-full justify-start gap-4 hover:bg-blue-50/50 pr-8",
                      isActive && "bg-blue-50 shadow-sm"
                    )}
                  >
                    <Icon className="h-4 w-4" style={{ color: itemColor }} />
                    <span style={{ color: isActive ? itemColor : "#64748b" }}>{t(item.label)}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 transition-transform",
                        isHovered && "rotate-90"
                      )}
                    />
                  </UISidebarMenuButton>

                  <div
                    className={cn(
                      "overflow-hidden transition-[max-height] duration-200 ease-in-out",
                      isHovered ? "max-h-32" : "max-h-0"
                    )}
                  >
                    <div className="py-1 px-2 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = location === subItem.href;
                        return (
                          <Link key={subItem.href} href={subItem.href}>
                            <button
                              onClick={() => setOpenMobile(false)}
                              className={cn(
                                "w-full px-4 py-2 text-left text-sm rounded-md",
                                "hover:bg-blue-50 transition-colors duration-150",
                                isSubActive && "bg-blue-50 font-medium"
                              )}
                            >
                              {t(subItem.label)}
                            </button>
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