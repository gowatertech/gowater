import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

// Iconos
import { 
  Search, 
  X, 
  ShoppingCart, 
  Plus, 
  ListFilter, 
  Eye, 
  Tag, 
  Clock, 
  CheckCircle, 
  CircleX, 
  AlertTriangle,
  Calendar,
  SearchX
} from "lucide-react";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrdersList() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Obtener los pedidos
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  // Obtener clientes para mostrar sus nombres
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Filtrar pedidos según criterios de búsqueda
  const filteredOrders = orders
    .filter((order: any) => {
      // Filtrar por término de búsqueda
      const customer = customers?.find((c: any) => c.id === order.customerId);
      const searchMatch = 
        customer?.businessname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm) ||
        order.total.toString().includes(searchTerm);
      
      // Filtrar por estado
      const statusMatch = statusFilter === "all" || order.status === statusFilter;
      
      return searchMatch && statusMatch;
    })
    // Ordenar por ID de mayor a menor (más recientes primero)
    .sort((a: any, b: any) => b.id - a.id);

  // Obtener estadísticas de pedidos
  const getOrderStats = () => {
    const pending = orders.filter((o: any) => o.status === "pending").length;
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const total = orders.length;

    const totalAmount = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total.toString()), 0);

    return {
      pending,
      delivered,
      cancelled,
      total,
      totalAmount
    };
  };

  const stats = getOrderStats();

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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Pedidos
        </h1>
        <Button 
          onClick={() => setLocation("/orders/new")}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Pedidos</p>
                <h3 className="font-bold text-lg sm:text-xl">{stats.total}</h3>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pendientes</p>
                <h3 className="font-bold text-lg sm:text-xl">{stats.pending}</h3>
              </div>
              <Clock className="h-8 w-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Entregados</p>
                <h3 className="font-bold text-lg sm:text-xl">{stats.delivered}</h3>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Valor Total</p>
                <h3 className="font-bold text-lg sm:text-xl">
                  RD$ {stats.totalAmount.toFixed(2)}
                </h3>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-primary">$</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador y filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente, ID, monto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center">
                  <ListFilter className="h-4 w-4 mr-2" />
                  <span>Estado</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Pendientes</span>
                  </div>
                </SelectItem>
                <SelectItem value="delivered">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Entregados</span>
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <CircleX className="h-4 w-4 text-red-500" />
                    <span>Cancelados</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vista móvil - Tarjetas */}
          <div className="block md:hidden space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <SearchX className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No se encontraron pedidos</p>
              </div>
            ) : (
              filteredOrders.map((order: any) => {
                const customer = customers?.find((c: any) => c.id === order.customerId);
                return (
                  <Card 
                    key={order.id} 
                    className={`border-l-4 ${getStatusColor(order.status)} shadow-sm`}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-sm flex items-center">
                            <ShoppingCart className="h-3.5 w-3.5 mr-1 text-primary" />
                            Pedido #{order.id}
                          </h3>
                          <p className="text-sm">{customer?.businessname || "Cliente"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">RD$ {parseFloat(order.total.toString()).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>{getStatusBadge(order.status)}</div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setLocation(`/orders/details/${order.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setLocation(`/orders/status/${order.id}`)}
                          >
                            <Tag className="h-3.5 w-3.5 mr-1" />
                            Estado
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <SearchX className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No se encontraron pedidos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order: any) => {
                    const customer = customers?.find((c: any) => c.id === order.customerId);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{customer?.businessname || "Cliente"}</TableCell>
                        <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          RD$ {parseFloat(order.total.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setLocation(`/orders/details/${order.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setLocation(`/orders/status/${order.id}`)}
                            >
                              <Tag className="h-3.5 w-3.5 mr-1" />
                              Estado
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}