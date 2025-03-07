import { useTranslation } from "react-i18next";
import type { Ruta } from "@shared/schema";
import { formatCurrency } from "@/lib/format";

interface ResumenRutaProps {
  ruta: Ruta;
  className?: string;
}

export default function ResumenRuta({ ruta, className }: ResumenRutaProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{t("deliveries")}</p>
          <p className="font-medium">{ruta.paradas?.length || 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("distance")}</p>
          <p className="font-medium">
            {ruta.distanciaTotal ? `${ruta.distanciaTotal} km` : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("revenue")}</p>
          <p className="font-medium">
            {formatCurrency(ruta.ingresoTotal || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}