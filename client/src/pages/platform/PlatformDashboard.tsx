import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { User, LogOut, Building2, Users, Package, Clock, CreditCard } from "lucide-react";

// Componente de layout para el panel de administración
function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await apiRequest({
        url: "/api/platform/platform-logout", 
        method: "POST" 
      });
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      // Redireccionar a la página de login
      setLocation("/platform/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 bg-card shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Admin Platform</h1>
        </div>
        <nav className="p-2">
          <ul className="space-y-1">
            <li>
              <Link href="/platform/dashboard">
                <a className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10">
                  <User size={18} />
                  <span>Dashboard</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/companies">
                <a className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10">
                  <Building2 size={18} />
                  <span>Empresas</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/plans">
                <a className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10">
                  <Package size={18} />
                  <span>Planes</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/users">
                <a className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10">
                  <Users size={18} />
                  <span>Usuarios</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/platform/invoices">
                <a className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10">
                  <CreditCard size={18} />
                  <span>Facturas</span>
                </a>
              </Link>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-destructive/10 text-destructive"
              >
                <LogOut size={18} />
                <span>Cerrar sesión</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}

export default function PlatformDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Consulta para obtener el recuento de empresas
  const companiesQuery = useQuery({
    queryKey: ["/api/platform/companies/count"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/companies/count", 
        method: "GET" 
      }),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Manejar errores de autenticación
  React.useEffect(() => {
    const handleAuthError = (error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        toast({
          title: "Sesión expirada",
          description: "Por favor, inicia sesión nuevamente",
          variant: "destructive",
        });
        setLocation("/platform/login");
      }
    };

    if (companiesQuery.error) {
      handleAuthError(companiesQuery.error);
    }
  }, [companiesQuery.error, toast, setLocation]);

  // Consulta para obtener el recuento de usuarios
  const usersQuery = useQuery({
    queryKey: ["/api/platform/platform-users/count"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/platform-users/count", 
        method: "GET"
      }),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Consulta para obtener el recuento de facturas pendientes
  const invoicesQuery = useQuery({
    queryKey: ["/api/platform/membership-invoices/count", { status: "pending" }],
    queryFn: () =>
      apiRequest({
        url: "/api/platform/membership-invoices/count",
        method: "GET",
        params: { status: "pending" }
      }),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Si todas las consultas están cargando, mostrar un indicador de carga
  if (companiesQuery.isLoading && usersQuery.isLoading && invoicesQuery.isLoading) {
    return (
      <PlatformLayout>
        <div className="flex justify-center items-center h-full">
          <div className="text-lg">Cargando estadísticas...</div>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard de Plataforma</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de administración de la plataforma. Desde aquí puedes gestionar todas las empresas,
          usuarios y facturas.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {/* Tarjeta de Empresas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Empresas Totales</CardTitle>
              <CardDescription>
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companiesQuery.isLoading ? "..." : (
                  typeof companiesQuery.data === 'object' && 'count' in companiesQuery.data 
                    ? companiesQuery.data.count 
                    : 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Empresas registradas en la plataforma
              </p>
            </CardContent>
          </Card>

          {/* Tarjeta de Usuarios */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Usuarios de Plataforma</CardTitle>
              <CardDescription>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usersQuery.isLoading ? "..." : (
                  typeof usersQuery.data === 'object' && 'count' in usersQuery.data 
                    ? usersQuery.data.count 
                    : 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Administradores de plataforma y empresas
              </p>
            </CardContent>
          </Card>

          {/* Tarjeta de Facturas Pendientes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
              <CardDescription>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoicesQuery.isLoading ? "..." : (
                  typeof invoicesQuery.data === 'object' && 'count' in invoicesQuery.data 
                    ? invoicesQuery.data.count 
                    : 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Facturas pendientes de pago
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {/* Tarjeta de Acciones Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Acciones frecuentes para la gestión de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/platform/companies/new">
                  <Building2 size={16} className="mr-2" />
                  Crear Nueva Empresa
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/platform/users/new">
                  <User size={16} className="mr-2" />
                  Añadir Usuario de Plataforma
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/platform/plans/new">
                  <Package size={16} className="mr-2" />
                  Crear Nuevo Plan
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/platform/invoices/new">
                  <CreditCard size={16} className="mr-2" />
                  Generar Factura
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Tarjeta de Estado del Sistema */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del Sistema</CardTitle>
              <CardDescription>
                Información sobre el estado actual de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Versión del sistema:</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Última actualización:</span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado de la base de datos:</span>
                  <span className="flex items-center text-green-500">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    Conectada
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sistema de facturación:</span>
                  <span className="flex items-center text-green-500">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    Operativo
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlatformLayout>
  );
}