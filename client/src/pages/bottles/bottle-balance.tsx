import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BottleBalance() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: bottleBalance } = useQuery({
    queryKey: ["/api/bottles/balance"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bottles/balance");
      return response.json();
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("bottleBalance")}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          {t("viewDetails")}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bottleBalance")}</DialogTitle>
            <DialogDescription>
              {t("bottleBalanceDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {bottleBalance && (
              <Card className="p-4">
                {/* Balance details will go here */}
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}