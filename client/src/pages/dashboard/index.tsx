
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
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_sales")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${salesStats?.total ? Number(salesStats.total).toFixed(2) : "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avg_ticket")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${salesStats?.avgTicket || "0.00"}
            </div>
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
            <p className="text-xs text-muted-foreground">
              {totalProducts} {t("products")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("orders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tendencia de ventas */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("sales_trend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {salesTrend && salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p>{t("no_data")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado de órdenes */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("order_status")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {orderStatus && orderStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {orderStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || `#${index * 3}${index * 5}${index * 7}`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p>{t("no_data")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clientes principales */}
      <Card>
        <CardHeader>
          <CardTitle>{t("top_customers")}</CardTitle>
        </CardHeader>
        <CardContent>
          {topCustomers && topCustomers.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p>{t("no_data")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
