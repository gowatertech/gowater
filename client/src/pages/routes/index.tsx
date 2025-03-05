import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Zone, type Customer } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Componente de zonas
import ZoneMap from "./ZoneMap";

// Componente de rutas
import RouteOptimizer from "./RouteOptimizer";

export default function Routes() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("zones");

  // Consultas
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{t("routes")}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="zones">{t("zones")}</TabsTrigger>
          <TabsTrigger value="routes">{t("routeOptimization")}</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="mt-4">
          <Card className="p-0">
            <ZoneMap />
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="mt-4">
          <Card className="p-0">
            <RouteOptimizer />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}