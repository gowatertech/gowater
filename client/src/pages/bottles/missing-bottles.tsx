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
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

export default function MissingBottles() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedBottle, setSelectedBottle] = useState<BottleReturnWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const assignResponsibilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/missing-bottles/assign", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/missing-bottles"] });
      toast({
        title: t("success"),
        description: t("responsibilityAssigned"),
      });
      setDialogOpen(false);
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

  const { data: customerMissingBottles = [] } = useQuery<BottleReturnWithDetails[]>({
    queryKey: ["/api/missing-bottles/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/missing-bottles/customers");
      return response.json();
    },
  });

  const { data: driverMissingBottles = [] } = useQuery<BottleReturnWithDetails[]>({
    queryKey: ["/api/missing-bottles/drivers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/missing-bottles/drivers");
      return response.json();
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("missingBottlesTitle")}</h1>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">{t("byCustomer")}</TabsTrigger>
          <TabsTrigger value="drivers">{t("byDriver")}</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead>{t("missingBottles")}</TableHead>
                    <TableHead>{t("amountToCharge")}</TableHead>
                    <TableHead>{t("daysElapsed")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("detectionType")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerMissingBottles.map((bottle) => (
                    <TableRow key={bottle.id} className={bottle.automaticAlert ? "bg-yellow-50" : ""}>
                      <TableCell>{bottle.customerName}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${Number(bottle.amountCharged).toFixed(2)}</TableCell>
                      <TableCell>{bottle.daysElapsed}</TableCell>
                      <TableCell>{t(bottle.status)}</TableCell>
                      <TableCell>
                        {bottle.automaticAlert ? t("automatic") : t("manual")}
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
                          {t("assignResponsibility")}
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
                    <TableHead>{t("driver")}</TableHead>
                    <TableHead>{t("order")}</TableHead>
                    <TableHead>{t("missingBottles")}</TableHead>
                    <TableHead>{t("amountToCharge")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("detectionType")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverMissingBottles.map((bottle) => (
                    <TableRow key={bottle.id} className={bottle.automaticAlert ? "bg-yellow-50" : ""}>
                      <TableCell>{bottle.driverName}</TableCell>
                      <TableCell>#{bottle.orderId}</TableCell>
                      <TableCell>{bottle.pendingQuantity}</TableCell>
                      <TableCell>${Number(bottle.amountCharged).toFixed(2)}</TableCell>
                      <TableCell>{new Date(bottle.returnDate).toLocaleDateString()}</TableCell>
                      <TableCell>{t(bottle.status)}</TableCell>
                      <TableCell>
                        {bottle.automaticAlert ? t("automatic") : t("manual")}
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
                          {t("assignResponsibility")}
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
            <DialogTitle>{t("assignResponsibility")}</DialogTitle>
            <DialogDescription>
              {selectedBottle?.customerName && (
                <p>{t("customer")}: {selectedBottle.customerName}</p>
              )}
              {selectedBottle?.driverName && (
                <p>{t("driver")}: {selectedBottle.driverName}</p>
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
                <Label>{t("responsibleParty")}</Label>
                <RadioGroup defaultValue="customer" name="responsible">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customer" id="customer" />
                    <Label htmlFor="customer">{t("customer")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="driver" id="driver" />
                    <Label htmlFor="driver">{t("driver")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">{t("both")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>{t("customerPercentage")}</Label>
                <Input 
                  type="number" 
                  name="customerPercentage"
                  defaultValue="100"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <Label>{t("chargeMethod")}</Label>
                <RadioGroup defaultValue="invoice" name="chargeMethod">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="invoice" id="invoice" />
                    <Label htmlFor="invoice">{t("invoice")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="commission" id="commission" />
                    <Label htmlFor="commission">{t("deductFromCommission")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">{t("cashPayment")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>{t("justification")}</Label>
                <Input 
                  name="justification"
                  placeholder={t("chargeReason")}
                />
              </div>

              <div>
                <Label>{t("amountToCharge")}</Label>
                <Input 
                  type="number" 
                  name="amountCharged"
                  defaultValue={Number(selectedBottle?.amountCharged || 0).toFixed(2)}
                />
              </div>

              <Button 
                type="submit"
                disabled={assignResponsibilityMutation.isPending}
              >
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}