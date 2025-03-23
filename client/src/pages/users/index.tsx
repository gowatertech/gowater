import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("users")}</h1>
        <Button onClick={() => {
          form.reset();
          setEditingUser(null);
          setActiveTab("form");
        }}>
          {t("addUser")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="list">{t("users")}</TabsTrigger>
          <TabsTrigger value="form">{editingUser ? t("editUser") : t("addUser")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-0">
          <Card>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("username")}</TableHead>
                      <TableHead>{t("role")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("phone")}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t("license")}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t("licenseExpiry")}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t("emergencyContact")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(user => user.active).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{t(user.role)}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.phone || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{user.role === "driver" ? user.license || "-" : "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {user.role === "driver" && user.licenseExpiry
                            ? format(new Date(user.licenseExpiry), "PPP", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{user.emergencyContact || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => handleEditWithTabChange(user)}
                          >
                            {t("edit")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                          >
                            {t("delete")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
        
        <TabsContent value="form" className="mt-0">
          <Card className="p-4 md:p-6">
            <h2 className="text-xl font-bold text-center pb-4">
              {editingUser ? t("editUser") : t("addUser")}
            </h2>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(async (data) => {
                await onSubmit(data);
                handleFormSuccess();
              })} className="space-y-6">
                {/* Sección de información básica */}
                <div className="bg-muted/30 p-4 rounded-md space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">{t("basicInfo")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormItem>
                          <FormLabel>{editingUser ? t("newPassword") : t("password")}</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field}
                              placeholder={editingUser ? t("leaveEmptyToKeep") : t("enterPassword")}
                              autoComplete={editingUser ? "new-password" : "current-password"}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormItem>
                          <FormLabel>{t("emergencyContact")}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder={t("enterEmergencyContact")}
                              type="tel"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={handleCancel}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit">
                    {editingUser ? t("update") : t("create")}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}