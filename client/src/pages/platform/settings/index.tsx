import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlatformLayout } from "../_components/PlatformLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Upload, Settings, Mail, Image, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

const generalSettingsSchema = z.object({
  platformName: z.string().min(2, "El nombre de la plataforma debe tener al menos 2 caracteres"),
  billingCompanyName: z.string().optional(),
  address: z.string().optional(),
  rnc: z.string().optional(),
  supportEmail: z.string().email("Email inválido"),
  supportPhone: z.string().optional(),
  logoUrl: z.string().optional(),
  enableRegistration: z.boolean().default(false),
  maintenanceMode: z.boolean().default(false),
});

const emailSettingsSchema = z.object({
  smtpServer: z.string().min(1, "El servidor SMTP es requerido"),
  smtpPort: z.string().min(1, "El puerto SMTP es requerido"),
  smtpUser: z.string().min(1, "El usuario SMTP es requerido"),
  smtpPassword: z.string().optional(),
  senderEmail: z.string().email("Email inválido"),
  senderName: z.string().min(1, "El nombre del remitente es requerido"),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;
type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;

export default function PlatformSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const generalForm = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      platformName: "GoWater",
      billingCompanyName: "",
      address: "",
      rnc: "",
      supportEmail: "soporte@gowater.com",
      supportPhone: "",
      logoUrl: "",
      enableRegistration: false,
      maintenanceMode: false,
    },
  });

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

  const { isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/platform/settings"],
    queryFn: () =>
      apiRequest({
        url: "/api/platform/settings",
        method: "GET",
      }),
  });

  useEffect(() => {
    if (isLoadingSettings) return;
    const data = queryClient.getQueryData(["/api/platform/settings"]) as any;
    if (data) {
      if (data?.generalSettings) {
        generalForm.reset(data.generalSettings);
        if (data.generalSettings.logoUrl) {
          setLogoPreview(data.generalSettings.logoUrl);
        }
      }
      if (data?.emailSettings) {
        emailForm.reset(data.emailSettings);
      }
    }
  }, [isLoadingSettings, generalForm, emailForm]);

  const saveGeneralSettingsMutation = useMutation({
    mutationFn: (data: GeneralSettingsFormData) =>
      apiRequest({
        url: "/api/platform/settings/general",
        method: "PUT",
        data,
      }),
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración general ha sido actualizada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/settings"] });
    },
    onError: () => {
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración general.",
        variant: "destructive",
      });
    },
  });

  const saveEmailSettingsMutation = useMutation({
    mutationFn: (data: EmailSettingsFormData) =>
      apiRequest({
        url: "/api/platform/settings/email",
        method: "PUT",
        data,
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

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/platform/settings/upload-logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Error al subir logo");
      }

      const result = await response.json();
      setLogoPreview(result.logoUrl);
      generalForm.setValue("logoUrl", result.logoUrl);
      toast({
        title: "Logo actualizado",
        description: "El logo se ha subido correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/settings"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmitGeneralSettings = (data: GeneralSettingsFormData) => {
    saveGeneralSettingsMutation.mutate(data);
  };

  const onSubmitEmailSettings = (data: EmailSettingsFormData) => {
    saveEmailSettingsMutation.mutate(data);
  };

  const sendTestEmailMutation = useMutation({
    mutationFn: () =>
      apiRequest({
        url: "/api/platform/settings/test-email",
        method: "POST",
      }),
    onSuccess: () => {
      toast({ title: "Correo enviado", description: "El correo de prueba ha sido enviado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo enviar el correo de prueba.", variant: "destructive" });
    },
  });

  const isSubmittingGeneral = saveGeneralSettingsMutation.isPending;
  const isSubmittingEmail = saveEmailSettingsMutation.isPending;
  const isSendingTestEmail = sendTestEmailMutation.isPending;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            Configuración de la Plataforma
          </h1>
          <p className="text-blue-100 mt-1">Ajustes globales del sistema GoWater</p>
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
              <TabsTrigger value="billing">Facturación</TabsTrigger>
              <TabsTrigger value="email">Correo Electrónico</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                  <CardDescription>Nombre del sistema, contacto y opciones generales</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...generalForm}>
                    <form onSubmit={generalForm.handleSubmit(onSubmitGeneralSettings)} className="space-y-6">
                      <FormField
                        control={generalForm.control}
                        name="platformName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del sistema</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>Nombre que se mostrará en la plataforma (ej: GoWater)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={generalForm.control}
                          name="supportEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email de soporte</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormDescription>Correo para recibir consultas de soporte</FormDescription>
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
                              <FormDescription>Número telefónico (opcional)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={generalForm.control}
                          name="enableRegistration"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-xl">
                              <div className="space-y-0.5">
                                <FormLabel>Habilitar registro público</FormLabel>
                                <FormDescription>Permitir que empresas se registren</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={generalForm.control}
                          name="maintenanceMode"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-4 border rounded-xl">
                              <div className="space-y-0.5">
                                <FormLabel>Modo de mantenimiento</FormLabel>
                                <FormDescription>Mostrar página de mantenimiento</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" disabled={isSubmittingGeneral} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
                        {isSubmittingGeneral ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar configuración
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <div className="space-y-6">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle>Logo de la Empresa</CardTitle>
                    <CardDescription>Imagen que aparecerá en las facturas y documentos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        {logoPreview ? (
                          <div className="relative group">
                            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-white flex items-center justify-center p-2">
                              <img
                                src={logoPreview}
                                alt="Logo"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setLogoPreview("");
                                generalForm.setValue("logoUrl", "");
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                            <Image className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="rounded-xl"
                        >
                          {uploadingLogo ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {logoPreview ? "Cambiar logo" : "Subir logo"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          PNG, JPG o WebP. Máximo 5MB.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle>Datos de Facturación</CardTitle>
                    <CardDescription>Información que aparecerá en las facturas generadas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...generalForm}>
                      <form onSubmit={generalForm.handleSubmit(onSubmitGeneralSettings)} className="space-y-6">
                        <FormField
                          control={generalForm.control}
                          name="billingCompanyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre de empresa (facturación)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: GoWater Technologies SRL" />
                              </FormControl>
                              <FormDescription>Razón social que aparecerá en las facturas</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={generalForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dirección</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: Calle Principal #123, Santo Domingo, RD" />
                              </FormControl>
                              <FormDescription>Dirección fiscal que aparecerá en las facturas</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={generalForm.control}
                          name="rnc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RNC</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: 131-12345-6" />
                              </FormControl>
                              <FormDescription>Registro Nacional de Contribuyente</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={isSubmittingGeneral} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
                          {isSubmittingGeneral ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Guardar datos de facturación
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="email">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Configuración de Correo Electrónico</CardTitle>
                  <CardDescription>Servidor SMTP para envío de correos desde la plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onSubmitEmailSettings)} className="space-y-6">
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
                                <Input type="password" {...field} placeholder="••••••••" />
                              </FormControl>
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
                                <Input type="email" {...field} placeholder="no-reply@example.com" />
                              </FormControl>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button type="submit" disabled={isSubmittingEmail} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
                          {isSubmittingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Guardar configuración
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => sendTestEmailMutation.mutate()}
                          disabled={isSendingTestEmail}
                          className="rounded-xl"
                        >
                          {isSendingTestEmail ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="mr-2 h-4 w-4" />
                          )}
                          Enviar correo de prueba
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PlatformLayout>
  );
}
