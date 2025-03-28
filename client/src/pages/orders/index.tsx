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
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMobile } from "@/hooks/use-mobile";

// Iconos - Importación única para evitar duplicados
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

export default function Orders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
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

  // Obtener clientes
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      if (!response.ok) {
        throw new Error('Error al cargar los clientes');
      }
      return response.json();
    }
  });

  // Obtener productos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Obtener detalles de un pedido específico
  const { data: orderDetails = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/orders", selectedOrder?.id, "items"],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const response = await apiRequest("GET", `/api/orders/${selectedOrder.id}/items`);
      if (!response.ok) {
        throw new Error('Error al cargar los items del pedido');
      }
      return response.json();
    },
    enabled: !!selectedOrder,
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

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = subtotal * 0.18; // 18% ITBIS
    return { subtotal, tax, total: subtotal + tax };
  };

  // Mutación para actualizar el estado del pedido
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el estado del pedido');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsStatusDialogOpen(false);
      
      const statusText = newStatus === "delivered" 
        ? "entregado" 
        : newStatus === "cancelled" 
          ? "cancelado" 
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

  // Función para renderizar el estado con color apropiado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Entregado
        </Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pendiente
        </Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200 flex items-center gap-1">
          <CircleX className="h-3 w-3" /> Cancelado
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Desconocido
        </Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "border-l-green-500";
      case "pending":
        return "border-l-yellow-500";
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
      <div className="flex justify-between items-center mb-2">
        <h1 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold flex items-center`}>
          <ShoppingCart className="h-4 w-4 mr-1.5 text-blue-600" />
          Gestión de Pedidos
        </h1>
        {!isMobile && (
          <Button 
            size="sm"
            onClick={() => setActiveTab("new")} 
            className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nuevo Pedido
          </Button>
        )}
      </div>

      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} mb-2 h-8`}>
          <TabsTrigger value="list" className="flex items-center gap-1 text-xs px-2">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Pedidos</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1 text-xs px-2">
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo</span>
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="details" disabled={!selectedOrder} className="flex items-center gap-1 text-xs px-2">
              <FileText className="h-3.5 w-3.5" />
              <span>Detalles</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Contenido del Tab de Lista de Pedidos */}
        <TabsContent value="list" className="space-y-2">
          <Card className="p-2">
            {/* Buscador y filtros en una fila */}
            <div className="flex flex-wrap gap-2 mb-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input 
                  placeholder="Buscar por cliente, pedido..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-7 w-[140px] flex items-center text-xs">
                  <ListFilter className="h-3 w-3 mr-1" />
                  <span>Estado</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
                  <SelectItem value="pending" className="text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-yellow-600" />
                      <span>Pendientes</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="delivered" className="text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Entregados</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled" className="text-xs">
                    <div className="flex items-center gap-1">
                      <CircleX className="h-3 w-3 text-red-600" />
                      <span>Cancelados</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lista de pedidos */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-6">
                <div className="mx-auto bg-gray-50 rounded-full h-12 w-12 flex items-center justify-center mb-2">
                  <ShoppingCart className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-600">No hay pedidos</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                  {searchTerm || statusFilter !== "all" 
                    ? "No se encontraron pedidos que coincidan con los filtros. Intente con otros criterios de búsqueda." 
                    : "No hay pedidos registrados en el sistema. Cree uno nuevo para comenzar."}
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="w-[10%] text-xs">ID</TableHead>
                      <TableHead className="w-[25%] text-xs">Cliente</TableHead>
                      <TableHead className="w-[15%] text-xs">Fecha</TableHead>
                      <TableHead className="w-[15%] text-xs text-right">Total</TableHead>
                      <TableHead className="w-[15%] text-xs">Estado</TableHead>
                      <TableHead className="w-[20%] text-xs text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="h-8">
                        <TableCell className="font-medium text-xs py-1">#{order.id}</TableCell>
                        <TableCell className="text-xs py-1">
                          {customers?.find(c => c.id === order.customerId)?.businessname}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {new Date(order.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs py-1 text-right">
                          RD$ {parseFloat(order.total.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-1">
                            {getStatusBadge(order.status)}
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActiveTab("details");
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-gray-600 hover:text-gray-700 hover:bg-gray-50 text-xs"
                              onClick={() => openStatusDialog(order)}
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              Estado
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Estadísticas de pedidos */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-blue-50 rounded-md p-2 border border-blue-100">
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                  <p className="text-xs text-blue-600 font-medium">Total Pedidos</p>
                </div>
                <p className="text-lg font-bold text-blue-700">
                  {stats.total}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-md p-2 border border-yellow-100">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  <p className="text-xs text-yellow-600 font-medium">Pendientes</p>
                </div>
                <p className="text-lg font-bold text-yellow-700">
                  {stats.pending}
                </p>
              </div>
              <div className="bg-green-50 rounded-md p-2 border border-green-100">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  <p className="text-xs text-green-600 font-medium">Entregados</p>
                </div>
                <p className="text-lg font-bold text-green-700">
                  {stats.delivered}
                </p>
              </div>
              <div className="bg-purple-50 rounded-md p-2 border border-purple-100">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                  <p className="text-xs text-purple-600 font-medium">Valor Total</p>
                </div>
                <p className="text-lg font-bold text-purple-700">
                  RD$ {stats.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Contenido del Tab de Nuevo Pedido */}
        <TabsContent value="new" className="space-y-2">
          <Card className="p-2">
            <CardHeader className="px-0 pt-0 pb-2">
              <div className="flex items-center gap-1 mb-1">
                <Plus className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base">Crear Nuevo Pedido</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Complete la información para registrar un nuevo pedido
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0 space-y-3">
              {/* Cliente */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium flex items-center">
                  <User className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  Información del Cliente
                </h3>
                <Select
                  onValueChange={(value) => {
                    const customer = customers?.find(c => c.id === parseInt(value));
                    setSelectedCustomer(customer || null);
                  }}
                  disabled={isLoadingCustomers}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Seleccionar Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                        className="text-xs py-1"
                      >
                        {customer.businessname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCustomer && (
                  <div className="text-xs bg-blue-50 p-2 rounded-md border border-blue-100">
                    <div className="space-y-0.5">
                      <div className="flex items-start">
                        <span className="font-medium w-20">Empresa:</span>
                        <span className="line-clamp-1">{selectedCustomer.businessname}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-medium w-20">Dirección:</span>
                        <span className="line-clamp-1">{`${selectedCustomer.street} ${selectedCustomer.streetnumber}`}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-medium w-20">Teléfono:</span>
                        <span>{selectedCustomer.phone}</span>
                      </div>
                      {selectedCustomer.email && (
                        <div className="flex items-start">
                          <span className="font-medium w-20">Email:</span>
                          <span className="line-clamp-1">{selectedCustomer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-1.5" />

              {/* Productos */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium flex items-center">
                  <Package className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  Productos
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="h-[200px] sm:h-[240px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="w-[22%] text-xs sticky top-0 bg-background py-1.5">Código</TableHead>
                          <TableHead className="w-[30%] text-xs sticky top-0 bg-background py-1.5">Descripción</TableHead>
                          <TableHead className="w-[13%] text-right text-xs sticky top-0 bg-background py-1.5">Cant.</TableHead>
                          <TableHead className="w-[17%] text-right text-xs sticky top-0 bg-background py-1.5">Precio</TableHead>
                          <TableHead className="w-[18%] text-right text-xs sticky top-0 bg-background py-1.5">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index} className="h-8">
                            <TableCell className="p-0.5">
                              <Select
                                value={item.code}
                                onValueChange={(value) => handleProductChange(index, value)}
                              >
                                <SelectTrigger className="h-7 text-xs px-2">
                                  <SelectValue placeholder="---" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products?.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id.toString()}
                                      className="text-xs py-1"
                                    >
                                      <div className="flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        <span>{product.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-0.5">
                              <Input
                                value={item.description}
                                readOnly
                                className="bg-muted h-7 text-xs px-2"
                              />
                            </TableCell>
                            <TableCell className="p-0.5">
                              <Input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                className="text-right h-7 text-xs px-2"
                              />
                            </TableCell>
                            <TableCell className="p-0.5">
                              <Input
                                value={item.price ? `RD$ ${item.price.toFixed(2)}` : ""}
                                readOnly
                                className="text-right bg-muted h-7 text-xs px-2"
                              />
                            </TableCell>
                            <TableCell className="p-0.5">
                              <Input
                                value={item.total ? `RD$ ${item.total.toFixed(2)}` : ""}
                                readOnly
                                className="text-right bg-muted h-7 text-xs px-2 font-medium"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Notas */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium flex items-center">
                    <FileText className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Notas
                  </h3>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas del pedido..."
                    className="h-16 text-xs"
                  />
                </div>

                {/* Totales */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium flex items-center">
                    <DollarSign className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Resumen
                  </h3>
                  <div className="bg-blue-50 p-2 rounded-md space-y-1 text-xs border border-blue-100">
                    <div className="flex justify-between">
                      <span>Sub-total:</span>
                      <span>RD$ {calculateTotal().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITBIS (18%):</span>
                      <span>RD$ {calculateTotal().tax.toFixed(2)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold text-sm">
                      <span>Total:</span>
                      <span>RD$ {calculateTotal().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-2 rounded-md border border-yellow-100 mt-2">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-yellow-800">Importante:</p>
                    <p className="text-xs text-yellow-700">Asegúrese de seleccionar un cliente y agregar al menos un producto al pedido antes de guardar.</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end px-0 pt-2">
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveTab("list")}
                >
                  Cancelar
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                  disabled={!selectedCustomer || !orderItems.some(item => item.quantity > 0) || createMutation.isPending}
                  onClick={handleCreateOrder}
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-1">
                      <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                      Guardando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      Crear Pedido
                    </span>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Contenido del Tab de Detalles del Pedido */}
        <TabsContent value="details" className="space-y-2">
          {selectedOrder && (
            <Card className="p-2">
              <CardHeader className="px-0 pt-0 pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-base">Pedido #{selectedOrder.id}</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("list")}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Volver
                  </Button>
                </div>
                <CardDescription className="text-xs mt-1">
                  <span className="block">
                    Cliente: {customers?.find(c => c.id === selectedOrder.customerId)?.businessname}
                  </span>
                  <span className="block">
                    Fecha: {new Date(selectedOrder.date).toLocaleDateString()}
                  </span>
                </CardDescription>
              </CardHeader>

              <div className="space-y-4">
                {/* Estado y detalles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium">Estado del pedido</h3>
                    <div className="p-2 rounded-md border bg-gray-50">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(selectedOrder.status)}
                        <span className="text-sm font-medium">
                          {selectedOrder.status === "pending" && "Pendiente"}
                          {selectedOrder.status === "delivered" && "Entregado"}
                          {selectedOrder.status === "cancelled" && "Cancelado"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs h-7"
                        onClick={() => openStatusDialog(selectedOrder)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        Cambiar estado
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-medium">Detalles de pago</h3>
                    <div className="p-2 rounded-md border bg-gray-50">
                      <div className="flex justify-between text-xs">
                        <span>Método de pago:</span>
                        <span className="font-medium">
                          {selectedOrder.paymentMethod === "cash" && "Efectivo"}
                          {selectedOrder.paymentMethod === "transfer" && "Transferencia"}
                          {selectedOrder.paymentMethod === "credit" && "Crédito"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>Total:</span>
                        <span className="font-bold">
                          RD$ {parseFloat(selectedOrder.total.toString()).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Productos */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium flex items-center">
                    <Package className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Productos
                  </h3>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="text-xs w-[35%]">Producto</TableHead>
                          <TableHead className="text-xs text-right w-[15%]">Cantidad</TableHead>
                          <TableHead className="text-xs text-right w-[25%]">Precio</TableHead>
                          <TableHead className="text-xs text-right w-[25%]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!isLoadingDetails && orderDetails?.map((item: any) => (
                          <TableRow key={item.id} className="h-8">
                            <TableCell className="text-xs py-1 font-medium">
                              {products?.find(p => p.id === item.productId)?.name || ""}
                            </TableCell>
                            <TableCell className="text-xs py-1 text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-xs py-1 text-right">
                              RD$ {parseFloat(item.price.toString()).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs py-1 text-right font-medium">
                              RD$ {(item.quantity * parseFloat(item.price.toString())).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {isLoadingDetails && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-20 text-center">
                              <div className="flex justify-center items-center">
                                <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                                <span className="text-xs">Cargando detalles...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
                <SelectItem value="pending" className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span>Pendiente</span>
                </SelectItem>
                <SelectItem value="delivered" className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Entregado</span>
                </SelectItem>
                <SelectItem value="cancelled" className="flex items-center gap-1">
                  <CircleX className="h-4 w-4 text-red-600" />
                  <span>Cancelado</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateStatus}
              size="sm"
              disabled={updateStatusMutation.isPending || !newStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateStatusMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                  Actualizando...
                </span>
              ) : (
                "Actualizar Estado"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}