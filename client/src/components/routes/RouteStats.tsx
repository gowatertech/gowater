import { useTranslation } from "react-i18next";
import type { Route } from "@shared/schema";
import { formatCurrency } from "@/lib/format";

interface RouteStatsProps {
  route: Route;
  className?: string;
}

export default function RouteStats({ route, className }: RouteStatsProps) {
  const { t } = useTranslation();
  
  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      <div>
        <p className="text-xs text-muted-foreground">{t("deliveries")}</p>
        <p className="font-medium">{route.stops?.length || 0}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t("distance")}</p>
        <p className="font-medium">
          {route.totalDistance ? `${route.totalDistance.toFixed(1)} km` : "-"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t("revenue")}</p>
        <p className="font-medium">
          {formatCurrency(route.totalRevenue || 0)}
        </p>
      </div>
    </div>
  );
}
