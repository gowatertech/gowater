import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePreventBackNavigation } from "@/hooks/use-prevent-back-navigation";
import { KPICard } from "@/components/dashboard/KPICard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Package,
  CheckCircle,
  Calendar,
  Clock,
  Users,
  Map,
  Droplet,
  Truck,
  FileBarChart,
  PieChart,
  BarChart,
  LineChart,
  LogOut,
  BadgeDollarSign
} from "lucide-react";

// Colores consistentes para los gráficos
const COLORS = {
  BLUE: "#0088FE",
  TURQUOISE: "#00C49F",
  YELLOW: "#FFBB28",
  ORANGE: "#FF8042",
  RED: "#FF0000",
  PURPLE: "#8884d8",
  GREEN: "#4CAF50"
};

interface DashboardStats {
  totalSales: number;
  pendingPayments: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  dailySales: number;
  weeklyTrend?: Array<{
    day: string;
    total: number;
  }>;
}

interface PaymentStats {
  yearlyPayments: number;
  monthlyPayments: number;
}

interface RouteStats {
  activeRoutes: number;
  completedToday: number;
  avgEfficiency: number;
}

interface BottleStats {
  pendingReturns: number;
  totalPendingQty: number;
  overdueReturns: number;
}

interface CommissionStats {
  driversTotal: number;
  helpersTotal: number;
  weekTotal: number;
  weekStartDate: string;
  weekEndDate: string;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Usar el hook para prevenir navegación hacia atrás después de cerrar sesión
  // Usar el endpoint específico para la autenticación del panel de empresa
  usePreventBackNavigation('/', '/api/user');

