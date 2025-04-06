import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Componentes UI
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

// Iconos
import {
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Edit,
  Eye,
  FileEdit,
  Filter,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Settings,
  Trash,
  Truck,
  Users,
  X,
  CalendarDays,
  CalendarClock,
  FileBarChart,
  History,
  AlertCircle,
  SkipForward,
} from "lucide-react";

// Tipos de datos
type RecurringOrder = {
  id: number;
  customerId: number;
  customerName: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "custom";
  frequencyDays?: number;
  weekdays?: string;
  monthDays?: string;
  nextDeliveryDate: string;
  startDate: string;
  endDate?: string;
  status: "active" | "paused" | "cancelled";
  zoneId?: number;
  notifyCustomer: boolean;
  notifyBefore?: number;
  totalGeneratedOrders: number;
  lastGeneratedDate?: string;
};

type OrderItem = {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  price?: string;
  notes?: string;
};

type RecurringOrderException = {
  id?: number;
  exceptionDate: string;
  exceptionType: "skip" | "modify" | "reschedule";
  reason?: string;
  newDate?: string;
  modifiedItems?: string;
};

type RecurringOrderWithDetails = RecurringOrder & {
  items: OrderItem[];
  exceptions: RecurringOrderException[];
  history: {
    id: number;
    generatedOrderId: number;
    scheduledDate: string;
    generatedDate: string;
    status: "created" | "delivered" | "cancelled";
    notes?: string;
    orderTotal?: string;
    orderStatus?: string;
  }[];
};

// Componente para el estado del pedido
const StatusBadge = ({ status }: { status: RecurringOrder['status'] }) => {
  let variant: "outline" | "default" | "secondary" | "destructive" = "outline";
  let label = "";

  switch (status) {
    case "active":
      variant = "default";
      label = "Activo";
      break;
    case "paused":
      variant = "secondary";
      label = "Pausado";
      break;
    case "cancelled":
      variant = "destructive";
      label = "Cancelado";
      break;
  }

  return <Badge variant={variant}>{label}</Badge>;
};

