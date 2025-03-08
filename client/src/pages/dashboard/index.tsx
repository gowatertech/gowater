import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

// Interfaces para los datos
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

interface SalesTrend {
  date: string;
  sales: number;
}

interface OrderStatus {
  name: string;
  value: number;
  color: string;
}

interface TopCustomer {
  name: string;
  orders: number;
}

interface Order {
  id: number;
  status: string;
  date: string;
}

interface Product {
  id: number;
  name: string;
  stock: number;
}

// Colores para los gráficos circulares - Paleta moderna
const COLORS = {
  sales: "#6366f1",      // Índigo vibrante
  orders: "#22c55e",     // Verde esmeralda
  receivables: "#eab308", // Ámbar moderno
  pending: "#f43f5e",    // Rosa vibrante
  delivered: "#0ea5e9",  // Celeste brillante
};

export default function Dashboard() {
  const { t } = useTranslation();

  // Consultas tipadas para obtener datos del dashboard
  const { data: salesStats } = useQuery<SalesStats>({
    queryKey: ["/api/stats/sales"],
  });

  const { data: salesTrend } = useQuery<SalesTrend[]>({
    queryKey: ["/api/stats/sales-trend"],
  });

  const { data: orderStatus } = useQuery<OrderStatus[]>({
    queryKey: ["/api/stats/order-status"],
  });

  const { data: topCustomers } = useQuery<TopCustomer[]>({
    queryKey: ["/api/stats/top-customers"],
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Datos para el nuevo gráfico circular de métricas mensuales
  const monthlyMetricsData = salesStats?.monthlyStats ? [
    { name: t("Ventas"), value: salesStats.monthlyStats.totalSales, color: COLORS.sales },
    { name: t("Pedidos"), value: salesStats.monthlyStats.totalOrders, color: COLORS.orders },
    { name: t("Cuentas por Cobrar"), value: salesStats.monthlyStats.totalReceivables, color: COLORS.receivables },
  ] : [];

  // Datos para el gráfico circular de estado de pedidos
  const orderStatusData = salesStats?.orderStatus ? [
    { name: t("Pendientes"), value: salesStats.orderStatus.pending, color: COLORS.pending },
    { name: t("Entregados"), value: salesStats.orderStatus.delivered, color: COLORS.delivered },
  ] : [];

  // Calcular el total de inventario con tipado correcto
  const totalInventory = products?.reduce((sum, product) => sum + product.stock, 0) ?? 0;
  const totalProducts = products?.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("Panel de Control")}</h1>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("Ventas Totales")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RD$ {salesStats?.totalSales.toFixed(2) ?? "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesStats?.percentageChange > 0 ? "+" : ""}{salesStats?.percentageChange?.toFixed(1) ?? "0"}% {t("desde el mes anterior")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("Pedidos Pendientes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.orderStatus?.pending ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("Pedidos por entregar")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("Inventario")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInventory}</div>
            <p className="text-xs text-muted-foreground">{totalProducts} {t("productos registrados")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("Pedidos Entregados")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesStats?.orderStatus?.delivered ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("Pedidos entregados")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos y análisis */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Gráfico circular de métricas mensuales */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t("Métricas Mensuales")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={monthlyMetricsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {monthlyMetricsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `RD$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-col gap-2">
              {monthlyMetricsData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico circular de estado de pedidos */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>{t("Estado de Pedidos")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-col gap-2">
              {orderStatusData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tendencia de Ventas */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("Tendencia de Ventas")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#0088FE"
                  strokeWidth={2}
                  dot={{ stroke: '#0088FE', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t("Actividad Reciente")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(orders ?? []).slice(-3).map((order) => (
                <div key={order.id} className="text-sm">
                  <p className="text-muted-foreground mb-1">
                    {new Date(order.date).toLocaleString()}
                  </p>
                  <p>{t("Pedido")} #{order.id} - {t(order.status)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t("Clientes Principales")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="orders"
                  fill="#0088FE"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}