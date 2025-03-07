import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type Customer, insertCustomerSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

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
import { PlusCircle, Pencil, Trash } from "lucide-react";

interface City {
  id: number;
  name: string;
  code: string;
  type: 'city' | 'municipality';
  provinceId: number;
  municipality_id?: number;
}

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  // Obtener provincias
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
  });

  // Obtener ciudades y municipios cuando se selecciona una provincia
  const { data: cities = [], isLoading: isLoadingCities } = useQuery<City[]>({
    queryKey: ["/api/cities", selectedProvinceId],
    queryFn: async () => {
      if (!selectedProvinceId) return [];
      try {
        const response = await apiRequest("GET", `/api/cities/${selectedProvinceId}`);
        if (!response.ok) {
          throw new Error(`Error fetching cities: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error("Error loading cities:", error);
        toast({
          variant: "destructive",
          title: t("error"),
          description: "Error al cargar las ciudades y municipios"
        });
        return [];
      }
    },
    enabled: !!selectedProvinceId,
  });


  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  type CustomerFormData = z.infer<typeof insertCustomerSchema>;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      street: "",
      houseNumber: "",
      phone: "",
      sectorId: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      console.log("Enviando datos:", data); // Para debug
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
      setSelectedMunicipalityId(null);
      setSelectedCityId(null);
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

  // Filtrar municipios y distritos
  const municipalities = cities.filter(city =>
    city.code.endsWith('-M') &&
    city.provinceId === selectedProvinceId
  );

  const districts = cities.filter(city => {
    if (!selectedMunicipalityId) return false;
    const municipalityCode = municipalities.find(m => m.id === selectedMunicipalityId)?.code;
    if (!municipalityCode) return false;
    return city.code.endsWith('-C') && city.code.startsWith(municipalityCode.slice(0, -2));
  });

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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("name")}</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("businessName")}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} className="h-8" />
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
                            <Input {...field} className="h-8" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("email")}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} value={field.value || ''} className="h-8" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3 border rounded-md p-3">
                  <h3 className="text-sm font-medium">{t("address")}</h3>
                  <div className="grid gap-3">
                    <FormItem>
                      <FormLabel>{t("province")}</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const numValue = parseInt(value);
                          console.log("Provincia seleccionada:", numValue);
                          setSelectedProvinceId(numValue);
                          setSelectedMunicipalityId(null);
                          setSelectedCityId(null);
                          form.setValue("sectorId", undefined);
                        }}
                        value={selectedProvinceId?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectProvince")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {provinces?.map((province: any) => (
                            <SelectItem key={province.id} value={province.id.toString()}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>

                    <FormItem>
                      <FormLabel>{t("municipality")}</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const numValue = parseInt(value);
                          console.log("Municipio seleccionado:", numValue);
                          setSelectedMunicipalityId(numValue);
                          setSelectedCityId(null);
                          form.setValue("sectorId", undefined);
                        }}
                        value={selectedMunicipalityId?.toString()}
                        disabled={!selectedProvinceId || isLoadingCities}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectMunicipality")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {municipalities.map((city) => (
                            <SelectItem key={city.id} value={city.id.toString()}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>

                    <FormItem>
                      <FormLabel>{t("districtMunicipality")}</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const numValue = parseInt(value);
                          console.log("Distrito Municipal seleccionado:", numValue);
                          setSelectedCityId(numValue);
                          form.setValue("cityId", numValue);
                        }}
                        value={selectedCityId?.toString()}
                        disabled={!selectedMunicipalityId || isLoadingCities}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectDistrict")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {districts.map((city) => (
                            <SelectItem key={city.id} value={city.id.toString()}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>


                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("street")}</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="houseNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("houseNumber")}</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-8"
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
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("businessName")}</TableHead>
            <TableHead>{t("email")}</TableHead>
            <TableHead>{t("address")}</TableHead>
            <TableHead>{t("phone")}</TableHead>
            <TableHead>{t("balance")}</TableHead>
            <TableHead>{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.businessName}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>
                {`${customer.street} #${customer.houseNumber}`}
              </TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>RD$ {parseFloat(customer.balance.toString()).toFixed(2)}</TableCell>
              <TableCell className="space-x-2">
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}