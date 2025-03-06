import { useTranslation } from "react-i18next";
import type { Route } from "@shared/schema";
import { format } from "date-fns";

interface RouteTimelineProps {
  route: Route;
  className?: string;
}

export default function RouteTimeline({ route, className }: RouteTimelineProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <h3 className="font-medium mb-4">{t("timeline")}</h3>
      <div className="space-y-4">
        {route.stops?.map((stop, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs">
              {index + 1}
            </div>
            <div>
              <p className="font-medium">{stop.address}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(stop.estimatedTime), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
