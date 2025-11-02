import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type BottleReturn } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, AlertTriangle, Plus } from "lucide-react";
import { formatDateRD } from "@/lib/date-utils";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Faltante from "./faltante";

interface BottleReturnWithDetails extends BottleReturn {
  customerName: string | null;
  driverName: string | null;
  daysElapsed: number;
  orderStatus: string | null;
  detectionType: 'automatic' | 'manual';
}

const DetectionTypeBadge = ({ type }: { type: 'automatic' | 'manual' }) => {
  const { t } = useTranslation();
  return (
    <Badge 
      variant={type === 'automatic' ? 'warning' : 'default'}
      className="flex items-center gap-1"
    >
      {type === 'automatic' ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      {t(type === 'automatic' ? 'Automático' : 'Manual')}
    </Badge>
  );
};

export default function Faltantes() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showFaltanteForm, setShowFaltanteForm] = useState(false);

  // Consulta para obtener los envases faltantes por cliente
  const { data: faltantesPorCliente = [], isLoading: isLoadingClientes } = useQuery({
    queryKey: ["/api/envases/faltantes/clientes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/envases/faltantes/clientes");
      if (!response.ok) {
        throw new Error("Error al obtener datos");
      }
      return response.json();
    },
  });

  // Consulta para obtener los envases faltantes por chofer
  const { data: faltantesPorChofer = [], isLoading: isLoadingChoferes } = useQuery({
    queryKey: ["/api/envases/faltantes/choferes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/envases/faltantes/choferes");
      if (!response.ok) {
        throw new Error("Error al obtener datos");
      }
      return response.json();
    },
  });

  if (isLoadingClientes || isLoadingChoferes) {
    return <div className="p-4">{t("Cargando...")}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Envases Faltantes")}</h1>
        <Button onClick={() => setShowFaltanteForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("Registrar Faltante")}
        </Button>
      </div>

      <Dialog open={showFaltanteForm} onOpenChange={setShowFaltanteForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("Registrar Faltante")}</DialogTitle>
          </DialogHeader>
          <Faltante onCreated={() => setShowFaltanteForm(false)} />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="clientes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clientes">{t("Por Cliente")}</TabsTrigger>
          <TabsTrigger value="choferes">{t("Por Chofer")}</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
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
                    <TableHead>{t("Tipo")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faltantesPorCliente.map((bottle: BottleReturnWithDetails) => (
                    <TableRow
                      key={bottle.id}
                      className={bottle.detectionType === 'automatic' ? 'bg-yellow-50' : ''}
                    >
                      <TableCell>{bottle.customerName}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${Number(bottle.amountCharged).toFixed(2)}</TableCell>
                      <TableCell>{bottle.daysElapsed}</TableCell>
                      <TableCell>{bottle.orderStatus}</TableCell>
                      <TableCell>
                        <DetectionTypeBadge type={bottle.detectionType} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="choferes">
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
                    <TableHead>{t("Tipo")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faltantesPorChofer.map((bottle: BottleReturnWithDetails) => (
                    <TableRow key={bottle.id} className={bottle.detectionType === 'automatic' ? 'bg-yellow-50' : ''}>
                      <TableCell>{bottle.driverName}</TableCell>
                      <TableCell>#{bottle.orderId}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${Number(bottle.amountCharged).toFixed(2)}</TableCell>
                      <TableCell>{formatDateRD(bottle.returnDate, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}</TableCell>
                      <TableCell>
                        <DetectionTypeBadge type={bottle.detectionType} />
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