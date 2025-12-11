import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  CalendarIcon, 
  Loader2, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  History,
  Ban,
  RefreshCw
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { PlatformLayout } from "../_components/PlatformLayout";
import { PlanSelect } from "@/components/platform/PlanSelect";

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  subdomain: z
    .string()
    .min(3, "El subdominio debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "El subdominio solo puede contener letras minúsculas, números y guiones")
    .transform(val => val.toLowerCase()),
  active: z.boolean().default(true),
  planId: z.coerce.number().min(1, "Debes seleccionar un plan"),
  expirationDate: z.date({
    required_error: "Se requiere una fecha de expiración",
  }),
  logo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StatusHistory {
  id: number;
  companyId: number;
  previousStatus: string;
  newStatus: string;
  reason: string;
  changedBy: string;
  createdAt: string;
}

export default function CompanyFormPage() {
  const params = useParams();
  const isEditMode = !!params.id && params.id !== "new";
  const companyId = isEditMode ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");

  const { data: plansResponse } = useQuery({
    queryKey: ["/api/platform/plans"],
    queryFn: async () => {
      try {
        const response = await apiRequest({
          url: "/api/platform/plans",
          method: "GET"
        });
        return response && response.data ? response : { data: response || [] };
      } catch (error) {
        console.error("Error al obtener planes:", error);
        return { data: [] };
      }
    },
  });
  
  const plansData = plansResponse?.data || [];

  const { data: companyResponse, isLoading: isLoadingCompany, refetch: refetchCompany } = useQuery({
    queryKey: [`/api/platform/companies/${companyId}`],
    queryFn: async () => {
      try {
        const response = await apiRequest({
          url: `/api/platform/companies/${companyId}`,
          method: "GET"
        });
        return response && response.data ? response : { data: response };
      } catch (error) {
        console.error("Error al obtener detalles de empresa:", error);
        return { data: null };
      }
    },
    enabled: isEditMode && !!companyId,
  });
  
  const companyData = companyResponse?.data;

  const { data: statusHistoryResponse, isLoading: isLoadingHistory } = useQuery({
    queryKey: [`/api/platform/companies/${companyId}/status-history`],
    queryFn: async () => {
      try {
        const response = await apiRequest({
          url: `/api/platform/companies/${companyId}/status-history`,
          method: "GET"
        });
        return response?.data || response || [];
      } catch (error) {
        console.error("Error al obtener historial:", error);
        return [];
      }
    },
    enabled: isEditMode && !!companyId,
  });

  const statusHistory: StatusHistory[] = statusHistoryResponse || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      active: true,
      planId: undefined,
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      logo: "",
    },
  });

  useEffect(() => {
    if (isEditMode && companyData) {
      const company = companyData;
      form.reset({
        name: company.name,
        subdomain: company.subdomain,
        active: company.active,
        planId: company.planId,
        expirationDate: new Date(company.expirationDate),
        logo: company.logo || "",
      });
    }
  }, [companyData, form, isEditMode]);

  const createCompanyMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: "/api/platform/companies",
        method: "POST",
        data: {
          ...data,
          expirationDate: data.expirationDate.toISOString().split('T')[0],
        }
      }),
    onSuccess: () => {
      toast({
        title: "Empresa creada",
        description: "La empresa ha sido creada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      setLocation("/platform/companies");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la empresa.",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest({
        url: `/api/platform/companies/${companyId}`,
        method: "PUT",
        data: {
          ...data,
          expirationDate: data.expirationDate.toISOString().split('T')[0],
        }
      }),
    onSuccess: () => {
      toast({
        title: "Empresa actualizada",
        description: "La empresa ha sido actualizada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      queryClient.invalidateQueries({ queryKey: [`/api/platform/companies/${companyId}`] });
      setLocation("/platform/companies");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la empresa.",
        variant: "destructive",
      });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => 
      apiRequest({
        url: `/api/platform/suspend`,
        method: "POST",
        data: {
          companyId,
          reason: suspensionReason || "Suspensión manual por administrador",
          changedBy: "Admin de Plataforma"
        }
      }),
    onSuccess: () => {
      toast({
        title: "Empresa suspendida",
        description: "La empresa ha sido suspendida correctamente.",
      });
      setSuspendDialogOpen(false);
      setSuspensionReason("");
      refetchCompany();
      queryClient.invalidateQueries({ queryKey: [`/api/platform/companies/${companyId}/status-history`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo suspender la empresa.",
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => 
      apiRequest({
        url: `/api/platform/reactivate`,
        method: "POST",
        data: {
          companyId,
          changedBy: "Admin de Plataforma"
        }
      }),
    onSuccess: () => {
      toast({
        title: "Empresa reactivada",
        description: "La empresa ha sido reactivada correctamente.",
      });
      setReactivateDialogOpen(false);
      refetchCompany();
      queryClient.invalidateQueries({ queryKey: [`/api/platform/companies/${companyId}/status-history`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo reactivar la empresa.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  const isSubmitting = createCompanyMutation.isPending || updateCompanyMutation.isPending;
  const isSuspended = companyData?.status === "suspended";

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Activo", variant: "default" },
      suspended: { label: "Suspendido", variant: "destructive" },
      trial: { label: "Período de Prueba", variant: "secondary" },
      cancelled: { label: "Cancelado", variant: "outline" },
    };
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/platform/companies")}
              className="mr-4"
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                {isEditMode ? "Editar Empresa" : "Crear Nueva Empresa"}
              </h1>
              <p className="text-muted-foreground">
                {isEditMode 
                  ? "Actualiza la información de la empresa" 
                  : "Completa el formulario para registrar una nueva empresa"}
              </p>
            </div>
          </div>
          {isEditMode && companyData && (
            <div className="flex items-center gap-2">
              {getStatusBadge(companyData.status)}
            </div>
          )}
        </div>

        {isSuspended && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/10" data-testid="card-suspended-alert">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-700 dark:text-red-400">Esta empresa está suspendida</h3>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Razón: {companyData?.suspensionReason || "No especificada"}
                  </p>
                  {companyData?.suspendedAt && (
                    <p className="text-sm text-red-600 dark:text-red-300">
                      Suspendida el: {format(new Date(companyData.suspendedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  )}
                </div>
                <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-white" data-testid="button-reactivate-dialog">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reactivar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reactivar Empresa</DialogTitle>
                      <DialogDescription>
                        Esta acción reactivará la cuenta de la empresa, permitiendo el acceso normal a la plataforma.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReactivateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => reactivateMutation.mutate()}
                        disabled={reactivateMutation.isPending}
                        data-testid="button-confirm-reactivate"
                      >
                        {reactivateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Reactivación
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {isEditMode && isLoadingCompany ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando información...</span>
          </div>
        ) : (
          <Tabs defaultValue="info" className="space-y-4">
            {isEditMode && (
              <TabsList>
                <TabsTrigger value="info" data-testid="tab-info">Información</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history">Historial de Estados</TabsTrigger>
                <TabsTrigger value="actions" data-testid="tab-actions">Acciones</TabsTrigger>
              </TabsList>
            )}
            
            <TabsContent value="info">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>{isEditMode ? "Editar Empresa" : "Nueva Empresa"}</CardTitle>
                  <CardDescription>
                    Proporciona los datos básicos para {isEditMode ? "actualizar la" : "crear una nueva"} empresa
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
                            <FormLabel>Nombre de la empresa</FormLabel>
                            <FormControl>
                              <Input placeholder="Mi Empresa" {...field} data-testid="input-name" />
                            </FormControl>
                            <FormDescription>Nombre comercial de la empresa</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subdomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subdominio</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Input placeholder="miempresa" {...field} data-testid="input-subdomain" />
                                <span className="ml-2 text-muted-foreground">.dominio.com</span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Identificador único. Solo letras minúsculas, números y guiones.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="planId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan</FormLabel>
                            <FormControl>
                              <PlanSelect 
                                value={field.value}
                                onChange={field.onChange}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormDescription>Plan de suscripción</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expirationDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de expiración</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    data-testid="button-expiration-date"
                                  >
                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecciona una fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>Fecha en que expira la suscripción</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Estado de la empresa</FormLabel>
                              <FormDescription>
                                {field.value ? "Activa y puede operar" : "Desactivada y no puede operar"}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="logo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo (URL)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://ejemplo.com/logo.png" {...field} data-testid="input-logo" />
                            </FormControl>
                            <FormDescription>URL de la imagen del logo (opcional)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setLocation("/platform/companies")}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isEditMode ? "Actualizar" : "Crear"} Empresa
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {isEditMode && (
              <>
                <TabsContent value="history">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Historial de Estados
                      </CardTitle>
                      <CardDescription>
                        Registro de todos los cambios de estado de la empresa
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistory ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : statusHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No hay historial de cambios de estado
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Estado Anterior</TableHead>
                              <TableHead>Nuevo Estado</TableHead>
                              <TableHead>Razón</TableHead>
                              <TableHead>Cambiado Por</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {statusHistory.map((entry) => (
                              <TableRow key={entry.id} data-testid={`history-row-${entry.id}`}>
                                <TableCell>
                                  {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                </TableCell>
                                <TableCell>{getStatusBadge(entry.previousStatus)}</TableCell>
                                <TableCell>{getStatusBadge(entry.newStatus)}</TableCell>
                                <TableCell className="max-w-xs truncate">{entry.reason}</TableCell>
                                <TableCell>{entry.changedBy}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="actions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Acciones de Administración</CardTitle>
                      <CardDescription>
                        Gestionar el estado y configuración de la empresa
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!isSuspended ? (
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">Suspender Empresa</h4>
                            <p className="text-sm text-muted-foreground">
                              Bloquear el acceso de esta empresa a la plataforma
                            </p>
                          </div>
                          <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="destructive" data-testid="button-suspend-dialog">
                                <Ban className="mr-2 h-4 w-4" />
                                Suspender
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Suspender Empresa</DialogTitle>
                                <DialogDescription>
                                  Esta acción bloqueará el acceso de la empresa a la plataforma. 
                                  Los usuarios de esta empresa no podrán iniciar sesión.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <label className="text-sm font-medium">Razón de la suspensión</label>
                                <Textarea
                                  placeholder="Ingrese la razón de la suspensión..."
                                  value={suspensionReason}
                                  onChange={(e) => setSuspensionReason(e.target.value)}
                                  className="mt-2"
                                  data-testid="input-suspension-reason"
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => suspendMutation.mutate()}
                                  disabled={suspendMutation.isPending}
                                  data-testid="button-confirm-suspend"
                                >
                                  {suspendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Confirmar Suspensión
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/10">
                          <div>
                            <h4 className="font-medium text-green-700 dark:text-green-400">Reactivar Empresa</h4>
                            <p className="text-sm text-green-600 dark:text-green-300">
                              Restaurar el acceso de esta empresa a la plataforma
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="bg-white border-green-300"
                            onClick={() => setReactivateDialogOpen(true)}
                            data-testid="button-reactivate-action"
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Reactivar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </div>
    </PlatformLayout>
  );
}