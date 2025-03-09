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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function EnvasesFaltantes() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedBottle, setSelectedBottle] = useState<BottleReturnWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mutación para asignar responsabilidad (kept from original)
  const assignResponsibilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/missing-bottles/assign", data);
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
  });

  // Consulta para obtener los envases faltantes por cliente (kept from original)
  const { data: missingBottlesByCustomer = [] } = useQuery({
    queryKey: ["/api/missing-bottles/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/missing-bottles/customers");
      return response.json();
    },
  });

    const handleOpenDialog = (bottle: BottleReturnWithDetails) => {
    console.log("Opening dialog for bottle:", bottle);
    setSelectedBottle(bottle);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    console.log("Closing dialog");
    setDialogOpen(false);
    setSelectedBottle(null);
  };

  const handleAssignResponsibility = (formData: any) => {
    console.log("Form data:", formData);
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


  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Cobro de Envases Faltantes")}</h1>
        <Button onClick={() => setDialogOpen(true)}>{t("Prueba Dialog")}</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p>Este es un diálogo de prueba</p>
            <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="p-4">
        <ScrollArea className="h-[calc(100vh-250px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Cliente")}</TableHead>
                <TableHead>{t("Envases Faltantes")}</TableHead>
                <TableHead>{t("Acciones")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missingBottlesByCustomer.map((bottle: any) => (
                <TableRow key={bottle.id}>
                  <TableCell>{bottle.customerName}</TableCell>
                  <TableCell>{bottle.pendingQuantity}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenDialog(bottle)}
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
    </div>
  );
}

interface BottleReturnWithDetails extends BottleReturn {
  customerName: string | null;
  driverName: string | null;
  daysElapsed: number;
  orderStatus: string | null;
}