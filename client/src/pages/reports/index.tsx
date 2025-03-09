import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SalesReports from "./components/SalesReports";
import OperationsReports from "./components/OperationsReports";
import CustomerReports from "./components/CustomerReports";
import { FileBarChart, TrendingUp, Users } from "lucide-react";

export default function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("sales");

  const reportCategories = [
    {
      id: "sales",
      label: t("Reportes de Ventas y Financieros"),
      icon: TrendingUp,
      description: t("Análisis de ventas, pagos y rendimiento financiero"),
    },
    {
      id: "operations",
      label: t("Reportes de Operaciones"),
      icon: FileBarChart,
      description: t("Estado de pedidos, entregas e inventario"),
    },
    {
      id: "customers",
      label: t("Reportes de Clientes"),
      icon: Users,
      description: t("Análisis de clientes y comportamiento"),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("Reportes")}</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {reportCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className={`p-4 cursor-pointer transition-all ${
                activeTab === category.id
                  ? "border-primary/50 shadow-md"
                  : "hover:border-primary/30"
              }`}
              onClick={() => setActiveTab(category.id)}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    activeTab === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">{category.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsContent value="sales" className="space-y-4">
          <SalesReports />
        </TabsContent>
        <TabsContent value="operations" className="space-y-4">
          <OperationsReports />
        </TabsContent>
        <TabsContent value="customers" className="space-y-4">
          <CustomerReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
