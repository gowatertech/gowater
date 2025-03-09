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
      const data = await response.json();
      console.log("Datos de ventas recibidos:", data);
      return data;
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
      const data = await response.json();
      console.log("Datos de pagos recibidos:", data);
      return data;
    },
  });

  const timeRanges = [
    { value: "week", label: "Esta Semana" },
    { value: "month", label: "Este Mes" },
    { value: "quarter", label: "Este Trimestre" },
    { value: "year", label: "Este Año" },
  ];

  return (
    <div className="space-y-1">
      <div className="flex justify-end mb-1">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[100px] h-6 text-xs">
            <SelectValue placeholder="Período" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
        {/* Gráfico de Ventas vs Tiempo */}
        <Card className="p-0.5">
          <h3 className="text-[10px] font-medium mb-0.5 px-0.5">
            {t("Tendencia de Ventas")}
          </h3>
          <div className="h-[100px]">
            {isLoadingSales ? (
              <div className="h-full flex items-center justify-center text-[10px]">
                Cargando datos...
              </div>
            ) : salesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    tick={{ fontSize: 8 }}
                  />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [`RD$ ${Number(value).toFixed(2)}`, "Ventas"]}
                  />
                  <Legend wrapperStyle={{ fontSize: '8px' }} />
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
        <Card className="p-0.5">
          <h3 className="text-[10px] font-medium mb-0.5 px-0.5">
            {t("Estado de Pagos")}
          </h3>
          <div className="h-[100px]">
            {isLoadingPayments ? (
              <div className="h-full flex items-center justify-center text-[10px]">
                Cargando datos...
              </div>
            ) : paymentsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    tick={{ fontSize: 8 }}
                  />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [`RD$ ${Number(value).toFixed(2)}`, "Monto"]}
                  />
                  <Legend wrapperStyle={{ fontSize: '8px' }} />
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