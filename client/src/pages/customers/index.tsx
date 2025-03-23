import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCustomerSchema, CustomerWithDetails, Province, Municipality, Zone } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocationSelector } from "@/components/map/LocationSelector";

type CustomerFormData = z.infer<typeof insertCustomerSchema>;

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("list");
  const queryClient = useQueryClient();

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
      coordinates: "",
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
        coordinates: "",
        creditlimit: "0.00",
      });
      setActiveTab("list");
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
    
    // Prepara los datos para el formulario, convirtiendo null a undefined
    const formData = {
      businessname: customer.businessname,
      managername: customer.managername,
      phone: customer.phone,
      email: customer.email || undefined,
      rnc: customer.rnc || undefined,
      zoneid: customer.zoneid || undefined,
      street: customer.street,
      streetnumber: customer.streetnumber,
      provinceid: customer.provinceid,
      municipalityid: customer.municipalityid,
      reference: customer.reference || undefined,
      // La propiedad coordinates está garantizada porque se requiere al crear clientes
      coordinates: customer.street + ", " + customer.municipalityName,
      creditlimit: customer.creditlimit.toString(),
      logo: customer.logo || undefined
    };
    
    form.reset(formData);
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
        <Button onClick={() => setActiveTab("new")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Lista de Clientes</TabsTrigger>
          <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="border rounded-md p-2 sm:p-4">
          <Card>
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Logo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">RNC</TableHead>
                    <TableHead className="hidden md:table-cell">Encargado</TableHead>
                    <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden lg:table-cell">Dirección</TableHead>
                    <TableHead>Crédito</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers?.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="hidden sm:table-cell">
                        {customer.logo ? (
                          <img
                            src={`data:image/jpeg;base64,${customer.logo}`}
                            alt="Logo"
                            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            No logo
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{customer.businessname}</TableCell>
                      <TableCell className="hidden md:table-cell">{customer.rnc || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">{customer.managername}</TableCell>
                      <TableCell className="hidden sm:table-cell">{customer.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell">
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
          </Card>
        </TabsContent>
        
        <TabsContent value="new" className="border rounded-md p-2 sm:p-4">
          <Card className="p-2 sm:p-4">
            <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4">Nuevo Cliente</h2>
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
                          <Input {...field} value={field.value || ""} />
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
                          <Input type="email" {...field} value={field.value || ""} />
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
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="coordinates"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Ubicación en Mapa</FormLabel>
                        <FormControl>
                          <LocationSelector 
                            value={field.value || ""} 
                            onChange={field.onChange} 
                            initialCenter={[19.075380, -70.128822]} 
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground mt-1">
                          Mueva el marcador para seleccionar la ubicación exacta del cliente, o use la barra de búsqueda para encontrar una dirección
                        </div>
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
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para ver/editar cliente */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader className="flex flex-row justify-between items-center mb-2">
            <DialogTitle className="text-lg sm:text-xl">{isEditing ? 'Editar Cliente' : 'Ver Cliente'}</DialogTitle>
            {!isEditing && (
              <Button onClick={handleEditClick} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
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
                        <Input {...field} value={field.value || ""} readOnly={!isEditing} />
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
                        <Input {...field} value={field.value || ""} readOnly={!isEditing} />
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
                      {isEditing ? (
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          disabled={!isEditing}
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
                      ) : (
                        <FormControl>
                          <Input 
                            value={zones.find(z => z.id === field.value)?.name || "No asignada"} 
                            readOnly 
                          />
                        </FormControl>
                      )}
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
                          disabled={!isEditing}
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
                          <Input 
                            value={provinces.find(p => p.id === field.value)?.name || ""} 
                            readOnly 
                          />
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
                          disabled={!selectedProvinceId || isLoadingMunicipalities || !isEditing}
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
                          <Input 
                            value={municipalities.find(m => m.id === field.value)?.name || ""} 
                            readOnly 
                          />
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
                        <Input {...field} value={field.value || ""} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditing && (
                  <FormField
                    control={form.control}
                    name="coordinates"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Ubicación en Mapa</FormLabel>
                        <FormControl>
                          <LocationSelector 
                            value={field.value || ""} 
                            onChange={field.onChange} 
                            initialCenter={[19.075380, -70.128822]} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                            if (!isEditing) return;
                            const value = e.target.value.replace(/[^\d.]/g, '');
                            const parts = value.split('.');
                            if (parts.length > 2) return;
                            if (parts[1]?.length > 2) return;
                            field.onChange(value);
                          }}
                          onBlur={(e) => {
                            if (!isEditing) return;
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}