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
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Formulario
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      username: "",
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
      const response = await apiRequest("POST", "/api/users", data);
      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
        // Verificar si es un error de usuario duplicado
        if (error.error?.includes('duplicate key value violates unique constraint "users_username_unique"')) {
          throw new Error('Este usuario ya existe');
        }
        throw new Error(error.error || 'Error al crear usuario');
      }
      return response.json();
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
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar usuario');
      }
      return response.json();
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
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar usuario');
      }
      return response.json();
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
        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data
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
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("users")}</h1>
        <Button 
          onClick={() => {
            form.reset();
            setEditingUser(null);
            setActiveTab("form");
          }}
          size="sm"
          className="h-8 sm:h-10 text-xs sm:text-sm"
        >
          <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {t("addUser")}
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Usuarios</p>
              <p className="text-sm sm:text-lg font-bold text-blue-600">{userStats.totalUsers}</p>
            </div>
            <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Administradores</p>
              <p className="text-sm sm:text-lg font-bold text-green-600">{userStats.totalAdmins}</p>
            </div>
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Conductores</p>
              <p className="text-sm sm:text-lg font-bold text-yellow-600">{userStats.totalDrivers}</p>
            </div>
            <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Asistentes</p>
              <p className="text-sm sm:text-lg font-bold text-purple-600">{userStats.totalAssistants}</p>
            </div>
            <HeartPulse className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con pestañas */}
      <div className="bg-card rounded-lg shadow-sm border p-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-8 sm:h-9">
            <TabsTrigger value="list" className="text-xs sm:text-sm">Listado</TabsTrigger>
            <TabsTrigger value="form" className="text-xs sm:text-sm">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs sm:text-sm">Inactivos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-2 p-2">
            {/* Barra de búsqueda */}
            <div className="flex items-center mb-3 sm:mb-4 relative">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, usuario o rol..."
                className="pl-7 sm:pl-8 w-full text-xs sm:text-sm h-8 sm:h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <X
                  className="absolute right-2.5 top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>

            <ScrollArea className="h-[calc(100vh-310px)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-2">{t("name")}</TableHead>
                      <TableHead className="py-2">{t("username")}</TableHead>
                      <TableHead className="py-2">{t("role")}</TableHead>
                      <TableHead className="py-2 hidden md:table-cell">{t("phone")}</TableHead>
                      <TableHead className="py-2 hidden lg:table-cell">{t("license")}</TableHead>
                      <TableHead className="py-2 text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="h-10 sm:h-12">
                        <TableCell className="py-1 sm:py-2">{user.name}</TableCell>
                        <TableCell className="py-1 sm:py-2">{user.username}</TableCell>
                        <TableCell className="py-1 sm:py-2">
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0.5 ${
                              user.role === "admin" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              user.role === "driver" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              user.role === "assistant" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {t(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1 sm:py-2 hidden md:table-cell">{user.phone || "-"}</TableCell>
                        <TableCell className="py-1 sm:py-2 hidden lg:table-cell">
                          {user.role === "driver" && user.licenseExpiry
                            ? format(new Date(user.licenseExpiry), "dd/MM/yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="py-1 sm:py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 mr-1"
                            onClick={() => handleEditWithTabChange(user)}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 text-destructive"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
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
                  <div className="bg-muted/30 p-3 sm:p-4 rounded-md space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("basicInfo")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
          
          <TabsContent value="inactive" className="mt-2 p-1 sm:p-2">
            <ScrollArea className="h-[calc(100vh-330px)] md:h-[calc(100vh-310px)]">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-1 sm:py-2">{t("name")}</TableHead>
                      <TableHead className="py-1 sm:py-2">{t("username")}</TableHead>
                      <TableHead className="py-1 sm:py-2">{t("role")}</TableHead>
                      <TableHead className="py-1 sm:py-2 hidden md:table-cell">{t("phone")}</TableHead>
                      <TableHead className="py-1 sm:py-2 text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {users.filter(user => !user.active).map((user) => (
                      <TableRow key={user.id} className="opacity-60 h-10 sm:h-12">
                        <TableCell className="py-1 sm:py-2">{user.name}</TableCell>
                        <TableCell className="py-1 sm:py-2">{user.username}</TableCell>
                        <TableCell className="py-1 sm:py-2">
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0.5 ${
                              user.role === "admin" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              user.role === "driver" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              user.role === "assistant" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              "bg-green-50 text-green-700 border-green-200"
                            }`}
                          >
                            {t(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1 sm:py-2 hidden md:table-cell">{user.phone || "-"}</TableCell>
                        <TableCell className="py-1 sm:py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 mr-1"
                            onClick={() => handleEditWithTabChange(user)}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-8 sm:w-8 text-destructive"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
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
    </div>
  );
}