// Componente para mostrar la frecuencia
const FrequencyBadge = ({ 
  frequency, 
  frequencyDays,
  weekdays,
  monthDays 
}: { 
  frequency: RecurringOrder['frequency']; 
  frequencyDays?: number;
  weekdays?: string;
  monthDays?: string;
}) => {
  let label = "";

  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  
  switch (frequency) {
    case "daily":
      label = "Diario";
      break;
    case "weekly":
      if (weekdays) {
        const days = weekdays.split(',').map(day => daysOfWeek[parseInt(day)]);
        label = `Semanal (${days.join(', ')})`;
      } else {
        label = "Semanal";
      }
      break;
    case "biweekly":
      label = "Quincenal";
      break;
    case "monthly":
      if (monthDays) {
        const days = monthDays.split(',').map(day => `día ${day}`);
        label = `Mensual (${days.join(', ')})`;
      } else {
        label = "Mensual";
      }
      break;
    case "custom":
      label = `Cada ${frequencyDays} días`;
      break;
  }

  return (
    <Badge variant="outline" className="font-normal">
      <Repeat className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
};

// Componente principal
export default function RecurringOrdersPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RecurringOrder['status'] | "all">("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState<"active" | "all" | "history">("active");
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consulta para obtener todos los pedidos recurrentes
  const { 
    data: recurringOrders = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<RecurringOrder[]>({
    queryKey: ['/api/recurring-orders'],
  });

  // Consulta para obtener los detalles de un pedido específico
  const {
    data: selectedOrder,
    isLoading: isLoadingDetails,
  } = useQuery<RecurringOrderWithDetails>({
    queryKey: ['/api/recurring-orders', selectedOrderId],
    enabled: selectedOrderId !== null,
  });

  // Mutación para generar pedidos a partir de recurrentes
  const generateOrdersMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await apiRequest("POST", "/api/recurring-orders/generate");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al generar pedidos");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pedidos generados",
        description: `Se procesaron ${data.totalProcessed} pedidos recurrentes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setIsGenerating(false);
    }
  });

  // Mutación para cambiar el estado de un pedido recurrente
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: RecurringOrder['status'] }) => {
      const response = await apiRequest("PATCH", `/api/recurring-orders/${id}`, {
        status
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar estado");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado del pedido recurrente ha sido actualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  // Filtrar los pedidos según la búsqueda y el filtro de estado
  const filteredOrders = recurringOrders.filter(order => {
    const matchesSearch = 
      searchQuery === "" || 
      order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    const matchesTab = 
      (currentTab === "all") || 
      (currentTab === "active" && order.status !== "cancelled");
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  // Ordenar los pedidos: primero activos, luego por fecha de entrega
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    // Primero por estado (activos primero)
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    
    // Luego por fecha de entrega (más cercanos primero)
    return new Date(a.nextDeliveryDate).getTime() - new Date(b.nextDeliveryDate).getTime();
  });

  // Agrupar órdenes por fecha de próxima entrega
  const ordersByDate: Record<string, RecurringOrder[]> = {};
  sortedOrders.forEach(order => {
    const dateKey = format(new Date(order.nextDeliveryDate), "yyyy-MM-dd");
    if (!ordersByDate[dateKey]) {
      ordersByDate[dateKey] = [];
    }
    ordersByDate[dateKey].push(order);
  });

  // Ordenar las fechas
  const sortedDates = Object.keys(ordersByDate).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Manejar la creación de nuevos pedidos recurrentes
  const handleCreateOrder = () => {
    navigate("/routes/recurring-orders/create");
    // O alternativamente, abrir un formulario en el mismo componente:
    // setIsCreating(true);
  };

  // Manejar la selección de un pedido para ver detalles
  const handleSelectOrder = (id: number) => {
    setSelectedOrderId(id);
  };

  // Manejar la acción de generar pedidos
  const handleGenerateOrders = () => {
    generateOrdersMutation.mutate();
  };

  // Renderizado de la tarjeta de pedido recurrente
  const renderOrderCard = (order: RecurringOrder) => {
    const isOverdue = isBefore(new Date(order.nextDeliveryDate), new Date()) && order.status === "active";
    const isToday = format(new Date(order.nextDeliveryDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
    const nextDate = format(new Date(order.nextDeliveryDate), "dd MMM yyyy", { locale: es });
    
    return (
      <Card 
        key={order.id}
        className={`mb-2 ${isOverdue ? "border-red-300" : ""} ${isToday ? "border-green-300" : ""} ${order.status === "paused" ? "opacity-70" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{order.name}</h3>
                {isOverdue && order.status === "active" && (
                  <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                )}
                {isToday && order.status === "active" && (
                  <Badge variant="default" className="text-xs bg-green-500">Hoy</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{order.customerName}</p>
              
              <div className="flex gap-2 mt-2 flex-wrap">
                <FrequencyBadge 
                  frequency={order.frequency} 
                  frequencyDays={order.frequencyDays}
                  weekdays={order.weekdays}
                  monthDays={order.monthDays}
                />
                <StatusBadge status={order.status} />
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{nextDate}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mt-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSelectOrder(order.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/routes/recurring-orders/edit/${order.id}`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {order.status === "active" ? (
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: "paused" })}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pausar
                    </DropdownMenuItem>
                  ) : order.status === "paused" ? (
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: "active" })}>
                      <Play className="mr-2 h-4 w-4" />
                      Activar
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: "cancelled" })}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/routes/recurring-orders/exceptions/${order.id}`)}>
                    <SkipForward className="mr-2 h-4 w-4" />
                    Gestionar excepciones
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderizado para los detalles de un pedido seleccionado
  const renderOrderDetails = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog open={selectedOrderId !== null} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido Recurrente</DialogTitle>
            <DialogDescription>
              Información y configuración del pedido recurrente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información general */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <h4 className="font-medium">Nombre</h4>
                    <p>{selectedOrder.name}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Cliente</h4>
                    <p>{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Estado</h4>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div>
                    <h4 className="font-medium">Pedidos generados</h4>
                    <p>{selectedOrder.totalGeneratedOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Programación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <h4 className="font-medium">Frecuencia</h4>
                    <FrequencyBadge 
                      frequency={selectedOrder.frequency} 
                      frequencyDays={selectedOrder.frequencyDays}
                      weekdays={selectedOrder.weekdays}
                      monthDays={selectedOrder.monthDays}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">Próxima entrega</h4>
                    <p>{format(new Date(selectedOrder.nextDeliveryDate), "dd MMMM yyyy", { locale: es })}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Fecha de inicio</h4>
                    <p>{format(new Date(selectedOrder.startDate), "dd MMMM yyyy", { locale: es })}</p>
                  </div>
                  {selectedOrder.endDate && (
                    <div>
                      <h4 className="font-medium">Fecha de finalización</h4>
                      <p>{format(new Date(selectedOrder.endDate), "dd MMMM yyyy", { locale: es })}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Productos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left font-medium py-2">Producto</th>
                        <th className="text-center font-medium py-2">Cantidad</th>
                        <th className="text-right font-medium py-2">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id || `${item.productId}-${item.quantity}`} className="border-b">
                          <td className="py-2">{item.productName}</td>
                          <td className="text-center py-2">{item.quantity}</td>
                          <td className="text-right py-2">
                            {item.price ? `$${item.price}` : "-"}
                          </td>
                        </tr>
                      ))}
                      {selectedOrder.items.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-3 text-muted-foreground">
                            No hay productos en este pedido recurrente
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Excepciones */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Excepciones</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOrder.exceptions.length === 0 ? (
                  <div className="text-center py-3 text-muted-foreground">
                    No hay excepciones configuradas
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrder.exceptions.map((exception) => (
                      <div 
                        key={exception.id || exception.exceptionDate} 
                        className="flex justify-between items-center border rounded-md p-2"
                      >
                        <div>
                          <div className="font-medium">
                            {format(new Date(exception.exceptionDate), "dd MMMM yyyy", { locale: es })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {exception.exceptionType === "skip" && "Saltar entrega"}
                            {exception.exceptionType === "reschedule" && "Reprogramar"}
                            {exception.exceptionType === "modify" && "Modificar pedido"}
                          </div>
                        </div>
                        
                        <div>
                          {exception.exceptionType === "reschedule" && exception.newDate && (
                            <Badge variant="outline">
                              Nueva fecha: {format(new Date(exception.newDate), "dd/MM/yyyy")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historial */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Historial de Entregas</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOrder.history.length === 0 ? (
                  <div className="text-center py-3 text-muted-foreground">
                    No hay entregas registradas
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrder.history.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="flex justify-between items-center border rounded-md p-2"
                      >
                        <div>
                          <div className="font-medium">
                            {format(new Date(entry.scheduledDate), "dd MMMM yyyy", { locale: es })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Generado: {format(new Date(entry.generatedDate), "dd/MM/yyyy HH:mm")}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              entry.status === "delivered" 
                                ? "default" 
                                : entry.status === "cancelled" 
                                  ? "destructive" 
                                  : "outline"
                            }
                          >
                            {entry.status === "created" && "Creado"}
                            {entry.status === "delivered" && "Entregado"}
                            {entry.status === "cancelled" && "Cancelado"}
                          </Badge>
                          
                          {entry.generatedOrderId && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7" 
                              onClick={() => {
                                // Navegar a la orden generada
                                // navigate(`/orders/${entry.generatedOrderId}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver pedido
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setSelectedOrderId(null)}
            >
              Cerrar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => navigate(`/routes/recurring-orders/edit/${selectedOrder.id}`)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Renderizado principal
  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos Recurrentes</h1>
            <p className="text-muted-foreground">
              Gestiona entregas programadas para tus clientes habituales
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={handleCreateOrder}
            >
              <Plus className="mr-1 h-4 w-4" />
              Nuevo Pedido Recurrente
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleGenerateOrders}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Repeat className="mr-1 h-4 w-4" />
                  Generar Pedidos
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o cliente..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Pestañas y contenido */}
        <Tabs defaultValue="active" value={currentTab} onValueChange={(value) => setCurrentTab(value as any)}>
          <TabsList>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="mb-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-3 w-[200px]" />
                          <div className="flex gap-2 mt-2">
                            <Skeleton className="h-5 w-[80px]" />
                            <Skeleton className="h-5 w-[60px]" />
                          </div>
                        </div>
                        <div>
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-8">
                <CircleAlert className="h-8 w-8 mx-auto text-destructive mb-2" />
                <p className="text-destructive font-medium">Error al cargar los pedidos recurrentes</p>
                <p className="text-muted-foreground">
                  Ocurrió un problema al obtener los datos. Intenta de nuevo.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">No hay pedidos recurrentes</h3>
                <p className="text-muted-foreground mb-6">
                  Configura entregas periódicas para tus clientes
                </p>
                <Button variant="default" onClick={handleCreateOrder}>
                  <Plus className="mr-1 h-4 w-4" />
                  Crear Pedido Recurrente
                </Button>
              </div>
            ) : (
              <div>
                {sortedDates.map(dateKey => {
                  const dateFormatted = format(new Date(dateKey), "EEEE d 'de' MMMM", { locale: es });
                  const isToday = format(new Date(dateKey), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  const isPast = isBefore(new Date(dateKey), new Date());
                  
                  return (
                    <div key={dateKey} className="mb-5">
                      <div className="flex items-center mb-2">
                        <h3 className="font-medium capitalize">
                          {isToday ? "Hoy" : dateFormatted}
                        </h3>
                        {isPast && !isToday && (
                          <Badge variant="outline" className="ml-2 text-red-500 border-red-200">
                            Atrasado
                          </Badge>
                        )}
                      </div>
                      <div>
                        {ordersByDate[dateKey].map(order => renderOrderCard(order))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all">
            {/* Contenido para todas las órdenes */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="mb-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-3 w-[200px]" />
                          <div className="flex gap-2 mt-2">
                            <Skeleton className="h-5 w-[80px]" />
                            <Skeleton className="h-5 w-[60px]" />
                          </div>
                        </div>
                        <div>
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay pedidos recurrentes que mostrar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedOrders.map(order => renderOrderCard(order))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            <div className="text-center py-12">
              <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">Historial de Pedidos Recurrentes</h3>
              <p className="text-muted-foreground mb-6">
                Esta funcionalidad estará disponible próximamente
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Diálogo de detalles */}
      {renderOrderDetails()}
    </div>
  );
}