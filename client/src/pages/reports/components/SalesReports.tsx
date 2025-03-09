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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

export default function SalesReports() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState("month");

  // Obtener datos de ventas
  const { data: salesData = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ["/api/reports/sales", timeRange],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/sales?range=${timeRange}`
      );
      if (!response.ok) {
        throw new Error("Error al cargar datos de ventas");
      }
      return response.json();
    },
  });

  // Obtener datos de pagos
  const { data: paymentsData = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/reports/payments", timeRange],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/reports/payments?range=${timeRange}`
      );
      if (!response.ok) {
        throw new Error("Error al cargar datos de pagos");
      }
      return response.json();
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
        {/* Gráfico de Ventas vs Tiempo */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">
            {t("Tendencia de Ventas")}
          </h3>
          <div className="h-[300px]">
            {isLoadingSales ? (
              <div className="h-full flex items-center justify-center">
                Cargando datos...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [`RD$ ${value.toFixed(2)}`, "Ventas"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#0088FE"
                    name="Ventas (RD$)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Gráfico de Pagos vs Tiempo */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">
            {t("Estado de Pagos")}
          </h3>
          <div className="h-[300px]">
            {isLoadingPayments ? (
              <div className="h-full flex items-center justify-center">
                Cargando datos...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [`RD$ ${value.toFixed(2)}`, "Monto"]}
                  />
                  <Legend />
                  <Bar
                    dataKey="paid"
                    fill="#00C49F"
                    name="Pagado (RD$)"
                  />
                  <Bar
                    dataKey="pending"
                    fill="#FFBB28"
                    name="Pendiente (RD$)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}