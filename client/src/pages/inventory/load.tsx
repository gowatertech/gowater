import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InventoryLoad() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("Load Truck")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t("Coming soon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
