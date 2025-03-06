import { useTranslation } from "react-i18next";
import type { Route } from "@shared/schema";
import { formatCurrency } from "@/lib/format";

interface RouteSummaryProps {
  route: Route;
  className?: string;
}

export default function RouteSummary({ route, className }: RouteSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{t("deliveries")}</p>
          <p className="font-medium">{route.stops?.length || 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("distance")}</p>
          <p className="font-medium">
            {route.totalDistance ? `${route.totalDistance} km` : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("revenue")}</p>
          <p className="font-medium">
            {formatCurrency(route.totalRevenue || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
