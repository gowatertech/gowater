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
  CheckCircle2,
  Wallet,
  User,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
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
  donatedWaterGallons: string;
  donatedWaterValue: string;
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
  donatedWaterGallons: string;
  donatedWaterValue: string;
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReconciliationId, setEditingReconciliationId] = useState<number | null>(null);

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

  // Mutación para actualizar cuadre
  const updateReconciliationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest({
        url: `/api/cash-reconciliation/${id}`,
        method: "PATCH",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Cuadre actualizado",
        description: "El cuadre de caja se ha actualizado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-reconciliation"] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "No se pudo actualizar el cuadre",
        variant: "destructive",
      });
    },
  });

  // Cálculos automáticos
  const waterPricePerGallon = 30; // Precio fijo de 30 para agua perdida
  const lostWaterValue = parseFloat(lostWaterGallons || "0") * waterPricePerGallon;
  
  // Agua donada (calculada automáticamente desde el backend)
  const donatedWaterGallons = parseFloat(dailySummary?.donatedWaterGallons || "0");
  const donatedWaterValue = parseFloat(dailySummary?.donatedWaterValue || "0");
  
  const cashInvoicesTotal = parseFloat(dailySummary?.cashInvoicesTotal || "0");
  const receiptsTotal = parseFloat(dailySummary?.receiptsTotal || "0");
  const advancesTotal = parseFloat(dailySummary?.advancesTotal || "0");
  
  // Nueva fórmula: Efectivo Esperado = Inicial + RI + ANT (sin incluir FT)
  const expectedCash = parseFloat(initialCash) + receiptsTotal + advancesTotal;
  
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
    setIsEditMode(false);
    setEditingReconciliationId(null);
  };

  const loadExistingReconciliation = () => {
    if (existenceCheck?.reconciliation) {
      const rec = existenceCheck.reconciliation;
      setInitialCash(parseFloat(rec.initialCash).toFixed(2));
      setActualCash(parseFloat(rec.actualCash).toFixed(2));
      setLostWaterGallons(parseInt(rec.lostWaterGallons).toString());
      setNotes(rec.notes || "");
      setIsEditMode(true);
      setEditingReconciliationId(rec.id);
      
      toast({
        title: "Modo Edición",
        description: "Ahora puedes modificar el cuadre existente",
      });
    }
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
      donatedWaterGallons: donatedWaterGallons.toFixed(2),
      donatedWaterValue: donatedWaterValue.toFixed(2),
      surplus: surplus.toFixed(2),
      shortage: shortage.toFixed(2),
      notes: notes.trim() || undefined,
    };

    if (isEditMode && editingReconciliationId) {
      updateReconciliationMutation.mutate({ id: editingReconciliationId, data });
    } else {
      createReconciliationMutation.mutate(data);
    }
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
                    onChange={(e) => {
                      setSelectedDate(new Date(e.target.value).toISOString());
                      setIsEditMode(false);
                      setEditingReconciliationId(null);
                    }}
                    data-testid="input-reconciliation-date"
                  />
                </div>
                {existenceCheck?.exists && !isEditMode && (
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <Badge variant="destructive" className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Ya existe cuadre para esta fecha
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadExistingReconciliation}
                      className="gap-2"
                      data-testid="button-edit-existing"
                    >
                      <FileText className="h-4 w-4" />
                      Editar Cuadre
                    </Button>
                  </div>
                )}
                {isEditMode && (
                  <Badge className="flex items-center gap-2 bg-blue-600">
                    <FileText className="h-4 w-4" />
                    Editando cuadre existente
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
                      <h3 className="text-lg font-semibold">Agua Perdida y Donada</h3>
                    </div>
                    
                    {/* Agua Perdida */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-900">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplet className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-sm">Agua Perdida</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="lost-water" className="text-sm">Cantidad de Galones (solo informativo)</Label>
                          <Input
                            id="lost-water"
                            type="number"
                            step="1"
                            value={lostWaterGallons}
                            onChange={(e) => setLostWaterGallons(e.target.value)}
                            placeholder="0"
                            data-testid="input-lost-water-gallons"
                            className="bg-white dark:bg-gray-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Precio por Galón</Label>
                          <div className="flex items-center h-10 px-3 rounded-md border bg-white dark:bg-gray-900">
                            <span className="font-medium">${waterPricePerGallon.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground ml-2">(fijo)</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-3 rounded-md border">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Valor del Agua Perdida:</span>
                          <span className="text-lg font-bold text-blue-600" data-testid="text-lost-water-value">
                            ${lostWaterValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Agua Donada */}
                    <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg space-y-3 border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplet className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-sm">Agua Donada</span>
                        <Badge variant="outline" className="ml-auto text-xs">Automático</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Cantidad de Galones</Label>
                          <div className="flex items-center h-10 px-3 rounded-md border bg-white dark:bg-gray-900">
                            <span className="font-medium">{donatedWaterGallons.toFixed(0)}</span>
                            <span className="text-xs text-muted-foreground ml-2">gal</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Valor Total Donado</Label>
                          <div className="flex items-center h-10 px-3 rounded-md border bg-white dark:bg-gray-900">
                            <span className="font-medium text-green-600">${donatedWaterValue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Calculado automáticamente desde pedidos con método de pago "Donación"
                      </p>
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
                          Inicial + RI + ANT
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
                      {isEditMode ? "Cancelar" : "Limpiar"}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={(createReconciliationMutation.isPending || updateReconciliationMutation.isPending) || (existenceCheck?.exists && !isEditMode)}
                      className="gap-2"
                      data-testid="button-save-reconciliation"
                    >
                      <Save className="h-4 w-4" />
                      {createReconciliationMutation.isPending || updateReconciliationMutation.isPending 
                        ? "Guardando..." 
                        : isEditMode 
                        ? "Actualizar Cuadre" 
                        : "Guardar Cuadre"}
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
                <>
                  {/* Vista móvil - Cards */}
                  <div className="md:hidden space-y-4">
                    <ScrollArea className="h-[600px]">
                      {reconciliations.map((rec) => {
                        const surplus = parseFloat(rec.surplus);
                        const shortage = parseFloat(rec.shortage);
                        const isBalanced = surplus === 0 && shortage === 0;
                        
                        return (
                          <Card 
                            key={rec.id} 
                            className={cn(
                              "mb-4 border-l-4 shadow-md hover:shadow-lg transition-all duration-200",
                              isBalanced && "border-l-emerald-500 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20",
                              surplus > 0 && "border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20",
                              shortage > 0 && "border-l-red-500 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20"
                            )}
                            data-testid={`card-reconciliation-${rec.id}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "p-2 rounded-full",
                                    isBalanced && "bg-emerald-100 dark:bg-emerald-900",
                                    surplus > 0 && "bg-green-100 dark:bg-green-900",
                                    shortage > 0 && "bg-red-100 dark:bg-red-900"
                                  )}>
                                    <Calendar className={cn(
                                      "h-4 w-4",
                                      isBalanced && "text-emerald-600 dark:text-emerald-400",
                                      surplus > 0 && "text-green-600 dark:text-green-400",
                                      shortage > 0 && "text-red-600 dark:text-red-400"
                                    )} />
                                  </div>
                                  <div>
                                    <CardTitle className="text-sm font-semibold">
                                      {formatDateRD(new Date(rec.reconciliationDate))}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <User className="h-3 w-3" />
                                      {rec.userName || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => viewReconciliationDetails(rec)}
                                  data-testid={`button-view-mobile-${rec.id}`}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-card/50 p-3 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <p className="text-xs font-medium text-muted-foreground">Ventas</p>
                                  </div>
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    ${parseFloat(rec.totalSales).toFixed(2)}
                                  </p>
                                </div>
                                <div className="bg-card/50 p-3 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <p className="text-xs font-medium text-muted-foreground">Efectivo Esp.</p>
                                  </div>
                                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                    ${parseFloat(rec.expectedCash).toFixed(2)}
                                  </p>
                                </div>
                                <div className="bg-card/50 p-3 rounded-lg border col-span-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    <p className="text-xs font-medium text-muted-foreground">Efectivo Real</p>
                                  </div>
                                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                    ${parseFloat(rec.actualCash).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-sm font-medium text-muted-foreground">Resultado</span>
                                <div>
                                  {surplus > 0 && (
                                    <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-sm">
                                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                                      +${surplus.toFixed(2)}
                                    </Badge>
                                  )}
                                  {shortage > 0 && (
                                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm">
                                      <ArrowDownCircle className="h-3 w-3 mr-1" />
                                      -${shortage.toFixed(2)}
                                    </Badge>
                                  )}
                                  {isBalanced && (
                                    <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-sm">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Perfecto
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </ScrollArea>
                  </div>

                  {/* Vista desktop - Tabla */}
                  <div className="hidden md:block">
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-2">
                            <TableHead className="font-bold">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                Fecha
                              </div>
                            </TableHead>
                            <TableHead className="font-bold">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                Ventas
                              </div>
                            </TableHead>
                            <TableHead className="font-bold">
                              <div className="flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                Efectivo Esp.
                              </div>
                            </TableHead>
                            <TableHead className="font-bold">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                Efectivo Real
                              </div>
                            </TableHead>
                            <TableHead className="font-bold">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                Resultado
                              </div>
                            </TableHead>
                            <TableHead className="font-bold">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                Creado Por
                              </div>
                            </TableHead>
                            <TableHead className="text-right font-bold">
                              <div className="flex items-center justify-end gap-2">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                Acciones
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reconciliations.map((rec) => {
                            const surplus = parseFloat(rec.surplus);
                            const shortage = parseFloat(rec.shortage);
                            const isBalanced = surplus === 0 && shortage === 0;
                            
                            return (
                              <TableRow 
                                key={rec.id} 
                                data-testid={`row-reconciliation-${rec.id}`}
                                className={cn(
                                  "hover:bg-muted/50 transition-colors",
                                  isBalanced && "bg-emerald-50/30 dark:bg-emerald-950/10 border-l-4 border-l-emerald-500",
                                  surplus > 0 && "bg-green-50/30 dark:bg-green-950/10 border-l-4 border-l-green-500",
                                  shortage > 0 && "bg-red-50/30 dark:bg-red-950/10 border-l-4 border-l-red-500"
                                )}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "p-1.5 rounded-md",
                                      isBalanced && "bg-emerald-100 dark:bg-emerald-900",
                                      surplus > 0 && "bg-green-100 dark:bg-green-900",
                                      shortage > 0 && "bg-red-100 dark:bg-red-900"
                                    )}>
                                      <Calendar className={cn(
                                        "h-3.5 w-3.5",
                                        isBalanced && "text-emerald-600 dark:text-emerald-400",
                                        surplus > 0 && "text-green-600 dark:text-green-400",
                                        shortage > 0 && "text-red-600 dark:text-red-400"
                                      )} />
                                    </div>
                                    {formatDateRD(new Date(rec.reconciliationDate))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                                    ${parseFloat(rec.totalSales).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                                    ${parseFloat(rec.expectedCash).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-semibold text-purple-700 dark:text-purple-400">
                                    ${parseFloat(rec.actualCash).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {surplus > 0 && (
                                    <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-sm">
                                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                                      +${surplus.toFixed(2)}
                                    </Badge>
                                  )}
                                  {shortage > 0 && (
                                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm">
                                      <ArrowDownCircle className="h-3 w-3 mr-1" />
                                      -${shortage.toFixed(2)}
                                    </Badge>
                                  )}
                                  {isBalanced && (
                                    <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-sm">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Perfecto
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 rounded-full bg-muted">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    {rec.userName || "N/A"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => viewReconciliationDetails(rec)}
                                    data-testid={`button-view-${rec.id}`}
                                    className="hover:bg-primary/10 hover:text-primary"
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
                  </div>
                </>
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
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="col-span-1 sm:col-span-2 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-blue-600" />
                    Agua Perdida
                  </Label>
                  <p className="font-semibold">
                    {parseInt(selectedReconciliation.lostWaterGallons)} gal 
                    (${parseFloat(selectedReconciliation.lostWaterValue).toFixed(2)})
                  </p>
                </div>
                <div className="col-span-1 sm:col-span-2 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-900">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-green-600" />
                    Agua Donada
                  </Label>
                  <p className="font-semibold text-green-600">
                    {parseInt(selectedReconciliation.donatedWaterGallons || "0")} gal 
                    (${parseFloat(selectedReconciliation.donatedWaterValue || "0").toFixed(2)})
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
