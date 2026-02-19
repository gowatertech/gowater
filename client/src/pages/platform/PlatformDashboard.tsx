import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, Building2, Users, Package, Clock, CreditCard, Loader2, 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  UserX, CalendarClock, BarChart3, RefreshCw
} from "lucide-react";
import { usePreventBackNavigation } from "@/hooks/use-prevent-back-navigation";
import { formatTodayRD } from "@/lib/date-utils";
import { PlatformLayout } from "./_components/PlatformLayout";

interface PlatformMetrics {
  id?: number;
  metricDate: string;
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  trialCompanies: number;
  mrr: string | number;
  arr: string | number;
  churnRate: string | number;
  ltv: string | number;
  overdueInvoices: number;
  totalRevenue: string | number;
}

interface DashboardData {
  metrics: PlatformMetrics;
  alerts: {
    nearExpiration: number;
    overdue: number;
    suspended: number;
    pendingNotifications: number;
  };
  companiesNearExpiration: Array<{ id: number; name: string; expirationDate: string }>;
  companiesOverdue: Array<{ id: number; name: string; expirationDate: string }>;
  companiesSuspended: Array<{ id: number; name: string; suspendedAt: string }>;
}

export default function PlatformDashboard() {
  usePreventBackNavigation('/platform', '/api/platform/user');

  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ["/api/platform/dashboard"],
    queryFn: () => apiRequest({ url: "/api/platform/dashboard", method: "GET" }),
    staleTime: 1000 * 60 * 5,
  });

  interface StatCardProps {
    title: string;
    icon: React.ReactNode;
    value: string | number;
    description: string;
    isLoading: boolean;
    variant?: "default" | "success" | "warning" | "danger";
  }
  
  const StatCard = ({ title, icon, value, description, isLoading, variant = "default" }: StatCardProps) => {
    const variantColors = {
      default: "bg-primary/10 text-primary",
      success: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
      warning: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
      danger: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
    };
    
    return (
      <Card className="overflow-hidden" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${variantColors[variant]}`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : value}
          </div>
        </CardContent>
      </Card>
    );
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null) return "$0";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(numValue);
  };

  const formatPercent = (value: string | number | undefined) => {
    if (value === undefined || value === null) return "0%";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return `${numValue.toFixed(1)}%`;
  };

  if (dashboardQuery.isLoading) {
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

  const data = dashboardQuery.data;
  const metrics = data?.metrics;
  const alerts = data?.alerts;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-dashboard-title">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                Panel de Administración
              </h1>
              <p className="text-blue-100 mt-1 text-sm">Métricas en tiempo real de la plataforma GoWater</p>
            </div>
            <Button 
              size="sm" 
              onClick={() => dashboardQuery.refetch()}
              className="bg-white text-blue-700 hover:bg-blue-50 border-0"
              data-testid="button-refresh-dashboard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="MRR" 
            icon={<DollarSign className="h-4 w-4" />}
            value={formatCurrency(metrics?.mrr)}
            description="Ingresos recurrentes mensuales"
            isLoading={dashboardQuery.isLoading}
            variant="success"
          />
          <StatCard 
            title="ARR" 
            icon={<TrendingUp className="h-4 w-4" />}
            value={formatCurrency(metrics?.arr)}
            description="Ingresos anuales recurrentes"
            isLoading={dashboardQuery.isLoading}
          />
          <StatCard 
            title="LTV Promedio" 
            icon={<BarChart3 className="h-4 w-4" />}
            value={formatCurrency(metrics?.ltv)}
            description="Valor de vida del cliente"
            isLoading={dashboardQuery.isLoading}
          />
          <StatCard 
            title="Tasa de Churn" 
            icon={<TrendingDown className="h-4 w-4" />}
            value={formatPercent(metrics?.churnRate)}
            description="Tasa de cancelación mensual"
            isLoading={dashboardQuery.isLoading}
            variant={parseFloat(String(metrics?.churnRate || 0)) > 5 ? "danger" : "success"}
          />
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Empresas Activas" 
            icon={<Building2 className="h-4 w-4" />}
            value={metrics?.activeCompanies || 0}
            description={`De ${metrics?.totalCompanies || 0} total`}
            isLoading={dashboardQuery.isLoading}
            variant="success"
          />
          <StatCard 
            title="Suspendidas" 
            icon={<UserX className="h-4 w-4" />}
            value={metrics?.suspendedCompanies || 0}
            description="Empresas con acceso bloqueado"
            isLoading={dashboardQuery.isLoading}
            variant={(metrics?.suspendedCompanies || 0) > 0 ? "danger" : "default"}
          />
          <StatCard 
            title="En Período de Prueba" 
            icon={<Clock className="h-4 w-4" />}
            value={metrics?.trialCompanies || 0}
            description="Empresas en trial"
            isLoading={dashboardQuery.isLoading}
          />
          <StatCard 
            title="Facturas Vencidas" 
            icon={<CreditCard className="h-4 w-4" />}
            value={metrics?.overdueInvoices || 0}
            description="Pendientes de cobro"
            isLoading={dashboardQuery.isLoading}
            variant={(metrics?.overdueInvoices || 0) > 0 ? "warning" : "default"}
          />
        </div>

        {alerts && (alerts.nearExpiration > 0 || alerts.overdue > 0 || alerts.suspended > 0) && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Alertas del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {alerts.nearExpiration > 0 && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300" data-testid="badge-near-expiration">
                    <CalendarClock className="h-3 w-3 mr-1" />
                    {alerts.nearExpiration} empresa(s) próximas a vencer
                  </Badge>
                )}
                {alerts.overdue > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300" data-testid="badge-overdue">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {alerts.overdue} empresa(s) con pagos vencidos
                  </Badge>
                )}
                {alerts.suspended > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300" data-testid="badge-suspended">
                    <UserX className="h-3 w-3 mr-1" />
                    {alerts.suspended} empresa(s) suspendida(s)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              <CardDescription>Gestión rápida de la plataforma</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button asChild variant="outline" className="w-full justify-start text-sm" data-testid="button-new-company">
                <Link href="/platform/companies/new">
                  <Building2 size={16} className="mr-2" />
                  Nueva Empresa
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start text-sm" data-testid="button-new-user">
                <Link href="/platform/users/new">
                  <User size={16} className="mr-2" />
                  Nuevo Usuario
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start text-sm" data-testid="button-new-plan">
                <Link href="/platform/plans/new">
                  <Package size={16} className="mr-2" />
                  Nuevo Plan
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start text-sm" data-testid="button-new-invoice">
                <Link href="/platform/invoices/new">
                  <CreditCard size={16} className="mr-2" />
                  Nueva Factura
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Estado del Sistema</CardTitle>
              <CardDescription>Información actual de la plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Versión:</span>
                  <span className="text-sm bg-primary/10 px-2 py-1 rounded">1.0.0</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Actualizado:</span>
                  <span className="text-sm">{formatTodayRD()}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Base de datos:</span>
                  <span className="flex items-center text-green-500 text-sm">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    Conectada
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm font-medium">Ingresos totales:</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(metrics?.totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {data?.companiesNearExpiration && data.companiesNearExpiration.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-yellow-500" />
                Empresas Próximas a Vencer
              </CardTitle>
              <CardDescription>Empresas que vencen en los próximos 7 días</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.companiesNearExpiration.map((company) => (
                  <div key={company.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg" data-testid={`company-near-expiration-${company.id}`}>
                    <span className="font-medium">{company.name}</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                      Vence: {new Date(company.expirationDate).toLocaleDateString('es-ES')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data?.companiesSuspended && data.companiesSuspended.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-500" />
                Empresas Suspendidas
              </CardTitle>
              <CardDescription>Empresas con acceso bloqueado actualmente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.companiesSuspended.map((company) => (
                  <div key={company.id} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/10 rounded-lg" data-testid={`company-suspended-${company.id}`}>
                    <span className="font-medium">{company.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Suspendida</Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/platform/companies/${company.id}`}>
                          Ver detalles
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PlatformLayout>
  );
}