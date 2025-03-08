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

// Colores para los gráficos circulares - Paleta moderna y distintiva
const COLORS = {
  // Métricas Mensuales
  ventas: "#0088FE",      // Azul brillante para ventas (20.54%)
  pedidos: "#20c49f",     // Verde turquesa para pedidos (20.12%)
  cuentas: "#fa3e9e",     // Rosa/Magenta para cuentas (19.91%)

  // Estado de Pedidos
  pendientes: "#ff8042",  // Naranja para pendientes (19.73%)
  entregados: "#ffbb28",  // Amarillo para entregados (19.69%)
};

export default function Dashboard() {
  const { t } = useTranslation();

  // Datos de prueba estáticos simplificados
  const testData: SalesStats = {
    totalSales: 150000,
    percentageChange: 12.5,
    monthlyStats: {
      totalSales: 50000,
      totalOrders: 120,
      totalReceivables: 15000,
    },
    orderStatus: {
      pending: 45,
      delivered: 75,
    },
  };

  // Consultas tipadas para obtener datos del dashboard
  const { data: salesStats } = useQuery<SalesStats>({
    queryKey: ["/api/stats/sales"],
    initialData: testData, // Usar datos de prueba mientras se arregla el backend
  });

  // Sample Sales Trend Data
  const sampleSalesTrend: SalesTrend[] = [
    { date: '2024-01-01', sales: 10000 },
    { date: '2024-02-01', sales: 12000 },
    { date: '2024-03-01', sales: 15000 },
    { date: '2024-04-01', sales: 13000 },
  ];
  const { data: salesTrend = sampleSalesTrend } = useQuery<SalesTrend[]>({
    queryKey: ["/api/stats/sales-trend"],
  });


  const sampleOrders: Order[] = [
    { id: 1, status: "pending", date: "2024-04-26" },
    { id: 2, status: "delivered", date: "2024-04-25" },
    { id: 3, status: "pending", date: "2024-04-24" },
  ];
  const { data: orders = sampleOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const sampleProducts: Product[] = [
    { id: 1, name: "Product A", stock: 100 },
    { id: 2, name: "Product B", stock: 50 },
    { id: 3, name: "Product C", stock: 75 },
  ];
  const { data: products = sampleProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Datos para el nuevo gráfico circular de métricas mensuales
  const monthlyMetricsData = [
    { name: t("Ventas"), value: salesStats?.monthlyStats.totalSales || 0, color: COLORS.ventas },
    { name: t("Pedidos"), value: salesStats?.monthlyStats.totalOrders || 0, color: COLORS.pedidos },
    { name: t("Cuentas por Cobrar"), value: salesStats?.monthlyStats.totalReceivables || 0, color: COLORS.cuentas }
  ];

  // Datos para el gráfico circular de estado de pedidos
  const orderStatusData = [
    { name: t("Pendientes"), value: salesStats?.orderStatus.pending || 0, color: COLORS.pendientes },
    { name: t("Entregados"), value: salesStats?.orderStatus.delivered || 0, color: COLORS.entregados }
  ];

  // Calcular el total de inventario con tipado correcto
  const totalInventory = products?.reduce((sum, product) => sum + product.stock, 0) ?? 0;
  const totalProducts = products?.length ?? 0;

  // Calcular porcentajes para los gráficos circulares
  const totalMetrics = monthlyMetricsData.reduce((sum, item) => sum + item.value, 0);
  const totalOrders = orderStatusData.reduce((sum, item) => sum + item.value, 0);

  const monthlyMetricsWithPercentage = monthlyMetricsData.map(item => ({
    ...item,
    percentage: ((item.value / totalMetrics) * 100).toFixed(2)
  }));

  const orderStatusWithPercentage = orderStatusData.map(item => ({
    ...item,
    percentage: ((item.value / totalOrders) * 100).toFixed(2)
  }));

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
              {salesStats?.orderStatus.pending ?? 0}
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
              {salesStats?.orderStatus.delivered ?? 0}
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
                  data={monthlyMetricsWithPercentage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={({ percent }) => `%${(percent * 100).toFixed(2)}`}
                >
                  {monthlyMetricsWithPercentage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `RD$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-col gap-2">
              {monthlyMetricsWithPercentage.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm font-medium">
                    {entry.name} {entry.percentage}%
                  </span>
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
                  data={orderStatusWithPercentage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={({ percent }) => `%${(percent * 100).toFixed(2)}`}
                >
                  {orderStatusWithPercentage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-col gap-2">
              {orderStatusWithPercentage.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm font-medium">
                    {entry.name} {entry.percentage}%
                  </span>
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
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={COLORS.ventas}
                  strokeWidth={2}
                  dot={{ stroke: COLORS.ventas, strokeWidth: 2, r: 4 }}
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
      </div>
    </div>
  );
}