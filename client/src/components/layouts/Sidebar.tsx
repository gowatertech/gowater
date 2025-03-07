import React from "react";
import { FileText, Home, MapPin, Users, Layers, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar as UISidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "../ui/sidebar";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { Logo } from "../Logo";

interface NavItem {
  icon: React.ComponentType;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Users, label: "Clientes", href: "/clients" },
  { icon: MapPin, label: "Rutas", href: "/routes" },
  { icon: Layers, label: "Inventario", href: "/inventory" },
  { icon: FileText, label: "Facturación", href: "/billing" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <UISidebar side="left">
      <SidebarHeader className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="text-lg font-semibold">GoWater</span>
        </div>
      </SidebarHeader>

      {/* Botón de Tutorial */}
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/tutorial">
              <SidebarMenuButton
                data-active={location.pathname === "/tutorial"}
              >
                <BookOpen className="h-4 w-4" />
                <span>Tutorial</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>

        <Separator className="my-2" />

        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link to={item.href}>
                <SidebarMenuButton
                  data-active={location.pathname === item.href}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback className={cn("bg-primary text-primary-foreground")}>
              U
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-medium">Usuario</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </div>
      </SidebarFooter>
    </UISidebar>
  );
}