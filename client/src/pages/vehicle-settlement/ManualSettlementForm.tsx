import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Truck, User as UserIcon, Calendar, DollarSign, CreditCard,
  Calculator, Coins, Receipt, FileText, Package, Plus, Trash2, AlertCircle
} from "lucide-react";
import type { Product, User, Truck as TruckType } from "@shared/schema";

const manualSettlementSchema = z.object({
  driverId: z.string().min(1, "Seleccione un conductor"),
  truckId: z.string().min(1, "Seleccione un vehículo"),
  date: z.string().min(1, "Seleccione una fecha"),
  initialCash: z.string().min(1, "Campo requerido"),
  totalCashReceived: z.string().min(1, "Campo requerido"),
  totalCreditReceived: z.string().min(1, "Campo requerido"),
  totalInvoiced: z.string().min(1, "Campo requerido"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Seleccione un producto"),
    loadedQuantity: z.number().min(0),
    returnedQuantity: z.number().min(0),
    soldQuantity: z.number().min(0),
    returnedContainers: z.number().min(0),
    notes: z.string().optional(),
  })),
});

type ManualSettlementFormValues = z.infer<typeof manualSettlementSchema>;

interface ManualSettlementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ManualSettlementForm({ onSuccess, onCancel }: ManualSettlementFormProps) {
  const { toast } = useToast();

