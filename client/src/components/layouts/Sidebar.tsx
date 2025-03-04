import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export function Sidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();

  return (
    <div className="flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-2 text-sidebar-foreground">
          <Droplet className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">GoWater</span>
        </div>
      </div>

      <nav className="flex-1 px-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-4 mb-1",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.label)}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
