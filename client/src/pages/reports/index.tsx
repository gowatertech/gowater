import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { FileBarChart, TrendingUp, Users } from "lucide-react";
import SalesReports from "./components/SalesReports";
import OperationsReports from "./components/OperationsReports";
import CustomerReports from "./components/CustomerReports";

export default function Reports() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const currentPath = location.split("/").pop() || "sales";

  const reportCategories = [
    {
      id: "sales",
      label: t("Reportes de Ventas y Financieros"),
      icon: TrendingUp,
      description: t("Análisis de ventas, pagos y rendimiento financiero"),
      color: "#0088FE"  // Azul brillante como dashboard
    },
    {
      id: "operations",
      label: t("Reportes de Operaciones"),
      icon: FileBarChart,
      description: t("Estado de pedidos, entregas e inventario"),
      color: "#00C49F"  // Verde turquesa como facturación
    },
    {
      id: "customers",
      label: t("Reportes de Clientes"),
      icon: Users,
      description: t("Análisis de clientes y comportamiento"),
      color: "#FFBB28"  // Amarillo cálido como inventario
    },
  ];

  const renderReport = () => {
    switch (currentPath) {
      case "sales":
        return <SalesReports />;
      case "operations":
        return <OperationsReports />;
      case "customers":
        return <CustomerReports />;
      default:
        return <SalesReports />;
    }
  };

  return (
    <div className="space-y-2 p-1">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg font-bold">{t("Reportes")}</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-1">
        {reportCategories.map((category) => {
          const Icon = category.icon;
          const isActive = currentPath === category.id;
          return (
            <Card
              key={category.id}
              className={`py-1.5 px-2 cursor-pointer transition-all ${
                isActive
                  ? "border-primary/50 shadow-md"
                  : "hover:border-primary/30"
              }`}
              onClick={() => setLocation(`/reports/${category.id}`)}
            >
              <div className="flex items-start gap-1">
                <div
                  className={`p-1 rounded-lg ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                  style={{ backgroundColor: isActive ? category.color : undefined }}
                >
                  <Icon className="h-3 w-3" style={{ color: isActive ? "white" : category.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium truncate">{category.label}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {category.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-2">
        {renderReport()}
      </div>
    </div>
  );
}