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
  Home,
  User,
  ClipboardCheck,
  ImageIcon
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
      // Usar coordinates directamente si existe, de lo contrario usar una cadena vacía
      coordinates: customer.coordinates || "",
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
    <div className="max-w-6xl mx-auto">
      {/* Cabecera - formato exacto como rutas */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg font-bold flex items-center">
          <Users className="h-4 w-4 mr-1 text-blue-600" />
          Clientes
        </h1>
        <div className="flex gap-1">
          {!isMobile && (
            <Button 
              onClick={() => setActiveTab("new")} 
              className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2 py-0.5"
            >
              <PlusCircle className="h-3 w-3 mr-1" />
              Crear Cliente
            </Button>
          )}
        </div>
      </div>
      
      {/* Tabs de navegación - formato exacto como rutas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : activeTab === "details" ? 'grid-cols-3' : 'grid-cols-3'} mb-2 h-7`}>
          <TabsTrigger value="list" className="flex items-center gap-1 text-xs px-2 py-0">
            <Users className="h-3 w-3" />
            <span>Lista</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1 text-xs px-2 py-0">
            <PlusCircle className="h-3 w-3" />
            <span>Nuevo</span>
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="details" disabled={!selectedCustomer} className="flex items-center gap-1 text-xs px-2 py-0">
              <FileText className="h-3 w-3" />
              <span>{isEditing ? "Editar" : "Detalles"}</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* Contenido del Tab de Lista de Clientes */}
        <TabsContent value="list" className="space-y-4">
          {/* Estadísticas - versión compacta que coincide exactamente con la vista de rutas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-2 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Clientes</p>
                  <p className="text-base font-bold">{stats.totalCustomers}</p>
                </div>
                <Users className="h-5 w-5 text-blue-500" />
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-2 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Crédito Total</p>
                  <p className="text-base font-bold">RD$ {stats.totalCredit.toFixed(2)}</p>
                </div>
                <DollarSign className="h-5 w-5 text-green-500" />
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-2 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Crédito Promedio</p>
                  <p className="text-base font-bold">RD$ {stats.avgCredit.toFixed(2)}</p>
                </div>
                <CreditCard className="h-5 w-5 text-yellow-500" />
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-2 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Provincias</p>
                  <p className="text-base font-bold">{stats.provinces}</p>
                </div>
                <MapPin className="h-5 w-5 text-purple-500" />
              </CardContent>
            </Card>
          </div>

          <Card className="p-2">
            {/* Buscador */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input 
                placeholder="Buscar por nombre, encargado, RNC o teléfono..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h2 className="font-semibold text-sm">Directorio de Clientes</h2>
              </div>
              <Badge className="px-2 py-0 h-5 text-[10px] bg-blue-50 text-blue-700 border-blue-200 border-l-4 border-l-blue-500">{filteredCustomers.length} clientes</Badge>
            </div>

            {isMobile ? (
              /* Vista de tarjetas para móvil - versión compacta */
              <ScrollArea className="h-[400px]">
                <div className="space-y-1.5">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-2 text-gray-500 text-xs">
                      No se encontraron clientes
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <Card 
                        key={customer.id} 
                        className="overflow-hidden hover:bg-accent/5 transition-colors border-l-4"
                        style={{ 
                          borderLeftColor: customer.zoneid === 1 ? '#3b82f6' : 
                                          customer.zoneid === 2 ? '#ef4444' : 
                                          customer.zoneid === 3 ? '#22c55e' : 
                                          '#6b7280' 
                        }}
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
                            coordinates: customer.coordinates || "",
                            creditlimit: customer.creditlimit.toString(),
                            logo: customer.logo || undefined
                          };
                          
                          form.reset(formData);
                        }}
                      >
                        <div className="flex items-center p-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">
                                {customer.businessname}
                              </span>
                              {customer.rnc && (
                                <Badge variant="outline" className="ml-auto text-[10px] py-0 h-4">
                                  RNC: {customer.rnc}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-1 text-[11px]">
                              <div className="flex items-center text-muted-foreground">
                                <User className="h-3 w-3 mr-1" />
                                <span>{customer.managername}</span>
                              </div>
                              <div className="flex items-center text-muted-foreground">
                                <Phone className="h-3 w-3 mr-1" />
                                <span>{customer.phone}</span>
                              </div>
                              {customer.email && (
                                <div className="flex items-center text-muted-foreground">
                                  <Mail className="h-3 w-3 mr-1" />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            {customer.zoneid === 1 ? (
                              <Building2 className="h-5 w-5 text-blue-500" />
                            ) : customer.zoneid === 2 ? (
                              <Building2 className="h-5 w-5 text-red-500" />
                            ) : customer.zoneid === 3 ? (
                              <Building2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Building2 className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              /* Vista de tarjetas para escritorio - diseño moderno */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCustomers.length === 0 ? (
                  <div className="col-span-3 text-center py-5 bg-gray-50 rounded-lg text-gray-500">
                    <Search className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No se encontraron clientes</p>
                    <p className="text-xs mt-1">Intente con otra búsqueda o cree un nuevo cliente</p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <Card 
                      key={customer.id} 
                      className="overflow-hidden hover:shadow-md transition-all border-t-4 cursor-pointer"
                      style={{ 
                        borderTopColor: customer.zoneid === 1 ? '#3b82f6' : 
                                      customer.zoneid === 2 ? '#ef4444' : 
                                      customer.zoneid === 3 ? '#22c55e' : 
                                      '#6b7280' 
                      }}
                      onClick={() => {
                        handleViewCustomer(customer);
                        setActiveTab("details");
                      }}
                    >
                      <CardHeader className="px-4 py-3 flex flex-row items-center space-y-0 gap-3">
                        <div className="relative">
                          {customer.logo ? (
                            <img
                              src={`data:image/jpeg;base64,${customer.logo}`}
                              alt="Logo"
                              className="w-12 h-12 rounded-md object-contain border bg-white"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-50 rounded-md flex items-center justify-center border">
                              <Building2 className="h-6 w-6 text-blue-500" />
                            </div>
                          )}
                          <div 
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] z-10 ${
                              customer.zoneid === 1 ? 'bg-blue-500' : 
                              customer.zoneid === 2 ? 'bg-red-500' : 
                              customer.zoneid === 3 ? 'bg-green-500' : 
                              'bg-gray-500'
                            }`}
                            title={zones.find(z => z.id === customer.zoneid)?.name || 'Sin zona'}
                          >
                            Z{customer.zoneid || "?"}
                          </div>
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm font-semibold line-clamp-1 mb-0">
                            {customer.businessname}
                          </CardTitle>
                          {customer.rnc && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                              RNC: {customer.rnc}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 py-2 text-xs space-y-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <div className="flex items-center text-muted-foreground">
                            <User className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{customer.managername}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </div>
                          {customer.email && (
                            <div className="flex items-center text-muted-foreground w-full">
                              <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start text-muted-foreground">
                            <Home className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{`${customer.street} #${customer.streetnumber}, ${customer.municipalityName || ''}`}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{customer.coordinates ? "Ubicación disponible" : <span className="text-red-500">Sin coordenadas</span>}</span>
                          </div>
                        </div>
                        
                        <div className="pt-1 flex justify-between items-center border-t border-dashed border-gray-200">
                          <Badge 
                            className="px-2 py-0.5 h-5 text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                            title="Límite de crédito"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            RD$ {parseFloat(customer.creditlimit.toString()).toFixed(2)}
                          </Badge>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] px-2 hover:bg-blue-50 hover:text-blue-700"
                            title="Ver detalles"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCustomer(customer);
                              setActiveTab("details");
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Detalles
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </Card>
        </TabsContent>
        
        {/* Contenido del Tab de Nuevo Cliente */}
        <TabsContent value="new">
          <div className="border rounded-md p-2 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-sm font-medium">Registrar Cliente</h3>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-1">
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="flex items-center justify-between text-xs">
                          <div className="flex items-center">
                            <Badge className="px-2 py-0 h-5 text-[10px] bg-slate-50 text-slate-700 border-slate-200 border-l-4 border-l-slate-500 mr-1">
                              Logo (JPG/PNG, máx. 5MB)
                            </Badge>
                          </div>
                          <ImageIcon className="h-4 w-4 text-slate-500" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-7 text-xs px-2 py-0"
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
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">RNC</FormLabel>
                        <FormControl>
                          <Input 
                            className="h-7 text-xs px-2 py-0" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessname"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Nombre del Negocio</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 py-0" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managername"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Nombre del Encargado</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 py-0" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Teléfono</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 py-0" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Email</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 py-0" type="email" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zoneid"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Zona</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Seleccione una zona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zones.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id.toString()} className="text-xs">
                                {zone.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Calle</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 py-0" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetnumber"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Número</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 py-0" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="provinceid"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Provincia</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(parseInt(value));
                            setSelectedProvinceId(parseInt(value));
                          }}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Seleccione una provincia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {provinces.map((province) => (
                              <SelectItem key={province.id} value={province.id.toString()} className="text-xs">
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="municipalityid"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Municipio</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          disabled={!selectedProvinceId || isLoadingMunicipalities}
                        >
                          <FormControl>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Seleccione un municipio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {municipalities.map((municipality) => (
                              <SelectItem key={municipality.id} value={municipality.id.toString()} className="text-xs">
                                {municipality.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 space-y-1">
                        <FormLabel className="text-xs">Referencia</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 py-0" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="coordinates"
                    render={({ field }) => (
                      <FormItem className="md:col-span-3 space-y-1">
                        <FormLabel className="text-xs">Ubicación en Mapa</FormLabel>
                        <FormControl>
                          <div className="h-[180px] w-full">
                            <LocationSelector 
                              value={field.value || ""} 
                              onChange={field.onChange} 
                              initialCenter={[19.075380, -70.128822]} 
                            />
                          </div>
                        </FormControl>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Mueva el marcador para seleccionar la ubicación exacta del cliente
                        </div>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creditlimit"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 space-y-1">
                        <FormLabel className="text-xs">Límite de Crédito</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-7 text-xs px-2 py-0"
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
                        <FormMessage className="text-[10px]" />
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
          </div>
        </TabsContent>
        
        {/* Contenido del Tab de Detalles de Cliente */}
        <TabsContent value="details" className="border rounded-md p-1">
          <Card className="p-2">
            <CardHeader className="px-0 pt-0 pb-2">
              <div className="flex flex-row justify-between items-center mb-1">
                <CardTitle className="text-lg font-bold flex items-center">
                  <Building2 className="h-4 w-4 mr-1.5 text-blue-600" />
                  {isEditing ? 'Editar Cliente' : 'Detalles del Cliente'}
                </CardTitle>
                {!isEditing ? (
                  <Button onClick={handleEditClick} variant="outline" size="sm" className="h-7 text-xs">
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                ) : (
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" className="h-7 text-xs">
                    <X className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs">
                {isEditing ? 'Modifique la información del cliente según sea necesario' : 'Información detallada del cliente'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
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
                      <FormLabel className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        <span>Nombre del Negocio</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-blue-600" />
                        <span>Nombre del Encargado</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                        <span>Teléfono</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                        <span>Email</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        <span>Zona</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <Home className="h-3.5 w-3.5 text-blue-600" />
                        <span>Calle</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span>Número</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        <span>Provincia</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        <span>Municipio</span>
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span>Referencia</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coordinates"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" /> 
                        <span>Ubicación en Mapa</span>
                      </FormLabel>
                      <FormControl>
                        <div className="h-[200px] w-full">
                          <LocationSelector 
                            value={field.value || ""} 
                            onChange={isEditing ? field.onChange : () => {}} 
                            initialCenter={[19.075380, -70.128822]} 
                          />
                        </div>
                      </FormControl>
                      {isEditing && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Mueva el marcador para seleccionar la ubicación exacta
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditlimit"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                        <span>Límite de Crédito</span>
                      </FormLabel>
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