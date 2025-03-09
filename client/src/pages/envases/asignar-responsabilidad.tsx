import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, AlertTriangle } from "lucide-react";

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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription, 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface BottleReturnWithDetails {
  id: number;
  customerName: string | null;
  driverName: string | null;
  daysElapsed: number;
  orderStatus: string | null;
  detectionType: 'automatic' | 'manual';
  pendingQuantity: number;
  amountCharged: number;
  status: string;
  orderId: number;
  returnDate: string;
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

export default function AsignarResponsabilidad() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState<BottleReturnWithDetails | null>(null);

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

  const asignarResponsabilidadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/envases/faltantes/asignar", data);
      if (!response.ok) {
        throw new Error("Error al asignar responsabilidad");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envases/faltantes"] });
      toast({
        description: t("La responsabilidad ha sido asignada correctamente"),
      });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: error.message,
      });
    },
  });

  const handleAssignResponsibility = (formData: any) => {
    const data = {
      bottleReturnId: selectedBottle?.id,
      ...formData,
      driverPercentage: formData.responsible === "both" ? 
        (100 - parseInt(formData.customerPercentage)) : 
        (formData.responsible === "driver" ? 100 : 0),
    };
    asignarResponsabilidadMutation.mutate(data);
  };

  if (isLoadingClientes) {
    return <div className="p-4">{t("Cargando...")}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Asignar Responsabilidad de Envases")}</h1>
      </div>

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
                <TableHead>{t("Acciones")}</TableHead>
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
                  <TableCell>{bottle.status}</TableCell>
                  <TableCell>
                    <DetectionTypeBadge type={bottle.detectionType} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBottle(bottle);
                        setDialogOpen(true);
                      }}
                    >
                      {t("Asignar")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("Asignar Responsabilidad")}</DialogTitle>
            <DialogDescription>
              {selectedBottle?.customerName && (
                <p>{t("Cliente")}: {selectedBottle.customerName}</p>
              )}
              {selectedBottle?.driverName && (
                <p>{t("Chofer")}: {selectedBottle.driverName}</p>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAssignResponsibility(Object.fromEntries(formData));
          }} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("Responsable")}</Label>
                <RadioGroup defaultValue="customer" name="responsible">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customer" id="r-customer" />
                    <Label htmlFor="r-customer">{t("Cliente")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="driver" id="r-driver" />
                    <Label htmlFor="r-driver">{t("Chofer")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="r-both" />
                    <Label htmlFor="r-both">{t("Ambos")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>{t("Porcentaje Cliente (%)")}</Label>
                <Input 
                  type="number" 
                  name="customerPercentage"
                  defaultValue="100"
                  min="0"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("Método de Cobro")}</Label>
                <RadioGroup defaultValue="invoice" name="chargeMethod">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="invoice" id="c-invoice" />
                    <Label htmlFor="c-invoice">{t("Factura")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="commission" id="c-commission" />
                    <Label htmlFor="c-commission">{t("Descontar de Comisión")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="c-cash" />
                    <Label htmlFor="c-cash">{t("Pago en Efectivo")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>{t("Justificación")}</Label>
                <Input 
                  name="justification"
                  placeholder={t("Razón del cargo")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("Monto a Cobrar")}</Label>
                <Input 
                  type="number" 
                  name="amountCharged"
                  defaultValue={Number(selectedBottle?.amountCharged || 0).toFixed(2)}
                  step="0.01"
                  min="0"
                />
              </div>

              <Button 
                type="submit"
                className="w-full"
                disabled={asignarResponsabilidadMutation.isPending}
              >
                {asignarResponsabilidadMutation.isPending ? t("Guardando...") : t("Guardar")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