  // Consultas para obtener los datos del dashboard
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000 // Refresca cada 30 segundos
  });

  const { data: paymentStats, isLoading: paymentsLoading } = useQuery<PaymentStats>({
    queryKey: ["/api/dashboard/payments-stats"],
    refetchInterval: 30000 // Refresca cada 30 segundos
  });

  // Consultas para obtener datos adicionales
  const { data: routeStats, isLoading: routesLoading } = useQuery<RouteStats>({
    queryKey: ["/api/dashboard/route-stats"],
    refetchInterval: 30000 // Refresca cada 30 segundos
  });

  const { data: bottleStats, isLoading: bottlesLoading } = useQuery<BottleStats>({
    queryKey: ["/api/dashboard/bottle-stats"],
    refetchInterval: 30000 // Refresca cada 30 segundos
  });

  const { data: commissionStats, isLoading: commissionsLoading } = useQuery<CommissionStats>({
    queryKey: ["/api/dashboard/commission-stats"],
    refetchInterval: 30000 // Refresca cada 30 segundos
  });

  // Función para formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Función para navegar a otras secciones 
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Datos para los gráficos
  const salesData: ChartData[] = [
    {
      name: t("Ventas"),
      value: stats?.totalSales || 0,
      color: COLORS.BLUE
    },
    {
      name: t("Por Cobrar"),
      value: stats?.pendingPayments || 0,
      color: COLORS.TURQUOISE
    },
    {
      name: t("Pedidos"),
      value: (stats?.pendingOrders || 0) + (stats?.deliveredOrders || 0) + (stats?.cancelledOrders || 0),
      color: COLORS.YELLOW
    }
  ];

  const ordersData: ChartData[] = [
    {
      name: t("Entregados"),
      value: stats?.deliveredOrders || 0,
      color: COLORS.TURQUOISE
    },
    {
      name: t("Pendientes"),
      value: stats?.pendingOrders || 0,
      color: COLORS.ORANGE
    },
    {
      name: t("Cancelados"),
      value: stats?.cancelledOrders || 0,
      color: COLORS.RED
    }
  ];

  const paymentsData: ChartData[] = [
    {
      name: t("Año"),
      value: paymentStats?.yearlyPayments || 0,
      color: COLORS.BLUE
    },
    {
      name: t("Mes"),
      value: paymentStats?.monthlyPayments || 0,
      color: COLORS.PURPLE
    }
  ];

  // Datos para alertas
  const alerts = [
    {
      id: "1",
      type: "warning" as const,
      message: t("Inventario bajo de producto Botellón 5L"),
      action: {
        label: t("Ver"),
        onClick: () => navigateTo("/inventory")
      }
    },
    {
      id: "2",
      type: "info" as const,
      message: t(`${bottleStats?.overdueReturns || 0} envases pendientes de devolución vencidos`),
      action: {
        label: t("Revisar"),
        onClick: () => navigateTo("/envases/faltantes")
      }
    }
  ];

  // Si hay una ruta activa, agregamos una alerta de información
  if (routeStats?.activeRoutes) {
    alerts.push({
      id: "3",
      type: "info" as const,
      message: t(`${routeStats.activeRoutes} rutas activas en progreso`),
      action: {
        label: t("Ver Mapa"),
        onClick: () => navigateTo("/routes/map")
      }
    });
  }

  // Función para cerrar sesión
  const { toast } = useToast();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Importante para enviar/recibir cookies
      });
      
      if (!response.ok) {
        throw new Error("Error al cerrar sesión");
      }
      
      // Limpiar el estado de autenticación en el cliente
      queryClient.setQueryData(["/api/user"], null);
      
      // Redirigir a la página de login después de cerrar sesión
      window.location.href = "/auth/login";
      return null;
    },
    onSuccess: () => {
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Panel con pestañas para diferentes vistas */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">{t("Resumen")}</TabsTrigger>
          <TabsTrigger value="sales">{t("Ventas")}</TabsTrigger>
          <TabsTrigger value="operations">{t("Operaciones")}</TabsTrigger>
          <TabsTrigger value="resources">{t("Recursos")}</TabsTrigger>
        </TabsList>

        {/* Contenido de la pestaña Resumen */}
        <TabsContent value="overview" className="space-y-4">
          {/* Tarjetas de KPI */}
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <KPICard 
              title={t("Ventas Hoy")}
              value={formatCurrency(stats?.dailySales || 0)}
              icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
              trend="+12%"
              trendUp={true}
              onClick={() => navigateTo("/billing")}
            />
            <KPICard 
              title={t("Pedidos Pendientes")}
              value={stats?.pendingOrders || 0}
              icon={<Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
              trend={"-3%"}
              trendUp={false}
              onClick={() => navigateTo("/orders")}
            />
            <KPICard 
              title={t("Rutas Activas")}
              value={routeStats?.activeRoutes || 0}
              icon={<Map className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
              trend={"+2"}
              trendUp={true}
              onClick={() => navigateTo("/routes")}
            />
            <KPICard 
              title={t("Envases Pendientes")}
              value={bottleStats?.pendingReturns || 0}
              icon={<Droplet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
              trend={"+5"}
              trendUp={false}
              onClick={() => navigateTo("/bottles/balance")}
            />
          </div>
          
          {/* Widget de Comisiones - Diseño Moderno */}
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-lg" data-testid="card-commissions-widget">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <BadgeDollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    {t("Comisiones de la Semana")}
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-100 mt-1">
                    {commissionStats ? (
                      <>
                        {t("Del")} {new Date(commissionStats.weekStartDate).toLocaleDateString('es-DO', { weekday: 'short', day: '2-digit', month: 'short' })} {t("al")} {new Date(commissionStats.weekEndDate).toLocaleDateString('es-DO', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </>
                    ) : (
                      t("Cargando...")
                    )}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 self-start sm:self-auto"
                  onClick={() => navigateTo("/commissions")}
                  data-testid="button-view-all-commissions"
                >
                  {t("Ver todas")}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex flex-col space-y-2 p-4 sm:p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm text-blue-100 font-medium">{t("Choferes")}</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-drivers-total">
                    {formatCurrency(commissionStats?.driversTotal || 0)}
                  </span>
                </div>
                
                <div className="flex flex-col space-y-2 p-4 sm:p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm text-blue-100 font-medium">{t("Ayudantes")}</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-helpers-total">
                    {formatCurrency(commissionStats?.helpersTotal || 0)}
                  </span>
                </div>
                
                <div className="flex flex-col space-y-2 p-4 sm:p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all sm:col-span-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white/20">
                      <BadgeDollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm text-blue-100 font-medium">{t("Total Semanal")}</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-week-total">
                    {formatCurrency(commissionStats?.weekTotal || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Gráficos principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard
              title={t("Distribución de Ventas")}
              type="pie"
              data={salesData}
              formatter={formatCurrency}
              height={window.innerWidth < 768 ? 200 : 300}
            />
            
            <ChartCard
              title={t("Estado de Pedidos")}
              type="bar"
              data={ordersData}
              height={window.innerWidth < 768 ? 200 : 300}
            />
          </div>
          
          {/* Sección de alertas */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{t("Alertas y Acciones Pendientes")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <AlertCard alerts={alerts} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido de la pestaña Ventas */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="h-auto md:h-full overflow-hidden">
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-sm font-medium">{t("Resumen Financiero")}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Ventas Totales")}</span>
                    <span className="font-medium text-sm sm:text-base">{formatCurrency(stats?.totalSales || 0)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Cuentas por Cobrar")}</span>
                    <span className="font-medium text-sm sm:text-base">{formatCurrency(stats?.pendingPayments || 0)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Pagos Anuales")}</span>
                    <span className="font-medium text-sm sm:text-base">{formatCurrency(paymentStats?.yearlyPayments || 0)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Pagos Mensuales")}</span>
                    <span className="font-medium text-sm sm:text-base">{formatCurrency(paymentStats?.monthlyPayments || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <ChartCard
                title={t("Pagos Realizados")}
                description={t("Comparativa anual y mensual")}
                type="bar"
                data={paymentsData}
                formatter={formatCurrency}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button size="sm" className="text-xs sm:text-sm" onClick={() => navigateTo("/billing")}>
              {t("Ver todas las ventas")}
            </Button>
          </div>
        </TabsContent>

        {/* Contenido de la pestaña Operaciones */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="h-auto md:h-full overflow-hidden">
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-sm font-medium">{t("Resumen de Rutas")}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Rutas Activas")}</span>
                    <span className="font-medium text-sm sm:text-base">{routeStats?.activeRoutes || 0}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Completadas Hoy")}</span>
                    <span className="font-medium text-sm sm:text-base">{routeStats?.completedToday || 0}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Eficiencia Promedio")}</span>
                    <span className="font-medium text-sm sm:text-base">{routeStats?.avgEfficiency ? `${(routeStats.avgEfficiency * 100).toFixed(0)}%` : "N/A"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <ChartCard
                title={t("Estado de Pedidos")}
                description={t("Distribución por estado")}
                type="pie"
                data={ordersData}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button size="sm" className="text-xs sm:text-sm" onClick={() => navigateTo("/routes")}>
              {t("Ver todas las rutas")}
            </Button>
          </div>
        </TabsContent>

        {/* Contenido de la pestaña Recursos */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="h-auto md:h-full overflow-hidden">
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-sm font-medium">{t("Resumen de Envases")}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Envases Pendientes")}</span>
                    <span className="font-medium text-sm sm:text-base">{bottleStats?.pendingReturns || 0}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Cantidad Total Pendiente")}</span>
                    <span className="font-medium text-sm sm:text-base">{bottleStats?.totalPendingQty || 0}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t("Devoluciones Vencidas")}</span>
                    <span className="font-medium text-sm sm:text-base text-red-500">{bottleStats?.overdueReturns || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <ChartCard
                title={t("Distribución de Ventas")}
                description={t("Relación entre ventas y pedidos")}
                type="pie"
                data={salesData}
                formatter={formatCurrency}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button size="sm" className="text-xs sm:text-sm" onClick={() => navigateTo("/inventory")}>
              {t("Ver inventario")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}