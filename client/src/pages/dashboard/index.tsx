import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Colores modernos para los gráficos circulares
const COLORS = {
  metrics: ["#0088FE", "#00C4B4", "#FF6B8B"],  // Azul, Turquesa, Rosa
  status: ["#FF8042", "#FFBB28"]                // Naranja, Amarillo
};

// Interfaces para los datos (from original code)
interface SalesStats {
  totalSales: number;
  percentageChange: number;
  monthlyStats: {
    totalSales: number;
    totalOrders: number;
    totalReceivables: number;
  };
  orderStatus: {
    pending: number;
    delivered: number;
  };
}

interface Order {
  id: number;
  status: string;
  date: string;
}


export default function Dashboard() {
  const { t } = useTranslation();

  // Consultas tipadas para obtener datos del dashboard (from original code)
  const { data: salesStats } = useQuery<SalesStats>({
    queryKey: ["/api/stats/sales"],
  });

  // Datos para el gráfico circular de métricas mensuales (modified from original)
  const monthlyMetricsData = salesStats?.monthlyStats ? [
    { name: t("Ventas"), value: salesStats.monthlyStats.totalSales },
    { name: t("Pedidos"), value: salesStats.monthlyStats.totalOrders },
    { name: t("Cuentas por Cobrar"), value: salesStats.monthlyStats.totalReceivables }
  ] : [
    { name: t("Ventas"), value: 20.54 },
    { name: t("Pedidos"), value: 20.12 },
    { name: t("Cuentas por Cobrar"), value: 19.91 }
  ];

  // Datos para el gráfico circular de estado de pedidos (modified from original)
  const orderStatusData = salesStats?.orderStatus ? [
    { name: t("Pendientes"), value: salesStats.orderStatus.pending },
    { name: t("Entregados"), value: salesStats.orderStatus.delivered }
  ] : [
    { name: t("Pendientes"), value: 19.73 },
    { name: t("Entregados"), value: 19.69 }
  ];

  const renderPieChart = (data: any[], colors: string[]) => (
    <div className="flex items-center justify-center gap-8">
      <div style={{ width: 300, height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>{entry.name} {entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("Panel de Control")}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico circular de métricas mensuales */}
        <Card>
          <CardHeader>
            <CardTitle>{t("Métricas Mensuales")}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderPieChart(monthlyMetricsData, COLORS.metrics)}
          </CardContent>
        </Card>

        {/* Gráfico circular de estado de pedidos */}
        <Card>
          <CardHeader>
            <CardTitle>{t("Estado de Pedidos")}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderPieChart(orderStatusData, COLORS.status)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}