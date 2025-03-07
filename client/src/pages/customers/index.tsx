import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type Customer, insertCustomerSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Eye } from "lucide-react";

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);

  // Fetch provinces
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
  });

  // Fetch municipalities when province is selected
  const { data: municipalities = [], isLoading: isLoadingMunicipalities } = useQuery({
    queryKey: ["/api/municipalities", selectedProvinceId],
    queryFn: async () => {
      if (!selectedProvinceId) return [];
      const response = await apiRequest("GET", `/api/municipalities/${selectedProvinceId}`);
      return response.json();
    },
    enabled: !!selectedProvinceId,
  });

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  type CustomerFormData = z.infer<typeof insertCustomerSchema>;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      businessName: "",
      managerName: "",
      phone: "",
      street: "",
      streetNumber: "",
      country: "República Dominicana",
      reference: "",
      creditLimit: "0.00",
      provinceId: undefined,
      municipalityId: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: t("success"),
        description: t("customerCreated"),
      });
      form.reset();
      setIsDialogOpen(false);
      setSelectedProvinceId(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("customers")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("newCustomer")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("newCustomer")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("logo")}</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/*" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("businessName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("managerName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("phone")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("street")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("number")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="provinceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("province")}</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          setSelectedProvinceId(parseInt(value));
                        }}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectProvince")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {provinces.map((province: any) => (
                            <SelectItem key={province.id} value={province.id.toString()}>
                              {province.name}
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
                  name="municipalityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("municipality")}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                        disabled={!selectedProvinceId || isLoadingMunicipalities}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectMunicipality")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {municipalities.map((municipality: any) => (
                            <SelectItem
                              key={municipality.id}
                              value={municipality.id.toString()}
                            >
                              {municipality.name}
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
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("reference")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("creditLimit")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(value.toFixed(2));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? t("saving") : t("save")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre del Negocio</TableHead>
            <TableHead>Nombre del Encargado</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>Límite de Crédito</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.businessName}</TableCell>
              <TableCell>{customer.managerName}</TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>
                {`${customer.street} #${customer.streetNumber}, ${customer.municipalityName}, ${customer.provinceName}`}
              </TableCell>
              <TableCell>
                RD$ {parseFloat(customer.creditLimit.toString()).toFixed(2)}
              </TableCell>
              <TableCell>
                RD$ {parseFloat(customer.balance.toString()).toFixed(2)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // TODO: Implement view customer details
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}