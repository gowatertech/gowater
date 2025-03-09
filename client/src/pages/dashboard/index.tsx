import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { apiRequest } from "@/lib/queryClient";

// Colores consistentes para los gráficos
const COLORS = {
  BLUE: "#0088FE",
  TURQUOISE: "#00C49F",
  YELLOW: "#FFBB28",
  ORANGE: "#FF8042",
  RED: "#FF0000"
};

interface DashboardStats {
  totalSales: number;
  pendingPayments: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dashboard/stats");
      return response.json();
    }
  });

  // Datos para el gráfico de ventas y cobros
  const salesData: ChartData[] = [
    {
      name: "Ventas Totales",
      value: stats?.totalSales || 0,
      color: COLORS.BLUE
    },
    {
      name: "Cuentas por Cobrar",
      value: stats?.pendingPayments || 0,
      color: COLORS.TURQUOISE
    },
    {
      name: "Total Pedidos",
      value: (stats?.pendingOrders || 0) + (stats?.deliveredOrders || 0) + (stats?.cancelledOrders || 0),
      color: COLORS.YELLOW
    }
  ];

  // Datos para el gráfico de pedidos
  const ordersData: ChartData[] = [
    {
      name: "Pedidos Entregados",
      value: stats?.deliveredOrders || 0,
      color: COLORS.TURQUOISE
    },
    {
      name: "Pedidos Pendientes",
      value: stats?.pendingOrders || 0,
      color: COLORS.ORANGE
    },
    {
      name: "Pedidos Cancelados",
      value: stats?.cancelledOrders || 0,
      color: COLORS.RED
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("Panel de Control")}</h1>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="space-y-0 p-3">
            <CardTitle className="text-sm font-medium">
              {t("Total Ventas")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(stats?.totalSales || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="space-y-0 p-3">
            <CardTitle className="text-sm font-medium">
              {t("Cuentas por Cobrar")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold text-emerald-600">
              {formatCurrency(stats?.pendingPayments || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 p-3">
            <CardTitle className="text-sm font-medium">
              {t("Pedidos Pendientes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold text-yellow-600">
              {stats?.pendingOrders || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 p-3">
            <CardTitle className="text-sm font-medium">
              {t("Entregados (Mes)")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold text-orange-600">
              {stats?.deliveredOrders || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 p-3">
            <CardTitle className="text-sm font-medium">
              {t("Cancelados (Mes)")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="text-lg font-bold text-red-600">
              {stats?.cancelledOrders || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos circulares */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">{t("Distribución de Ventas")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">{t("Estado de Pedidos")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ordersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}