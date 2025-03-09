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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DevolucionEnvases() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Consulta para obtener las devoluciones pendientes
  const { data: bottleReturns = [] } = useQuery<BottleReturn[]>({
    queryKey: ["/api/bottle-returns"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bottle-returns");
      return response.json();
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Devolución de Envases")}</h1>
        <Button>{t("Registrar Devolución")}</Button>
      </div>

      <Card className="p-4">
        <ScrollArea className="h-[calc(100vh-250px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Orden")}</TableHead>
                <TableHead>{t("Cliente")}</TableHead>
                <TableHead>{t("Producto")}</TableHead>
                <TableHead>{t("Cantidad Esperada")}</TableHead>
                <TableHead>{t("Cantidad Devuelta")}</TableHead>
                <TableHead>{t("Estado")}</TableHead>
                <TableHead>{t("Acciones")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bottleReturns.map((bottleReturn) => (
                <TableRow key={bottleReturn.id}>
                  <TableCell>#{bottleReturn.orderId}</TableCell>
                  <TableCell>{bottleReturn.customerId}</TableCell>
                  <TableCell>{bottleReturn.productId}</TableCell>
                  <TableCell>{bottleReturn.expectedQuantity}</TableCell>
                  <TableCell>{bottleReturn.returnedQuantity}</TableCell>
                  <TableCell>{bottleReturn.status}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      {t("Ver Detalles")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
