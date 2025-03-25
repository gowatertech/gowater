import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiRequest } from "@/lib/queryClient";

// Colores consistentes para los gráficos
const COLORS = {
  BLUE: "#0088FE",
  TURQUOISE: "#00C49F",
  YELLOW: "#FFBB28",
  ORANGE: "#FF8042",
  RED: "#FF0000",
  PURPLE: "#8884d8"
};

interface DashboardStats {
  totalSales: number;
  pendingPayments: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

interface PaymentStats {
  yearlyPayments: number;
  monthlyPayments: number;
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

  const { data: paymentStats } = useQuery<PaymentStats>({
    queryKey: ["/api/dashboard/payments-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/dashboard/payments-stats");
      return response.json();
    }
  });

  // Datos para el gráfico de ventas y cobros
  const salesData: ChartData[] = [
    {
      name: "Ventas",
      value: stats?.totalSales || 0,
      color: COLORS.BLUE
    },
    {
      name: "Por Cobrar",
      value: stats?.pendingPayments || 0,
      color: COLORS.TURQUOISE
    },
    {
      name: "Pedidos",
      value: (stats?.pendingOrders || 0) + (stats?.deliveredOrders || 0) + (stats?.cancelledOrders || 0),
      color: COLORS.YELLOW
    }
  ];

  // Datos para el gráfico de pedidos
  const ordersData: ChartData[] = [
    {
      name: "Entregados",
      value: stats?.deliveredOrders || 0,
      color: COLORS.TURQUOISE
    },
    {
      name: "Pendientes",
      value: stats?.pendingOrders || 0,
      color: COLORS.ORANGE
    },
    {
      name: "Cancelados",
      value: stats?.cancelledOrders || 0,
      color: COLORS.RED
    }
  ];

  // Datos para el gráfico de pagos
  const paymentsData: ChartData[] = [
    {
      name: "Año",
      value: paymentStats?.yearlyPayments || 0,
      color: COLORS.BLUE
    },
    {
      name: "Mes",
      value: paymentStats?.monthlyPayments || 0,
      color: COLORS.PURPLE
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">{t("Panel de Control")}</h1>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500">
              {t("Total Ventas")}
            </div>
            <div className="mt-1 text-base font-semibold text-blue-600">
              {formatCurrency(stats?.totalSales || 0)}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-green-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500">
              {t("Cuentas por Cobrar")}
            </div>
            <div className="mt-1 text-base font-semibold text-green-600">
              {formatCurrency(stats?.pendingPayments || 0)}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-yellow-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500">
              {t("Pedidos Pendientes")}
            </div>
            <div className="mt-1 text-base font-semibold text-yellow-600">
              {stats?.pendingOrders || 0}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-orange-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500">
              {t("Entregados (Mes)")}
            </div>
            <div className="mt-1 text-base font-semibold text-orange-600">
              {stats?.deliveredOrders || 0}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-red-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500">
              {t("Cancelados (Mes)")}
            </div>
            <div className="mt-1 text-base font-semibold text-red-600">
              {stats?.cancelledOrders || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos circulares */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500 mb-1">
              {t("Distribución de Ventas")}
            </div>
            <div className="space-y-1 mb-1">
              {salesData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center">
                  <div className="h-2.5 w-2.5 mr-1.5" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs">{entry.name}: {formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-orange-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500 mb-1">
              {t("Estado de Pedidos")}
            </div>
            <div className="space-y-1 mb-1">
              {ordersData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center">
                  <div className="h-2.5 w-2.5 mr-1.5" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ordersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-purple-500"></div>
          <div className="p-2 pl-2.5">
            <div className="text-xs font-normal text-gray-500 mb-1">
              {t("Pagos Realizados")}
            </div>
            <div className="space-y-1 mb-1">
              {paymentsData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center">
                  <div className="h-2.5 w-2.5 mr-1.5" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs">{entry.name}: {formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}