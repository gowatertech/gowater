import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Truck,
  Route,
  Package,
  FileText,
  Settings,
  Droplet,
} from "lucide-react";

const menuColors = {
  panel: "#0088FE",      // Azul brillante
  facturacion: "#00C49F", // Verde turquesa para facturación
  pagos: "#00C49F",      // Verde turquesa para pagos
  usuarios: "#0088FE",   // Azul brillante
  clientes: "#00C49F",   // Verde turquesa
  inventario: "#FFBB28", // Amarillo cálido
  rutas: "#FF8042",      // Naranja
  vehiculos: "#00C49F",  // Verde turquesa
  pedidos: "#FFBB28",    // Amarillo
  reportes: "#FF8042",   // Naranja
  ajustes: "#8884d8",    // Púrpura
};

// Actualizado con etiquetas en español
const sidebarItems = [
  { icon: LayoutDashboard, label: "Panel", href: "/" },
  { icon: FileText, label: "Facturación", href: "/billing" },
  { icon: FileText, label: "Pagos", href: "/payments" },
  { icon: Users, label: "Usuarios", href: "/users" },
  { icon: Users, label: "Clientes", href: "/customers" },
  { icon: Package, label: "Inventario", href: "/inventory" },
  { icon: Route, label: "Rutas", href: "/routes" },
  { icon: Truck, label: "Vehículos", href: "/trucks" },
  { icon: FileText, label: "Pedidos", href: "/orders" },
  { icon: FileText, label: "Reportes", href: "/reports" },
  { icon: Settings, label: "Ajustes", href: "/settings" },
];

import {
  Sidebar as UISidebar,
  SidebarContent as UISidebarContent,
  SidebarHeader as UISidebarHeader,
  SidebarMenu as UISidebarMenu,
  SidebarMenuItem as UISidebarMenuItem,
  SidebarMenuButton as UISidebarMenuButton,
} from "@/components/ui/sidebar";

import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarProps {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

export function Sidebar({ openMobile, setOpenMobile }: SidebarProps) {
  const { t } = useTranslation();
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <UISidebarHeader className="px-8 py-4">
        <div className="flex items-center gap-2">
          <Droplet className="h-6 w-6" style={{ color: "#0088FE" }} />
          <span className="text-xl font-bold" style={{ color: "#0088FE" }}>GoWater</span>
        </div>
      </UISidebarHeader>

      <UISidebarMenu className="px-5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          const itemColor = menuColors[item.label.toLowerCase() as keyof typeof menuColors];

          return (
            <UISidebarMenuItem key={item.href}>
              <UISidebarMenuButton
                isActive={isActive}
                tooltip={t(item.label)}
                className={cn(
                  "w-full justify-start gap-4 hover:bg-blue-50/50",
                  isActive && "bg-blue-50 shadow-sm"
                )}
                onClick={() => {
                  setOpenMobile(false);
                  window.location.href = item.href;
                }}
              >
                <Icon className="h-4 w-4" style={{ color: itemColor }} />
                <span style={{ color: isActive ? itemColor : "#64748b" }}>{t(item.label)}</span>
              </UISidebarMenuButton>
            </UISidebarMenuItem>
          );
        })}
      </UISidebarMenu>
    </div>
  );

  // Versión móvil usando Sheet
  const MobileSidebar = () => (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="p-0 w-[280px]">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );

  // Versión desktop usando UISidebar
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