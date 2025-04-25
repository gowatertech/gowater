import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { User, LogOut, Building2, Users, Package, Clock, CreditCard, Loader2 } from "lucide-react";
import { usePreventBackNavigation } from "@/hooks/use-prevent-back-navigation";

import { PlatformLayout } from "./_components/PlatformLayout";

export default function PlatformDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Usar el hook para prevenir navegación hacia atrás después de cerrar sesión
  // Usar el endpoint específico para la autenticación de la plataforma
  usePreventBackNavigation('/platform', '/api/platform/user');

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
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Cargando estadísticas...</span>
          </div>
        </div>
      </PlatformLayout>
    );
  }

  // Tarjetas de estadísticas
  interface StatCardProps {
    title: string;
    icon: React.ReactNode;
    value: string | number;
    description: string;
    isLoading: boolean;
  }
  
  const StatCard = ({ title, icon, value, description, isLoading }: StatCardProps) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            value
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra empresas, usuarios y facturas desde un solo lugar.
          </p>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          <StatCard 
            title="Empresas Totales" 
            icon={<Building2 className="h-4 w-4 text-primary" />}
            value={
              companiesQuery.isLoading ? "..." : (
                typeof companiesQuery.data === 'object' && 'count' in companiesQuery.data 
                  ? companiesQuery.data.count 
                  : 0
              )
            }
            description="Empresas registradas"
            isLoading={companiesQuery.isLoading}
          />

          <StatCard 
            title="Usuarios de Plataforma" 
            icon={<Users className="h-4 w-4 text-primary" />}
            value={
              usersQuery.isLoading ? "..." : (
                typeof usersQuery.data === 'object' && 'count' in usersQuery.data 
                  ? usersQuery.data.count 
                  : 0
              )
            }
            description="Administradores"
            isLoading={usersQuery.isLoading}
          />

          <StatCard 
            title="Facturas Pendientes" 
            icon={<Clock className="h-4 w-4 text-primary" />}
            value={
              invoicesQuery.isLoading ? "..." : (
                typeof invoicesQuery.data === 'object' && 'count' in invoicesQuery.data 
                  ? invoicesQuery.data.count 
                  : 0
              )
            }
            description="Pendientes de pago"
            isLoading={invoicesQuery.isLoading}
          />
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 mt-4">
          {/* Tarjeta de Acciones Rápidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              <CardDescription>
                Gestión rápida de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button asChild variant="outline" className="w-full justify-start text-sm">
                <Link href="/platform/companies/new">
                  <Building2 size={16} className="mr-2" />
                  Nueva Empresa
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start text-sm">
                <Link href="/platform/users/new">
                  <User size={16} className="mr-2" />
                  Nuevo Usuario
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start text-sm">
                <Link href="/platform/plans/new">
                  <Package size={16} className="mr-2" />
                  Nuevo Plan
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start text-sm">
                <Link href="/platform/invoices/new">
                  <CreditCard size={16} className="mr-2" />
                  Nueva Factura
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Tarjeta de Estado del Sistema */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Estado del Sistema</CardTitle>
              <CardDescription>
                Información actual de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Versión:</span>
                  <span className="text-sm bg-primary/10 px-2 py-1 rounded">1.0.0</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Actualizado:</span>
                  <span className="text-sm">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Base de datos:</span>
                  <span className="flex items-center text-green-500 text-sm">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    Conectada
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Facturación:</span>
                  <span className="flex items-center text-green-500 text-sm">
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