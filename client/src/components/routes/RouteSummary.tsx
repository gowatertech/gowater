import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/format";

interface RouteSummaryProps {
  route: {
    id: number;
    name: string;
    stops?: string[] | null;
    totalDistance?: string | number | null;
    totalRevenue?: string | number | null;
    comments?: string | null;
  };
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
            {formatCurrency(typeof route.totalRevenue === 'string' ? parseFloat(route.totalRevenue) : 0)}
          </p>
        </div>
      </div>
      
      {/* Mostrar comentarios de la ruta si existen */}
      {route.comments && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-1">{t("route_comments")}</p>
          <p className="text-sm bg-muted p-3 rounded-md">{route.comments}</p>
        </div>
      )}
    </div>
  );
}
