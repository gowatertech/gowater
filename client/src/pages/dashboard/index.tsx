import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

// Datos de ejemplo - Después se reemplazarán con datos reales de la API
const orderStatusData = [
  { name: "Entregados", value: 400, color: '#0088FE' },
  { name: "Pendientes", value: 300, color: '#00C49F' },
  { name: "Cancelados", value: 100, color: '#FFBB28' },
];

const salesTrendData = [
  { date: '2025-02-28', sales: 4000 },
  { date: '2025-03-01', sales: 3000 },
  { date: '2025-03-02', sales: 5000 },
  { date: '2025-03-03', sales: 2780 },
  { date: '2025-03-04', sales: 1890 },
  { date: '2025-03-05', sales: 2390 },
];

const topCustomersData = [
  { name: "Cliente A", orders: 35 },
  { name: "Cliente B", orders: 28 },
  { name: "Cliente C", orders: 25 },
  { name: "Cliente D", orders: 22 },
  { name: "Cliente E", orders: 20 },
];

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
  });

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
            <div className="text-2xl font-bold">RD$ 45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% del mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("pendingPayments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RD$ 12,345.67</div>
            <p className="text-xs text-muted-foreground">12 facturas pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("activeRoutes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">4 camiones en ruta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("inventory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">Unidades disponibles</p>
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
              <LineChart data={salesTrendData}>
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
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomersData}>
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
              {/* Lista de actividades recientes */}
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Hace 5 min</p>
                <p>Pedido #123 entregado en Zona Norte</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Hace 15 min</p>
                <p>Nueva ruta creada para Zona Este</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Hace 30 min</p>
                <p>Inventario actualizado: +500 unidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}