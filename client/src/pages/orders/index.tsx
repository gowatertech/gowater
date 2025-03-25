import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  type Customer, 
  type Product, 
  type Order, 
  insertOrderSchema 
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMobile } from "@/hooks/use-mobile";

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

import {
  ShoppingCart,
  ClipboardList,
  Plus,
  Search,
  X,
  FileText,
  CheckCircle,
  Clock,
  CircleX,
  Truck,
  CalendarDays,
  Package,
  User,
  DollarSign,
  AlertTriangle,
  Eye,
  Filter,
  ListFilter,
  Tag,
  ArrowLeft,
} from "lucide-react";

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
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    Array(5).fill({
      code: "",
      description: "",
      quantity: 0,
      price: 0,
      total: 0
    })
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

  // Mutación para crear pedidos
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
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
        routeId: null as number | null
      };

      // 4. Validar con Zod antes de enviar
      const validationResult = insertOrderSchema.safeParse(orderData);
      if (!validationResult.success) {
        console.error('Error de validación:', validationResult.error);
        throw new Error(validationResult.error.issues[0].message);
      }

      // 5. Crear el pedido
      const orderResponse = await apiRequest("POST", "/api/orders", validationResult.data);
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error?.issues?.[0]?.message || 'Error al crear el pedido');
      }

      const order = await orderResponse.json();

      // 5. Crear los items del pedido
      for (const item of validItems) {
        const itemData = {
          orderId: order.id,
          productId: parseInt(item.code),
          quantity: item.quantity,
          price: item.price.toFixed(2) // Formato exacto: "0.00"
        };

        const itemResponse = await apiRequest("POST", `/api/orders/${order.id}/items`, itemData);
        if (!itemResponse.ok) {
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
      setOrderItems(Array(5).fill({
        code: "",
        description: "",
        quantity: 0,
        price: 0,
        total: 0
      }));
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

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                <h2 className="font-medium text-xs">Lista de Pedidos</h2>
              </div>
              <Badge variant="outline" className="text-xs h-5 px-1.5">{filteredOrders.length} pedidos</Badge>
            </div>

            {isMobile ? (
              /* Vista de tarjetas para móvil */
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-3 text-gray-500 text-xs">
                      No se encontraron pedidos
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const customer = customers?.find(c => c.id === order.customerId);
                      return (
                        <Card 
                          key={order.id} 
                          className={`p-2 border-l-4 ${getStatusColor(order.status)}`}
                          onClick={() => {
                            setSelectedOrder(order);
                            setActiveTab("details");
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-xs">Pedido #{order.id}</h3>
                              <p className="text-[10px] text-gray-500 line-clamp-1 max-w-[150px]">
                                {customer?.businessname || "Cliente desconocido"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end">
                              {getStatusBadge(order.status)}
                              <p className="text-[10px] mt-0.5">
                                <CalendarDays className="h-2.5 w-2.5 inline mr-0.5" />
                                {new Date(order.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-medium flex items-center text-xs">
                              <DollarSign className="h-3 w-3 text-green-600 mr-0.5" />
                              RD$ {parseFloat(order.total.toString()).toFixed(2)}
                            </span>
                            
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1.5 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setIsDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-2.5 w-2.5 mr-0.5" />
                              Detalles
                            </Button>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            ) : (
              /* Tabla para escritorio */
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="text-xs py-1">No. Pedido</TableHead>
                      <TableHead className="text-xs py-1">Cliente</TableHead>
                      <TableHead className="text-xs py-1">Fecha</TableHead>
                      <TableHead className="text-xs py-1">Total</TableHead>
                      <TableHead className="text-xs py-1">Estado</TableHead>
                      <TableHead className="text-xs py-1">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500 text-xs">
                          No se encontraron pedidos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id} className="h-8">
                          <TableCell className="py-1 text-xs">#{order.id}</TableCell>
                          <TableCell className="py-1 text-xs">
                            {customers?.find(c => c.id === order.customerId)?.businessname || "Cliente desconocido"}
                          </TableCell>
                          <TableCell className="py-1 text-xs">
                            {new Date(order.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="py-1 text-xs">
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Volver
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="px-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs h-5">
                    <CalendarDays className="h-3 w-3" /> {new Date(selectedOrder.date).toLocaleDateString()}
                  </Badge>
                </div>
                
                <Separator className="my-1" />
                
                {/* Información del Cliente */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium flex items-center">
                    <User className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Información del Cliente
                  </h3>
                  <div className="bg-blue-50 p-2 rounded-md border border-blue-100">
                    <div className="grid grid-cols-2 gap-y-1 text-xs">
                      <div>
                        <span className="font-medium">Cliente: </span>
                        <span className="line-clamp-1">{customers?.find(c => c.id === selectedOrder.customerId)?.businessname}</span>
                      </div>
                      <div>
                        <span className="font-medium">Teléfono: </span>
                        <span>{customers?.find(c => c.id === selectedOrder.customerId)?.phone}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Dirección: </span>
                        <span className="line-clamp-1">
                          {(() => {
                            const customer = customers?.find(c => c.id === selectedOrder.customerId);
                            return customer ? `${customer.street} ${customer.streetnumber}` : "";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalles del Pedido */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium flex items-center">
                    <Package className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Productos
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="h-[180px] sm:h-[240px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-8">
                            <TableHead className="w-[40%] py-1.5 text-xs sticky top-0 bg-background">Producto</TableHead>
                            <TableHead className="w-[15%] py-1.5 text-xs text-right sticky top-0 bg-background">Cant.</TableHead>
                            <TableHead className="w-[22%] py-1.5 text-xs text-right sticky top-0 bg-background">Precio</TableHead>
                            <TableHead className="w-[23%] py-1.5 text-xs text-right sticky top-0 bg-background">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingDetails ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-2 text-xs">
                                Cargando detalles del pedido...
                              </TableCell>
                            </TableRow>
                          ) : orderDetails.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-2 text-xs">
                                No hay productos en este pedido
                              </TableCell>
                            </TableRow>
                          ) : (
                            orderDetails.map((item: any) => {
                              const product = products?.find(p => p.id === item.productId);
                              return (
                                <TableRow key={item.id} className="h-8">
                                  <TableCell className="py-1 px-2 text-xs">{product?.name || `Producto #${item.productId}`}</TableCell>
                                  <TableCell className="py-1 px-2 text-xs text-right">{item.quantity}</TableCell>
                                  <TableCell className="py-1 px-2 text-xs text-right">RD$ {parseFloat(item.price).toFixed(2)}</TableCell>
                                  <TableCell className="py-1 px-2 text-xs text-right font-medium">RD$ {(parseFloat(item.price) * item.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>

                {/* Resumen */}
                <div className="space-y-1">
                  <h3 className="text-xs font-medium flex items-center">
                    <DollarSign className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Resumen del Pedido
                  </h3>
                  <div className="bg-blue-50 p-2 rounded-md border border-blue-100">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Método de Pago:</span>
                        <span>{selectedOrder.paymentMethod === 'cash' ? 'Efectivo' : 'Crédito'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ruta Asignada:</span>
                        <span>{selectedOrder.routeId ? `#${selectedOrder.routeId}` : 'No asignada'}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-bold text-sm">
                        <span>Total:</span>
                        <span>RD$ {parseFloat(selectedOrder.total.toString()).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex items-center justify-center gap-1"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Asignar a Ruta
                  </Button>
                  
                  <Button 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 h-7 text-xs flex items-center justify-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Imprimir Pedido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para detalles en móvil */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl p-1.5 sm:p-3 gap-2">
          <DialogHeader className="p-0 space-y-1">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-base flex items-center gap-1">
                <FileText className="h-4 w-4 text-blue-600" />
                Pedido #{selectedOrder?.id}
              </DialogTitle>
              {getStatusBadge(selectedOrder?.status || 'pending')}
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {selectedOrder && new Date(selectedOrder.date).toLocaleDateString()}
            </p>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-2">
              {/* Información del cliente */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium flex items-center">
                  <User className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  Información del Cliente
                </h3>
                <div className="bg-blue-50 p-2 rounded-md border border-blue-100 grid grid-cols-2 gap-y-1 text-xs">
                  <div>
                    <span className="font-medium">Cliente: </span>
                    <span className="line-clamp-1">{customers?.find(c => c.id === selectedOrder.customerId)?.businessname}</span>
                  </div>
                  <div>
                    <span className="font-medium">Teléfono: </span>
                    <span>{customers?.find(c => c.id === selectedOrder.customerId)?.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Dirección: </span>
                    <span className="line-clamp-1">
                      {(() => {
                        const customer = customers?.find(c => c.id === selectedOrder.customerId);
                        return customer ? `${customer.street} ${customer.streetnumber}` : "";
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalles del pedido */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium flex items-center">
                  <Package className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  Productos
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="w-[40%] py-1.5 text-xs sticky top-0 bg-background">Producto</TableHead>
                          <TableHead className="w-[15%] py-1.5 text-xs text-right sticky top-0 bg-background">Cant.</TableHead>
                          <TableHead className="w-[22%] py-1.5 text-xs text-right sticky top-0 bg-background">Precio</TableHead>
                          <TableHead className="w-[23%] py-1.5 text-xs text-right sticky top-0 bg-background">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingDetails ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-2 text-xs">
                              Cargando...
                            </TableCell>
                          </TableRow>
                        ) : orderDetails.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-2 text-xs">
                              No hay productos
                            </TableCell>
                          </TableRow>
                        ) : (
                          orderDetails.map((item: any) => {
                            const product = products?.find(p => p.id === item.productId);
                            return (
                              <TableRow key={item.id} className="h-8">
                                <TableCell className="py-1 px-2 text-xs">{product?.name || `Producto #${item.productId}`}</TableCell>
                                <TableCell className="py-1 px-2 text-xs text-right">{item.quantity}</TableCell>
                                <TableCell className="py-1 px-2 text-xs text-right">RD$ {parseFloat(item.price).toFixed(2)}</TableCell>
                                <TableCell className="py-1 px-2 text-xs text-right font-medium">RD$ {(parseFloat(item.price) * item.quantity).toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
                <div className="bg-blue-50 p-2 rounded-md border border-blue-100">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Método de Pago:</span>
                      <span>{selectedOrder.paymentMethod === 'cash' ? 'Efectivo' : 'Crédito'}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold text-sm">
                      <span>Total:</span>
                      <span>RD$ {parseFloat(selectedOrder.total.toString()).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsDetailsDialogOpen(false)}
                >
                  Cerrar
                </Button>
                <Button 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}