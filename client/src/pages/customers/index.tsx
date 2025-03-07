import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type Customer, type Province, type Municipality, type Zone, insertCustomerSchema } from "@shared/schema";
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

type CustomerFormData = z.infer<typeof insertCustomerSchema>;

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);

  // Obtener provincias
  const { data: provinces = [] } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
  });

  // Obtener municipios cuando se selecciona una provincia
  const { data: municipalities = [], isLoading: isLoadingMunicipalities } = useQuery<Municipality[]>({
    queryKey: ["/api/municipalities", selectedProvinceId],
    queryFn: async () => {
      if (!selectedProvinceId) return [];
      const response = await apiRequest("GET", `/api/municipalities/${selectedProvinceId}`);
      return response.json();
    },
    enabled: !!selectedProvinceId,
  });

  // Obtener zonas
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });


  // Obtener clientes
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      logo: "",
      rnc: "",
      businessname: "",
      managername: "",
      phone: "",
      email: "",
      zoneid: undefined,
      street: "",
      streetnumber: "",
      provinceid: undefined,
      municipalityid: undefined,
      reference: "",
      creditlimit: "0.00",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (data.logo instanceof File) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'logo' && value instanceof File) {
              formData.append(key, value);
            } else {
              formData.append(key, String(value));
            }
          }
        });
        const res = await apiRequest("POST", "/api/customers", formData);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/customers", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      });
      form.reset();
      setIsDialogOpen(false);
      setSelectedProvinceId(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Logo</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                              }
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rnc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RNC</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Negocio</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Encargado</FormLabel>
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
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zoneid"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Zona</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una zona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zones.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id.toString()}>
                                {zone.name}
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
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calle</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetnumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="provinceid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(parseInt(value));
                            setSelectedProvinceId(parseInt(value));
                          }}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una provincia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {provinces.map((province) => (
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
                    name="municipalityid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Municipio</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          disabled={!selectedProvinceId || isLoadingMunicipalities}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un municipio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {municipalities.map((municipality) => (
                              <SelectItem key={municipality.id} value={municipality.id.toString()}>
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
                      <FormItem className="md:col-span-2">
                        <FormLabel>Referencia</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creditlimit"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Límite de Crédito</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="\d*\.?\d{0,2}"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              const parts = value.split('.');
                              if (parts.length > 2) return;
                              if (parts[1]?.length > 2) return;
                              field.onChange(value);
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value || '0');
                              field.onChange(value.toFixed(2));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Negocio</TableHead>
              <TableHead>RNC</TableHead>
              <TableHead>Impuestos</TableHead>
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
                <TableCell>{customer.businessname}</TableCell>
                <TableCell>{customer.rnc}</TableCell>
                <TableCell>{customer.tax}</TableCell>
                <TableCell>{customer.managername}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  {`${customer.street} #${customer.streetnumber}, ${customer.municipalityName}, ${customer.provinceName}`}
                </TableCell>
                <TableCell>
                  RD$ {parseFloat(customer.creditlimit.toString()).toFixed(2)}
                </TableCell>
                <TableCell>
                  RD$ {parseFloat(customer.balance.toString()).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // TODO: Implementar ver detalles del cliente
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
    </div>
  );
}