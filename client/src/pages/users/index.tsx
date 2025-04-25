import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
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
  HeartPulse
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { insertUserSchema } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Users() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Consulta de usuarios
  const { data: usersResponse = [], isLoading, error: usersError } = useQuery({
    queryKey: ["/api/users"],
    onSuccess: (data) => {
      console.log("✅ Datos de usuarios recibidos:", data);
    },
    onError: (error) => {
      console.error("❌ Error al cargar usuarios:", error);
    },
    retry: 1 // Reducir reintentos para ver errores más rápido
  });
  
  // Asegurarnos de que siempre tenemos un array de usuarios
  // La API puede devolver directamente el array o un objeto con formato { success, data }
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
        password: insertUserSchema.shape.password.optional(),
      })
    : insertUserSchema;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "", // Añadido campo de email
      password: "",
      role: "admin",
      phone: "",
      license: "",
      licenseExpiry: "",
      emergencyContact: "",
      active: true,
    },
  });

  // Mutaciones
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      // Utilizar directamente apiRequest que ya maneja la lógica de errores y JSON
      return apiRequest({
        url: "/api/users",
        method: "POST",
        data: data
      });
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
      // Utilizar directamente apiRequest que ya maneja la lógica de errores y JSON
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
      // Utilizar directamente apiRequest que ya maneja la lógica de errores y JSON
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

  // Actualizar la función onSubmit
  const onSubmit = async (data: any) => {
    try {
      // Si estamos editando, proceder con la actualización
      if (editingUser) {
        // Preparar datos para la actualización
        const updateData = {
          ...data,
          licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry).toISOString() : undefined
        };

        // Si la contraseña está vacía, eliminarla del objeto para no actualizarla
        if (!updateData.password) {
          delete updateData.password;
        }

        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: updateData
        });
        return;
      }

      // Verificar si el usuario ya existe antes de crear
      const existingUser = users.find(u => u.username === data.username);
      if (existingUser) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Este usuario ya existe"
        });
        return;
      }

      // Formatear los datos antes de enviar
      const formattedData = {
        ...data,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry).toISOString() : undefined
      };

      // Si no existe, crear el usuario
      await createUserMutation.mutateAsync(formattedData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      username: user.username,
      email: user.email || "", // Añadido email para edición
      password: "",
      role: user.role,
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

  const [activeTab, setActiveTab] = useState<string>("list");
  
  // Cambiar a la pestaña de formulario cuando se edita un usuario
  const handleEditWithTabChange = (user: User) => {
    handleEdit(user);
    setActiveTab("form");
  };
  
  // Reset del formulario y regreso a la lista
  const handleCancel = () => {
    form.reset();
    setEditingUser(null);
    setActiveTab("list");
  };

  // Después de crear o actualizar un usuario, regresar a la lista
  const handleFormSuccess = () => {
    form.reset();
    setEditingUser(null);
    setActiveTab("list");
  };

  // Filtro de búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estadísticas de usuarios calculadas
  const userStats = useMemo(() => {
    const totalUsers = users.length;
    const totalAdmins = users.filter(user => user.role === "admin").length;
    const totalDrivers = users.filter(user => user.role === "driver").length;
    const totalAssistants = users.filter(user => user.role === "assistant").length;
    
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
        t(user.role).toLowerCase().includes(query)
      );
  }, [users, searchQuery, t]);

  return (
    <div className="p-2 sm:p-3 md:p-4">
      {/* Estado de carga */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg shadow-sm border mb-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
        </div>
      )}
      
      {/* Error al cargar */}
      {usersError && (
        <div className="flex flex-col items-center justify-center p-4 bg-destructive/10 rounded-lg border border-destructive mb-4">
          <p className="text-sm font-medium text-destructive mb-2">Error al cargar usuarios</p>
          <p className="text-xs text-muted-foreground mb-2">{String(usersError)}</p>
          <p className="text-xs text-muted-foreground">Parece que has perdido la sesión. Por favor, vuelve a iniciar sesión.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.location.href = '/auth/login'}
          >
            Volver a iniciar sesión
          </Button>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{t("users")}</h1>
        <Button 
          onClick={() => {
            form.reset();
            setEditingUser(null);
            setActiveTab("form");
          }}
          size="sm"
          className="h-7 sm:h-8 text-xs px-2 py-0"
          disabled={isLoading || !!usersError}
        >
          <UserPlus className="h-3 w-3 mr-1" />
          {t("addUser")}
        </Button>
      </div>

      {/* Tarjetas de estadísticas y contenido - todo lo ocultamos si hay error o está cargando */}
      {(isLoading || usersError) ? null : (
        <>
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-1 sm:p-1.5 md:p-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Usuarios</p>
                  <p className="text-sm font-bold text-blue-600">{userStats.totalUsers}</p>
                </div>
                <UsersIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-100">
              <CardContent className="p-1 sm:p-1.5 md:p-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Administradores</p>
                  <p className="text-sm font-bold text-green-600">{userStats.totalAdmins}</p>
                </div>
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-100">
              <CardContent className="p-1 sm:p-1.5 md:p-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Conductores</p>
                  <p className="text-sm font-bold text-yellow-600">{userStats.totalDrivers}</p>
                </div>
                <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-100">
              <CardContent className="p-1 sm:p-1.5 md:p-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Asistentes</p>
                  <p className="text-sm font-bold text-purple-600">{userStats.totalAssistants}</p>
                </div>
                <HeartPulse className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
              </CardContent>
            </Card>
          </div>

          {/* Contenido principal con pestañas */}
          <div className="bg-card rounded-lg shadow-sm border p-0.5 sm:p-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-7 sm:h-8">
                <TabsTrigger value="list" className="text-[10px] sm:text-xs">Listado</TabsTrigger>
                <TabsTrigger value="form" className="text-[10px] sm:text-xs">{editingUser ? "Editar" : "Nuevo"}</TabsTrigger>
                <TabsTrigger value="inactive" className="text-[10px] sm:text-xs">Inactivos</TabsTrigger>
              </TabsList>
          
          <TabsContent value="list" className="mt-1 p-1 sm:p-2">
            {/* Barra de búsqueda */}
            <div className="flex items-center mb-2 sm:mb-3 relative">
              <Search className="absolute left-2 top-1.5 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-6 sm:pl-8 w-full text-[10px] sm:text-xs h-6 sm:h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <X
                  className="absolute right-2 top-1.5 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>

            <ScrollArea className="h-[calc(100vh-300px)] md:h-[calc(100vh-290px)]">
              <div className="w-full overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="text-[10px] sm:text-xs">
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3">{t("name")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3 hidden sm:table-cell">{t("username")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3">{t("role")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3 hidden md:table-cell">{t("phone")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3 hidden lg:table-cell">{t("license")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3 text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px] sm:text-xs">
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="h-7 sm:h-9">
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3">{user.name}</TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3 hidden sm:table-cell">{user.username}</TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] sm:text-xs px-1 py-0 ${
                              user.role === "admin" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              user.role === "driver" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              user.role === "assistant" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {t(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3 hidden md:table-cell">{user.phone || "-"}</TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3 hidden lg:table-cell">
                          {user.role === "driver" && user.licenseExpiry
                            ? format(new Date(user.licenseExpiry), "dd/MM/yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 sm:h-6 sm:w-6 mr-0.5 sm:mr-1 p-0"
                            onClick={() => handleEditWithTabChange(user)}
                          >
                            <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 sm:h-6 sm:w-6 text-destructive p-0"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No se encontraron usuarios con los criterios de búsqueda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>
        
          <TabsContent value="form" className="mt-2 p-2 px-1 sm:p-3">
            <Card className="p-3 sm:p-4 bg-background shadow-none border-0">
              <h2 className="text-lg sm:text-xl font-bold pb-2 sm:pb-4 text-center sm:text-left">
                {editingUser ? t("editUser") : t("addUser")}
              </h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(async (data) => {
                  await onSubmit(data);
                  handleFormSuccess();
                })} className="space-y-4 sm:space-y-6">
                  {/* Sección de información básica */}
                  <div className="bg-muted/30 p-2 sm:p-3 md:p-4 rounded-md space-y-2 sm:space-y-3">
                    <h3 className="font-medium text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{t("basicInfo")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">{t("name")}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={t("enterName")}
                                autoComplete="name"
                                className="text-sm sm:text-base"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">{t("role")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="text-sm sm:text-base">
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
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Sección de credenciales en 3 columnas en pantallas grandes */}
                  <div className="bg-muted/30 p-2 sm:p-3 md:p-4 rounded-md space-y-2 sm:space-y-3">
                    <h3 className="font-medium text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{t("credentials")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">{t("username")}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={t("enterUsername")}
                                autoComplete="username"
                                className="text-sm sm:text-base"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">{t("email")}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="ejemplo@correo.com"
                                autoComplete="email"
                                className="text-sm sm:text-base"
                                type="email"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="lg:col-span-2">
                            <FormLabel className="text-sm">{editingUser ? t("newPassword") : t("password")}</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                {...field}
                                placeholder={editingUser ? t("leaveEmptyToKeep") : t("enterPassword")}
                                autoComplete={editingUser ? "new-password" : "current-password"}
                                className="text-sm sm:text-base"
                              />
                            </FormControl>
                            {editingUser && (
                              <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
                            )}
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Sección de contacto en 3 columnas en pantallas grandes */}
                  <div className="bg-muted/30 p-2 sm:p-3 md:p-4 rounded-md space-y-2 sm:space-y-3">
                    <h3 className="font-medium text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{t("contactInfo")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">{t("phone")}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={t("enterPhone")}
                                type="tel"
                                autoComplete="tel"
                                className="text-sm sm:text-base"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContact"
                        render={({ field }) => (
                          <FormItem className="lg:col-span-2">
                            <FormLabel className="text-sm">{t("emergencyContact")}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={t("enterEmergencyContact")}
                                type="tel"
                                className="text-sm sm:text-base"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Sección específica para conductores */}
                  {form.watch("role") === "driver" && (
                    <div className="bg-muted/30 p-2 sm:p-3 md:p-4 rounded-md space-y-2 sm:space-y-3">
                      <h3 className="font-medium text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{t("driverInfo")}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        <FormField
                          control={form.control}
                          name="license"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">{t("license")}</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder={t("enterLicense")}
                                  className="text-sm sm:text-base"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="licenseExpiry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">{t("licenseExpiry")}</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ''}
                                  className="text-sm sm:text-base"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={handleCancel}
                      size="sm"
                      className="h-8 text-xs sm:text-sm px-2 sm:h-9 sm:px-3"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {t("cancel")}
                    </Button>
                    <Button 
                      type="submit"
                      size="sm"
                      className="h-8 text-xs sm:text-sm px-2 sm:h-9 sm:px-4"
                    >
                      {editingUser 
                        ? <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> 
                        : <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      }
                      {editingUser ? t("update") : t("create")}
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          </TabsContent>
          
          <TabsContent value="inactive" className="mt-1 p-1 sm:p-2">
            <ScrollArea className="h-[calc(100vh-300px)] md:h-[calc(100vh-290px)]">
              <div className="w-full overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="text-[10px] sm:text-xs">
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3">{t("name")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3 hidden sm:table-cell">{t("username")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3">{t("role")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3 hidden md:table-cell">{t("phone")}</TableHead>
                      <TableHead className="py-0.5 sm:py-1 px-1 sm:px-3 text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px] sm:text-xs">
                    {users.filter(user => !user.active).map((user) => (
                      <TableRow key={user.id} className="opacity-60 h-7 sm:h-9">
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3">{user.name}</TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3 hidden sm:table-cell">{user.username}</TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] sm:text-xs px-1 py-0 ${
                              user.role === "admin" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              user.role === "driver" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              user.role === "assistant" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {t(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3 hidden md:table-cell">{user.phone || "-"}</TableCell>
                        <TableCell className="py-0.5 sm:py-1 px-1 sm:px-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 sm:h-6 sm:w-6 mr-0.5 sm:mr-1 p-0"
                            onClick={() => handleEditWithTabChange(user)}
                          >
                            <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 sm:h-6 sm:w-6 text-destructive p-0"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
        </>
      )}
    </div>
  );
}