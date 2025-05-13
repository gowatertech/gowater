import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// Componente de fila de pedido recurrente
const RecurringOrderRow = ({ 
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
      month: '2-digit',
      day: '2-digit',
    }).format(date);
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
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  // Colores para métodos de pago
  const paymentMethodLabels: Record<string, string> = {
    cash: t("Efectivo"),
    credit: t("Crédito"),
    card: t("Tarjeta"),
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{order.id}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{order.name}</div>
        {order.customer && (
          <div className="text-xs text-muted-foreground">
            {order.customer.name}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {frequencyLabels[order.frequency]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          <Badge className={statusColors[order.status]}>
            {statusLabels[order.status]}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div>{formatDate(order.startDate)}</div>
        {order.endDate && (
          <div className="text-xs text-muted-foreground">
            {t("Hasta")}: {formatDate(order.endDate)}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div>
          {order.lastGeneratedDate 
            ? formatDate(order.lastGeneratedDate)
            : t("Nunca")}
        </div>
        {order.nextGenerationDate && (
          <div className="text-xs flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t("Próxima")}: {formatDate(order.nextGenerationDate)}
          </div>
        )}
      </TableCell>
      <TableCell>
        {new Intl.NumberFormat('es', {
          style: 'currency',
          currency: 'DOP'
        }).format(parseFloat(order.totalAmount))}
        <div className="text-xs text-muted-foreground">
          {paymentMethodLabels[order.paymentMethod]}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t("Abrir menú")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("Acciones")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setLocation(`/recurring-orders/${order.id}`)}>
              <Edit className="mr-2 h-4 w-4" />
              {t("Editar")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateOrder(order.id)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("Generar Pedido")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            {/* Cambio de estado */}
            {order.status === "active" && (
              <DropdownMenuItem onClick={() => onStatusChange(order.id, "paused")}>
                <Pause className="mr-2 h-4 w-4" />
                {t("Pausar")}
              </DropdownMenuItem>
            )}
            {order.status === "paused" && (
              <DropdownMenuItem onClick={() => onStatusChange(order.id, "active")}>
                <Play className="mr-2 h-4 w-4" />
                {t("Activar")}
              </DropdownMenuItem>
            )}
            {(order.status === "active" || order.status === "paused") && (
              <>
                <DropdownMenuItem onClick={() => onStatusChange(order.id, "completed")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("Marcar completado")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(order.id, "cancelled")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("Cancelar")}
                </DropdownMenuItem>
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600"
              onClick={() => onDeleteClick(order.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("Eliminar")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("Pedidos Recurrentes")}</h1>
          <p className="text-muted-foreground">
            {t("Administra los pedidos programados para generarse automáticamente.")}
          </p>
        </div>
        <Button onClick={() => setLocation("/recurring-orders/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("Nuevo Pedido Recurrente")}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">{t("Todos")}</TabsTrigger>
          <TabsTrigger value="active">{t("Activos")}</TabsTrigger>
          <TabsTrigger value="paused">{t("Pausados")}</TabsTrigger>
          <TabsTrigger value="completed">{t("Finalizados")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>{t("Lista de Pedidos Recurrentes")}</CardTitle>
          <CardDescription>
            {t("Visualiza y gestiona los pedidos programados para repetirse automáticamente.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (recurringOrders && recurringOrders.length === 0) ? (
            <div className="text-center py-10">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">{t("No hay pedidos recurrentes")}</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {t("No se encontraron pedidos recurrentes. Crea uno nuevo para empezar.")}
              </p>
              <Button onClick={() => setLocation("/recurring-orders/new")} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("Crear Pedido Recurrente")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("ID")}</TableHead>
                    <TableHead>{t("Nombre")}</TableHead>
                    <TableHead>{t("Frecuencia")}</TableHead>
                    <TableHead>{t("Estado")}</TableHead>
                    <TableHead>{t("Período")}</TableHead>
                    <TableHead>{t("Última/Próxima")}</TableHead>
                    <TableHead>{t("Total")}</TableHead>
                    <TableHead className="text-right">{t("Acciones")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders().map((order: RecurringOrder) => (
                    <RecurringOrderRow 
                      key={order.id} 
                      order={order} 
                      onDeleteClick={handleDelete}
                      onStatusChange={handleStatusChange}
                      onGenerateOrder={handleGenerateOrder}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}