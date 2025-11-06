import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toRD, formatDateRD } from "@/lib/date-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Calendar,
  Droplet,
  Banknote,
  CreditCard,
  Receipt,
  FileText,
  Save,
  AlertCircle,
  History,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DailySummary {
  totalSales: string;
  creditInvoicesTotal: string;
  cashInvoicesTotal: string;
  totalPayments: string;
  receiptsTotal: string;
  advancesTotal: string;
  waterPricePerGallon: string;
  invoicesCount: number;
  paymentsCount: number;
}

interface CashReconciliation {
  id: number;
  reconciliationDate: string;
  totalSales: string;
  creditInvoicesTotal: string;
  cashInvoicesTotal: string;
  totalPayments: string;
  receiptsTotal: string;
  advancesTotal: string;
  initialCash: string;
  expectedCash: string;
  actualCash: string;
  lostWaterGallons: string;
  waterPricePerGallon: string;
  lostWaterValue: string;
  surplus: string;
  shortage: string;
  notes?: string;
  createdBy?: number;
  createdAt: string;
  userName?: string;
}

export default function CashReconciliation() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("new");
  const [selectedDate, setSelectedDate] = useState<string>(toRD(new Date()).toISOString());
  const [initialCash, setInitialCash] = useState("0.00");
  const [actualCash, setActualCash] = useState("0.00");
  const [lostWaterGallons, setLostWaterGallons] = useState("0");
  const [notes, setNotes] = useState("");
  const [showExistingAlert, setShowExistingAlert] = useState(false);
  const [existingReconciliation, setExistingReconciliation] = useState<CashReconciliation | null>(null);
  const [selectedReconciliation, setSelectedReconciliation] = useState<CashReconciliation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Obtener resumen diario
  const { data: dailySummary, isLoading: isLoadingSummary } = useQuery<DailySummary>({
    queryKey: ["/api/cash-reconciliation/daily-summary", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/cash-reconciliation/daily-summary?date=${encodeURIComponent(selectedDate)}`);
      if (!response.ok) throw new Error("Error al obtener resumen diario");
      return await response.json();
    },
    enabled: !!selectedDate,
  });

  // Verificar si ya existe cuadre
  const { data: existenceCheck } = useQuery<{ exists: boolean; reconciliation: CashReconciliation | null }>({
    queryKey: ["/api/cash-reconciliation/check-exists", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/cash-reconciliation/check-exists?date=${encodeURIComponent(selectedDate)}`);
      if (!response.ok) throw new Error("Error al verificar cuadre existente");
      return await response.json();
    },
    enabled: !!selectedDate,
  });

  // Obtener historial de cuadres
  const { data: reconciliations = [], isLoading: isLoadingHistory } = useQuery<CashReconciliation[]>({
    queryKey: ["/api/cash-reconciliation"],
  });

  // Mutación para crear cuadre
  const createReconciliationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest({
        url: "/api/cash-reconciliation",
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Cuadre guardado",
        description: "El cuadre de caja se ha registrado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-reconciliation"] });
      resetForm();
    },
    onError: (error: any) => {
      if (error.existing) {
        setExistingReconciliation(error.existing);
        setShowExistingAlert(true);
      } else {
        toast({
          title: "Error",
          description: error.error || "No se pudo guardar el cuadre",
          variant: "destructive",
        });
      }
    },
  });

  // Cálculos automáticos
  const waterPricePerGallon = parseFloat(dailySummary?.waterPricePerGallon || "0");
  const lostWaterValue = parseFloat(lostWaterGallons || "0") * waterPricePerGallon;
  
  const cashInvoicesTotal = parseFloat(dailySummary?.cashInvoicesTotal || "0");
  const receiptsTotal = parseFloat(dailySummary?.receiptsTotal || "0");
  const advancesTotal = parseFloat(dailySummary?.advancesTotal || "0");
  
  // Nueva fórmula: efectivo caja - (efectivo FT + ANT + efectivo inicial)
  const expectedCash = cashInvoicesTotal + advancesTotal + parseFloat(initialCash);
  
  const actualCashValue = parseFloat(actualCash);
  const difference = actualCashValue - expectedCash;
  const surplus = difference > 0 ? difference : 0;
  const shortage = difference < 0 ? Math.abs(difference) : 0;

  const resetForm = () => {
    setSelectedDate(toRD(new Date()).toISOString());
    setInitialCash("0.00");
    setActualCash("0.00");
    setLostWaterGallons("0");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!dailySummary) {
      toast({
        title: "Error",
        description: "Primero selecciona una fecha válida",
        variant: "destructive",
      });
      return;
    }

    const data = {
      reconciliationDate: selectedDate,
      totalSales: dailySummary.totalSales,
      creditInvoicesTotal: dailySummary.creditInvoicesTotal,
      cashInvoicesTotal: dailySummary.cashInvoicesTotal,
      totalPayments: dailySummary.totalPayments,
      receiptsTotal: dailySummary.receiptsTotal,
      advancesTotal: dailySummary.advancesTotal,
      initialCash: parseFloat(initialCash).toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      actualCash: parseFloat(actualCash).toFixed(2),
      lostWaterGallons: parseInt(lostWaterGallons || "0").toString(),
      waterPricePerGallon: waterPricePerGallon.toFixed(2),
      lostWaterValue: lostWaterValue.toFixed(2),
      surplus: surplus.toFixed(2),
      shortage: shortage.toFixed(2),
      notes: notes.trim() || undefined,
    };

    createReconciliationMutation.mutate(data);
  };

  const viewReconciliationDetails = (reconciliation: CashReconciliation) => {
    setSelectedReconciliation(reconciliation);
    setShowDetailDialog(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            Cuadre de Caja Diaria
          </h1>
          <p className="text-muted-foreground mt-1">
            Proceso de cierre y reconciliación de efectivo diario
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2" data-testid="tab-new-reconciliation">
            <FileText className="h-4 w-4" />
            Nuevo Cuadre
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6 mt-6">
          {/* Selector de fecha */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Seleccionar Fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="reconciliation-date">Fecha del Cuadre</Label>
                  <Input
                    id="reconciliation-date"
                    type="date"
                    value={format(new Date(selectedDate), "yyyy-MM-dd")}
                    onChange={(e) => setSelectedDate(new Date(e.target.value).toISOString())}
                    data-testid="input-reconciliation-date"
                  />
                </div>
                {existenceCheck?.exists && (
                  <Badge variant="destructive" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Ya existe cuadre para esta fecha
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumen de ventas */}
          {isLoadingSummary ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Cargando resumen...</p>
              </CardContent>
            </Card>
          ) : dailySummary ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Resumen de Ventas
                  </CardTitle>
                  <CardDescription>
                    Datos obtenidos automáticamente del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Total de Ventas</Label>
                      <div className="text-2xl font-bold" data-testid="text-total-sales">
                        ${parseFloat(dailySummary.totalSales).toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dailySummary.invoicesCount} factura{dailySummary.invoicesCount !== 1 && "s"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        FT a Crédito
                      </Label>
                      <div className="text-2xl font-bold text-orange-600" data-testid="text-credit-invoices">
                        ${parseFloat(dailySummary.creditInvoicesTotal).toFixed(2)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        FT Efectivo
                      </Label>
                      <div className="text-2xl font-bold text-green-600" data-testid="text-cash-invoices">
                        ${parseFloat(dailySummary.cashInvoicesTotal).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Total Pagos</Label>
                      <div className="text-2xl font-bold" data-testid="text-total-payments">
                        ${parseFloat(dailySummary.totalPayments).toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dailySummary.paymentsCount} pago{dailySummary.paymentsCount !== 1 && "s"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        RI (Recibos)
                      </Label>
                      <div className="text-2xl font-bold text-blue-600" data-testid="text-receipts">
                        ${parseFloat(dailySummary.receiptsTotal).toFixed(2)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        ANT (Anticipos)
                      </Label>
                      <div className="text-2xl font-bold text-purple-600" data-testid="text-advances">
                        ${parseFloat(dailySummary.advancesTotal).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Formulario de cuadre */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Datos del Cuadre
                  </CardTitle>
                  <CardDescription>
                    Ingresa la información para completar el cuadre de caja
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="initial-cash">Efectivo Inicial</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="initial-cash"
                          type="number"
                          step="0.01"
                          value={initialCash}
                          onChange={(e) => setInitialCash(e.target.value)}
                          className="pl-10"
                          placeholder="0.00"
                          data-testid="input-initial-cash"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="actual-cash">Efectivo en Caja</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="actual-cash"
                          type="number"
                          step="0.01"
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                          className="pl-10"
                          placeholder="0.00"
                          data-testid="input-actual-cash"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-semibold">Agua Perdida</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lost-water">Cantidad de Galones (solo informativo)</Label>
                        <Input
                          id="lost-water"
                          type="number"
                          step="1"
                          value={lostWaterGallons}
                          onChange={(e) => setLostWaterGallons(e.target.value)}
                          placeholder="0"
                          data-testid="input-lost-water-gallons"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio por Galón</Label>
                        <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                          <span className="font-medium">${waterPricePerGallon.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground ml-2">(automático)</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Valor del Agua Perdida:</span>
                        <span className="text-lg font-bold text-blue-600" data-testid="text-lost-water-value">
                          ${lostWaterValue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Resultado del Cuadre</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                        <Label className="text-sm text-muted-foreground">Efectivo Esperado</Label>
                        <div className="text-2xl font-bold" data-testid="text-expected-cash">
                          ${expectedCash.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Inicial + FT Cash + ANT
                        </p>
                      </div>
                      <div className={cn(
                        "p-4 rounded-lg space-y-2",
                        surplus > 0 && "bg-green-50 dark:bg-green-950",
                        shortage > 0 && "bg-red-50 dark:bg-red-950",
                        surplus === 0 && shortage === 0 && "bg-blue-50 dark:bg-blue-950"
                      )}>
                        <Label className="text-sm">Resultado</Label>
                        {surplus > 0 && (
                          <>
                            <div className="flex items-center gap-2 text-green-600">
                              <TrendingUp className="h-5 w-5" />
                              <span className="text-2xl font-bold" data-testid="text-surplus">
                                +${surplus.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-green-600 font-medium">Sobrante</p>
                          </>
                        )}
                        {shortage > 0 && (
                          <>
                            <div className="flex items-center gap-2 text-red-600">
                              <TrendingDown className="h-5 w-5" />
                              <span className="text-2xl font-bold" data-testid="text-shortage">
                                -${shortage.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-red-600 font-medium">Faltante</p>
                          </>
                        )}
                        {surplus === 0 && shortage === 0 && (
                          <>
                            <div className="flex items-center gap-2 text-blue-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-2xl font-bold">$0.00</span>
                            </div>
                            <p className="text-xs text-blue-600 font-medium">Cuadre Perfecto</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones o comentarios adicionales..."
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      data-testid="button-reset"
                    >
                      Limpiar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={createReconciliationMutation.isPending || existenceCheck?.exists}
                      className="gap-2"
                      data-testid="button-save-reconciliation"
                    >
                      <Save className="h-4 w-4" />
                      {createReconciliationMutation.isPending ? "Guardando..." : "Guardar Cuadre"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  Selecciona una fecha para ver el resumen de ventas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Cuadres
              </CardTitle>
              <CardDescription>
                Consulta todos los cuadres de caja realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <p className="text-center text-muted-foreground py-8">Cargando historial...</p>
              ) : reconciliations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay cuadres registrados
                </p>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Ventas</TableHead>
                        <TableHead>Efectivo Esp.</TableHead>
                        <TableHead>Efectivo Real</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Creado Por</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliations.map((rec) => {
                        const surplus = parseFloat(rec.surplus);
                        const shortage = parseFloat(rec.shortage);
                        return (
                          <TableRow key={rec.id} data-testid={`row-reconciliation-${rec.id}`}>
                            <TableCell className="font-medium">
                              {formatDateRD(new Date(rec.reconciliationDate))}
                            </TableCell>
                            <TableCell>${parseFloat(rec.totalSales).toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(rec.expectedCash).toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(rec.actualCash).toFixed(2)}</TableCell>
                            <TableCell>
                              {surplus > 0 && (
                                <Badge variant="default" className="bg-green-600">
                                  +${surplus.toFixed(2)}
                                </Badge>
                              )}
                              {shortage > 0 && (
                                <Badge variant="destructive">
                                  -${shortage.toFixed(2)}
                                </Badge>
                              )}
                              {surplus === 0 && shortage === 0 && (
                                <Badge variant="outline" className="border-blue-600 text-blue-600">
                                  Perfecto
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{rec.userName || "N/A"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewReconciliationDetails(rec)}
                                data-testid={`button-view-${rec.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert para cuadre existente */}
      <AlertDialog open={showExistingAlert} onOpenChange={setShowExistingAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Cuadre Ya Existe
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe un cuadre registrado para la fecha seleccionada. Solo se permite un cuadre por día.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowExistingAlert(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de detalles */}
      <AlertDialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Cuadre
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedReconciliation && formatDateRD(new Date(selectedReconciliation.reconciliationDate))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedReconciliation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Ventas</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.totalSales).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">FT Crédito</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.creditInvoicesTotal).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">FT Efectivo</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.cashInvoicesTotal).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Pagos</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.totalPayments).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Recibos (RI)</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.receiptsTotal).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Anticipos (ANT)</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.advancesTotal).toFixed(2)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Efectivo Inicial</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.initialCash).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Efectivo Esperado</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.expectedCash).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Efectivo Real</Label>
                  <p className="font-semibold">${parseFloat(selectedReconciliation.actualCash).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Agua Perdida</Label>
                  <p className="font-semibold">
                    {parseFloat(selectedReconciliation.lostWaterGallons).toFixed(2)} gal 
                    (${parseFloat(selectedReconciliation.lostWaterValue).toFixed(2)})
                  </p>
                </div>
              </div>

              {selectedReconciliation.notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Notas</Label>
                    <p className="text-sm mt-1">{selectedReconciliation.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
