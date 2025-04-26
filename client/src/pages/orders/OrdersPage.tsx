import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  type Customer, 
  type Product, 
  type Order
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Iconos
import { 
  Plus, 
  ArrowLeft, 
  User, 
  Package, 
  Eye, 
  Clock, 
  CheckCircle, 
  CircleX,
  DollarSign, 
  FileText, 
  ShoppingCart, 
  Tag, 
  AlertTriangle,
  Search,
  X,
  ClipboardList,
  Filter,
  ListFilter,
  Truck,
  CalendarDays
} from "lucide-react";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface OrderItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  // Estado eliminado: isDetailsDialogOpen ya que ahora se muestra en una pestaña
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notes, setNotes] = useState("");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>(() => 
    Array.from({ length: 5 }, () => ({
      code: "",
      description: "",
      quantity: 0,
      price: 0,
      total: 0
    }))
  );

  // Consultas para obtener datos
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Obtener clientes
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Obtener productos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Obtener detalles del pedido seleccionado
  const { data: orderDetails = [], isLoading: isLoadingDetails } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders/products", selectedOrder?.id],
    enabled: !!selectedOrder?.id,
    queryFn: async () => {
      if (!selectedOrder?.id) return [];
      try {
        const response = await apiRequest("GET", `/api/orders/${selectedOrder.id}/products`);
        if (!response.ok) {
          console.error("Error cargando detalles del pedido");
          return [];
        }
        
        const items = await response.json();
        return items.map((item: any) => ({
          code: item.id.toString(),
          description: item.name || "Producto",
          quantity: item.quantity,
          price: parseFloat(item.price.toString()),
          total: parseFloat(item.price.toString()) * item.quantity
        }));
      } catch (error) {
        console.error("Error cargando detalles del pedido:", error);
        return [];
      }
    }
  });
  
  // Manejo de cambios en productos y cantidades
  const handleProductChange = (index: number, code: string) => {
    const product = products?.find(p => p.id.toString() === code);
    if (!product) return;

    const newItems = [...orderItems];
    newItems[index] = {
      code,
      description: product.name,
      quantity: 1,
      price: parseFloat(product.price.toString()),
      total: parseFloat(product.price.toString())
    };
    setOrderItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    const item = newItems[index];
    item.quantity = quantity;
    item.total = item.price * quantity;
    setOrderItems(newItems);
  };
  
  // Mutación para crear pedidos
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creando pedido con datos:", data);
      
      // 1. Validar items
      const validItems = orderItems.filter(item => item.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }

      // 2. Calcular totales
      const subtotal = validItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      // 3. Preparar datos del pedido
      const orderData = {
        customerId: parseInt(data.customerId),
        total: total.toFixed(2), // Formato exacto: "0.00"
        status: "pending" as const,
        paymentMethod: "cash" as const,
        date: new Date().toISOString(), // Formato ISO completo
        routeId: null as number | null,
        notes: notes || ""
      };

      console.log("Datos del pedido a enviar:", orderData);

      // 4. Crear el pedido con los datos validados
      const orderResponse = await apiRequest("POST", "/api/orders", orderData);
      
      if (!orderResponse.ok) {
        console.error("Error en la respuesta:", await orderResponse.text());
        throw new Error('Error al crear el pedido. Revise los datos enviados.');
      }

      const order = await orderResponse.json();
      console.log("Pedido creado:", order);

      // 5. Crear los items del pedido
      for (const item of validItems) {
        const itemData = {
          orderId: order.id,
          productId: parseInt(item.code),
          quantity: item.quantity,
          price: item.price.toFixed(2) // Formato exacto: "0.00"
        };

        console.log("Agregando item al pedido:", itemData);
        const itemResponse = await apiRequest("POST", `/api/orders/${order.id}/items`, itemData);
        if (!itemResponse.ok) {
          console.error("Error al crear item:", await itemResponse.text());
          throw new Error('Error al crear items del pedido');
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: t("success"),
        description: t("orderCreated"),
      });
      setSelectedCustomer(null);
      setNotes("");
      setOrderItems(Array.from({ length: 5 }, () => ({
        code: "",
        description: "",
        quantity: 0,
        price: 0,
        total: 0
      })));
      setActiveTab("list");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    }
  });

  // Función para crear un nuevo pedido
  const handleCreateOrder = () => {
    if (!selectedCustomer) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Debe seleccionar un cliente"
      });
      return;
    }

    const validItems = orderItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Debe agregar al menos un producto"
      });
      return;
    }

    createMutation.mutate({
      customerId: selectedCustomer.id,
      items: validItems
    });
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = subtotal * 0.18; // 18% ITBIS
    return { subtotal, tax, total: subtotal + tax };
  };

  // Filtrar órdenes según criterios de búsqueda
  const filteredOrders = orders.filter(order => {
    // Filtrar por término de búsqueda
    const customer = customers?.find(c => c.id === order.customerId);
    const searchMatch = 
      customer?.businessname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm) ||
      order.total.toString().includes(searchTerm);
    
    // Filtrar por estado
    const statusMatch = statusFilter === "all" || order.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  // Obtener estadísticas de pedidos
  const getOrderStats = () => {
    const pending = orders.filter(o => o.status === "pending").length;
    const delivered = orders.filter(o => o.status === "delivered").length;
    const cancelled = orders.filter(o => o.status === "cancelled").length;
    const total = orders.length;

    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);

    return {
      pending,
      delivered,
      cancelled,
      total,
      totalAmount
    };
  };

  const stats = getOrderStats();

  // Mutación para actualizar el estado del pedido
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      const response = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId: orderId.toString(),
          status 
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al actualizar estado: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "No se pudo actualizar el estado"
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsStatusDialogOpen(false);
      
      const statusText = newStatus === "delivered" 
        ? "entregado" 
        : newStatus === "cancelled" 
          ? "cancelado" 
          : newStatus === "in_transit"
            ? "en tránsito"
            : "pendiente";
          
      toast({
        title: "Estado actualizado",
        description: `El pedido ahora está ${statusText}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const handleUpdateStatus = () => {
    if (!orderToUpdate || !newStatus) return;
    
    updateStatusMutation.mutate({
      orderId: orderToUpdate.id,
      status: newStatus
    });
  };

  const openStatusDialog = (order: Order) => {
    setOrderToUpdate(order);
    setNewStatus(order.status);
    setIsStatusDialogOpen(true);
  };

  // Función para renderizar el estado con color apropiado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 flex items-center gap-0.5 px-1.5 py-0 h-4 text-[10px]">
          <CheckCircle className="h-2 w-2" /> Entregado
        </Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 flex items-center gap-0.5 px-1.5 py-0 h-4 text-[10px]">
          <Clock className="h-2 w-2" /> Pendiente
        </Badge>;
      case "in_transit":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 flex items-center gap-0.5 px-1.5 py-0 h-4 text-[10px]">
          <Clock className="h-2 w-2" /> En Tránsito
        </Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 flex items-center gap-0.5 px-1.5 py-0 h-4 text-[10px]">
          <CircleX className="h-2 w-2" /> Cancelado
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 flex items-center gap-0.5 px-1.5 py-0 h-4 text-[10px]">
          <AlertTriangle className="h-2 w-2" /> Otro
        </Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "border-l-green-500";
      case "pending":
        return "border-l-yellow-500";
      case "in_transit":
        return "border-l-blue-500";
      case "cancelled":
        return "border-l-red-500";
      default:
        return "border-l-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "cancelled":
        return <CircleX className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className={`${isMobile ? 'p-1' : 'p-2'} max-w-6xl mx-auto`}>
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-sm font-bold flex items-center">
          <ShoppingCart className="h-3.5 w-3.5 mr-1 text-blue-600" />
          Gestión de Pedidos
        </h1>
        {!isMobile && (
          <Button 
            size="sm"
            onClick={() => setActiveTab("new")} 
            className="bg-blue-600 hover:bg-blue-700 h-6 text-xs px-2 py-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nuevo Pedido
          </Button>
        )}
      </div>

      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-3 mb-1 h-7`}>
          <TabsTrigger value="list" className="flex items-center gap-1 text-xs px-2 h-6">
            <ClipboardList className="h-3 w-3" />
            <span>Pedidos</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1 text-xs px-2 h-6">
            <Plus className="h-3 w-3" />
            <span>Nuevo</span>
          </TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedOrder} className="flex items-center gap-1 text-xs px-2 h-6">
            <FileText className="h-3 w-3" />
            <span>Detalles</span>
          </TabsTrigger>
        </TabsList>

        {/* Contenido del Tab de Lista de Pedidos */}
        <TabsContent value="list" className="space-y-1">
          <Card className="p-1">
            {/* Buscador y filtros en una fila */}
            <div className="flex flex-wrap gap-1 mb-1">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-1.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input 
                  placeholder="Buscar cliente o pedido..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-6 h-6 text-xs py-0"
                />
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-0.5 top-1/2 transform -translate-y-1/2 h-4 w-4 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>

              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-6 w-[110px] flex items-center text-xs">
                  <ListFilter className="h-2.5 w-2.5 mr-1" />
                  <span>Estado</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  <SelectItem value="pending" className="text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-yellow-600" />
                      <span>Pendientes</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in_transit" className="text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-blue-600" />
                      <span>En Tránsito</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="delivered" className="text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-2.5 w-2.5 text-green-600" />
                      <span>Entregados</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled" className="text-xs">
                    <div className="flex items-center gap-1">
                      <CircleX className="h-2.5 w-2.5 text-red-600" />
                      <span>Cancelados</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Indicadores clave de pedidos */}
            <div className="grid grid-cols-5 gap-1 mb-1">
              <Card className="p-1 flex flex-col items-center border-gray-100">
                <p className="text-[10px] text-gray-500">Total</p>
                <p className="text-sm font-bold leading-tight">{stats.total}</p>
              </Card>
              <Card className="p-1 flex flex-col items-center border-gray-100">
                <p className="text-[10px] text-gray-500">Pendientes</p>
                <p className="text-sm font-bold leading-tight text-yellow-600">{stats.pending}</p>
              </Card>
              <Card className="p-1 flex flex-col items-center border-gray-100">
                <p className="text-[10px] text-gray-500">Entregados</p>
                <p className="text-sm font-bold leading-tight text-green-600">{stats.delivered}</p>
              </Card>
              <Card className="p-1 flex flex-col items-center border-gray-100">
                <p className="text-[10px] text-gray-500">Cancelados</p>
                <p className="text-sm font-bold leading-tight text-red-600">{stats.cancelled}</p>
              </Card>
              <Card className="p-1 flex flex-col items-center border-gray-100">
                <p className="text-[10px] text-gray-500">Ingresos</p>
                <p className="text-sm font-bold leading-tight text-blue-600">
                  ${stats.totalAmount.toFixed(2)}
                </p>
              </Card>
            </div>

            {/* Listado de pedidos */}
            <div className="border rounded-md">
              {filteredOrders.length > 0 ? (
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="h-6">
                      <TableHead className="px-1 py-1 h-5 w-[40px]">ID</TableHead>
                      <TableHead className="px-1 py-1 h-5">Cliente</TableHead>
                      <TableHead className="px-1 py-1 h-5 hidden md:table-cell w-[80px]">Fecha</TableHead>
                      <TableHead className="px-1 py-1 h-5 w-[50px]">Total</TableHead>
                      <TableHead className="px-1 py-1 h-5 w-[80px]">Estado</TableHead>
                      <TableHead className="px-1 py-1 h-5 w-[70px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const customer = customers?.find(c => c.id === order.customerId);
                      return (
                        <TableRow key={order.id} className={`border-l-2 ${getStatusColor(order.status)} h-7`}>
                          <TableCell className="font-medium p-1">#{order.id}</TableCell>
                          <TableCell className="max-w-[120px] truncate p-1">
                            {customer?.businessname || "Cliente"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell p-1 text-[10px]">
                            {new Date(order.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="p-1">${parseFloat(order.total.toString()).toFixed(2)}</TableCell>
                          <TableCell className="p-1">{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right p-1 whitespace-nowrap">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-5 w-5 p-0 mr-1" 
                              onClick={() => openStatusDialog(order)}
                            >
                              <Tag className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-5 w-5 p-0" 
                              onClick={() => {
                                setSelectedOrder(order);
                                setActiveTab("details");
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-2 text-center">
                  <p className="text-xs text-gray-500">No hay pedidos que coincidan con los criterios de búsqueda</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab para crear nuevo pedido */}
        <TabsContent value="new" className="space-y-1">
          <Card className="p-2">
            <CardHeader className="px-0 pt-0 pb-1">
              <CardTitle className="text-xs font-semibold flex items-center gap-1">
                <Plus className="h-3 w-3 text-blue-600" />
                Crear Nuevo Pedido
              </CardTitle>
              <CardDescription className="text-xs">Complete los datos para crear un nuevo pedido</CardDescription>
            </CardHeader>
            
            <CardContent className="px-0 pb-0 space-y-2">
              {/* Selector de cliente */}
              <div className="mb-2">
                <h3 className="text-xs font-semibold mb-1 flex items-center gap-1">
                  <User className="h-3 w-3 text-blue-600" />
                  Seleccionar Cliente
                </h3>
                <Select
                  onValueChange={(value) => {
                    const customer = customers?.find(c => c.id.toString() === value);
                    setSelectedCustomer(customer || null);
                  }}
                  value={selectedCustomer?.id.toString()}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem 
                        key={customer.id} 
                        value={customer.id.toString()}
                        className="flex justify-between items-center text-xs"
                      >
                        <div>
                          <span>{customer.businessname}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedCustomer && (
                  <div className="mt-1 p-1 border rounded-md bg-gray-50 text-[11px] grid grid-cols-3 gap-1">
                    <p>
                      <span className="font-medium">Tel:</span> {selectedCustomer.phone}
                    </p>
                    <p>
                      <span className="font-medium">Dir:</span> {selectedCustomer.street}
                    </p>
                    <p>
                      <span className="font-medium">Crédito:</span> ${parseFloat(selectedCustomer.creditlimit.toString()).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Listado de productos */}
              <div className="mb-2">
                <h3 className="text-xs font-semibold mb-1 flex items-center gap-1">
                  <Package className="h-3 w-3 text-blue-600" />
                  Seleccionar Productos
                </h3>
                
                <div className="border rounded-md overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="h-7">
                        <TableHead className="px-2 py-1 h-6">Producto</TableHead>
                        <TableHead className="px-2 py-1 h-6 w-[60px]">Cant.</TableHead>
                        <TableHead className="px-2 py-1 h-6 w-[60px]">Precio</TableHead>
                        <TableHead className="px-2 py-1 h-6 w-[60px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={`item-${index}`} className="h-7">
                          <TableCell className="p-1">
                            <Select
                              value={item.code || undefined}
                              onValueChange={(value) => handleProductChange(index, value)}
                            >
                              <SelectTrigger className="h-6 text-xs">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((product) => (
                                  <SelectItem 
                                    key={product.id} 
                                    value={product.id.toString()}
                                    className="text-xs"
                                  >
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input 
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                              className="w-full h-6 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            ${item.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="p-1 font-semibold">
                            ${item.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Resumen de totales */}
                <div className="mt-1 flex justify-end">
                  <div className="w-[200px] space-y-0 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${calculateTotal().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITBIS (18%):</span>
                      <span>${calculateTotal().tax.toFixed(2)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${calculateTotal().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notas */}
              <div className="mb-2">
                <h3 className="text-xs font-semibold mb-1">Notas adicionales</h3>
                <Textarea 
                  placeholder="Instrucciones especiales para este pedido"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between px-0 pt-1">
              <Button 
                variant="outline" 
                className="text-xs h-6 px-2"
                onClick={() => setActiveTab("list")}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Volver
              </Button>
              <Button 
                className="text-xs h-6 px-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateOrder}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Crear Pedido
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab de Detalles del Pedido */}
        <TabsContent value="details" className="space-y-1">
          {selectedOrder ? (
            <Card className="p-2">
              <CardHeader className="px-0 pt-0 pb-1">
                <CardTitle className="text-xs font-semibold flex items-center gap-1">
                  <FileText className="h-3 w-3 text-blue-600" />
                  Detalles del Pedido #{selectedOrder.id}
                </CardTitle>
                <CardDescription className="text-xs">
                  {new Date(selectedOrder.date).toLocaleDateString()} - {getStatusBadge(selectedOrder.status)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-0 pb-0 space-y-2">
                {/* Info del cliente */}
                <div className="mb-2">
                  <h3 className="text-xs font-semibold mb-1 flex items-center gap-1">
                    <User className="h-3 w-3 text-blue-600" />
                    Cliente
                  </h3>
                  
                  <div className="p-1 border rounded-md bg-gray-50">
                    {(() => {
                      const customer = customers?.find(c => c.id === selectedOrder.customerId);
                      return (
                        <div className="text-[11px] grid grid-cols-2 gap-1">
                          <p><span className="font-medium">Nombre:</span> {customer?.businessname}</p>
                          <p><span className="font-medium">Tel:</span> {customer?.phone}</p>
                          <p><span className="font-medium">Dir:</span> {customer?.street} {customer?.streetnumber}</p>
                          <p><span className="font-medium">RNC:</span> {customer?.rnc}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Productos del pedido */}
                <div className="mb-2">
                  <h3 className="text-xs font-semibold mb-1 flex items-center gap-1">
                    <Package className="h-3 w-3 text-blue-600" />
                    Productos
                  </h3>
                  
                  <div className="border rounded-md overflow-hidden">
                    {isLoadingDetails ? (
                      <div className="p-2 text-center">
                        <p className="text-xs text-gray-500">Cargando detalles...</p>
                      </div>
                    ) : orderDetails.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="h-6">
                            <TableHead className="px-2 py-1 h-5">Producto</TableHead>
                            <TableHead className="px-2 py-1 h-5 w-[60px]">Cant.</TableHead>
                            <TableHead className="px-2 py-1 h-5 w-[60px]">Precio</TableHead>
                            <TableHead className="px-2 py-1 h-5 w-[60px]">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails.map((item, index) => (
                            <TableRow key={`detail-${index}`} className="h-6">
                              <TableCell className="p-1 font-medium">{item.description}</TableCell>
                              <TableCell className="p-1">{item.quantity}</TableCell>
                              <TableCell className="p-1">${item.price.toFixed(2)}</TableCell>
                              <TableCell className="p-1 font-semibold">${item.total.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-2 text-center">
                        <p className="text-xs text-gray-500">No hay productos en este pedido</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Resumen de totales */}
                  <div className="mt-1 flex justify-end">
                    <div className="w-[200px] space-y-0 text-xs">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${(parseFloat(selectedOrder.total.toString()) / 1.18).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ITBIS (18%):</span>
                        <span>${(parseFloat(selectedOrder.total.toString()) - (parseFloat(selectedOrder.total.toString()) / 1.18)).toFixed(2)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>${parseFloat(selectedOrder.total.toString()).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Acciones adicionales */}
                <div className="mb-2 flex flex-col gap-1">
                  <h3 className="text-xs font-semibold">Acciones disponibles</h3>
                  
                  <div className="flex gap-1 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => {
                        setOrderToUpdate(selectedOrder);
                        setNewStatus(selectedOrder.status);
                        setIsStatusDialogOpen(true);
                      }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      Cambiar Estado
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => window.print()}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between px-0 pt-2">
                <Button 
                  variant="outline" 
                  className="text-xs h-6 px-2"
                  onClick={() => {
                    setSelectedOrder(null);
                    setActiveTab("list");
                  }}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Volver
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Seleccione un pedido para ver sus detalles</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* El diálogo de detalles ha sido eliminado y ahora se muestra en la pestaña de detalles */}

      {/* Diálogo para cambiar estado del pedido */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1">
              <Tag className="h-4 w-4 text-blue-600" />
              Cambiar Estado del Pedido
            </DialogTitle>
            <DialogDescription>
              {orderToUpdate && (
                <span className="text-xs">
                  Pedido #{orderToUpdate.id} - Cliente: {customers?.find(c => c.id === orderToUpdate.customerId)?.businessname}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span>Pendiente</span>
                  </div>
                </SelectItem>
                <SelectItem value="in_transit">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>En Tránsito</span>
                  </div>
                </SelectItem>
                <SelectItem value="delivered">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Entregado</span>
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-1">
                    <CircleX className="h-4 w-4 text-red-600" />
                    <span>Cancelado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Button
                variant={newStatus === "pending" ? "default" : "outline"}
                className={newStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                onClick={() => setNewStatus("pending")}
              >
                <div className="flex flex-col items-center w-full">
                  <Clock className="h-8 w-8 mb-1 text-yellow-600" />
                  <span className="text-xs">Pendiente</span>
                </div>
              </Button>
              <Button 
                variant={newStatus === "in_transit" ? "default" : "outline"}
                className={newStatus === "in_transit" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => setNewStatus("in_transit")}
              >
                <div className="flex flex-col items-center w-full">
                  <Clock className="h-8 w-8 mb-1 text-blue-600" />
                  <span className="text-xs">En Tránsito</span>
                </div>
              </Button>
              <Button 
                variant={newStatus === "delivered" ? "default" : "outline"}
                className={newStatus === "delivered" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setNewStatus("delivered")}
              >
                <div className="flex flex-col items-center w-full">
                  <CheckCircle className="h-8 w-8 mb-1 text-green-600" />
                  <span className="text-xs">Entregado</span>
                </div>
              </Button>
              <Button 
                variant={newStatus === "cancelled" ? "default" : "outline"}
                className={newStatus === "cancelled" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setNewStatus("cancelled")}
              >
                <div className="flex flex-col items-center w-full">
                  <CircleX className="h-8 w-8 mb-1 text-red-600" />
                  <span className="text-xs">Cancelado</span>
                </div>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              size="sm"
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending || !newStatus}
            >
              {updateStatusMutation.isPending ? "Actualizando..." : "Actualizar Estado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}