  const { data: trucks = [] } = useQuery<TruckType[]>({ queryKey: ["/api/trucks"] });
  const { data: drivers = [] } = useQuery<User[]>({ queryKey: ["/api/users/drivers"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<ManualSettlementFormValues>({
    resolver: zodResolver(manualSettlementSchema),
    defaultValues: {
      driverId: "",
      truckId: "",
      date: today,
      initialCash: "0.00",
      totalCashReceived: "0.00",
      totalCreditReceived: "0.00",
      totalInvoiced: "0.00",
      notes: "",
      items: [],
    },
  });

  const items = form.watch("items");
  const totalCashReceived = form.watch("totalCashReceived");
  const totalCreditReceived = form.watch("totalCreditReceived");
  const initialCash = form.watch("initialCash");

  const totalInvoiced = (() => {
    const cash = parseFloat(totalCashReceived) || 0;
    const credit = parseFloat(totalCreditReceived) || 0;
    return (cash + credit).toFixed(2);
  })();

  useEffect(() => {
    form.setValue("totalInvoiced", totalInvoiced);
  }, [totalInvoiced, form]);

  const expectedCash = (() => {
    const initial = parseFloat(initialCash) || 0;
    const invoiced = parseFloat(totalInvoiced) || 0;
    const credit = parseFloat(totalCreditReceived) || 0;
    return (initial + (invoiced - credit)).toFixed(2);
  })();

  const cashDifference = (() => {
    const received = parseFloat(totalCashReceived) || 0;
    const initial = parseFloat(initialCash) || 0;
    const invoiced = parseFloat(totalInvoiced) || 0;
    const credit = parseFloat(totalCreditReceived) || 0;
    const expected = initial + (invoiced - credit);
    return (received - expected).toFixed(2);
  })();

  const addProductRow = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [
      ...currentItems,
      { productId: "", loadedQuantity: 0, returnedQuantity: 0, soldQuantity: 0, returnedContainers: 0, notes: "" },
    ]);
  };

  const removeProductRow = (index: number) => {
    const currentItems = form.getValues("items");
    form.setValue("items", currentItems.filter((_, i) => i !== index));
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ManualSettlementFormValues) => {
      const payload = {
        driverId: parseInt(data.driverId),
        truckId: parseInt(data.truckId),
        date: new Date(data.date).toISOString(),
        initialCash: parseFloat(data.initialCash).toFixed(2),
        totalCashReceived: parseFloat(data.totalCashReceived).toFixed(2),
        totalCreditReceived: parseFloat(data.totalCreditReceived).toFixed(2),
        totalInvoiced: parseFloat(data.totalInvoiced).toFixed(2),
        cashDifference,
        notes: data.notes || "",
        items: data.items.map(item => ({
          productId: parseInt(item.productId),
          loadedQuantity: item.loadedQuantity,
          returnedQuantity: item.returnedQuantity,
          soldQuantity: item.soldQuantity,
          returnedContainers: item.returnedContainers,
          notes: item.notes || "",
        })),
      };
      return await apiRequest("/api/route-settlements/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/route-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-loading/pending"] });
      toast({
        title: "Cuadre manual creado",
        description: "El cuadre de vehículo ha sido registrado exitosamente.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el cuadre manual.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ManualSettlementFormValues) => {
    mutate(data);
  };

  const formatDecimalOnBlur = (fieldName: any) => (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    const formatted = value ? (parseFloat(value) || 0).toFixed(2) : "0.00";
    form.setValue(fieldName, formatted);
  };

  const handleDecimalChange = (fieldName: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.]/g, '');
    const parts = value.split('.');
    const newValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
    form.setValue(fieldName, newValue);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="border rounded-lg p-4 bg-gray-50/50">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Datos del Vehículo y Conductor
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1">
                    <UserIcon className="h-3 w-3" /> Conductor
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar conductor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={String(driver.id)}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Vehículo
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar vehículo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trucks.map((truck) => (
                        <SelectItem key={truck.id} value={String(truck.id)}>
                          {truck.plate} {truck.brand ? `- ${truck.brand} ${truck.model || ''}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Fecha
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="bg-white" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialCash"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium flex items-center gap-1">
                    <Coins className="h-3 w-3" /> Efectivo Inicial (RD$)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="bg-white text-center font-medium"
                      value={field.value}
                      onBlur={formatDecimalOnBlur("initialCash")}
                      onChange={handleDecimalChange("initialCash")}
                      onFocus={(e) => { if (e.target.value === "0.00") form.setValue("initialCash", ""); }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Totales de Facturación
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="totalCashReceived"
              render={({ field }) => (
                <FormItem className="bg-white p-3 rounded-lg shadow-sm border">
                  <FormLabel className="text-xs font-semibold flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-green-600" />
                    Efectivo Recibido (RD$)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="text-center font-medium text-lg"
                      value={field.value}
                      onBlur={formatDecimalOnBlur("totalCashReceived")}
                      onChange={handleDecimalChange("totalCashReceived")}
                      onFocus={(e) => { if (e.target.value === "0.00") form.setValue("totalCashReceived", ""); }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalCreditReceived"
              render={({ field }) => (
                <FormItem className="bg-white p-3 rounded-lg shadow-sm border">
                  <FormLabel className="text-xs font-semibold flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                    Crédito Otorgado (RD$)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="text-center font-medium text-lg"
                      value={field.value}
                      onBlur={formatDecimalOnBlur("totalCreditReceived")}
                      onChange={handleDecimalChange("totalCreditReceived")}
                      onFocus={(e) => { if (e.target.value === "0.00") form.setValue("totalCreditReceived", ""); }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="bg-white p-3 rounded-lg shadow-sm border">
              <p className="text-xs font-semibold flex items-center gap-1 mb-2">
                <Receipt className="h-3.5 w-3.5 text-purple-600" />
                Total Facturado (RD$)
              </p>
              <p className="text-center font-bold text-lg text-purple-700">
                RD$ {totalInvoiced}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 text-center">Efectivo + Crédito (calculado)</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-medium">Efectivo Esperado</p>
              <p className="text-lg font-bold text-blue-800">RD$ {expectedCash}</p>
              <p className="text-[10px] text-blue-600">(Inicial + Ventas efectivo)</p>
            </div>
            <div className={`p-3 rounded-lg border ${
              parseFloat(cashDifference) < 0
                ? "bg-red-50 border-red-200"
                : parseFloat(cashDifference) > 0
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-green-50 border-green-200"
            }`}>
              <p className={`text-xs font-medium ${
                parseFloat(cashDifference) < 0 ? "text-red-700" : parseFloat(cashDifference) > 0 ? "text-yellow-700" : "text-green-700"
              }`}>Diferencia de Efectivo</p>
              <p className={`text-lg font-bold ${
                parseFloat(cashDifference) < 0 ? "text-red-800" : parseFloat(cashDifference) > 0 ? "text-yellow-800" : "text-green-800"
              }`}>RD$ {cashDifference}</p>
              <p className={`text-[10px] ${
                parseFloat(cashDifference) < 0 ? "text-red-600" : parseFloat(cashDifference) > 0 ? "text-yellow-600" : "text-green-600"
              }`}>(Recibido - Esperado)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-700 font-medium">Efectivo Inicial</p>
              <p className="text-lg font-bold text-gray-800">RD$ {parseFloat(initialCash || "0").toFixed(2)}</p>
              <p className="text-[10px] text-gray-600">Caja inicial del día</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Productos (opcional)
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={addProductRow} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Producto
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
              <Package className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No hay productos agregados</p>
              <p className="text-xs text-gray-400 mt-1">Puede agregar productos opcionalmente para detallar el cuadre</p>
              <Button type="button" variant="ghost" size="sm" onClick={addProductRow} className="mt-3 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Producto
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-white border rounded-lg p-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeProductRow(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="col-span-2 sm:col-span-3 lg:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Producto</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.loadedQuantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Cargado</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" className="text-center text-xs" {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.returnedQuantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Devuelto</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" className="text-center text-xs" {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.soldQuantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Vendido</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" className="text-center text-xs" {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.returnedContainers`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Env. Dev.</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" className="text-center text-xs" {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Notas y Comentarios
          </h3>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Añadir comentarios sobre el cuadre, justificaciones de diferencias, etc."
                    className="min-h-20 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Calculator className="h-4 w-4 mr-2" />
            Guardar Cuadre Manual
          </Button>
        </div>
      </form>
    </Form>
  );
}