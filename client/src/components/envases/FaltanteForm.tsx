import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
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

interface FaltanteFormProps {
  onCreated?: () => void;
}

export default function FaltanteForm({ onCreated }: FaltanteFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Consulta para obtener clientes
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Consulta para obtener productos
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
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
    },
  });

  const createFaltanteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/envases/faltantes", {
        ...data,
        customerId: Number(data.customerId),
        productId: Number(data.productId),
        expectedQuantity: Number(data.expectedQuantity),
        returnedQuantity: Number(data.returnedQuantity),
        pendingQuantity: Number(data.expectedQuantity) - Number(data.returnedQuantity),
        returnDate: new Date(data.returnDate),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al registrar faltante');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envases/faltantes"] });
      toast({
        description: t("Faltante registrado correctamente"),
      });
      form.reset();
      onCreated?.();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await createFaltanteMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error al enviar formulario:", error);
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
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
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
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
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

        <Button
          type="submit"
          className="w-full"
          disabled={createFaltanteMutation.isPending}
        >
          {createFaltanteMutation.isPending ? t("Guardando...") : t("Registrar Faltante")}
        </Button>
      </form>
    </Form>
  );
}
