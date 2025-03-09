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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EnvasesFaltantes() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Consulta para obtener los envases faltantes por cliente
  const { data: missingBottlesByCustomer = [] } = useQuery<BottleReturn[]>({
    queryKey: ["/api/missing-bottles/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/missing-bottles/customers");
      return response.json();
    },
  });

  // Consulta para obtener los envases faltantes por chofer
  const { data: missingBottlesByDriver = [] } = useQuery<BottleReturn[]>({
    queryKey: ["/api/missing-bottles/drivers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/missing-bottles/drivers");
      return response.json();
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Cobro de Envases Faltantes")}</h1>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">{t("Por Cliente")}</TabsTrigger>
          <TabsTrigger value="drivers">{t("Por Chofer")}</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Cliente")}</TableHead>
                    <TableHead>{t("Envases Faltantes")}</TableHead>
                    <TableHead>{t("Monto a Cobrar")}</TableHead>
                    <TableHead>{t("Días Transcurridos")}</TableHead>
                    <TableHead>{t("Estado")}</TableHead>
                    <TableHead>{t("Acciones")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingBottlesByCustomer.map((bottle) => (
                    <TableRow key={bottle.id}>
                      <TableCell>{bottle.customerName}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${bottle.amountCharged}</TableCell>
                      <TableCell>30</TableCell>
                      <TableCell>{bottle.status}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          {t("Generar Cargo")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="drivers">
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Chofer")}</TableHead>
                    <TableHead>{t("Ruta")}</TableHead>
                    <TableHead>{t("Envases Faltantes")}</TableHead>
                    <TableHead>{t("Monto a Cobrar")}</TableHead>
                    <TableHead>{t("Fecha")}</TableHead>
                    <TableHead>{t("Estado")}</TableHead>
                    <TableHead>{t("Acciones")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingBottlesByDriver.map((bottle) => (
                    <TableRow key={bottle.id}>
                      <TableCell>{bottle.driverName}</TableCell>
                      <TableCell>#{bottle.routeId}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${bottle.amountCharged}</TableCell>
                      <TableCell>{new Date(bottle.returnDate).toLocaleDateString()}</TableCell>
                      <TableCell>{bottle.status}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          {t("Descontar de Comisión")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}