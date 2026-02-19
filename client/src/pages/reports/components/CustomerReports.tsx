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
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Pedidos" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="total" name="Total (RD$)" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Estadísticas de Clientes */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">
            {t("Estadísticas de Clientes")}
          </h3>
          <div className="space-y-4">
            {topCustomers.map((customer: any) => (
              <div key={customer.name} className="flex justify-between items-center">
                <span>{customer.name}</span>
                <div className="space-x-4">
                  <span className="text-muted-foreground">
                    {customer.orders} pedidos
                  </span>
                  <span className="font-medium">
                    RD$ {parseFloat(customer.total.toString()).toFixed(2)}
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
