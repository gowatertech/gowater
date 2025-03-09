import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

interface BottleReturnWithDetails extends BottleReturn {
  customerName: string | null;
  driverName: string | null;
  daysElapsed: number;
  orderStatus: string | null;
}

export default function EnvasesFaltantes() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedBottle, setSelectedBottle] = useState<BottleReturnWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Consulta para obtener los envases faltantes por cliente
  const { data: missingBottlesByCustomer = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["/api/missing-bottles/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/missing-bottles/customers");
      if (!response.ok) {
        throw new Error("Error al obtener datos");
      }
      const data = await response.json();
      console.log("Datos obtenidos:", data);
      return data;
    },
  });

  // Consulta para obtener los envases faltantes por chofer
  const { data: missingBottlesByDriver = [], isLoading: isLoadingDrivers } = useQuery({
    queryKey: ["/api/missing-bottles/drivers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/missing-bottles/drivers");
      if (!response.ok) {
        throw new Error("Error al obtener datos");
      }
      return response.json();
    },
  });

  // Mutación para asignar responsabilidad
  const assignResponsibilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/missing-bottles/assign", data);
      if (!response.ok) {
        throw new Error("Error al asignar responsabilidad");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/missing-bottles"] });
      toast({
        title: t("Éxito"),
        description: t("La responsabilidad ha sido asignada correctamente"),
      });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("Error"),
        description: error.message,
        variant: "destructive",
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
      manuallyAssigned: true,
      assignedAt: new Date().toISOString(),
    };
    assignResponsibilityMutation.mutate(data);
  };

  if (isLoadingCustomers || isLoadingDrivers) {
    return <div className="p-4">{t("Cargando...")}</div>;
  }

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
                  {missingBottlesByCustomer.map((bottle: BottleReturnWithDetails) => (
                    <TableRow key={bottle.id}>
                      <TableCell>{bottle.customerName}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${Number(bottle.amountCharged).toFixed(2)}</TableCell>
                      <TableCell>{bottle.daysElapsed}</TableCell>
                      <TableCell>{bottle.status}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedBottle(bottle);
                            setDialogOpen(true);
                          }}
                        >
                          {t("Asignar Responsabilidad")}
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
                    <TableHead>{t("Acciones")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingBottlesByDriver.map((bottle: BottleReturnWithDetails) => (
                    <TableRow key={bottle.id}>
                      <TableCell>{bottle.driverName}</TableCell>
                      <TableCell>#{bottle.orderId}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${Number(bottle.amountCharged).toFixed(2)}</TableCell>
                      <TableCell>{new Date(bottle.returnDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedBottle(bottle);
                            setDialogOpen(true);
                          }}
                        >
                          {t("Asignar Responsabilidad")}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
          }}>
            <div className="space-y-4">
              <div>
                <Label>{t("Responsable")}</Label>
                <RadioGroup defaultValue="customer" name="responsible" className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customer" id="customer" />
                    <Label htmlFor="customer">{t("Cliente")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="driver" id="driver" />
                    <Label htmlFor="driver">{t("Chofer")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">{t("Ambos")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>{t("Porcentaje Cliente (%)")}</Label>
                <Input 
                  type="number" 
                  name="customerPercentage"
                  defaultValue="100"
                  min="0"
                  max="100"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>{t("Método de Cobro")}</Label>
                <RadioGroup defaultValue="invoice" name="chargeMethod" className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="invoice" id="invoice" />
                    <Label htmlFor="invoice">{t("Factura")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="commission" id="commission" />
                    <Label htmlFor="commission">{t("Descontar de Comisión")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">{t("Pago en Efectivo")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>{t("Justificación")}</Label>
                <Input 
                  name="justification"
                  placeholder={t("Razón del cargo")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>{t("Monto a Cobrar")}</Label>
                <Input 
                  type="number" 
                  name="amountCharged"
                  defaultValue={Number(selectedBottle?.amountCharged || 0).toFixed(2)}
                  step="0.01"
                  min="0"
                  className="mt-2"
                />
              </div>

              <Button 
                type="submit"
                className="w-full mt-4"
                disabled={assignResponsibilityMutation.isPending}
              >
                {assignResponsibilityMutation.isPending ? t("Guardando...") : t("Guardar")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}