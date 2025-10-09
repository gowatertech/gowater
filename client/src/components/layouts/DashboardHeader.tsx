import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FileBarChart, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useToast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const { settings } = useCompanySettings();
  const { toast } = useToast();
  
  // Consulta para obtener información del usuario y compañía
  const { data: userData } = useQuery<{
    id: number;
    username: string;
    name: string;
    role: string;
    companyId?: number;
    companyName?: string;
  }>({
    queryKey: ["/api/user"],
    refetchOnWindowFocus: false
  });

  // Función para navegar a otras secciones 
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Función para cerrar sesión
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
      
      // Redirigir al login
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
      <div className="flex flex-col">
        <h1 className="text-xl sm:text-2xl font-bold">{t(title)}</h1>
        <div className="flex items-center gap-2 text-sm mt-1">
          {(settings?.companyId || userData?.companyId) ? (
            <Badge variant="secondary" className="px-2 py-0 font-semibold">
              ID: {settings?.companyId || userData?.companyId}
            </Badge>
          ) : (
            <Badge variant="outline" className="px-2 py-0">
              Cargando ID...
            </Badge>
          )}
          <span className="font-medium text-primary">
            {settings?.name || userData?.companyName || 'Cargando nombre de empresa...'}
          </span>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={() => navigateTo("/reports")}>
          <FileBarChart className="h-4 w-4 mr-1" />
          <span className="hidden xs:inline">{t("Reportes")}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout-header">
          <LogOut className="h-4 w-4 mr-1" />
          <span className="hidden xs:inline">{t("Cerrar sesión")}</span>
        </Button>
      </div>
    </div>
  );
}