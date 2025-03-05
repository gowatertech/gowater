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

const sidebarItems = [
  { icon: LayoutDashboard, label: "dashboard", href: "/" },
  { icon: Users, label: "customers", href: "/customers" },
  { icon: Package, label: "inventory", href: "/inventory" },
  { icon: Route, label: "routes", href: "/routes" },
  { icon: Users, label: "drivers", href: "/drivers" },
  { icon: Users, label: "assistants", href: "/assistants" },
  { icon: Truck, label: "trucks", href: "/trucks" },
  { icon: FileText, label: "orders", href: "/orders" },
  { icon: FileText, label: "reports", href: "/reports" },
  { icon: Settings, label: "settings", href: "/settings" },
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
        <div className="flex items-center gap-2 text-blue-600">
          <Droplet className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold">GoWater</span>
        </div>
      </UISidebarHeader>

      <UISidebarMenu className="px-5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <UISidebarMenuItem key={item.href}>
              <UISidebarMenuButton
                isActive={isActive}
                tooltip={t(item.label)}
                className={cn(
                  "w-full justify-start gap-4 text-blue-600/75 hover:text-blue-700 hover:bg-blue-50",
                  isActive && "bg-blue-50 text-blue-700 shadow-sm"
                )}
                onClick={() => {
                  setOpenMobile(false);
                  window.location.href = item.href;
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{t(item.label)}</span>
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