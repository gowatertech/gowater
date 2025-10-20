import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMobile } from "@/hooks/use-mobile";
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  Edit, 
  Trash, 
  X,
  Shield, 
  Truck,
  UserCog,
  User as UserIcon,
  HeartPulse,
  Phone,
  Mail,
  Calendar,
  MoreVertical,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Users() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useCurrentUser();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("list");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const isMobile = useMobile();

  // Consulta de usuarios
  const { data: usersResponse = [], isLoading, error: usersError } = useQuery({
    queryKey: ["/api/users"],
    retry: 1,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (usersError) {
      console.error("❌ Error al cargar usuarios:", usersError);
    }
  }, [usersError]);
  
  // Asegurarnos de que siempre tenemos un array de usuarios
  const users = useMemo(() => {
    if (Array.isArray(usersResponse)) {
      return usersResponse as User[];
    } else if (usersResponse && typeof usersResponse === 'object' && 'data' in usersResponse) {
      return (usersResponse as any).data as User[];
    }
    return [] as User[];
  }, [usersResponse]);

  // Formulario con esquema de validación condicional
  const formSchema = editingUser
    ? insertUserSchema.extend({
        password: z.union([
          z.string().length(0), // Permite string vacío para mantener la contraseña actual
          z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
        ]),
      })
    : insertUserSchema;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role: "admin",
      companyId: currentUser?.companyId || undefined,
      phone: "",
      license: "",
      licenseExpiry: "",
      emergencyContact: "",
      active: true,
    },
  });
  
  // Actualizar companyId cuando currentUser cambie
  useEffect(() => {
    if (currentUser?.companyId) {
      form.setValue('companyId', currentUser.companyId);
    }
  }, [currentUser, form]);

  // Mutaciones
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.companyId && currentUser?.companyId) {
        data.companyId = currentUser.companyId;
      }
      
      if (!data.companyId) {
        throw new Error("No se pudo determinar el ID de la compañía para crear el usuario");
      }
      
      try {
        const response = await apiRequest({
          url: "/api/users",
          method: "POST",
          data: data
        });
        
        return response;
      } catch (error) {
        console.error("Error al crear usuario:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t("success"),
        description: t("userCreated"),
      });
      setActiveTab("list");
      form.reset();
    },
    onError: (error: Error) => {
      console.error('Error en createUserMutation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest({
        url: `/api/users/${id}`,
        method: "PUT",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t("success"),
        description: t("userUpdated"),
      });
      setActiveTab("list");
      setEditingUser(null);
    },
    onError: (error: Error) => {
      console.error('Error en updateUserMutation:', error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({
        url: `/api/users/${id}`,
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t("success"),
        description: t("userDeleted"),
      });
    },
    onError: (error: Error) => {
      console.error('Error en deleteUserMutation:', error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: any) => {
    try {
      if (editingUser) {
        if (!currentUser?.companyId) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo obtener el ID de la compañía actual"
          });
          return;
        }

        const updateData = {
          ...data,
          companyId: Number(currentUser.companyId),
          licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry).toISOString() : undefined
        };

        // Si el campo de contraseña está vacío o solo tiene espacios, eliminarlo para no actualizar la contraseña
        if (!updateData.password || updateData.password.trim() === '') {
          delete updateData.password;
        }

        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: updateData
        });
        return;
      }

      const existingUser = users.find(u => u.username === data.username);
      if (existingUser) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Este nombre de usuario ya existe"
        });
        return;
      }

      if (!data.name || !data.username || !data.password || !data.role) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Faltan campos obligatorios: nombre, usuario, contraseña o rol"
        });
        return;
      }

      if (!data.companyId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo obtener el ID de la compañía"
        });
        return;
      }
      
      const formattedData = {
        name: data.name,
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        role: data.role,
        companyId: Number(data.companyId),
        phone: data.phone || undefined,
        license: data.license || undefined,
        ...(data.licenseExpiry ? { licenseExpiry: data.licenseExpiry } : {}),
        emergencyContact: data.emergencyContact || undefined,
        active: true
      };
      
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(formattedData),
          credentials: "include"
        });
        
        let respuestaJson;
        const contentType = response.headers.get("content-type");
        
        try {
          if (contentType && contentType.includes("application/json")) {
            respuestaJson = await response.json();
          } else {
            const text = await response.text();
            try {
              respuestaJson = JSON.parse(text);
            } catch (e) {
              respuestaJson = { message: text };
            }
          }
          
          if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            if (respuestaJson.error) errorMsg += `: ${respuestaJson.error}`;
            if (respuestaJson.message) errorMsg += ` - ${respuestaJson.message}`;
            
            throw new Error(errorMsg);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          throw new Error(`Error procesando respuesta: ${errorMessage}`);
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        
        toast({
          title: "Éxito",
          description: "Usuario creado correctamente"
        });
        
        handleFormSuccess();
        
        return respuestaJson;
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error al crear usuario",
          description: err instanceof Error ? err.message : "Error en la comunicación con el servidor"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: error instanceof Error ? error.message : 'Error desconocido en el procesamiento'
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      username: user.username,
      email: user.email || "",
      password: "",
      role: user.role,
      companyId: currentUser?.companyId,
      phone: user.phone || "",
      license: user.license || "",
      licenseExpiry: user.licenseExpiry ? format(new Date(user.licenseExpiry), "yyyy-MM-dd") : "",
      emergencyContact: user.emergencyContact || "",
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm(t("confirmDelete"))) {
      deleteUserMutation.mutate(id);
    }
  };
  
  const handleEditWithTabChange = (user: User) => {
    handleEdit(user);
    setActiveTab("form");
  };
  
  const handleCancel = () => {
    form.reset({
      name: "",
      username: "",
      email: "",
      password: "",
      role: "admin",
      companyId: currentUser?.companyId,
      phone: "",
      license: "",
      licenseExpiry: "",
      emergencyContact: "",
      active: true,
    });
    setEditingUser(null);
    setActiveTab("list");
  };

  const handleFormSuccess = () => {
    form.reset({
      name: "",
      username: "",
      email: "",
      password: "",
      role: "admin",
      companyId: currentUser?.companyId,
      phone: "",
      license: "",
      licenseExpiry: "",
      emergencyContact: "",
      active: true,
    });
    setEditingUser(null);
    setActiveTab("list");
  };
  
  // Estadísticas de usuarios calculadas
  const userStats = useMemo(() => {
    const totalUsers = users.filter(u => u.active).length;
    const totalAdmins = users.filter(user => user.active && user.role === "admin").length;
    const totalDrivers = users.filter(user => user.active && user.role === "driver").length;
    const totalAssistants = users.filter(user => user.active && user.role === "assistant").length;
    
    return {
      totalUsers,
      totalAdmins,
      totalDrivers,
      totalAssistants
    };
  }, [users]);
  
  // Usuarios filtrados por búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users.filter(user => user.active);
    
    const query = searchQuery.toLowerCase();
    return users
      .filter(user => user.active)
      .filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.username.toLowerCase().includes(query) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.phone && user.phone.toLowerCase().includes(query)) ||
        t(user.role).toLowerCase().includes(query)
      );
  }, [users, searchQuery, t]);

  // Función helper para renderizar rol con icono
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return Shield;
      case "driver":
        return Truck;
      case "assistant":
        return HeartPulse;
      default:
        return UserIcon;
    }
  };

  // Función helper para obtener color de badge por rol
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "driver":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "assistant":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "supervisor":
        return "bg-green-50 text-green-700 border-green-200";
      case "cashier":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Estado de carga */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg shadow-sm border">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
        </div>
      )}
      
      {/* Error al cargar */}
      {usersError && (
        <div className="flex flex-col items-center justify-center p-4 bg-destructive/10 rounded-lg border border-destructive">
          <p className="text-sm font-medium text-destructive mb-2">Error al cargar usuarios</p>
          <p className="text-xs text-muted-foreground mb-2">{String(usersError)}</p>
          <p className="text-xs text-muted-foreground">Parece que has perdido la sesión. Por favor, vuelve a iniciar sesión.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.location.href = '/auth/login'}
            data-testid="button-relogin"
          >
            Volver a iniciar sesión
          </Button>
        </div>
      )}
      
      {/* Tarjetas de estadísticas y contenido - todo lo ocultamos si hay error o está cargando */}
      {!isLoading && !usersError && (
        <>
          {/* Header con título y botón */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t("users")}</h1>
            <Button 
              onClick={() => {
                form.reset({
                  name: "",
                  username: "",
                  email: "",
                  password: "",
                  role: "admin",
                  companyId: currentUser?.companyId,
                  phone: "",
                  license: "",
                  licenseExpiry: "",
                  emergencyContact: "",
                  active: true,
                });
                setEditingUser(null);
                setActiveTab("form");
              }}
              size="sm"
              data-testid="button-add-user"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t("addUser")}
            </Button>
          </div>

          {/* Tarjetas de estadísticas modernas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-blue-500">
                    <UsersIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Usuarios</p>
                    <p className="text-2xl font-bold">{userStats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-green-500">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Administradores</p>
                    <p className="text-2xl font-bold">{userStats.totalAdmins}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-yellow-500">
                    <Truck className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Conductores</p>
                    <p className="text-2xl font-bold">{userStats.totalDrivers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-purple-500">
                    <HeartPulse className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 p-4">
                    <p className="text-sm text-muted-foreground mb-1">Asistentes</p>
                    <p className="text-2xl font-bold">{userStats.totalAssistants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs de navegación */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} mb-2 h-10`}>
              <TabsTrigger value="list" className="flex items-center gap-2" data-testid="tab-list">
                <UsersIcon className="h-4 w-4" />
                <span>Lista</span>
              </TabsTrigger>
              <TabsTrigger value="form" className="flex items-center gap-2" data-testid="tab-form">
                <UserPlus className="h-4 w-4 text-blue-500" />
                <span>{editingUser ? "Editar" : "Nuevo"}</span>
              </TabsTrigger>
              {!isMobile && (
                <TabsTrigger value="inactive" className="flex items-center gap-2" data-testid="tab-inactive">
                  <UserCog className="h-4 w-4" />
                  <span>Inactivos</span>
                </TabsTrigger>
              )}
            </TabsList>
        
            {/* Contenido del Tab de Lista de Usuarios */}
            <TabsContent value="list" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">Directorio de Usuarios</CardTitle>
                      {filteredUsers.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filteredUsers.length} de {users.filter(u => u.active).length}
                        </Badge>
                      )}
                    </div>

                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuarios..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9"
                        data-testid="input-search-user"
                        aria-label="Buscar usuarios"
                      />
                      {searchQuery && (
                        <Button
                          onClick={() => setSearchQuery("")}
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
                </CardHeader>

                <CardContent className="p-4 pt-0">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <UsersIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                      <h3 className="font-medium text-lg mb-1">
                        {searchQuery ? "No se encontraron usuarios" : "No hay usuarios"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery 
                          ? "Intenta con otro término de búsqueda" 
                          : "Los usuarios aparecerán aquí cuando se registren"}
                      </p>
                      {searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery("")}
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
                        {filteredUsers.map((user) => {
                          const RoleIcon = getRoleIcon(user.role);
                          return (
                            <Card 
                              key={user.id}
                              className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50"
                              data-testid={`card-user-${user.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="relative flex-shrink-0">
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-background shadow-sm">
                                      <RoleIcon className="h-6 w-6 text-blue-600" />
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h3 
                                      className="font-semibold text-base mb-1 line-clamp-1" 
                                      data-testid={`text-user-name-${user.id}`}
                                    >
                                      {user.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                                    <Badge 
                                      className={`text-xs mt-1 ${getRoleBadgeClass(user.role)}`}
                                    >
                                      {t(user.role)}
                                    </Badge>
                                  </div>

                                  <DropdownMenu 
                                    open={openDropdownId === user.id} 
                                    onOpenChange={(open) => setOpenDropdownId(open ? user.id : null)}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        aria-label="Más acciones"
                                        data-testid={`button-actions-${user.id}`}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleEditWithTabChange(user)}
                                        data-testid={`menu-edit-${user.id}`}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(user.id)}
                                        className="text-destructive"
                                        data-testid={`menu-delete-${user.id}`}
                                      >
                                        <Trash className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  {user.phone && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                                      <p className="text-sm font-medium flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        <span className="truncate">{user.phone}</span>
                                      </p>
                                    </div>
                                  )}
                                  {user.email && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                                      <p className="text-sm font-medium flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{user.email}</span>
                                      </p>
                                    </div>
                                  )}
                                  {user.role === "driver" && user.license && (
                                    <div className="col-span-2">
                                      <p className="text-xs text-muted-foreground mb-1">Licencia</p>
                                      <p className="text-sm font-medium">{user.license}</p>
                                      {user.licenseExpiry && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                          <Calendar className="h-3 w-3" />
                                          Vence: {format(new Date(user.licenseExpiry), "dd/MM/yyyy", { locale: es })}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Vista desktop - Tabla moderna */}
                      <div className="hidden md:block">
                        <ScrollArea className="h-[calc(100vh-450px)]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredUsers.map((user) => {
                                const RoleIcon = getRoleIcon(user.role);
                                return (
                                  <TableRow 
                                    key={user.id}
                                    data-testid={`row-user-${user.id}`}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                                          <RoleIcon className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <p className="font-medium">{user.name}</p>
                                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getRoleBadgeClass(user.role)}>
                                        {t(user.role)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        {user.phone && (
                                          <p className="text-sm flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {user.phone}
                                          </p>
                                        )}
                                        {user.email && (
                                          <p className="text-sm flex items-center gap-1 text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            {user.email}
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 w-8 p-0"
                                            aria-label="Más acciones"
                                            data-testid={`button-actions-desktop-${user.id}`}
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            onClick={() => handleEditWithTabChange(user)}
                                            data-testid={`menu-edit-desktop-${user.id}`}
                                          >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => handleDelete(user.id)}
                                            className="text-destructive"
                                            data-testid={`menu-delete-desktop-${user.id}`}
                                          >
                                            <Trash className="h-4 w-4 mr-2" />
                                            Eliminar
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
        
            <TabsContent value="form" className="mt-2 p-2">
              <Card className="p-4 bg-background">
                <h2 className="text-xl font-bold pb-4">
                  {editingUser ? t("editUser") : t("addUser")}
                </h2>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Sección de información básica */}
                    <div className="bg-muted/30 p-4 rounded-md space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("basicInfo")}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("name")}</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder={t("enterName")}
                                  autoComplete="name"
                                  data-testid="input-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("role")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-role">
                                    <SelectValue placeholder={t("selectRole")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">{t("admin")}</SelectItem>
                                  <SelectItem value="supervisor">{t("supervisor")}</SelectItem>
                                  <SelectItem value="cashier">{t("cashier")}</SelectItem>
                                  <SelectItem value="driver">{t("driver")}</SelectItem>
                                  <SelectItem value="assistant">{t("assistant")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Sección de credenciales */}
                    <div className="bg-muted/30 p-4 rounded-md space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("credentials")}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("username")}</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder={t("enterUsername")}
                                  autoComplete="username"
                                  data-testid="input-username"
                                />
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
                              <FormLabel>{t("email")}</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="ejemplo@correo.com"
                                  autoComplete="email"
                                  type="email"
                                  data-testid="input-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="md:col-span-1">
                              <FormLabel>{editingUser ? t("newPassword") : t("password")}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  {...field}
                                  placeholder={editingUser ? t("leaveEmptyToKeep") : t("enterPassword")}
                                  autoComplete={editingUser ? "new-password" : "current-password"}
                                  data-testid="input-password"
                                />
                              </FormControl>
                              {editingUser && (
                                <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Sección de contacto */}
                    <div className="bg-muted/30 p-4 rounded-md space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("contactInfo")}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("phone")}</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder={t("enterPhone")}
                                  type="tel"
                                  autoComplete="tel"
                                  data-testid="input-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="emergencyContact"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>{t("emergencyContact")}</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder={t("enterEmergencyContact")}
                                  type="tel"
                                  data-testid="input-emergency"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Sección específica para conductores */}
                    {form.watch("role") === "driver" && (
                      <div className="bg-muted/30 p-4 rounded-md space-y-3">
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("driverInfo")}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="license"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("license")}</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder={t("enterLicense")}
                                    data-testid="input-license"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="licenseExpiry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("licenseExpiry")}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ''}
                                    data-testid="input-license-expiry"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* Campo oculto para companyId */}
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input 
                              type="hidden" 
                              {...field} 
                              value={field.value ? String(field.value) : ''}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-end gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={handleCancel}
                        data-testid="button-cancel"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t("cancel")}
                      </Button>
                      <Button 
                        type="submit"
                        disabled={!currentUser?.companyId}
                        data-testid="button-submit"
                      >
                        {editingUser 
                          ? <Edit className="h-4 w-4 mr-2" /> 
                          : <UserPlus className="h-4 w-4 mr-2" />
                        }
                        {editingUser ? t("update") : t("create")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            </TabsContent>
          
            <TabsContent value="inactive" className="mt-2 p-2">
              <Card>
                <CardHeader>
                  <CardTitle>Usuarios Inactivos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.filter(user => !user.active).map((user) => (
                          <TableRow key={user.id} className="opacity-60" data-testid={`row-inactive-${user.id}`}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeClass(user.role)}>
                                {t(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.phone || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditWithTabChange(user)}
                                aria-label="Editar usuario"
                                data-testid={`button-edit-inactive-${user.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {users.filter(user => !user.active).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No hay usuarios inactivos
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
