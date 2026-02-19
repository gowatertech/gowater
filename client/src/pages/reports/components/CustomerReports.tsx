import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function CustomerReports() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState("month");

  // Obtener top clientes
  const { data: topCustomers = [], isLoading: isLoadingTopCustomers } = useQuery({
    queryKey: ["/api/stats/top-customers", timeRange],
    queryFn: async () => {
      const response = await apiRequest({
        url: `/api/stats/top-customers?range=${timeRange}`,
        method: "GET",
      });
      return response;
    },
  });

  const timeRanges = [
    { value: "week", label: "Esta Semana" },
    { value: "month", label: "Este Mes" },
    { value: "quarter", label: "Este Trimestre" },
    { value: "year", label: "Este Año" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {timeRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {t(range.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Clientes */}
        <Card className="p-4 col-span-2">
          <h3 className="text-lg font-medium mb-4">
            {t("Top Clientes")}
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCustomers}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 30,
                  left: 120,
                  bottom: 10,
                }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 12, fill: "#374151" }}
                  axisLine={false}
                  tickLine={false}
                />
                <XAxis
                  type="number"
                  orientation="bottom"
                  stroke="#9ca3af"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(37, 99, 235, 0.05)" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    padding: "12px 16px",
                  }}
                  formatter={(value: any, name: string) => [
                    name === "Total (RD$)" ? `RD$ ${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 2 })}` : value,
                    name,
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingTop: "12px" }}
                />
                <Bar dataKey="orders" name="Pedidos" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                <Bar dataKey="total" name="Total (RD$)" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Estadísticas de Clientes */}
        <Card className="p-4 col-span-2 md:col-span-1">
          <h3 className="text-lg font-medium mb-4">
            {t("Estadísticas de Clientes")}
          </h3>
          <div className="space-y-3">
            {topCustomers.map((customer: any, index: number) => (
              <div key={customer.name} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: index < 3 ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "#94a3b8" }}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-700">{customer.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                    {customer.orders} pedidos
                  </span>
                  <span className="font-semibold text-gray-900">
                    RD$ {Number(customer.total).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
