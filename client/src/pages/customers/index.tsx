import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type CustomerWithDetails, type Province, type Municipality, type Zone, insertCustomerSchema } from "@shared/schema";
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
import { PlusCircle, Eye, Edit, Save } from "lucide-react";

type CustomerFormData = z.infer<typeof insertCustomerSchema>;

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
  const { data: customers = [], isLoading } = useQuery<CustomerWithDetails[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      logo: undefined,
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
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      console.log("Submitting form data:", data);
      const formData = new FormData();

      // Manejar cada campo, incluyendo el archivo del logo
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          if (key === 'logo' && value instanceof File) {
            formData.append('logo', value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const res = await fetch('/api/customers', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Error al crear el cliente');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      });
      form.reset({
        logo: undefined,
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
      });
      setIsDialogOpen(false);
      setSelectedProvinceId(null);
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData & { id: number }) => {
      const formData = new FormData();

      console.log("Inicio de actualización:", { data });

      // Agregar todos los campos excepto logo
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'logo' && value !== undefined && value !== null) {
          formData.append(key, String(value));
          console.log(`Añadiendo campo ${key}:`, value);
        }
      });

      // Manejar el logo separadamente
      if (data.logo instanceof File) {
        console.log("Añadiendo archivo logo:", {
          name: data.logo.name,
          size: data.logo.size,
          type: data.logo.type
        });
        formData.append('logo', data.logo);
      } else if (typeof data.logo === 'string') {
        console.log("Manteniendo logo existente");
      }

      console.log("FormData preparado:",
        Array.from(formData.entries()).map(([key, value]) =>
          `${key}: ${value instanceof File ? `File(${value.name})` : value}`
        )
      );

      const response = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar el cliente');
      }

      const result = await response.json();
      console.log("Respuesta del servidor:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Éxito",
        description: "Cliente actualizado correctamente",
      });
      setIsEditing(false);
      setIsViewDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error al actualizar:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      console.log("Formulario enviado con datos:", data);
      if (isEditing && selectedCustomer) {
        await updateMutation.mutateAsync({ ...data, id: selectedCustomer.id });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error en el envío del formulario:", error);
    }
  };

  const handleViewCustomer = (customer: CustomerWithDetails) => {
    setSelectedCustomer(customer);
    setSelectedProvinceId(customer.provinceid);
    setIsEditing(false);
    form.reset({
      ...customer,
      creditlimit: customer.creditlimit.toString()
    });
    setIsViewDialogOpen(true);
  };

  const handleEditClick = () => {
    setIsEditing(true);
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
                      <FormItem>
                        <FormLabel>Logo (JPG/PNG, máx. 5MB)</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validar el tamaño (5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "El archivo debe ser menor a 5MB",
                                  });
                                  e.target.value = '';
                                  return;
                                }

                                // Validar el tipo
                                if (!['image/jpeg', 'image/png'].includes(file.type)) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "El archivo debe ser JPG o PNG",
                                  });
                                  e.target.value = '';
                                  return;
                                }

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
                      <FormItem>
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
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.]/g, '');
                              const parts = value.split('.');
                              if (parts.length > 2) return;
                              if (parts[1]?.length > 2) return;
                              field.onChange(value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value || '0';
                              const number = parseFloat(value);
                              if (!isNaN(number)) {
                                field.onChange(number.toFixed(2));
                              }
                            }}
                            defaultValue="0.00"
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

      {/* Dialog para ver/editar cliente */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>{isEditing ? 'Editar Cliente' : 'Ver Cliente'}</DialogTitle>
            {!isEditing && (
              <Button onClick={handleEditClick} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <div className="grid md:grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {/* Mostrar logo actual o placeholder */}
                          {typeof value === 'string' ? (
                            <img
                              src={`data:image/jpeg;base64,${value}`}
                              alt="Logo"
                              className="w-32 h-32 object-contain"
                            />
                          ) : (
                            <div className="w-32 h-32 bg-gray-100 flex items-center justify-center">
                              No logo
                            </div>
                          )}

                          {/* Input para actualizar logo */}
                          {isEditing && (
                            <Input
                              type="file"
                              accept="image/jpeg,image/png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  console.log("Archivo seleccionado:", {
                                    name: file.name,
                                    size: file.size,
                                    type: file.type
                                  });

                                  // Validar el tamaño (5MB)
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "El archivo debe ser menor a 5MB",
                                    });
                                    e.target.value = '';
                                    return;
                                  }

                                  // Validar el tipo
                                  if (!['image/jpeg', 'image/png'].includes(file.type)) {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "El archivo debe ser JPG o PNG",
                                    });
                                    e.target.value = '';
                                    return;
                                  }

                                  onChange(file);
                                }
                              }}
                              disabled={!isEditing}
                              {...field}
                            />
                          )}
                        </div>
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
                        <Input {...field} readOnly={!isEditing} />
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
                        <Input {...field} readOnly={!isEditing} />
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
                        <Input {...field} readOnly={!isEditing} />
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
                        <Input {...field} readOnly={!isEditing} />
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
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
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
                        <Input {...field} readOnly={!isEditing} />
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
                        <Input {...field} readOnly={!isEditing} />
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
                      {isEditing ? (
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
                      ) : (
                        <FormControl>
                          <Input value={selectedCustomer?.provinceName || ''} readOnly />
                        </FormControl>
                      )}
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
                      {isEditing ? (
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
                      ) : (
                        <FormControl>
                          <Input value={selectedCustomer?.municipalityName || ''} readOnly />
                        </FormControl>
                      )}
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
                        <Input {...field} readOnly={!isEditing} />
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
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d.]/g, '');
                            const parts = value.split('.');
                            if (parts.length > 2) return;
                            if (parts[1]?.length > 2) return;
                            field.onChange(value);
                          }}
                          onBlur={(e) => {
                            const value = e.target.value || '0';
                            const number = parseFloat(value);
                            if (!isNaN(number)) {
                              field.onChange(number.toFixed(2));
                            }
                          }}
                          readOnly={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {isEditing && (
                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Nombre del Negocio</TableHead>
              <TableHead>RNC</TableHead>
              <TableHead>Nombre del Encargado</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Límite de Crédito</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  {customer.logo ? (
                    <img
                      src={`data:image/jpeg;base64,${customer.logo}`}
                      alt="Logo"
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-gray-400">
                      No logo
                    </div>
                  )}
                </TableCell>
                <TableCell>{customer.businessname}</TableCell>
                <TableCell>{customer.rnc || '-'}</TableCell>
                <TableCell>{customer.managername}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  {`${customer.street} #${customer.streetnumber}, ${customer.municipalityName || ''}, ${customer.provinceName || ''}`}
                </TableCell>
                <TableCell>
                  RD$ {parseFloat(customer.creditlimit.toString()).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewCustomer(customer)}
                    className="text-blue-500 hover:text-blue-700"
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