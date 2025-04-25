import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Loader2, 
  User as UserIcon,
  ShieldCheck,
  Building2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { PlatformLayout } from "../_components/PlatformLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// Esquema de validación para el formulario
const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional(), // Opcional para edición
  role: z.enum(["platform_admin", "company_admin"], {
    required_error: "El rol es requerido",
  }),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function UserFormPage() {
  const params = useParams();
  const isEditMode = !!params.id && params.id !== "new";
  const userId = isEditMode ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

  // Consulta para obtener detalles del usuario (solo en modo edición)
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: [`/api/platform/platform-users/${userId}`],
    queryFn: () => 
      apiRequest({
        url: `/api/platform/platform-users/${userId}`,
        method: "GET"
      }),
    enabled: isEditMode && !!userId,
  });

  // Consulta para obtener la lista de empresas
  const { data: companiesData } = useQuery({
    queryKey: ["/api/platform/companies"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/companies",
        method: "GET"
      }),
  });

  // Consulta para obtener las empresas asignadas al usuario (solo en modo edición)
  const { data: userCompaniesData, isLoading: isLoadingUserCompanies } = useQuery({
    queryKey: [`/api/platform/platform-users/${userId}/companies`],
    queryFn: () => 
      apiRequest({
        url: `/api/platform/platform-users/${userId}/companies`,
        method: "GET"
      }),
    enabled: isEditMode && !!userId,
  });

  // Configuración del formulario
  const form = useForm<FormData>({
    resolver: zodResolver(
      isEditMode 
        ? formSchema.omit({ password: true }) // En modo edición, la contraseña es opcional
        : formSchema // En modo creación, la contraseña es obligatoria
    ),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "company_admin",
      isActive: true,
    },
  });

  // Actualizar el formulario cuando se carga el usuario
  useEffect(() => {
    if (isEditMode && userData?.data) {
      const user = userData.data;
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    }
  }, [userData, form, isEditMode]);

  // Actualizar las empresas seleccionadas cuando se cargan
  useEffect(() => {
    if (isEditMode && userCompaniesData?.data?.companies) {
      setSelectedCompanies(userCompaniesData.data.companies.map((c: any) => c.id));
    }
  }, [userCompaniesData, isEditMode]);

  // Actualizar las empresas disponibles
  useEffect(() => {
    if (companiesData) {
      // La API puede devolver directamente un array o puede encapsularlo en una propiedad data
      const companies = Array.isArray(companiesData) ? companiesData : companiesData.data || [];
      setAvailableCompanies(companies);
    }
  }, [companiesData]);

  // Mutación para crear un usuario
  const createUserMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: "/api/platform/platform-users",
        method: "POST",
        // Enviamos los datos del formulario junto con las compañías seleccionadas en un solo objeto
        data: { ...data, selectedCompanies }
      }),
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: selectedCompanies.length > 0 
          ? "El usuario ha sido creado y asignado a las empresas seleccionadas"
          : "El usuario ha sido creado correctamente",
      });
      
      // Refrescar la lista de usuarios
      queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-users"] });
      
      // Redirigir a la lista de usuarios
      setLocation("/platform/users");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar un usuario
  const updateUserMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: `/api/platform/platform-users/${userId}`,
        method: "PUT",
        data
      }),
    onSuccess: () => {
      // Primero, quitar todas las asignaciones existentes
      Promise.all(
        userCompaniesData?.data?.companies?.map((company: any) => 
          apiRequest({
            url: "/api/platform/user-company-assignment",
            method: "DELETE",
            data: { userId, companyId: company.id }
          })
        ) || []
      )
      .then(() => {
        // Luego, crear las nuevas asignaciones
        return Promise.all(
          selectedCompanies.map(companyId => 
            apiRequest({
              url: "/api/platform/user-company-assignment",
              method: "POST",
              data: { userId, companyId }
            })
          )
        );
      })
      .then(() => {
        toast({
          title: "Usuario actualizado",
          description: "El usuario y sus asignaciones han sido actualizados correctamente",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-users"] });
        queryClient.invalidateQueries({ queryKey: [`/api/platform/platform-users/${userId}`] });
        setLocation("/platform/users");
      })
      .catch(() => {
        toast({
          title: "Usuario actualizado parcialmente",
          description: "El usuario ha sido actualizado pero hubo un problema con las asignaciones de empresas",
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-users"] });
        queryClient.invalidateQueries({ queryKey: [`/api/platform/platform-users/${userId}`] });
        setLocation("/platform/users");
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    },
  });

  // Función para manejar el envío del formulario
  const onSubmit = (data: FormData) => {
    // Si es un admin de plataforma, no necesita empresas asignadas
    if (data.role === "platform_admin") {
      setSelectedCompanies([]);
    }
    
    // Si está en modo edición y no se proporciona una contraseña, eliminarla para no actualizarla
    if (isEditMode && (!data.password || data.password.trim() === "")) {
      const { password, ...dataWithoutPassword } = data;
      if (isEditMode) {
        updateUserMutation.mutate(dataWithoutPassword as FormData);
      }
    } else {
      if (isEditMode) {
        updateUserMutation.mutate(data);
      } else {
        createUserMutation.mutate(data);
      }
    }
  };

  // Manejar la selección/deselección de empresas
  const toggleCompany = (companyId: number) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  // Verificar si hay alguna mutación en progreso
  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  // El rol actual seleccionado en el formulario
  const currentRole = form.watch("role");

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/platform/users")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Editar Usuario" : "Crear Nuevo Usuario"}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? "Actualiza la información del usuario de plataforma" 
                : "Completa el formulario para crear un nuevo usuario de plataforma"}
            </p>
          </div>
        </div>

        {isEditMode && (isLoadingUser || isLoadingUserCompanies) ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando información...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{isEditMode ? "Editar Usuario" : "Nuevo Usuario"}</CardTitle>
                <CardDescription>
                  Información básica del usuario de plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan Pérez" {...field} />
                          </FormControl>
                          <FormDescription>
                            Nombre y apellido del usuario
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="juan.perez@empresa.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Email para acceso a la plataforma
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {isEditMode ? "Contraseña (dejar en blanco para no cambiar)" : "Contraseña"}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="******" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            {isEditMode 
                              ? "Dejar en blanco para mantener la contraseña actual" 
                              : "Contraseña para acceso a la plataforma (mínimo 6 caracteres)"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un rol" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="platform_admin">
                                <div className="flex items-center">
                                  <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                                  <span>Administrador de Plataforma</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="company_admin">
                                <div className="flex items-center">
                                  <Building2 className="mr-2 h-4 w-4" />
                                  <span>Administrador de Empresa</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === "platform_admin" 
                              ? "Acceso completo a toda la plataforma y empresas" 
                              : "Acceso limitado a las empresas asignadas"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Estado del usuario</FormLabel>
                            <FormDescription>
                              {field.value ? "El usuario está activo y puede acceder a la plataforma" : "El usuario está desactivado y no puede acceder a la plataforma"}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation("/platform/users")}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Actualizar" : "Crear"} Usuario
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Asignación de empresas (solo para administradores de empresa) */}
            <Card className={currentRole === "company_admin" ? "" : "opacity-50 pointer-events-none"}>
              <CardHeader>
                <CardTitle>Empresas Asignadas</CardTitle>
                <CardDescription>
                  Empresas que este usuario puede administrar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentRole === "platform_admin" ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <ShieldCheck className="mx-auto h-10 w-10 text-primary/50 mb-2" />
                    <p>
                      Los administradores de plataforma tienen acceso a todas las empresas automáticamente
                    </p>
                  </div>
                ) : availableCompanies?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p>No hay empresas disponibles para asignar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCompanies.length === 0 && (
                      <div className="rounded-md bg-yellow-50 p-4 mb-4">
                        <div className="flex">
                          <div className="text-yellow-800">
                            <p className="text-sm">
                              Este usuario no tiene empresas asignadas. Debe tener al menos una empresa para poder acceder al sistema.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Subdominio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableCompanies?.map((company: any) => (
                            <TableRow key={company.id}>
                              <TableCell>
                                <Checkbox 
                                  checked={selectedCompanies.includes(company.id)}
                                  onCheckedChange={() => toggleCompany(company.id)}
                                />
                              </TableCell>
                              <TableCell>{company.name}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {company.subdomain}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Seleccionadas: {selectedCompanies.length} de {availableCompanies?.length || 0} empresas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}