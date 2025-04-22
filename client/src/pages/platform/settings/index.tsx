import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlatformLayout } from "../_components/PlatformLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

// Esquema de validación para la configuración general
const generalSettingsSchema = z.object({
  platformName: z.string().min(2, "El nombre de la plataforma debe tener al menos 2 caracteres"),
  supportEmail: z.string().email("Email inválido"),
  supportPhone: z.string().optional(),
  logoUrl: z.string().optional(),
  enableRegistration: z.boolean().default(false),
  maintenanceMode: z.boolean().default(false),
});

// Esquema de validación para la configuración de correo
const emailSettingsSchema = z.object({
  smtpServer: z.string().min(1, "El servidor SMTP es requerido"),
  smtpPort: z.string().min(1, "El puerto SMTP es requerido"),
  smtpUser: z.string().min(1, "El usuario SMTP es requerido"),
  smtpPassword: z.string().optional(),
  senderEmail: z.string().email("Email inválido"),
  senderName: z.string().min(1, "El nombre del remitente es requerido"),
});

// Tipos derivados de los esquemas
type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;
type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;

export default function PlatformSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const queryClient = useQueryClient();

  // Formulario para configuración general
  const generalForm = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      platformName: "GoWater",
      supportEmail: "soporte@gowater.com",
      supportPhone: "",
      logoUrl: "",
      enableRegistration: false,
      maintenanceMode: false,
    },
  });

  // Formulario para configuración de correo
  const emailForm = useForm<EmailSettingsFormData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpServer: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPassword: "",
      senderEmail: "no-reply@gowater.com",
      senderName: "GoWater",
    },
  });

  // Consulta para obtener la configuración actual
  const { isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/platform/settings"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/settings",
        method: "GET"
      })
  });
  
  // Manejar cambios cuando se cargan los datos
  useEffect(() => {
    if (isLoadingSettings) return;
    
    // Intentar obtener datos del caché
    const data = queryClient.getQueryData(["/api/platform/settings"]) as any;
    
    if (data) {
      // Actualizar formulario general con los datos recibidos
      if (data?.generalSettings) {
        generalForm.reset(data.generalSettings);
      }
      
      // Actualizar formulario de correo con los datos recibidos
      if (data?.emailSettings) {
        emailForm.reset(data.emailSettings);
      }
    }
  }, [isLoadingSettings, generalForm, emailForm]);

  // Mutación para guardar la configuración general
  const saveGeneralSettingsMutation = useMutation({
    mutationFn: (data: GeneralSettingsFormData) => 
      apiRequest({
        url: "/api/platform/settings/general",
        method: "PUT",
        data
      }),
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración general ha sido actualizada correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración general.",
        variant: "destructive",
      });
    },
  });

  // Mutación para guardar la configuración de correo
  const saveEmailSettingsMutation = useMutation({
    mutationFn: (data: EmailSettingsFormData) => 
      apiRequest({
        url: "/api/platform/settings/email",
        method: "PUT",
        data
      }),
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración de correo ha sido actualizada correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración de correo.",
        variant: "destructive",
      });
    },
  });

  // Función para manejar el envío del formulario general
  const onSubmitGeneralSettings = (data: GeneralSettingsFormData) => {
    saveGeneralSettingsMutation.mutate(data);
  };

  // Función para manejar el envío del formulario de correo
  const onSubmitEmailSettings = (data: EmailSettingsFormData) => {
    saveEmailSettingsMutation.mutate(data);
  };

  // Mutación para enviar correo de prueba
  const sendTestEmailMutation = useMutation({
    mutationFn: () => 
      apiRequest({
        url: "/api/platform/settings/test-email",
        method: "POST"
      }),
    onSuccess: () => {
      toast({
        title: "Correo enviado",
        description: "El correo de prueba ha sido enviado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error al enviar correo",
        description: "No se pudo enviar el correo de prueba.",
        variant: "destructive",
      });
    },
  });

  // Función para enviar correo de prueba
  const handleSendTestEmail = () => {
    sendTestEmailMutation.mutate();
  };

  // Verificar si hay alguna mutación en progreso
  const isSubmittingGeneral = saveGeneralSettingsMutation.isPending;
  const isSubmittingEmail = saveEmailSettingsMutation.isPending;
  const isSendingTestEmail = sendTestEmailMutation.isPending;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configuración de la Plataforma</h1>
          <p className="text-muted-foreground">
            Configura los ajustes globales de la plataforma GoWater
          </p>
        </div>

        {isLoadingSettings ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando configuración...</span>
          </div>
        ) : (
          <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="email">Correo Electrónico</TabsTrigger>
              <TabsTrigger value="backup" disabled>
                Respaldos
              </TabsTrigger>
              <TabsTrigger value="appearance" disabled>
                Apariencia
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                  <CardDescription>
                    Configura los ajustes básicos de la plataforma GoWater
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...generalForm}>
                    <form
                      onSubmit={generalForm.handleSubmit(onSubmitGeneralSettings)}
                      className="space-y-6"
                    >
                      <FormField
                        control={generalForm.control}
                        name="platformName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la plataforma</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Nombre que se mostrará en toda la plataforma y correos electrónicos
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={generalForm.control}
                        name="supportEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email de soporte</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormDescription>
                              Correo electrónico para recibir consultas de soporte
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={generalForm.control}
                        name="supportPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono de soporte</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Número telefónico para soporte (opcional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={generalForm.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL del logo</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              URL pública de la imagen del logo (formato recomendado: SVG o PNG)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={generalForm.control}
                          name="enableRegistration"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Habilitar registro público</FormLabel>
                                <FormDescription>
                                  Permitir que las empresas se registren directamente
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={generalForm.control}
                          name="maintenanceMode"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Modo de mantenimiento</FormLabel>
                                <FormDescription>
                                  Mostrar página de mantenimiento a todos los usuarios
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" disabled={isSubmittingGeneral}>
                        {isSubmittingGeneral && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Guardar configuración
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Correo Electrónico</CardTitle>
                  <CardDescription>
                    Configura el servidor SMTP para envío de correos desde la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...emailForm}>
                    <form
                      onSubmit={emailForm.handleSubmit(onSubmitEmailSettings)}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={emailForm.control}
                          name="smtpServer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Servidor SMTP</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="smtp.example.com" />
                              </FormControl>
                              <FormDescription>
                                Dirección del servidor SMTP
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailForm.control}
                          name="smtpPort"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Puerto SMTP</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="587" />
                              </FormControl>
                              <FormDescription>
                                Puerto para la conexión SMTP (normalmente 587 o 465)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={emailForm.control}
                          name="smtpUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Usuario SMTP</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="usuario@example.com" />
                              </FormControl>
                              <FormDescription>
                                Nombre de usuario para autenticación SMTP
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailForm.control}
                          name="smtpPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contraseña SMTP</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  {...field}
                                  placeholder="••••••••"
                                />
                              </FormControl>
                              <FormDescription>
                                Contraseña para autenticación SMTP (dejar en blanco para no cambiar)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={emailForm.control}
                          name="senderEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email del remitente</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  {...field}
                                  placeholder="no-reply@example.com"
                                />
                              </FormControl>
                              <FormDescription>
                                Dirección de correo que aparecerá como remitente
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailForm.control}
                          name="senderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del remitente</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="GoWater" />
                              </FormControl>
                              <FormDescription>
                                Nombre que aparecerá como remitente de los correos
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button type="submit" disabled={isSubmittingEmail}>
                          {isSubmittingEmail && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Guardar configuración
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendTestEmail}
                          disabled={isSendingTestEmail}
                        >
                          {isSendingTestEmail ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Enviar correo de prueba
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backup">
              <Card>
                <CardHeader>
                  <CardTitle>Respaldos</CardTitle>
                  <CardDescription>
                    Configura y administra los respaldos de la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-12">
                    Funcionalidad en desarrollo
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Apariencia</CardTitle>
                  <CardDescription>
                    Personaliza la apariencia de la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-12">
                    Funcionalidad en desarrollo
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PlatformLayout>
  );
}