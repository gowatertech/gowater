import { useState } from "react";
import { Menu, Smartphone, ShieldAlert, ArrowRight, LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { hasRouteAccess, getDefaultRedirect, isMobileOnlyRole, type UserRole } from "@shared/permissions";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [openMobile, setOpenMobile] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth/login" />;
  }

  const role = (user.role || "admin") as UserRole;

  if (isMobileOnlyRole(role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Acceso Restringido
            </h2>
            <p className="text-gray-500 mb-6">
              Tu cuenta de <span className="font-semibold text-gray-700">{role === "driver" ? "conductor" : "asistente"}</span> no tiene acceso al panel de control. Usa la aplicación móvil para gestionar tus entregas.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setLocation("/mobile-app")}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl h-12 text-base"
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Ir a la App Móvil
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (logout) logout();
                }}
                className="w-full rounded-xl h-10 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasRouteAccess(role, location)) {
    const defaultPath = getDefaultRedirect(role);
    const roleLabel = role === "cashier" ? "cajero" : role === "supervisor" ? "supervisor" : role;
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Acceso No Autorizado
            </h2>
            <p className="text-gray-500 mb-6">
              Tu rol de <span className="font-semibold text-gray-700">{roleLabel}</span> no tiene permisos para acceder a esta sección del panel.
            </p>
            <Button
              onClick={() => setLocation(defaultPath)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl h-12 text-base"
            >
              Ir a mi página principal
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-gray-50">
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-4 z-50 md:hidden bg-white/90 backdrop-blur-sm shadow-md hover:bg-white border border-gray-200 rounded-lg"
          onClick={() => setOpenMobile(!openMobile)}
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </Button>

        <Sidebar openMobile={openMobile} setOpenMobile={setOpenMobile} />

        <SidebarInset>
          <ScrollArea className="h-full">
            <div className="container mx-auto py-8 px-4 md:py-6 md:px-6">
              <DashboardHeader title="Panel de Control" />
              {children}
            </div>
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
