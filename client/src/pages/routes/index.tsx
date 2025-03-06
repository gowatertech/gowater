import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Zone, type Customer } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

// Componente de zonas
import ZoneMap from "./ZoneMap";

// Componente de rutas
import RouteOptimizer from "./RouteOptimizer";

// Vista del chofer
import DriverView from "./DriverView";
import DeliveryTracking from "./DeliveryTracking";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Llamada inicial

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
};


export default function Routes() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("zones");
  const [newZoneName, setNewZoneName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");

  // Consultas
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const isMobile = useIsMobile();

  return (
    <div className="p-2 md:p-6 space-y-3 md:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3">
        <h1 className="text-xl md:text-3xl font-bold">{t("routes")}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="zones">{t("zones")}</TabsTrigger>
          <TabsTrigger value="routes">{t("routeOptimization")}</TabsTrigger>
          <TabsTrigger value="tracking">Seguimiento en Tiempo Real</TabsTrigger>
          <TabsTrigger value="driver">Vista del Chofer</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="mt-4">
          <Card className="p-4">
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Nombre de la zona"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="w-48"
              />
              <Input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-16"
              />
            </div>
            <ZoneMap newZoneName={newZoneName} selectedColor={selectedColor} onZoneCreated={() => setNewZoneName("")} />
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="mt-4">
          <div className="flex gap-4">
            <Card className="p-0 flex-1">
              <RouteOptimizer />
            </Card>

            {/* Lista de zonas al lado derecho */}
            <Card className="p-4 w-80">
              <h3 className="text-lg font-medium mb-3">{t("zones")}</h3>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-2">
                  {zones.map((zone) => (
                    <div
                      key={zone.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className="font-medium">{zone.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {zone.coordinates.length} puntos
                      </span>
                    </div>
                  ))}
                  {zones.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay zonas creadas
                    </p>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="mt-4">
          <DeliveryTracking />
        </TabsContent>

        <TabsContent value="driver" className="mt-4">
          <DriverView />
        </TabsContent>
      </Tabs>
    </div>
  );
}