import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FaltanteProps {
  onCreated?: () => void;
}

export default function Faltante({ onCreated }: FaltanteProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      if (!response.ok) {
        throw new Error("Error al obtener clientes");
      }
      return response.json();
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      if (!response.ok) {
        throw new Error("Error al obtener productos");
      }
      return response.json();
    }
  });

  const form = useForm({
    defaultValues: {
      customerId: "",
      productId: "",
      expectedQuantity: 0,
      returnedQuantity: 0,
      pendingQuantity: 0,
      returnDate: new Date().toISOString().split('T')[0],
      notes: "",
      chargeType: "direct", // direct, commission
      commissionPercentage: 0,
      commissionAmount: 0,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const pendingQuantity = Number(data.expectedQuantity) - Number(data.returnedQuantity);
      const commissionAmount = data.chargeType === "commission" 
        ? (pendingQuantity * Number(data.commissionPercentage)) / 100 
        : 0;

      const response = await apiRequest("POST", "/api/envases/faltantes", {
        ...data,
        customerId: Number(data.customerId),
        productId: Number(data.productId),
        expectedQuantity: Number(data.expectedQuantity),
        returnedQuantity: Number(data.returnedQuantity),
        pendingQuantity,
        commissionPercentage: Number(data.commissionPercentage),
        commissionAmount,
        returnDate: new Date(data.returnDate),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al registrar faltante');
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/envases/faltantes"] });
      toast({
        description: t("Faltante registrado correctamente"),
      });
      form.reset();
      onCreated?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: error.message,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Cliente")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Seleccionar cliente")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.businessname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Producto")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Seleccionar producto")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expectedQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Cantidad Esperada")}</FormLabel>
              <FormControl>
                <Input type="number" {...field} min="0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="returnedQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Cantidad Devuelta")}</FormLabel>
              <FormControl>
                <Input type="number" {...field} min="0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chargeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Tipo de Cargo")}</FormLabel>
              <FormControl>
                <RadioGroup 
                  defaultValue={field.value} 
                  onValueChange={field.onChange}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direct" id="direct" />
                    <Label htmlFor="direct">{t("Cargo Directo")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="commission" id="commission" />
                    <Label htmlFor="commission">{t("Comisión")}</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("chargeType") === "commission" && (
          <FormField
            control={form.control}
            name="commissionPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Porcentaje de Comisión")}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    min="0" 
                    max="100" 
                    step="0.01"
                    onChange={(e) => {
                      field.onChange(e);
                      const pendingQuantity = Number(form.getValues("expectedQuantity")) - Number(form.getValues("returnedQuantity"));
                      const commissionAmount = (pendingQuantity * Number(e.target.value)) / 100;
                      form.setValue("commissionAmount", commissionAmount);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="returnDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Fecha de Devolución")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Notas")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("Agregar notas adicionales")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {t("Registrar Faltante")}
        </Button>
      </form>
    </Form>
  );
}