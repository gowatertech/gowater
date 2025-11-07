import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toRD, formatDateRD, parseDateStringRD, formatDateTimeRD } from "@/lib/date-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PrinterService } from "@/services/PrinterService";
import { useLocation } from "wouter";

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
  Printer,
  Download,
  Info,
  ShoppingCart,
  ArrowLeft,
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
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("new");
  const [selectedDate, setSelectedDate] = useState<string>(format(toRD(new Date()), "yyyy-MM-dd"));
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

  // Obtener configuración de la empresa
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/company/settings"],
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
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-reconciliation"] });
      resetForm();
      setActiveTab("history");
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
        duration: 3000,
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
  
  // En modo edición, usar valores originales; en modo creación, usar dailySummary
  const reconciliationData = isEditMode && existenceCheck?.reconciliation 
    ? existenceCheck.reconciliation 
    : null;
  
  // Agua donada (desde el cuadre existente o calculada desde el backend)
  const donatedWaterGallons = parseFloat(reconciliationData?.donatedWaterGallons || dailySummary?.donatedWaterGallons || "0");
  const donatedWaterValue = parseFloat(reconciliationData?.donatedWaterValue || dailySummary?.donatedWaterValue || "0");
  
  const cashInvoicesTotal = parseFloat(reconciliationData?.cashInvoicesTotal || dailySummary?.cashInvoicesTotal || "0");
  const receiptsTotal = parseFloat(reconciliationData?.receiptsTotal || dailySummary?.receiptsTotal || "0");
  const advancesTotal = parseFloat(reconciliationData?.advancesTotal || dailySummary?.advancesTotal || "0");
  
  // Nueva fórmula: Efectivo Esperado = Inicial + RI + ANT (sin incluir FT)
  const initialCashValue = parseFloat(initialCash) || 0;
  const expectedCash = initialCashValue + receiptsTotal + advancesTotal;
  
  const actualCashValue = parseFloat(actualCash);
  const difference = actualCashValue - expectedCash;
  const surplus = difference > 0 ? difference : 0;
  const shortage = difference < 0 ? Math.abs(difference) : 0;

  const resetForm = () => {
    setSelectedDate(format(toRD(new Date()), "yyyy-MM-dd"));
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
      setInitialCash((parseFloat(rec.initialCash) || 0).toFixed(2));
      setActualCash((parseFloat(rec.actualCash) || 0).toFixed(2));
      setLostWaterGallons((parseInt(rec.lostWaterGallons) || 0).toString());
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
    if (!dailySummary && !isEditMode) {
      toast({
        title: "Error",
        description: "Primero selecciona una fecha válida",
        variant: "destructive",
      });
      return;
    }

    // En modo edición, usar los valores originales del cuadre existente
    // En modo creación, usar el resumen diario
    const reconciliationToUse = isEditMode && existenceCheck?.reconciliation 
      ? existenceCheck.reconciliation 
      : null;

    const data = {
      reconciliationDate: selectedDate,
      // Conservar valores originales en modo edición
      totalSales: reconciliationToUse?.totalSales || dailySummary?.totalSales || "0.00",
      creditInvoicesTotal: reconciliationToUse?.creditInvoicesTotal || dailySummary?.creditInvoicesTotal || "0.00",
      cashInvoicesTotal: reconciliationToUse?.cashInvoicesTotal || dailySummary?.cashInvoicesTotal || "0.00",
      totalPayments: reconciliationToUse?.totalPayments || dailySummary?.totalPayments || "0.00",
      receiptsTotal: reconciliationToUse?.receiptsTotal || dailySummary?.receiptsTotal || "0.00",
      advancesTotal: reconciliationToUse?.advancesTotal || dailySummary?.advancesTotal || "0.00",
      initialCash: parseFloat(initialCash).toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      actualCash: parseFloat(actualCash).toFixed(2),
      lostWaterGallons: parseInt(lostWaterGallons || "0").toString(),
      waterPricePerGallon: waterPricePerGallon.toFixed(2),
      lostWaterValue: lostWaterValue.toFixed(2),
      donatedWaterGallons: reconciliationToUse?.donatedWaterGallons || donatedWaterGallons.toFixed(2),
      donatedWaterValue: reconciliationToUse?.donatedWaterValue || donatedWaterValue.toFixed(2),
      surplus: surplus.toFixed(2),
      shortage: shortage.toFixed(2),
      notes: notes.trim() || undefined,
    };

    // Log para depuración
    console.log("💰 CUADRE DE CAJA - Valores calculados:", {
      initialCash,
      initialCashValue,
      receiptsTotal,
      advancesTotal,
      expectedCash,
      dataToSend: {
        initialCash: data.initialCash,
        expectedCash: data.expectedCash,
      }
    });

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

  // Funciones de impresión
  const handlePrintReconciliation = async (reconciliation: CashReconciliation) => {
    try {
      await PrinterService.printCashReconciliation(reconciliation, settings);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo imprimir el cuadre",
      });
    }
  };

  const handleGeneratePDF = async (reconciliation: CashReconciliation) => {
    try {
      await PrinterService.generateCashReconciliationPDF(reconciliation, settings);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
      });
    }
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
        <Button
          variant="outline"
          onClick={() => setLocation("/billing")}
          className="flex items-center gap-2"
          data-testid="button-back-to-billing"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
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
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
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

          {/* Resumen de ventas - Solo mostrar si no existe cuadre o está en modo edición */}
          {(!existenceCheck?.exists || isEditMode) && (
            <>
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
            </>
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
                  {/* Vista móvil - Lista compacta */}
                  <div className="md:hidden space-y-2">
                    <ScrollArea className="h-[600px]">
                      {reconciliations.map((rec) => {
                        const surplus = parseFloat(rec.surplus);
                        const shortage = parseFloat(rec.shortage);
                        const isBalanced = surplus === 0 && shortage === 0;
                        
                        return (
                          <div 
                            key={rec.id} 
                            className={cn(
                              "p-3 rounded-lg border-l-4 mb-2 hover:bg-muted/50 transition-colors",
                              isBalanced && "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10",
                              surplus > 0 && "border-l-green-500 bg-green-50/30 dark:bg-green-950/10",
                              shortage > 0 && "border-l-red-500 bg-red-50/30 dark:bg-red-950/10"
                            )}
                            data-testid={`card-reconciliation-${rec.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">
                                  {formatDateTimeRD(rec.reconciliationDate, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {rec.userName || "N/A"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {surplus > 0 && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    +${surplus.toFixed(2)}
                                  </Badge>
                                )}
                                {shortage > 0 && (
                                  <Badge variant="outline" className="text-red-600 border-red-600">
                                    -${shortage.toFixed(2)}
                                  </Badge>
                                )}
                                {isBalanced && (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                    ✓
                                  </Badge>
                                )}
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
                            </div>
                          </div>
                        );
                      })}
                    </ScrollArea>
                  </div>

                  {/* Vista desktop - Tabla compacta */}
                  <div className="hidden md:block">
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Fecha
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Resultado
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Usuario
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
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
                                  {formatDateTimeRD(rec.reconciliationDate, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </TableCell>
                                <TableCell>
                                  {surplus > 0 && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      +${surplus.toFixed(2)}
                                    </Badge>
                                  )}
                                  {shortage > 0 && (
                                    <Badge variant="outline" className="text-red-600 border-red-600">
                                      -${shortage.toFixed(2)}
                                    </Badge>
                                  )}
                                  {isBalanced && (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                      Perfecto
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {rec.userName || "N/A"}
                                </TableCell>
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

      {/* Dialog de detalles moderno */}
      <AlertDialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span>Detalles del Cuadre</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReconciliation && handlePrintReconciliation(selectedReconciliation)}
                  disabled={!selectedReconciliation}
                  data-testid="button-print-reconciliation"
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReconciliation && handleGeneratePDF(selectedReconciliation)}
                  disabled={!selectedReconciliation}
                  data-testid="button-download-pdf"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {selectedReconciliation && formatDateTimeRD(selectedReconciliation.reconciliationDate, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
              <span className="text-muted-foreground">•</span>
              <User className="h-4 w-4" />
              {selectedReconciliation?.userName || "N/A"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedReconciliation && (() => {
            const surplus = parseFloat(selectedReconciliation.surplus);
            const shortage = parseFloat(selectedReconciliation.shortage);
            const isBalanced = surplus === 0 && shortage === 0;
            
            return (
              <div className="space-y-6">
                {/* Resultado destacado */}
                <div className={cn(
                  "p-6 rounded-xl border-2",
                  isBalanced && "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-500",
                  surplus > 0 && "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-500",
                  shortage > 0 && "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-500"
                )}>
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      {isBalanced && <CheckCircle2 className="h-8 w-8 text-emerald-600" />}
                      {surplus > 0 && <TrendingUp className="h-8 w-8 text-green-600" />}
                      {shortage > 0 && <TrendingDown className="h-8 w-8 text-red-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Resultado del Cuadre</p>
                      {isBalanced && (
                        <>
                          <p className="text-3xl font-bold text-emerald-600">Cuadre Perfecto</p>
                          <p className="text-lg text-emerald-600 mt-1">$0.00</p>
                        </>
                      )}
                      {surplus > 0 && (
                        <>
                          <p className="text-3xl font-bold text-green-600">Sobrante</p>
                          <p className="text-lg text-green-600 mt-1">+${surplus.toFixed(2)}</p>
                        </>
                      )}
                      {shortage > 0 && (
                        <>
                          <p className="text-3xl font-bold text-red-600">Faltante</p>
                          <p className="text-lg text-red-600 mt-1">-${shortage.toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumen de Ventas */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-4 text-blue-700 dark:text-blue-400">
                    <ShoppingCart className="h-5 w-5" />
                    Resumen de Ventas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <Label className="text-xs text-muted-foreground">Total Ventas</Label>
                      </div>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        ${parseFloat(selectedReconciliation.totalSales).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-amber-600" />
                        <Label className="text-xs text-muted-foreground">FT Crédito</Label>
                      </div>
                      <p className="text-xl font-semibold text-amber-700 dark:text-amber-400">
                        ${parseFloat(selectedReconciliation.creditInvoicesTotal).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Banknote className="h-4 w-4 text-green-600" />
                        <Label className="text-xs text-muted-foreground">FT Efectivo</Label>
                      </div>
                      <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                        ${parseFloat(selectedReconciliation.cashInvoicesTotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pagos Recibidos */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 p-5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-4 text-purple-700 dark:text-purple-400">
                    <Wallet className="h-5 w-5" />
                    Pagos Recibidos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <Label className="text-xs text-muted-foreground">Total Pagos</Label>
                      </div>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                        ${parseFloat(selectedReconciliation.totalPayments).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="h-4 w-4 text-indigo-600" />
                        <Label className="text-xs text-muted-foreground">Recibos (RI)</Label>
                      </div>
                      <p className="text-xl font-semibold text-indigo-700 dark:text-indigo-400">
                        ${parseFloat(selectedReconciliation.receiptsTotal).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-cyan-600" />
                        <Label className="text-xs text-muted-foreground">Anticipos (ANT)</Label>
                      </div>
                      <p className="text-xl font-semibold text-cyan-700 dark:text-cyan-400">
                        ${parseFloat(selectedReconciliation.advancesTotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cuadre de Efectivo */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 p-5 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-4 text-amber-700 dark:text-amber-400">
                    <Calculator className="h-5 w-5" />
                    Cuadre de Efectivo
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Banknote className="h-4 w-4 text-amber-600" />
                        <Label className="text-xs text-muted-foreground">Efectivo Inicial</Label>
                      </div>
                      <p className="text-xl font-semibold text-amber-700 dark:text-amber-400">
                        ${parseFloat(selectedReconciliation.initialCash).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="h-4 w-4 text-orange-600" />
                        <Label className="text-xs text-muted-foreground">Efectivo Esperado</Label>
                      </div>
                      <p className="text-xl font-semibold text-orange-700 dark:text-orange-400">
                        ${parseFloat(selectedReconciliation.expectedCash).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-950/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-green-600" />
                        <Label className="text-xs text-muted-foreground">Efectivo Real</Label>
                      </div>
                      <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                        ${parseFloat(selectedReconciliation.actualCash).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agua Perdida y Donada */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/20 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800">
                        <Droplet className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300">Agua Perdida</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                        {parseInt(selectedReconciliation.lostWaterGallons || "0")} gal
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valor: ${parseFloat(selectedReconciliation.lostWaterValue || "0").toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/20 p-5 rounded-xl border border-teal-200 dark:border-teal-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-teal-200 dark:bg-teal-800">
                        <Droplet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <h4 className="font-semibold text-teal-700 dark:text-teal-300">Agua Donada</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                        {parseInt(selectedReconciliation.donatedWaterGallons || "0")} gal
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valor: ${parseFloat(selectedReconciliation.donatedWaterValue || "0").toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notas */}
                {selectedReconciliation.notes && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800">
                        <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">Notas</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedReconciliation.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-close-detail-dialog">Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
