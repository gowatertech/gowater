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
import { Checkbox } from "@/components/ui/checkbox";
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
import { CustomerBalance } from "@/components/customers/CustomerBalance";
import { CustomerStats } from "@/components/customers/CustomerStats";
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
  Map,
  Grid3x3,
  List,
  Sparkles,
  Shield,
  TrendingUp
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      isCharity: false,
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
        isCharity: false,
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
        isCharity: false,
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
      isCharity: customer.isCharity || false,
      logo: customer.logo || undefined
    };
    
    form.reset(formData);
    setActiveTab("details");
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCaptureOnMap = (customer: CustomerWithDetails) => {
    setOpenDropdownId(null);
    setLocationCaptureCustomer(customer);
    setLocationDialogOpen(true);
  };

  const handleSendWhatsApp = async (customer: CustomerWithDetails) => {
    setOpenDropdownId(null);
    
    if (!customer.phone) {
      toast({
        title: "Error",
        description: "El cliente no tiene un número de teléfono registrado",
        variant: "destructive",
      });
      return;
    }
    
    const popup = window.open('', '_blank');
    
    try {
      const res = await fetch(`/api/customers/${customer.id}/request-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        if (popup) popup.close();
        const errorData = await res.json().catch(() => ({ error: "Error al generar enlace" }));
        throw new Error(errorData.error || "Error al generar enlace");
      }
      
      const { token, whatsappUrl } = await res.json();
      
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
      console.error("Error al generar enlace:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de WhatsApp",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
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
    
    // Clientes con donaciones
    const charityCount = customers.filter(c => c.isCharity).length;
    
    return {
      totalCustomers,
      totalCredit,
      avgCredit,
      provinces,
      charityCount
    };
  };

  const stats = getCustomerStats();

  const getZoneColor = (zoneId?: number | null) => {
    if (!zoneId) return 'bg-gray-500';
    switch(zoneId) {
      case 1: return 'bg-purple-500';
      case 2: return 'bg-red-500';
      case 3: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getZoneName = (zoneId?: number | null) => {
    if (!zoneId) return 'Sin zona';
    const zone = zones.find(z => z.id === zoneId);
    return zone?.name || 'Sin zona';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Cabecera moderna */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-8 w-8 text-primary" />
              </div>
              Gestión de Clientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Administra y organiza tu cartera de clientes
            </p>
          </div>
          <Button 
            onClick={() => setActiveTab("new")} 
            size="lg"
            className="gap-2"
            data-testid="button-create-customer"
          >
            <PlusCircle className="h-5 w-5" />
            Nuevo Cliente
          </Button>
        </div>
      </div>
      
      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
          <TabsTrigger value="list" className="flex items-center gap-2 text-sm">
            <List className="h-4 w-4" />
            <span>Lista</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2 text-sm">
            <PlusCircle className="h-4 w-4" />
            <span>Nuevo</span>
          </TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedCustomer} className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4" />
            <span>{isEditing ? "Editar" : "Detalles"}</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Tab: Lista de Clientes */}
        <TabsContent value="list" className="space-y-6">
          {/* Estadísticas modernas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                    <p className="text-3xl font-bold">{stats.totalCustomers}</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-full">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Crédito Total</p>
                    <p className="text-2xl font-bold">RD$ {stats.totalCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Promedio</p>
                    <p className="text-2xl font-bold">RD$ {stats.avgCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-full">
                    <TrendingUp className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Provincias</p>
                    <p className="text-3xl font-bold">{stats.provinces}</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-full">
                    <MapPin className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Benéficos</p>
                    <p className="text-3xl font-bold">{stats.charityCount}</p>
                  </div>
                  <div className="p-3 bg-pink-500/10 rounded-full">
                    <Shield className="h-6 w-6 text-pink-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Estadísticas - visible solo en móvil */}
          <div className="lg:hidden">
            <CustomerStats customers={filteredCustomers} />
          </div>

          {/* Grid principal: Directorio + Estadísticas */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Directorio de Clientes */}
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">Directorio de Clientes</CardTitle>
                    <CardDescription>
                      {filteredCustomers.length} {filteredCustomers.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
                    </CardDescription>
                  </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="gap-2"
                  >
                    <Grid3x3 className="h-4 w-4" />
                    {!isMobile && 'Grid'}
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="gap-2"
                  >
                    <List className="h-4 w-4" />
                    {!isMobile && 'Lista'}
                  </Button>
                </div>
              </div>
              
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre, encargado, RNC o teléfono..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                  data-testid="input-search-customers"
                />
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No se encontraron clientes</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'Intenta con otros términos de búsqueda'
                      : 'Crea tu primer cliente para comenzar'
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setActiveTab("new")} className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Crear Cliente
                    </Button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                // Vista Grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCustomers.map((customer) => (
                    <Card 
                      key={customer.id}
                      className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 overflow-hidden"
                      style={{ borderLeftColor: getZoneColor(customer.zoneid).replace('bg-', '#') }}
                      onClick={() => handleViewCustomer(customer)}
                      data-testid={`card-customer-${customer.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                              {customer.logo ? (
                                <div className="w-14 h-14 rounded-xl border-2 border-muted overflow-hidden bg-white shadow-sm">
                                  <img
                                    src={`data:image/jpeg;base64,${customer.logo}`}
                                    alt="Logo"
                                    className="w-full h-full object-contain p-1"
                                  />
                                </div>
                              ) : (
                                <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border-2 border-muted">
                                  <Building2 className="h-7 w-7 text-primary" />
                                </div>
                              )}
                              {customer.isCharity && (
                                <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-1 shadow-lg">
                                  <Shield className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">
                                {customer.businessname}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {customer.managername}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu 
                            open={openDropdownId === customer.id}
                            onOpenChange={(open) => setOpenDropdownId(open ? customer.id : null)}
                          >
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCaptureOnMap(customer)}>
                                <Map className="h-4 w-4 mr-2" />
                                Capturar en Mapa
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSendWhatsApp(customer)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Enviar WhatsApp
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">
                            {provinces.find(p => p.id === customer.provinceid)?.name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge variant="secondary" className="gap-1">
                            <CreditCard className="h-3 w-3" />
                            RD$ {parseFloat(customer.creditlimit.toString()).toLocaleString('es-DO')}
                          </Badge>
                          <Badge className={`${getZoneColor(customer.zoneid)} text-white`}>
                            {getZoneName(customer.zoneid)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // Vista Lista
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => (
                    <Card 
                      key={customer.id}
                      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4"
                      style={{ borderLeftColor: getZoneColor(customer.zoneid).replace('bg-', '#') }}
                      onClick={() => handleViewCustomer(customer)}
                      data-testid={`list-customer-${customer.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                              {customer.logo ? (
                                <div className="w-12 h-12 rounded-lg border-2 border-muted overflow-hidden bg-white">
                                  <img
                                    src={`data:image/jpeg;base64,${customer.logo}`}
                                    alt="Logo"
                                    className="w-full h-full object-contain p-1"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center border-2 border-muted">
                                  <Building2 className="h-6 w-6 text-primary" />
                                </div>
                              )}
                              {customer.isCharity && (
                                <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-0.5 shadow-lg">
                                  <Shield className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="min-w-0">
                                <p className="font-semibold truncate group-hover:text-primary transition-colors">
                                  {customer.businessname}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {customer.managername}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-sm min-w-0">
                                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{customer.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm min-w-0">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">
                                  {provinces.find(p => p.id === customer.provinceid)?.name || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  RD$ {parseFloat(customer.creditlimit.toString()).toLocaleString('es-DO')}
                                </Badge>
                                <Badge className={`${getZoneColor(customer.zoneid)} text-white`}>
                                  {getZoneName(customer.zoneid)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <DropdownMenu 
                            open={openDropdownId === customer.id}
                            onOpenChange={(open) => setOpenDropdownId(open ? customer.id : null)}
                          >
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCaptureOnMap(customer)}>
                                <Map className="h-4 w-4 mr-2" />
                                Capturar en Mapa
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSendWhatsApp(customer)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Enviar WhatsApp
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel de Estadísticas Lateral - visible solo en desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <CustomerStats customers={filteredCustomers} />
            </div>
          </div>
        </div>
        </TabsContent>

        {/* Tab: Nuevo Cliente */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Crear Nuevo Cliente
              </CardTitle>
              <CardDescription>
                Complete la información del cliente para agregarlo a su cartera
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="logo"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-1">
                          <FormLabel>Logo del Negocio</FormLabel>
                          <FormControl>
                            <Input
                              className="cursor-pointer"
                              type="file"
                              accept="image/jpeg,image/png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "El archivo debe ser menor a 5MB",
                                    });
                                    e.target.value = '';
                                    return;
                                  }
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
                          <FormDescription>JPG o PNG, máximo 5MB</FormDescription>
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
                            <Input placeholder="000-00000-0" {...field} value={field.value || ""} />
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
                          <FormLabel>Nombre del Negocio *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Colmado Central" {...field} />
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
                          <FormLabel>Nombre del Encargado *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Juan Pérez" {...field} />
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
                          <FormLabel>Teléfono *</FormLabel>
                          <FormControl>
                            <Input placeholder="809-000-0000" {...field} />
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
                            <Input type="email" placeholder="cliente@ejemplo.com" {...field} value={field.value || ""} />
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
                          <FormLabel>Calle *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Av. Independencia" {...field} />
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
                          <FormLabel>Número *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: 123" {...field} />
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
                          <FormLabel>Provincia *</FormLabel>
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
                          <FormLabel>Municipio *</FormLabel>
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
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Referencia de Ubicación</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Cerca del parque central" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="creditlimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Límite de Crédito (RD$)</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isCharity"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-charity-new"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-pink-500" />
                              Institución Benéfica
                            </FormLabel>
                            <FormDescription>
                              Cliente que recibe donaciones de agua
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="coordinates"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-3">
                          <FormLabel>Ubicación en Mapa</FormLabel>
                          <FormControl>
                            <div className="h-[300px] w-full border rounded-lg overflow-hidden shadow-sm">
                              <LocationSelector 
                                value={field.value || ""} 
                                onChange={field.onChange} 
                                initialCenter={[19.075380, -70.128822]} 
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Mueva el marcador para seleccionar la ubicación exacta del cliente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                        setActiveTab("list");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="gap-2"
                    >
                      {createMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Crear Cliente
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Detalles del Cliente */}
        <TabsContent value="details">
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Header con info principal */}
              <Card className="border-l-4" style={{ borderLeftColor: getZoneColor(selectedCustomer.zoneid).replace('bg-', '#') }}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      {selectedCustomer.logo ? (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-muted overflow-hidden bg-white shadow-lg">
                          <img
                            src={`data:image/jpeg;base64,${selectedCustomer.logo}`}
                            alt="Logo"
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border-2 border-muted shadow-lg">
                          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="text-center sm:text-left">
                          <h2 className="text-2xl sm:text-3xl font-bold break-words">{selectedCustomer.businessname}</h2>
                          <p className="text-muted-foreground text-base sm:text-lg mt-1">{selectedCustomer.managername}</p>
                        </div>
                        <div className="flex gap-2 justify-center sm:justify-start flex-shrink-0">
                          {!isEditing ? (
                            <Button onClick={handleEditClick} className="gap-2 w-full sm:w-auto" size={isMobile ? "sm" : "default"} data-testid="button-edit-customer">
                              <Edit className="h-4 w-4" />
                              <span className="sm:inline">Editar</span>
                            </Button>
                          ) : (
                            <Button onClick={() => setIsEditing(false)} variant="outline" className="gap-2 w-full sm:w-auto" size={isMobile ? "sm" : "default"} data-testid="button-cancel-edit">
                              <X className="h-4 w-4" />
                              <span className="sm:inline">Cancelar</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <Badge className={`${getZoneColor(selectedCustomer.zoneid)} text-white text-xs sm:text-sm`}>
                          {getZoneName(selectedCustomer.zoneid)}
                        </Badge>
                        {selectedCustomer.isCharity && (
                          <Badge variant="secondary" className="bg-pink-500 text-white gap-1 text-xs sm:text-sm">
                            <Shield className="h-3 w-3" />
                            Benéfico
                          </Badge>
                        )}
                        {selectedCustomer.rnc && (
                          <Badge variant="outline" className="text-xs sm:text-sm">
                            RNC: {selectedCustomer.rnc}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Información en dos columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Columna izquierda: Formulario */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                        {isEditing ? 'Editar Información' : 'Información del Cliente'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <ScrollArea className="h-[500px] sm:h-[600px] pr-2 sm:pr-4">
                            <div className="space-y-6">
                              {/* Sección: Información de Contacto */}
                              <div className="space-y-4">
                                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 pb-2 border-b">
                                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                  Contacto
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Teléfono</FormLabel>
                                        <FormControl>
                                          <Input {...field} readOnly={!isEditing} disabled={!isEditing} />
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
                                          <Input {...field} value={field.value || ""} readOnly={!isEditing} disabled={!isEditing} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Sección: Información del Negocio */}
                              <div className="space-y-4">
                                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 pb-2 border-b">
                                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                  Información del Negocio
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="businessname"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Nombre del Negocio</FormLabel>
                                        <FormControl>
                                          <Input {...field} readOnly={!isEditing} disabled={!isEditing} />
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
                                        <FormLabel>Encargado</FormLabel>
                                        <FormControl>
                                          <Input {...field} readOnly={!isEditing} disabled={!isEditing} />
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
                                          <Input {...field} value={field.value || ""} readOnly={!isEditing} disabled={!isEditing} />
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
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Sección: Dirección */}
                              <div className="space-y-4">
                                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 pb-2 border-b">
                                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                  Dirección
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="street"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Calle</FormLabel>
                                        <FormControl>
                                          <Input {...field} readOnly={!isEditing} disabled={!isEditing} />
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
                                          <Input {...field} readOnly={!isEditing} disabled={!isEditing} />
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
                                          disabled={!isEditing || !selectedProvinceId}
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
                                          <Input {...field} value={field.value || ""} readOnly={!isEditing} disabled={!isEditing} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Sección: Información Financiera */}
                              <div className="space-y-4">
                                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 pb-2 border-b">
                                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                  Información Financiera
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="creditlimit"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Límite de Crédito (RD$)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={field.value || "0.00"}
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
                                            disabled={!isEditing}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="isCharity"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={!isEditing}
                                            data-testid="checkbox-is-charity-detail"
                                          />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                          <FormLabel className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-pink-500" />
                                            Institución Benéfica
                                          </FormLabel>
                                          <FormDescription>
                                            Recibe donaciones
                                          </FormDescription>
                                        </div>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Sección: Ubicación en Mapa */}
                              <div className="space-y-4">
                                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 pb-2 border-b">
                                  <Map className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                  Ubicación en Mapa
                                </h3>
                                {isEditing ? (
                                  <FormField
                                    control={form.control}
                                    name="coordinates"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <div className="h-[250px] sm:h-[300px] w-full border rounded-lg overflow-hidden">
                                            <LocationSelector 
                                              value={field.value || ""} 
                                              onChange={field.onChange} 
                                              initialCenter={[19.075380, -70.128822]} 
                                            />
                                          </div>
                                        </FormControl>
                                        <FormDescription>
                                          Mueva el marcador para actualizar la ubicación
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    <div className="h-[250px] sm:h-[300px] w-full border rounded-lg overflow-hidden bg-muted/30">
                                      {selectedCustomer?.coordinates ? (
                                        <LocationSelector 
                                          value={selectedCustomer.coordinates} 
                                          onChange={() => {}} 
                                          initialCenter={[19.075380, -70.128822]}
                                          readOnly
                                        />
                                      ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground">
                                          <div className="text-center space-y-2">
                                            <MapPin className="h-12 w-12 mx-auto opacity-50" />
                                            <p className="text-sm">Sin coordenadas registradas</p>
                                            <p className="text-xs">Edita el cliente para agregar ubicación</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {selectedCustomer?.coordinates && (
                                      <p className="text-xs text-muted-foreground">
                                        📍 Coordenadas: {selectedCustomer.coordinates}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Logo Update */}
                              {isEditing && (
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 pb-2 border-b">
                                    <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    Logo del Negocio
                                  </h3>
                                  <FormField
                                    control={form.control}
                                    name="logo"
                                    render={({ field: { value, onChange, ...field } }) => (
                                      <FormItem>
                                        <FormControl>
                                          <div className="space-y-3">
                                            {typeof value === 'string' && value && (
                                              <div className="flex items-center gap-4">
                                                <img
                                                  src={`data:image/jpeg;base64,${value}`}
                                                  alt="Logo actual"
                                                  className="w-24 h-24 object-contain border rounded-lg"
                                                />
                                                <div className="text-sm text-muted-foreground">
                                                  Logo actual
                                                </div>
                                              </div>
                                            )}
                                            <Input
                                              type="file"
                                              accept="image/jpeg,image/png"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  if (file.size > 5 * 1024 * 1024) {
                                                    toast({
                                                      variant: "destructive",
                                                      title: "Error",
                                                      description: "El archivo debe ser menor a 5MB",
                                                    });
                                                    e.target.value = '';
                                                    return;
                                                  }
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
                                          </div>
                                        </FormControl>
                                        <FormDescription>
                                          JPG o PNG, máximo 5MB
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              )}
                            </div>
                          </ScrollArea>

                          {isEditing && (
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                                className="w-full sm:w-auto"
                                size={isMobile ? "sm" : "default"}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="gap-2 w-full sm:w-auto"
                                size={isMobile ? "sm" : "default"}
                              >
                                {updateMutation.isPending ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Guardando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4" />
                                    Guardar Cambios
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>

                {/* Columna derecha: Balance */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    <CustomerBalance 
                      customerId={selectedCustomer.id} 
                      customerName={selectedCustomer.businessname}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para captura de ubicación */}
      {locationCaptureCustomer && (
        <LocationCaptureDialog
          open={locationDialogOpen}
          onOpenChange={setLocationDialogOpen}
          customerId={locationCaptureCustomer.id}
          customerName={locationCaptureCustomer.businessname}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          }}
        />
      )}
    </div>
  );
}
