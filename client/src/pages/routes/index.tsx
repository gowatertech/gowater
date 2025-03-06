import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
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
//import RouteOptimizer from "./RouteOptimizer"; //Removed as it's redefined in the edited code

// Vista del chofer
import DriverView from "./DriverView";
import DeliveryTracking from "./DeliveryTracking";

export default function Routes() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("routes");
  const isMobile = useIsMobile();

  return (
    <div className="relative flex h-full w-full flex-col gap-6 md:gap-8 items-center p-3 md:p-6">
      {/* Selector de pestañas para móvil */}
      {isMobile && (
        <div className="w-full max-w-3xl bg-white dark:bg-slate-950 rounded-lg p-2 shadow-sm">
          <div className="flex space-x-2">
            <button
              onClick={() => setTab("routes")}
              className={cn(
                "flex-1 py-2 text-center rounded-md transition-all",
                tab === "routes"
                  ? "bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {t("routes.title")}
            </button>
            <button
              onClick={() => setTab("tracking")}
              className={cn(
                "flex-1 py-2 text-center rounded-md transition-all",
                tab === "tracking"
                  ? "bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {t("tracking.title")}
            </button>
          </div>
        </div>
      )}

      {/* Contenido basado en la pestaña seleccionada para móvil */}
      {isMobile ? (
        <>
          {tab === "routes" && (
            <div className="w-full flex-1 flex flex-col">
              <RouteOptimizer />
            </div>
          )}
          {tab === "tracking" && (
            <div className="w-full flex-1 flex flex-col">
              <DeliveryTracking />
            </div>
          )}
        </>
      ) : (
        // Vista de escritorio con ambos componentes
        <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="w-full h-full flex flex-col">
            <RouteOptimizer />
          </div>
          <div className="w-full h-full flex flex-col">
            <DeliveryTracking />
          </div>
        </div>
      )}
    </div>
  );
}

function RouteOptimizer() {
  const { t } = useTranslation();
  const [driverLoading, setDriverLoading] = useState(false);

  // Vista del chofer (implementación simple)
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("routes.title")}
        </h2>
      </div>

      {driverLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DriverView />
      )}
    </div>
  );
}