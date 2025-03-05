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
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function Sidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();

  return (
    <aside data-sidebar="sidebar" className="group peer hidden md:block">
      <SidebarContent>
        <SidebarHeader className="px-6 py-4">
          <div className="flex items-center gap-2 text-sidebar-foreground">
            <Droplet className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">GoWater</span>
          </div>
        </SidebarHeader>

        <SidebarMenu>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={t(item.label)}
                    className={cn(
                      "w-full justify-start gap-4",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <a>
                      <Icon className="h-4 w-4" />
                      <span>{t(item.label)}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </aside>
  );
}