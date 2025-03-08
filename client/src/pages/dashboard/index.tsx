import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

export default function Dashboard() {
  const { t } = useTranslation();

  // Consultas para obtener datos del dashboard
  const { data: salesStats } = useQuery({
    queryKey: ["/api/stats/sales"],
  });

  const { data: salesTrend } = useQuery({
    queryKey: ["/api/stats/sales-trend"],
  });

  const { data: orderStatus } = useQuery({
    queryKey: ["/api/stats/order-status"],
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["/api/stats/top-customers"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  // Calcular el total de inventario
  const totalInventory = products?.reduce((sum, product) => sum + product.stock, 0) || 0;
  const totalProducts = products?.length || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("dashboard")}</h1>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalSales")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RD$ {salesStats?.totalSales || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesStats?.percentageChange > 0 ? "+" : ""}{salesStats?.percentageChange || "0"}% del mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("pendingOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter(o => o.status === "pending").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pedidos por entregar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("inventory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInventory}</div>
            <p className="text-xs text-muted-foreground">{totalProducts} productos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("deliveredOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter(o => o.status === "delivered").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pedidos entregados</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos y análisis */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Tendencia de Ventas */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Tendencia de Ventas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#0088FE" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estado de Pedidos */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Estado de Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatus?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders?.slice(-3).map((order: any) => (
                <div key={order.id} className="text-sm">
                  <p className="text-muted-foreground mb-1">
                    {new Date(order.date).toLocaleString()}
                  </p>
                  <p>Pedido #{order.id} - {t(order.status)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}