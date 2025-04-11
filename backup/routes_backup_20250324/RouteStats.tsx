import { useTranslation } from "react-i18next";
import type { Route } from "@shared/schema";
import { formatCurrency } from "@/lib/format";

interface RouteStatsProps {
  route: Route;
  className?: string;
}

export default function RouteStats({ route, className }: RouteStatsProps) {
  const { t } = useTranslation();
  
  // Parsear totalDistance a número si es string
  let distance: number | undefined;
  if (route.totalDistance) {
    if (typeof route.totalDistance === 'number') {
      distance = route.totalDistance;
    } else if (typeof route.totalDistance === 'string') {
      distance = parseFloat(route.totalDistance);
    }
  }
  
  // Parsear totalRevenue a número si es string
  let revenue: number = 0;
  if (route.totalRevenue) {
    if (typeof route.totalRevenue === 'number') {
      revenue = route.totalRevenue;
    } else if (typeof route.totalRevenue === 'string') {
      revenue = parseFloat(route.totalRevenue);
    }
  }
  
  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      <div>
        <p className="text-xs text-muted-foreground">{t("deliveries")}</p>
        <p className="font-medium">{route.stops?.length || 0}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t("distance")}</p>
        <p className="font-medium">
          {distance && !isNaN(distance) ? `${distance.toFixed(1)} km` : "-"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t("revenue")}</p>
        <p className="font-medium">
          {formatCurrency(revenue)}
        </p>
      </div>
    </div>
  );
}
