import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type BottleReturn } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BalanceEnvases() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Consulta para obtener el balance de envases
  const { data: bottleBalance = [] } = useQuery<any[]>({
    queryKey: ["/api/bottle-balance"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bottle-balance");
      return response.json();
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Balance de Envases")}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-2">{t("Total Envases en Circulación")}</h3>
          <p className="text-2xl">1,234</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium mb-2">{t("Envases Devueltos")}</h3>
          <p className="text-2xl">987</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium mb-2">{t("Envases Pendientes")}</h3>
          <p className="text-2xl">247</p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-4">{t("Balance por Cliente")}</h3>
        <ScrollArea className="h-[calc(100vh-400px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Cliente")}</TableHead>
                <TableHead>{t("Envases Entregados")}</TableHead>
                <TableHead>{t("Envases Devueltos")}</TableHead>
                <TableHead>{t("Pendientes")}</TableHead>
                <TableHead>{t("Monto Depósito")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bottleBalance.map((balance) => (
                <TableRow key={balance.customerId}>
                  <TableCell>{balance.customerName}</TableCell>
                  <TableCell>{balance.bottlesDelivered}</TableCell>
                  <TableCell>{balance.bottlesReturned}</TableCell>
                  <TableCell>{balance.bottlesPending}</TableCell>
                  <TableCell>${balance.depositAmount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
