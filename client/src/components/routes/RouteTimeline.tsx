import { useTranslation } from "react-i18next";
import type { Route } from "@shared/schema";
import { format } from "date-fns";

interface RouteTimelineProps {
  route: Route;
  className?: string;
}

export default function RouteTimeline({ route, className }: RouteTimelineProps) {
  const { t } = useTranslation();

  // Verificar si la ruta tiene paradas
  if (!route.stops || !Array.isArray(route.stops) || route.stops.length === 0) {
    return (
      <div className={className}>
        <h3 className="font-medium mb-4">{t("timeline")}</h3>
        <div className="p-4 text-center text-muted-foreground">
          No hay paradas programadas para esta ruta
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="font-medium mb-4">{t("timeline")}</h3>
      <div className="space-y-4">
        {route.stops.map((stop, index) => {
          // Para cada parada, mostrar su número de secuencia
          let stopName = `Parada #${index + 1}`;
          if (index === 0) {
            stopName = "Punto de inicio (Almacén)";
          }

          return (
            <div key={index} className="flex items-start gap-2">
              <div className={`min-w-[24px] h-6 flex items-center justify-center rounded-full ${
                index === 0 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
              } text-xs`}>
                {index}
              </div>
              <div>
                <p className="font-medium">{stopName}</p>
                {route.date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(route.date), "dd MMM yyyy")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
