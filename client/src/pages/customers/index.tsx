import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCustomerSchema, CustomerWithDetails, Province, Municipality, Zone } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocationSelector } from "@/components/map/LocationSelector";
import { 
  PlusCircle, 
  Eye, 
  Edit, 
  Save, 
  Users, 
  Search, 
  X, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  ArrowLeft, 
  CreditCard,
  FileText,
  DollarSign,
  User,
  ClipboardCheck,
  Home
} from "lucide-react";

type CustomerFormData = z.infer<typeof insertCustomerSchema>;

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
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
  
  // Filtrar clientes según término de búsqueda
  const filteredCustomers = customers.filter(
    customer => 
      customer.businessname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.managername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.rnc && customer.rnc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Escucha cambios en la pestaña activa
  useEffect(() => {
    if (activeTab === "new") {
      // Resetear el formulario cuando se cambia a la pestaña de nuevo cliente
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
      setSelectedProvinceId(null);
    }
  }, [activeTab, form]);
  
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
      setActiveTab("list");
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
    setActiveTab("details");
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  if (isLoading) {
    return <div className="p-8">Cargando...</div>;
  }

  // Estadísticas de clientes
  const getCustomerStats = () => {
    const totalCustomers = customers.length;
    const totalCredit = customers.reduce((sum, customer) => 
      sum + parseFloat(customer.creditlimit.toString()), 0
    );
    const avgCredit = totalCustomers > 0 ? totalCredit / totalCustomers : 0;
    
    // Obtener provincias de los clientes
    const uniqueProvinces = new Set<number>();
    customers.forEach(c => uniqueProvinces.add(c.provinceid));
    const provinces = uniqueProvinces.size;
    
    return {
      totalCustomers,
      totalCredit,
      avgCredit,
      provinces
    };
  };

  const stats = getCustomerStats();

  return (
    <div className={`${isMobile ? 'p-2' : 'p-4'} max-w-6xl mx-auto`}>
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center">
          <Users className="h-6 w-6 mr-2 text-blue-600" />
          Gestión de Clientes
        </h1>
        {!isMobile && (
          <Button 
            onClick={() => setActiveTab("new")} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        )}
      </div>
      
      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : activeTab === "details" ? 'grid-cols-3' : 'grid-cols-3'} mb-4`}>
          <TabsTrigger value="list" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            <span>Nuevo</span>
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="details" disabled={!selectedCustomer} className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{isEditing ? "Editar" : "Detalles"}</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* Contenido del Tab de Lista de Clientes */}
        <TabsContent value="list" className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  <Users className="mr-2 h-4 w-4 text-blue-500" />
                  {stats.totalCustomers}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                  RD$ {stats.totalCredit.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  <CreditCard className="mr-2 h-4 w-4 text-amber-500" />
                  RD$ {stats.avgCredit.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Provincias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-purple-500" />
                  {stats.provinces}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="p-4">
            {/* Buscador */}
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por nombre, encargado, RNC o teléfono..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold">Directorio de Clientes</h2>
              </div>
              <Badge variant="outline">{filteredCustomers.length} clientes</Badge>
            </div>

            {isMobile ? (
              /* Vista de tarjetas para móvil */
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No se encontraron clientes
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <Card 
                        key={customer.id} 
                        className="p-3 border-l-4 border-l-blue-500"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSelectedProvinceId(customer.provinceid);
                          setIsEditing(false);
                          setActiveTab("details");
                          
                          // Preparar datos para el formulario
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
                            coordinates: customer.street + ", " + customer.municipalityName,
                            creditlimit: customer.creditlimit.toString(),
                            logo: customer.logo || undefined
                          };
                          
                          form.reset(formData);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {customer.logo ? (
                              <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden">
                                <img
                                  src={`data:image/jpeg;base64,${customer.logo}`}
                                  alt="Logo"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 shrink-0 bg-blue-50 rounded-md flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-blue-500" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-sm">{customer.businessname}</h3>
                              <p className="text-xs text-gray-500 flex items-center">
                                <User className="h-3 w-3 mr-1" /> {customer.managername}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                            RD$ {parseFloat(customer.creditlimit.toString()).toFixed(2)}
                          </Badge>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                          <div className="flex items-center text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{customer.municipalityName || 'N/A'}</span>
                          </div>
                          {customer.rnc && (
                            <div className="flex items-center text-gray-500">
                              <ClipboardCheck className="h-3 w-3 mr-1" />
                              <span>{customer.rnc}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-100">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCustomer(customer);
                              setActiveTab("details");
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver Detalles
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              /* Tabla para escritorio */
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>RNC</TableHead>
                      <TableHead>Encargado</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Crédito</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                          No se encontraron clientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            {customer.logo ? (
                              <img
                                src={`data:image/jpeg;base64,${customer.logo}`}
                                alt="Logo"
                                className="w-10 h-10 object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-50 rounded-md flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-blue-500" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{customer.businessname}</TableCell>
                          <TableCell>{customer.rnc || '-'}</TableCell>
                          <TableCell>{customer.managername}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell className="max-w-[250px] truncate">
                            {`${customer.street} #${customer.streetnumber}, ${customer.municipalityName || ''}, ${customer.provinceName || ''}`}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                              RD$ {parseFloat(customer.creditlimit.toString()).toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleViewCustomer(customer);
                                setActiveTab("details");
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
        
        {/* Contenido del Tab de Nuevo Cliente */}
        <TabsContent value="new" className="border rounded-md p-2 sm:p-4">
          <Card className="p-4">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl font-bold flex items-center">
                <PlusCircle className="h-5 w-5 mr-2 text-blue-600" />
                Registrar Nuevo Cliente
              </CardTitle>
              <CardDescription>
                Complete los datos para crear un nuevo cliente en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
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
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contenido del Tab de Detalles de Cliente */}
        <TabsContent value="details" className="border rounded-md p-2 sm:p-4">
          <Card className="p-4">
            <CardHeader className="px-0 pt-0">
              <div className="flex flex-row justify-between items-center mb-2">
                <CardTitle className="text-xl font-bold flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  {isEditing ? 'Editar Cliente' : 'Detalles del Cliente'}
                </CardTitle>
                {!isEditing ? (
                  <Button onClick={handleEditClick} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                ) : (
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </Button>
                )}
              </div>
              <CardDescription>
                {isEditing ? 'Modifique la información del cliente según sea necesario' : 'Información detallada del cliente'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
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
          </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}