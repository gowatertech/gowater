import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, RefreshCcw, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Commission = {
  id: number;
  userId: number;
  userName: string;
  userRole: "driver" | "helper";
  weekStartDate: string;
  weekEndDate: string;
  productCount: number;
  totalAmount: string;
  status: "pending" | "paid" | "cancelled";
  paymentDate?: string;
  routeName?: string;
};

// Simulación de datos para la vista previa
// Estos datos serán reemplazados por llamadas reales a la API
const mockCommissions: Commission[] = [];

const CommissionsPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Función para obtener las comisiones según el estado activo
  const { data: commissions = [], isLoading, refetch } = useQuery({
    queryKey: ["commissions", activeTab],
    queryFn: async () => {
      // En producción, esta sería una llamada API real
      const response = await fetch(`/api/commissions?status=${activeTab}`);
      if (!response.ok) {
        throw new Error("Error al cargar las comisiones");
      }
      return response.json();
    },
    // Desactivar la consulta automática para la demo
    enabled: false,
  });

  // Función para manejar los filtros y búsquedas
  const filteredCommissions = mockCommissions.filter((commission) => {
    // Filtrar por término de búsqueda (nombre de usuario)
    const matchesSearch = commission.userName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Filtrar por estado
    const matchesStatus =
      statusFilter === "all" || commission.status === statusFilter;

    // Filtrar por rol
    const matchesRole =
      roleFilter === "all" || commission.userRole === roleFilter;

    // Filtrar por rango de fechas
    const matchesDateRange = !selectedDateRange.from
      ? true
      : new Date(commission.weekStartDate) >= selectedDateRange.from &&
        (!selectedDateRange.to ||
          new Date(commission.weekEndDate) <= selectedDateRange.to);

    return matchesSearch && matchesStatus && matchesRole && matchesDateRange;
  });

  // Función para calcular el total de comisiones
  const calculateTotal = (commissions: Commission[]): number => {
    return commissions.reduce(
      (total, commission) => total + parseFloat(commission.totalAmount),
      0
    );
  };

  // Función para formatear moneda
  const formatCurrency = (amount: string | number): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(numAmount);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
  };

  // Función para manejar el pago de una comisión
  const handlePayCommission = (id: number) => {
    toast({
      title: "Comisión marcada como pagada",
      description: `La comisión #${id} ha sido marcada como pagada.`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Comisiones</h1>
      
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal w-[240px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDateRange.from ? (
                    selectedDateRange.to ? (
                      <>
                        {format(selectedDateRange.from, "d MMM, yyyy", { locale: es })} -{" "}
                        {format(selectedDateRange.to, "d MMM, yyyy", { locale: es })}
                      </>
                    ) : (
                      format(selectedDateRange.from, "d MMM, yyyy", { locale: es })
                    )
                  ) : (
                    <span>Seleccionar fechas...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={selectedDateRange}
                  onSelect={(range) => setSelectedDateRange(range || { from: undefined, to: undefined })}
                  initialFocus
                  locale={es}
                />
                <div className="p-3 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedDateRange({ from: undefined, to: undefined })}
                  >
                    Limpiar filtro
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-[140px]">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="paid">Pagadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[140px]">
            <Select
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="driver">Conductores</SelectItem>
                <SelectItem value="helper">Ayudantes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="paid">Pagadas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Comisiones Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateTotal(filteredCommissions.filter(c => c.status === 'pending')))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Conductores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateTotal(filteredCommissions.filter(c => c.userRole === 'driver')))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Ayudantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateTotal(filteredCommissions.filter(c => c.userRole === 'helper')))}
              </div>
            </CardContent>
          </Card>
        </div>

        <TabsContent value={activeTab} className="border rounded-md p-4">
          {isLoading ? (
            <div className="text-center py-4">Cargando comisiones...</div>
          ) : filteredCommissions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No hay comisiones para mostrar</p>
              <Button onClick={() => refetch()}>Cargar comisiones</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Cant. Productos</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>{commission.id}</TableCell>
                      <TableCell className="font-medium">{commission.userName}</TableCell>
                      <TableCell>
                        {commission.userRole === "driver" ? "Conductor" : "Ayudante"}
                      </TableCell>
                      <TableCell>
                        {formatDate(commission.weekStartDate)} - {formatDate(commission.weekEndDate)}
                      </TableCell>
                      <TableCell>{commission.productCount}</TableCell>
                      <TableCell>{commission.routeName || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            commission.status === "pending"
                              ? "outline"
                              : commission.status === "paid"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {commission.status === "pending"
                            ? "Pendiente"
                            : commission.status === "paid"
                            ? "Pagada"
                            : "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(commission.totalAmount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Implementar visualización de detalles
                            }}
                          >
                            Ver detalles
                          </Button>
                          {commission.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handlePayCommission(commission.id)}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionsPage;