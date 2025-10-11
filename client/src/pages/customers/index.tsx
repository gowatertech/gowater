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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import LocationCaptureDialog from "@/components/customers/LocationCaptureDialog";
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
  ImageIcon,
  MoreVertical,
  MessageSquare,
  Map
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
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationCaptureCustomer, setLocationCaptureCustomer] = useState<CustomerWithDetails | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Obtener provincias
  const { data: provinces = [] } = useQuery<Province[]>({
    queryKey: ["/api/geo/provinces"],
    queryFn: async () => {
      const response = await fetch('/api/geo/provinces');
      if (!response.ok) {
        throw new Error('Error al cargar provincias');
      }
      return await response.json();
    }
  });

  // Obtener municipios cuando se selecciona una provincia
  const { data: municipalities = [], isLoading: isLoadingMunicipalities } = useQuery<Municipality[]>({
    queryKey: ["/api/geo/municipalities", selectedProvinceId],
    queryFn: async () => {
      if (!selectedProvinceId) return [];
      const response = await fetch(`/api/geo/municipalities/${selectedProvinceId}`);
      if (!response.ok) {
        throw new Error('Error al cargar municipios');
      }
      return await response.json();
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
      
      if (data.logo instanceof File) {
        // Si hay un archivo de logo, usamos FormData
        const formData = new FormData();
        
        // Añadir todos los campos al FormData
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== "") {
            if (key === 'logo' && value instanceof File) {
              formData.append('logo', value);
            } else {
              formData.append(key, String(value));
            }
          }
        });
        
        // Enviar la solicitud con fetch para manejar FormData
        const response = await fetch('/api/customers', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error al crear cliente:", errorText);
          throw new Error('Error al crear el cliente: ' + errorText);
        }
        
        return await response.json();
      } else {
        // Si no hay logo, usamos JSON con apiRequest exactamente como en almacén
        console.log("Enviando datos sin logo:", data);
        return await apiRequest({
          method: "POST",
          url: "/api/customers",
          data: data
        });
      }
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
      const { id, ...updateData } = data;
      
      console.log("Actualizando cliente:", id, updateData);
      
      // Si hay un archivo de logo, usamos FormData
      if (data.logo instanceof File) {
        const formData = new FormData();
        
        // Agregar todos los campos excepto logo
        Object.entries(updateData).forEach(([key, value]) => {
          if (key !== 'logo' && value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        
        // Agregar el logo
        formData.append('logo', data.logo);
        
        // Enviar con fetch para manejar FormData
        const response = await fetch(`/api/customers/${id}`, {
          method: 'PATCH',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Error al actualizar el cliente');
        }
        
        return await response.json();
      } else {
        // Si no hay logo, usamos JSON con apiRequest
        return await apiRequest({
          method: "PATCH",
          url: `/api/customers/${id}`,
          data: updateData
        });
      }
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

  const onSubmit = (data: CustomerFormData) => {
    console.log("Formulario enviado con datos:", data);
    
    // Aseguramos que creditlimit sea un string para evitar problemas de tipos
    const formattedData = {
      ...data,
      creditlimit: data.creditlimit ? String(data.creditlimit) : "0.00"
    };
    
    console.log("Datos formateados para envío:", formattedData);
    
    // Forma directa como en almacén
    if (isEditing && selectedCustomer) {
      updateMutation.mutate({ ...formattedData, id: selectedCustomer.id });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const handleViewCustomer = (customer: CustomerWithDetails) => {
    console.log("[handleViewCustomer] Llamado con cliente:", customer.id, customer.businessname);
    setOpenDropdownId(null);
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
    console.log("[handleViewCustomer] Cambiando tab a details");
    setActiveTab("details");
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCaptureOnMap = (customer: CustomerWithDetails) => {
    console.log("[handleCaptureOnMap] Llamado con cliente:", customer.id, customer.businessname);
    setOpenDropdownId(null);
    setLocationCaptureCustomer(customer);
    console.log("[handleCaptureOnMap] Abriendo dialog de captura de ubicación");
    setLocationDialogOpen(true);
  };

  const handleSendWhatsApp = async (customer: CustomerWithDetails) => {
    console.log("[handleSendWhatsApp] Llamado con cliente:", customer.id, customer.businessname);
    setOpenDropdownId(null);
    
    if (!customer.phone) {
      console.log("[handleSendWhatsApp] Cliente no tiene teléfono");
      toast({
        title: "Error",
        description: "El cliente no tiene un número de teléfono registrado",
        variant: "destructive",
      });
      return;
    }
    
    console.log("[handleSendWhatsApp] Cliente tiene teléfono:", customer.phone);
    const popup = window.open('', '_blank');
    
    try {
      console.log("[handleSendWhatsApp] Enviando solicitud a API para generar enlace de WhatsApp");
      const res = await fetch(`/api/customers/${customer.id}/request-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        console.log("[handleSendWhatsApp] Error en respuesta de API:", res.status);
        if (popup) popup.close();
        const errorData = await res.json().catch(() => ({ error: "Error al generar enlace" }));
        throw new Error(errorData.error || "Error al generar enlace");
      }
      
      const { token, whatsappUrl } = await res.json();
      console.log("[handleSendWhatsApp] Enlace de WhatsApp generado exitosamente");
      
      if (popup) {
        popup.location.href = whatsappUrl;
        toast({
          title: "Enlace generado",
          description: "Se abrió WhatsApp con el mensaje. El enlace expira en 24 horas.",
        });
      } else {
        toast({
          title: "Popup bloqueado",
          description: "Por favor permite popups y vuelve a intentar, o usa este enlace manualmente",
          variant: "destructive",
        });
        console.log("WhatsApp URL:", whatsappUrl);
      }
    } catch (error) {
      if (popup) popup.close();
      console.error("[handleSendWhatsApp] Error al generar enlace:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de WhatsApp",
        variant: "destructive",
      });
    }
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
          <Users className="h-4 w-4 mr-1 text-gray-600" />
          Clientes
        </h1>
        <div className="flex gap-1">
          {!isMobile && (
            <Button 
              onClick={() => setActiveTab("new")} 
              className="bg-blue-500 hover:bg-blue-600 text-white h-7 text-xs px-2 py-0.5"
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
            <PlusCircle className="h-3 w-3 text-blue-500" />
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
        <TabsContent value="list" className="space-y-4 mt-0">
          {/* Estadísticas modernas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-blue-500">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Clientes</p>
                    <p className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-green-500">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Crédito Total</p>
                    <p className="text-2xl font-bold">RD$ {stats.totalCredit.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-yellow-500">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Crédito Promedio</p>
                    <p className="text-2xl font-bold">RD$ {stats.avgCredit.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-purple-500">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Provincias</p>
                    <p className="text-2xl font-bold">{stats.provinces}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Directorio de Clientes</CardTitle>
                  {filteredCustomers.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredCustomers.length} de {customers.length}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar clientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-9"
                      data-testid="input-search-customer"
                      aria-label="Buscar clientes"
                    />
                    {searchTerm && (
                      <Button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-auto p-0 hover:bg-transparent"
                        variant="ghost"
                        size="sm"
                        aria-label="Limpiar búsqueda"
                        data-testid="button-clear-search"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="font-medium text-lg mb-1">
                    {searchTerm ? "No se encontraron clientes" : "No hay clientes"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm 
                      ? "Intenta con otro término de búsqueda" 
                      : "Los clientes aparecerán aquí cuando se registren"}
                  </p>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="mt-4"
                      data-testid="button-clear-search-empty"
                    >
                      Limpiar búsqueda
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Vista móvil - Cards modernas */}
                  <div className="md:hidden space-y-3">
                    {filteredCustomers.map((customer) => (
                      <Card 
                        key={customer.id}
                        className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
                        onClick={() => {
                          handleViewCustomer(customer);
                          setActiveTab("details");
                        }}
                        data-testid={`card-customer-${customer.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="relative flex-shrink-0">
                              {customer.logo ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-background shadow-sm">
                                  <img
                                    src={`data:image/jpeg;base64,${customer.logo}`}
                                    alt={customer.businessname}
                                    className="w-full h-full object-contain bg-white"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-background shadow-sm">
                                  <Building2 className="h-6 w-6 text-blue-600" />
                                </div>
                              )}
                              {customer.zoneid && (
                                <div 
                                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md ${
                                    customer.zoneid === 1 ? 'bg-purple-500' : 
                                    customer.zoneid === 2 ? 'bg-red-500' : 
                                    customer.zoneid === 3 ? 'bg-green-500' : 
                                    'bg-gray-500'
                                  }`}
                                  title={zones.find(z => z.id === customer.zoneid)?.name || 'Sin zona'}
                                >
                                  {customer.zoneid}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 
                                className="font-semibold text-base mb-1 line-clamp-1" 
                                data-testid={`text-customer-name-${customer.id}`}
                              >
                                {customer.businessname}
                              </h3>
                              {customer.rnc && (
                                <p className="text-xs text-muted-foreground">RNC: {customer.rnc}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  className={`text-xs ${
                                    customer.zoneid === 1 ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                    customer.zoneid === 2 ? 'bg-red-50 text-red-700 border-red-200' : 
                                    customer.zoneid === 3 ? 'bg-green-50 text-green-700 border-green-200' : 
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {zones.find(z => z.id === customer.zoneid)?.name || 'Sin zona'}
                                </Badge>
                              </div>
                            </div>

                            <DropdownMenu 
                              open={openDropdownId === customer.id} 
                              onOpenChange={(open) => setOpenDropdownId(open ? customer.id : null)}
                            >
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  aria-label="Más acciones"
                                  data-testid={`button-actions-${customer.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewCustomer(customer);
                                    setActiveTab("details");
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCaptureOnMap(customer);
                                  }}
                                >
                                  <Map className="h-4 w-4 mr-2" />
                                  Capturar en Mapa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendWhatsApp(customer);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Enviar por WhatsApp
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Encargado</p>
                              <p className="text-sm font-medium flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate">{customer.managername}</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                              <p className="text-sm font-medium flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span className="truncate">{customer.phone}</span>
                              </p>
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1">Dirección</p>
                            <p className="text-sm flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              <span className="line-clamp-2">{customer.street} #{customer.streetnumber}, {customer.municipalityName}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Crédito</p>
                              <Badge 
                                variant={parseFloat(customer.creditlimit.toString()) < 0 ? "destructive" : "outline"}
                                className="font-medium"
                              >
                                <DollarSign className="h-3 w-3 mr-1 inline-block" />
                                RD$ {parseFloat(customer.creditlimit.toString()).toFixed(2)}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5 text-right">Ubicación</p>
                              <Badge variant="outline" className={`${
                                customer.coordinates 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}>
                                <MapPin className="h-3 w-3 mr-1 inline-block" />
                                {customer.coordinates ? 'Capturada' : 'Pendiente'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Vista desktop - Tabla moderna */}
                  <div className="hidden md:block">
                    <ScrollArea className="h-[calc(100vh-500px)]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Negocio</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Ubicación</TableHead>
                            <TableHead>Zona</TableHead>
                            <TableHead className="text-right">Crédito</TableHead>
                            <TableHead className="text-center">Mapa</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCustomers.map((customer) => (
                            <TableRow 
                              key={customer.id}
                              className="cursor-pointer"
                              onClick={() => {
                                handleViewCustomer(customer);
                                setActiveTab("details");
                              }}
                              data-testid={`row-customer-${customer.id}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="relative flex-shrink-0">
                                    {customer.logo ? (
                                      <div className="w-10 h-10 rounded-md overflow-hidden border shadow-sm">
                                        <img
                                          src={`data:image/jpeg;base64,${customer.logo}`}
                                          alt={customer.businessname}
                                          className="w-full h-full object-contain bg-white"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border shadow-sm">
                                        <Building2 className="h-5 w-5 text-blue-600" />
                                      </div>
                                    )}
                                    {customer.zoneid && (
                                      <div 
                                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-sm ${
                                          customer.zoneid === 1 ? 'bg-purple-500' : 
                                          customer.zoneid === 2 ? 'bg-red-500' : 
                                          customer.zoneid === 3 ? 'bg-green-500' : 
                                          'bg-gray-500'
                                        }`}
                                      >
                                        {customer.zoneid}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium line-clamp-1">{customer.businessname}</p>
                                    {customer.rnc && (
                                      <p className="text-xs text-muted-foreground">RNC: {customer.rnc}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm">
                                    <User className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                    <span className="truncate">{customer.managername}</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <Phone className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                    <span className="truncate">{customer.phone}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 max-w-[200px]">
                                  <div className="flex items-start text-sm">
                                    <Home className="h-3 w-3 mr-1.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{customer.street} #{customer.streetnumber}</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <MapPin className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate text-xs text-muted-foreground">
                                      {customer.municipalityName}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={`${
                                    customer.zoneid === 1 ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                    customer.zoneid === 2 ? 'bg-red-50 text-red-700 border-red-200' : 
                                    customer.zoneid === 3 ? 'bg-green-50 text-green-700 border-green-200' : 
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {zones.find(z => z.id === customer.zoneid)?.name || 'Sin zona'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge 
                                  variant={parseFloat(customer.creditlimit.toString()) < 0 ? "destructive" : "outline"}
                                  className="font-medium"
                                >
                                  RD$ {parseFloat(customer.creditlimit.toString()).toFixed(2)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={`${
                                  customer.coordinates 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}>
                                  {customer.coordinates ? 'Sí' : 'No'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu 
                                  open={openDropdownId === customer.id} 
                                  onOpenChange={(open) => setOpenDropdownId(open ? customer.id : null)}
                                >
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      aria-label="Más acciones"
                                      data-testid={`button-actions-table-${customer.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewCustomer(customer);
                                        setActiveTab("details");
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalles
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCaptureOnMap(customer);
                                      }}
                                    >
                                      <Map className="h-4 w-4 mr-2" />
                                      Capturar en Mapa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendWhatsApp(customer);
                                      }}
                                    >
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Enviar por WhatsApp
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </>
              )}
            </CardContent>
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
                {/* Mostramos los errores del formulario para debug */}
                {Object.keys(form.formState.errors).length > 0 && (
                  <div className="text-red-500 text-xs bg-red-50 p-2 rounded mb-2">
                    Errores en el formulario: {JSON.stringify(form.formState.errors)}
                  </div>
                )}
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
                          <div className="h-[180px] w-full border rounded-md overflow-hidden">
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
                            value={field.value || "0.00"}
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
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end mt-4 mb-4">
                  <Button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
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
                  <Building2 className="h-4 w-4 mr-1.5 text-gray-600" />
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
                        <Building2 className="h-3.5 w-3.5 text-gray-600" />
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
                        <User className="h-3.5 w-3.5 text-gray-600" />
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
                        <Phone className="h-3.5 w-3.5 text-gray-600" />
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
                        <Mail className="h-3.5 w-3.5 text-gray-600" />
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
                        <MapPin className="h-3.5 w-3.5 text-gray-600" />
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
                        <Home className="h-3.5 w-3.5 text-gray-600" />
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
                        <FileText className="h-3.5 w-3.5 text-gray-600" />
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
                        <MapPin className="h-3.5 w-3.5 text-gray-600" />
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
                        <MapPin className="h-3.5 w-3.5 text-gray-600" />
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
                        <FileText className="h-3.5 w-3.5 text-gray-600" />
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
                        <MapPin className="h-3.5 w-3.5 text-gray-600" /> 
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
                        <DollarSign className="h-3.5 w-3.5 text-gray-600" />
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

      <LocationCaptureDialog
        open={locationDialogOpen}
        onOpenChange={(open) => {
          setLocationDialogOpen(open);
          if (!open) {
            setLocationCaptureCustomer(null);
          }
        }}
        customerId={locationCaptureCustomer?.id || 0}
        customerName={locationCaptureCustomer?.businessname || ""}
        currentCoordinates={locationCaptureCustomer?.coordinates || undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          toast({
            title: "Ubicación guardada",
            description: "La ubicación del cliente se ha actualizado correctamente",
          });
        }}
      />
    </div>
  );
}