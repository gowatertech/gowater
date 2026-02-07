import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FileBarChart, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useToast } from "@/hooks/use-toast";
import { formatTodayCompactRD } from "@/lib/date-utils";

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const { settings } = useCompanySettings();
  const { toast } = useToast();
  
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

  const navigateTo = (path: string) => {
    navigate(path);
  };

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

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 rounded-xl px-4 sm:px-6 py-4 mb-6 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white/30 shadow-md">
            {settings?.logo && (
              <AvatarImage 
                src={settings.logo.startsWith('data:') ? settings.logo : `data:image/png;base64,${settings.logo}`}
                alt={settings?.name || 'Logo'}
                className="object-contain bg-white p-0.5"
              />
            )}
            <AvatarFallback className="bg-white/20 text-white font-bold text-sm">
              {getInitials(settings?.name || userData?.companyName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t(title)}</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 mt-0.5">
              <span className="font-medium text-white/90 text-sm">
                {settings?.name || userData?.companyName || 'Cargando...'}
              </span>
              {(settings?.companyId || userData?.companyId) && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-2 py-0 text-xs">
                  ID: {settings?.companyId || userData?.companyId}
                </Badge>
              )}
              <span className="text-xs text-white/70 font-mono">
                {formatTodayCompactRD()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15 hover:text-white border border-white/20"
            onClick={() => navigateTo("/reports")}
          >
            <FileBarChart className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">{t("Reportes")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15 hover:text-white border border-white/20"
            onClick={handleLogout}
            data-testid="button-logout-header"
          >
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">{t("Cerrar sesión")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
