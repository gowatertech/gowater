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
    queryKey: ["/api/dashboard/stats"]
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

  // Componente de tarjeta estadística reutilizable
  const StatCard = ({ 
    color, 
    title, 
    value, 
    isCurrency = false,
    icon: Icon = null 
  }: { 
    color: "blue" | "green" | "yellow" | "orange" | "red" | "purple"; 
    title: string; 
    value: string | number; 
    isCurrency?: boolean;
    icon?: any;
  }) => {
    // Mapas de clases para colores
    const colorMap = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      orange: "bg-orange-500",
      red: "bg-red-500",
      purple: "bg-purple-500"
    };

    const textColorMap = {
      blue: "text-blue-600",
      green: "text-green-600",
      yellow: "text-yellow-600",
      orange: "text-orange-600",
      red: "text-red-600",
      purple: "text-purple-600"
    };

    const iconColorMap = {
      blue: "text-blue-500",
      green: "text-green-500",
      yellow: "text-yellow-500",
      orange: "text-orange-500",
      red: "text-red-500",
      purple: "text-purple-500"
    };

    return (
      <div className="relative overflow-hidden rounded-md border shadow-sm">
        <div className={`absolute left-0 top-0 h-full w-1 ${colorMap[color]}`}></div>
        <div className="p-2 pl-2.5">
          <div className="flex items-center gap-1">
            {Icon && <Icon className={`h-3 w-3 ${iconColorMap[color]}`} />}
            <div className="text-xs font-normal text-gray-500">
              {title}
            </div>
          </div>
          <div className={`mt-1 text-base font-semibold ${textColorMap[color]}`}>
            {isCurrency ? formatCurrency(value as number) : value}
          </div>
        </div>
      </div>
    );
  };

  // Componente de gráfico circular reutilizable
  const ChartCard = ({ 
    color, 
    title, 
    data, 
    isCurrency = false,
    icon: Icon = null 
  }: { 
    color: "blue" | "green" | "yellow" | "orange" | "red" | "purple"; 
    title: string; 
    data: ChartData[]; 
    isCurrency?: boolean;
    icon?: any;
  }) => {
    // Mapas de clases para colores
    const colorMap = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      orange: "bg-orange-500",
      red: "bg-red-500",
      purple: "bg-purple-500"
    };

    const iconColorMap = {
      blue: "text-blue-500",
      green: "text-green-500",
      yellow: "text-yellow-500",
      orange: "text-orange-500",
      red: "text-red-500",
      purple: "text-purple-500"
    };

    return (
      <div className="relative overflow-hidden rounded-md border shadow-sm">
        <div className={`absolute left-0 top-0 h-full w-1 ${colorMap[color]}`}></div>
        <div className="p-2 pl-2.5">
          <div className="flex items-center gap-1 mb-1">
            {Icon && <Icon className={`h-3 w-3 ${iconColorMap[color]}`} />}
            <div className="text-xs font-normal text-gray-500">
              {title}
            </div>
          </div>
          <div className="space-y-1 mb-1">
            {data.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center">
                <div className="h-2.5 w-2.5 mr-1.5" style={{ backgroundColor: entry.color }} />
                <span className="text-xs">
                  {entry.name}: {isCurrency ? formatCurrency(entry.value) : entry.value}
                </span>
              </div>
            ))}
          </div>
          <div className="h-[120px] md:h-[140px] lg:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={35}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-bold md:text-xl">{t("Panel de Control")}</h1>

      {/* Tarjetas de estadísticas - reorganizadas para mejor visualización en móvil */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard 
          color="blue" 
          title={t("Total Ventas")} 
          value={stats?.totalSales || 0} 
          isCurrency={true} 
        />
        <StatCard 
          color="green" 
          title={t("Cuentas por Cobrar")} 
          value={stats?.pendingPayments || 0} 
          isCurrency={true} 
        />
        <StatCard 
          color="yellow" 
          title={t("Pedidos Pendientes")} 
          value={stats?.pendingOrders || 0} 
        />
        <StatCard 
          color="orange" 
          title={t("Entregados (Mes)")} 
          value={stats?.deliveredOrders || 0} 
        />
        <StatCard 
          color="red" 
          title={t("Cancelados (Mes)")} 
          value={stats?.cancelledOrders || 0} 
        />
      </div>

      {/* Gráficos circulares - reorganizados para responsividad */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        <ChartCard 
          color="blue" 
          title={t("Distribución de Ventas")} 
          data={salesData} 
          isCurrency={true} 
        />
        <ChartCard 
          color="orange" 
          title={t("Estado de Pedidos")} 
          data={ordersData} 
        />
        <ChartCard 
          color="purple" 
          title={t("Pagos Realizados")} 
          data={paymentsData} 
          isCurrency={true} 
        />
      </div>
    </div>
  );
}