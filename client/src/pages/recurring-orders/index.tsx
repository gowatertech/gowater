import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Repeat,
  DollarSign,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Users,
  Package,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Tipos
type RecurringOrderStatus = "active" | "paused" | "completed" | "cancelled";
type RecurringOrderFrequency = "daily" | "weekly" | "biweekly" | "monthly";

interface RecurringOrder {
  id: number;
  name: string;
  customerId: number;
  customer?: {
    id: number;
    name: string;
  };
  frequency: RecurringOrderFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  lastGeneratedDate?: string;
  nextGenerationDate?: string;
  status: RecurringOrderStatus;
  totalAmount: string;
  paymentMethod: "cash" | "credit" | "card";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Componente de tarjeta estadística moderna
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  color = "bg-primary"
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  trend?: "up" | "down";
  trendValue?: string;
  color?: string;
}) => {
  return (
    <Card className="overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trendValue && (
              <div className={`flex items-center gap-1 text-xs ${trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                <TrendingUp className={`h-3 w-3 ${trend === "down" ? "rotate-180" : ""}`} />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`${color} p-3 rounded-xl text-white`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de tarjeta de pedido recurrente moderna
const RecurringOrderCard = ({ 
  order, 
  onDeleteClick, 
  onStatusChange, 
  onGenerateOrder 
}: { 
  order: RecurringOrder; 
  onDeleteClick: (id: number) => void;
  onStatusChange: (id: number, status: RecurringOrderStatus) => void;
  onGenerateOrder: (id: number) => void;
}) => {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  
  // Función para formatear la fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Iconos para frecuencia
  const frequencyIcons: Record<RecurringOrderFrequency, any> = {
    daily: CalendarCheck,
    weekly: CalendarClock,
    biweekly: Repeat,
    monthly: Calendar,
  };

  // Traducciones para frecuencia
  const frequencyLabels: Record<RecurringOrderFrequency, string> = {
    daily: t("Diario"),
    weekly: t("Semanal"),
    biweekly: t("Quincenal"),
    monthly: t("Mensual"),
  };

  // Traducciones para estado
  const statusLabels: Record<RecurringOrderStatus, string> = {
    active: t("Activo"),
    paused: t("Pausado"),
    completed: t("Completado"),
    cancelled: t("Cancelado"),
  };

  // Colores para estados
  const statusColors: Record<RecurringOrderStatus, string> = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  };

  const FrequencyIcon = frequencyIcons[order.frequency] || Calendar; // Fallback a Calendar si no existe

  // Calcular días hasta la próxima generación
  const daysUntilNext = order.nextGenerationDate 
    ? Math.ceil((new Date(order.nextGenerationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-l-4 border-l-primary">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg leading-tight">{order.name}</h3>
                <Badge variant="outline" className={statusColors[order.status] || "bg-gray-500/10 text-gray-700"}>
                  {statusLabels[order.status] || order.status}
                </Badge>
              </div>
              {order.customer && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {order.customer.name}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-actions-${order.id}`}
                  aria-label={t("Más acciones")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("Acciones")}</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => setLocation(`/recurring-orders/${order.id}`)}
                  data-testid={`menu-edit-${order.id}`}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t("Editar")}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onGenerateOrder(order.id)}
                  data-testid={`menu-generate-${order.id}`}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("Generar Pedido")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Cambio de estado */}
                {order.status === "active" && (
                  <DropdownMenuItem 
                    onClick={() => onStatusChange(order.id, "paused")}
                    data-testid={`menu-pause-${order.id}`}
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    {t("Pausar")}
                  </DropdownMenuItem>
                )}
                {order.status === "paused" && (
                  <DropdownMenuItem 
                    onClick={() => onStatusChange(order.id, "active")}
                    data-testid={`menu-activate-${order.id}`}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {t("Activar")}
                  </DropdownMenuItem>
                )}
                {(order.status === "active" || order.status === "paused") && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => onStatusChange(order.id, "completed")}
                      data-testid={`menu-complete-${order.id}`}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t("Marcar completado")}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onStatusChange(order.id, "cancelled")}
                      data-testid={`menu-cancel-${order.id}`}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("Cancelar")}
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onDeleteClick(order.id)}
                  data-testid={`menu-delete-${order.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("Eliminar")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Frecuencia y Fechas */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <FrequencyIcon className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">{frequencyLabels[order.frequency] || order.frequency}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDate(order.startDate)}</span>
              {order.endDate && (
                <>
                  <ArrowRight className="h-3 w-3" />
                  <span>{formatDate(order.endDate)}</span>
                </>
              )}
            </div>
          </div>

          {/* Próxima generación */}
          {order.nextGenerationDate && order.status === "active" && (
            <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-3 border border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Próxima generación")}</p>
                    <p className="text-sm font-semibold">{formatDate(order.nextGenerationDate)}</p>
                  </div>
                </div>
                {daysUntilNext !== null && (
                  <Badge variant="secondary" className="gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {daysUntilNext === 0 ? t("Hoy") : daysUntilNext === 1 ? t("Mañana") : `${daysUntilNext} días`}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Monto y Método de pago */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">
                {new Intl.NumberFormat('es', {
                  style: 'currency',
                  currency: 'DOP'
                }).format(parseFloat(order.totalAmount))}
              </span>
            </div>
            <Badge variant="outline" className="gap-1">
              <Package className="h-3 w-3" />
              {order.paymentMethod === "cash" ? t("Efectivo") : order.paymentMethod === "credit" ? t("Crédito") : t("Tarjeta")}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function RecurringOrdersPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [generatingOrderId, setGeneratingOrderId] = useState<number | null>(null);
  
  // Consultar pedidos recurrentes
  const { data: recurringOrders, isLoading } = useQuery({
    queryKey: ['/api/recurring-orders'],
    refetchOnWindowFocus: false,
  });

  // Mutación para eliminar un pedido recurrente
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/recurring-orders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: t("Pedido recurrente eliminado"),
        description: t("El pedido recurrente ha sido eliminado correctamente."),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
    },
    onError: (error) => {
      console.error("Error al eliminar:", error);
      toast({
        title: t("Error"),
        description: t("No se pudo eliminar el pedido recurrente. Inténtalo de nuevo."),
        variant: "destructive",
      });
    },
  });

  // Mutación para cambiar el estado
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: RecurringOrderStatus }) => 
      apiRequest(`/api/recurring-orders/${id}/status`, { 
        method: 'PATCH',
        data: { status } 
      }),
    onSuccess: () => {
      toast({
        title: t("Estado actualizado"),
        description: t("El estado del pedido recurrente ha sido actualizado."),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
    },
    onError: (error) => {
      console.error("Error al actualizar estado:", error);
      toast({
        title: t("Error"),
        description: t("No se pudo actualizar el estado. Inténtalo de nuevo."),
        variant: "destructive",
      });
    },
  });

  // Mutación para generar un pedido a partir de un pedido recurrente
  const generateOrderMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/recurring-orders/${id}/generate`, { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: t("Pedido generado"),
        description: t("El pedido ha sido generado correctamente."),
      });
      
      // Opcionalmente, redirigir al pedido generado
      if (data?.id) {
        setTimeout(() => {
          setLocation(`/orders/details/${data.id}`);
        }, 1500);
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
      }
    },
    onError: (error) => {
      console.error("Error al generar pedido:", error);
      toast({
        title: t("Error"),
        description: t("No se pudo generar el pedido. Inténtalo de nuevo."),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setGeneratingOrderId(null);
    }
  });

  // Manejador para eliminar
  const handleDelete = (id: number) => {
    setOrderToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación
  const confirmDelete = () => {
    if (orderToDelete) {
      deleteMutation.mutate(orderToDelete);
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  // Cambiar estado
  const handleStatusChange = (id: number, status: RecurringOrderStatus) => {
    statusMutation.mutate({ id, status });
  };

  // Generar pedido
  const handleGenerateOrder = (id: number) => {
    setGeneratingOrderId(id);
    generateOrderMutation.mutate(id);
  };

  // Filtrar pedidos según la pestaña activa
  const filteredOrders = () => {
    if (!recurringOrders || !Array.isArray(recurringOrders)) return [];
    
    switch(activeTab) {
      case "active":
        return recurringOrders.filter((order: RecurringOrder) => order.status === "active");
      case "paused":
        return recurringOrders.filter((order: RecurringOrder) => order.status === "paused");
      case "completed":
        return recurringOrders.filter((order: RecurringOrder) => 
          order.status === "completed" || order.status === "cancelled");
      default:
        return recurringOrders;
    }
  };

  // Calcular estadísticas
  const ordersArray = Array.isArray(recurringOrders) ? recurringOrders : [];
  const stats = {
    total: ordersArray.length,
    active: ordersArray.filter((o: RecurringOrder) => o.status === "active").length,
    totalRevenue: ordersArray
      .filter((o: RecurringOrder) => o.status === "active")
      .reduce((sum: number, o: RecurringOrder) => sum + parseFloat(o.totalAmount), 0),
    nextWeek: ordersArray.filter((o: RecurringOrder) => {
      if (!o.nextGenerationDate || o.status !== "active") return false;
      const days = Math.ceil((new Date(o.nextGenerationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    }).length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header con gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Repeat className="h-8 w-8" />
              <h1 className="text-3xl font-bold tracking-tight">{t("Pedidos Recurrentes")}</h1>
            </div>
            <p className="text-white/90 max-w-2xl">
              {t("Automatiza tus ventas con pedidos programados que se generan automáticamente según la frecuencia definida.")}
            </p>
          </div>
          <Button 
            onClick={() => setLocation("/recurring-orders/new")} 
            className="gap-2 bg-white text-primary hover:bg-white/90"
            data-testid="button-new-recurring-order"
          >
            <Plus className="h-4 w-4" />
            {t("Nuevo Pedido")}
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title={t("Total Pedidos")}
          value={stats.total}
          icon={Repeat}
          color="bg-primary"
        />
        <StatCard 
          title={t("Activos")}
          value={stats.active}
          icon={Zap}
          color="bg-green-500"
          trend="up"
          trendValue="+12%"
        />
        <StatCard 
          title={t("Ingresos Mensuales")}
          value={new Intl.NumberFormat('es', {
            style: 'currency',
            currency: 'DOP',
            notation: 'compact',
          }).format(stats.totalRevenue)}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatCard 
          title={t("Próxima Semana")}
          value={stats.nextWeek}
          icon={CalendarClock}
          color="bg-purple-500"
        />
      </div>

      {/* Tabs modernos */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="all" className="gap-2" data-testid="tab-all">
            <Sparkles className="h-4 w-4" />
            {t("Todos")}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2" data-testid="tab-active">
            <Zap className="h-4 w-4" />
            {t("Activos")}
          </TabsTrigger>
          <TabsTrigger value="paused" className="gap-2" data-testid="tab-paused">
            <Pause className="h-4 w-4" />
            {t("Pausados")}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
            <CheckCircle2 className="h-4 w-4" />
            {t("Finalizados")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-16 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOrders().length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t("No hay pedidos recurrentes")}</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  {t("No se encontraron pedidos recurrentes. Crea uno nuevo para automatizar tus ventas.")}
                </p>
                <Button 
                  onClick={() => setLocation("/recurring-orders/new")} 
                  className="gap-2"
                  data-testid="button-create-recurring-order-empty"
                >
                  <Plus className="h-4 w-4" />
                  {t("Crear Pedido Recurrente")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOrders().map((order: RecurringOrder) => (
                <RecurringOrderCard 
                  key={order.id} 
                  order={order} 
                  onDeleteClick={handleDelete}
                  onStatusChange={handleStatusChange}
                  onGenerateOrder={handleGenerateOrder}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("¿Eliminar este pedido recurrente?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido recurrente y todos sus datos asociados.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
