import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Eye,
  CheckCircle,
  Filter,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Status = 'calculated' | 'pending' | 'paid' | 'cancelled';
type UserRole = 'driver' | 'helper';

type Commission = {
  id: number | null;
  userId: number;
  userName: string;
  userRole: UserRole;
  date: string; // Formato YYYY-MM-DD
  productCount: number;
  totalAmount: string;
  status: Status;
  paymentDate?: string | null;
  routeName?: string | null;
  createdAt?: string | null;
};

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case 'calculated':
      return (
        <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700">
          💡 Calculado
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="border-yellow-500 bg-yellow-50 text-yellow-700">
          🟡 Pendiente
        </Badge>
      );
    case 'paid':
      return (
        <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700">
          🟢 Pagado
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700">
          🔴 Cancelado
        </Badge>
      );
    default:
      return null;
  }
}

export default function CommissionsPage() {
  const [, navigate] = useLocation();
  const currentDate = new Date();
  
  // State para filtros
  const [quickFilter, setQuickFilter] = useState<'today' | 'week' | 'month'>('today');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: currentDate,
    to: currentDate,
  });
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Aplicar filtro rápido
  const applyQuickFilter = (filter: 'today' | 'week' | 'month') => {
    setQuickFilter(filter);
    const today = new Date();
    
    switch (filter) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'week':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        setDateRange({ from: weekStart, to: weekEnd });
        break;
      case 'month':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        setDateRange({ from: monthStart, to: monthEnd });
        break;
    }
  };

  // Obtener lista de usuarios con comisión habilitada
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Error al obtener usuarios');
      return res.json();
    },
  });

  const usersWithCommission = useMemo(() => {
    return users.filter((u: any) => 
      u.hasCommission && 
      (u.role === 'driver' || u.role === 'assistant') &&
      u.active
    );
  }, [users]);

  // Fetch comisiones
  const fetchCommissions = async () => {
    if (!dateRange.from || !dateRange.to) {
      return [];
    }

    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');
    
    let url = `/api/commissions?startDate=${startDate}&endDate=${endDate}`;
    if (selectedUserId !== 'all') {
      url += `&userId=${selectedUserId}`;
    }
    if (selectedRole !== 'all') {
      url += `&userRole=${selectedRole}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener comisiones');
    const data = await res.json();
    return data;
  };

  const { data: commissions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/commissions', dateRange.from, dateRange.to, selectedUserId, selectedRole],
    queryFn: fetchCommissions,
    enabled: !!dateRange.from && !!dateRange.to,
    staleTime: 0,
    refetchOnMount: true,
  });

  const stats = useMemo(() => {
    if (!Array.isArray(commissions) || commissions.length === 0) {
      return {
        totalDrivers: 0,
        totalHelpers: 0,
        totalAmount: 0,
        totalProducts: 0,
        driverAmount: 0,
        helperAmount: 0,
      };
    }

    const drivers = commissions.filter(c => c.userRole === 'driver');
    const helpers = commissions.filter(c => c.userRole === 'helper');
    
    const driverAmount = drivers.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0);
    const helperAmount = helpers.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0);
    const totalAmount = driverAmount + helperAmount;
    const totalProducts = commissions.reduce((sum, c) => sum + c.productCount, 0);

    return {
      totalDrivers: drivers.length,
      totalHelpers: helpers.length,
      totalAmount,
      totalProducts,
      driverAmount,
      helperAmount,
    };
  }, [commissions]);

  const chartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    
    // Agrupar comisiones por día
    const amountsByDate = new Map<string, number>();
    
    if (Array.isArray(commissions)) {
      commissions.forEach(commission => {
        const commissionDate = commission.date;
        const currentAmount = amountsByDate.get(commissionDate) || 0;
        amountsByDate.set(commissionDate, currentAmount + parseFloat(commission.totalAmount));
      });
    }
    
    // Generar array de fechas en el rango
    const days: { day: string; amount: number; date: string }[] = [];
    let currentDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayName = format(currentDate, 'EEE', { locale: es });
      const dayNumber = format(currentDate, 'dd/MM');
      
      days.push({
        day: dayName,
        amount: amountsByDate.get(dateStr) || 0,
        date: dayNumber,
      });
      
      currentDate = addDays(currentDate, 1);
    }
    
    return days;
  }, [commissions, dateRange]);

  const maxAmount = useMemo(() => {
    return Math.max(...(commissions?.map((c: Commission) => parseFloat(c.totalAmount)) || []), 100);
  }, [commissions]);

  const clearFilters = () => {
    setSelectedUserId('all');
    setSelectedRole('all');
    applyQuickFilter('today');
  };

  const hasActiveFilters = selectedUserId !== 'all' || selectedRole !== 'all';

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comisiones Diarias</h1>
          <p className="text-muted-foreground">
            Gestione las comisiones de choferes y ayudantes basadas en entregas completadas
          </p>
        </div>

        {/* Filtros */}
        <div className="space-y-4">
          {/* Tabs de filtro rápido */}
          <Tabs value={quickFilter} onValueChange={(v) => applyQuickFilter(v as any)}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="today" data-testid="tab-today">Hoy</TabsTrigger>
              <TabsTrigger value="week" data-testid="tab-week">Esta Semana</TabsTrigger>
              <TabsTrigger value="month" data-testid="tab-month">Este Mes</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtros avanzados */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Selector de rango de fechas */}
            <div className="flex gap-2 flex-1">
              <DatePicker
                selected={dateRange.from}
                onSelect={(date) => {
                  setDateRange(prev => ({ ...prev, from: date }));
                  setQuickFilter('' as any); // Limpiar filtro rápido al seleccionar manual
                }}
                placeholderText="Fecha inicio"
              />
              <DatePicker
                selected={dateRange.to}
                onSelect={(date) => {
                  setDateRange(prev => ({ ...prev, to: date }));
                  setQuickFilter('' as any);
                }}
                placeholderText="Fecha fin"
              />
            </div>

            {/* Filtro de usuario */}
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-user">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="truncate">
                    {selectedUserId === 'all' ? 'Todos los usuarios' : 
                      usersWithCommission.find((u: any) => u.id.toString() === selectedUserId)?.name || 'Usuario'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {usersWithCommission.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name} ({user.role === 'driver' ? 'Chofer' : 'Ayudante'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de rol */}
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
            >
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-role">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>
                    {selectedRole === 'all' ? 'Todos los roles' : 
                     selectedRole === 'driver' ? 'Choferes' : 'Ayudantes'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="driver">Choferes</SelectItem>
                <SelectItem value="helper">Ayudantes</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón limpiar filtros */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Limpiar filtros"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Rango de fechas seleccionado */}
          {dateRange.from && dateRange.to && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2 self-start">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {format(dateRange.from, 'dd MMM', { locale: es })} - {format(dateRange.to, 'dd MMM yyyy', { locale: es })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Total Choferes</span>
              <Users className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrivers}</div>
            <p className="text-xs text-muted-foreground">
              RD$ {stats.driverAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Total Ayudantes</span>
              <Users className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHelpers}</div>
            <p className="text-xs text-muted-foreground">
              RD$ {stats.helperAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Total General</span>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RD$ {stats.totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDrivers + stats.totalHelpers} empleados
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Productos Vendidos</span>
              <Package className="h-4 w-4 text-orange-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Rango seleccionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica de Barras por Día */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Distribución de Comisiones por Día
          </CardTitle>
          <CardDescription>
            Comisiones diarias en el rango seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  className="text-[10px] sm:text-xs"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  className="text-[10px] sm:text-xs"
                  label={{ value: 'Monto (RD$)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => `RD$ ${value.toFixed(2)}`}
                  labelFormatter={(label, payload) => {
                    const item = payload[0]?.payload;
                    return item ? `${item.day} ${item.date}` : label;
                  }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Comisiones */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Comisiones</CardTitle>
          <CardDescription>
            Comisiones generadas para el rango seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Cargando comisiones...</p>
              </div>
            </div>
          ) : !Array.isArray(commissions) || commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">No hay comisiones para este rango</p>
              <p className="text-xs text-muted-foreground mt-1">
                No se encontraron órdenes completadas en este período
              </p>
            </div>
          ) : (
            <>
              {/* Vista de tarjetas para móvil */}
              <div className="md:hidden space-y-4">
                {commissions.map((commission) => {
                  const progressPercent = Math.min((parseFloat(commission.totalAmount) / maxAmount) * 100, 100);
                  const isCalculated = commission.status === 'calculated';
                  const commissionKey = commission.id || `calc-${commission.userId}-${commission.date}`;
                  
                  return (
                    <Card key={commissionKey} className="overflow-hidden" data-testid={`card-commission-${commissionKey}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base truncate">{commission.userName}</CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {commission.userRole === 'driver' ? '🚗 Chofer' : '👤 Ayudante'}
                              </Badge>
                              <StatusBadge status={commission.status} />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(commission.date), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Monto Total:</span>
                          <span className="text-lg font-bold">RD$ {parseFloat(commission.totalAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Productos:</span>
                          <span className="font-medium">{commission.productCount}</span>
                        </div>
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {progressPercent.toFixed(0)}% del máximo
                          </p>
                        </div>
                        {!isCalculated && commission.id ? (
                          <Link to={`/commissions/details/${commission.id}`} className="w-full">
                            <Button variant="default" size="sm" className="w-full" data-testid={`button-view-mobile-${commission.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </Button>
                          </Link>
                        ) : (
                          <div className="text-center py-2 text-xs text-blue-600 bg-blue-50 rounded">
                            💡 Comisión calculada en tiempo real
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Vista de tabla para escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[800px]">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-center">Productos</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="hidden lg:table-cell">Progreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => {
                      const progressPercent = Math.min((parseFloat(commission.totalAmount) / maxAmount) * 100, 100);
                      const isCalculated = commission.status === 'calculated';
                      const commissionKey = commission.id || `calc-${commission.userId}-${commission.date}`;
                      
                      return (
                        <TableRow key={commissionKey}>
                          <TableCell className="font-medium">{commission.userName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {commission.userRole === 'driver' ? '🚗 Chofer' : '👤 Ayudante'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(commission.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              {commission.productCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            RD$ {parseFloat(commission.totalAmount).toFixed(2)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="space-y-1 min-w-[120px]">
                              <Progress value={progressPercent} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {progressPercent.toFixed(0)}% del máximo
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={commission.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {!isCalculated && commission.id ? (
                              <Link to={`/commissions/details/${commission.id}`}>
                                <Button variant="ghost" size="sm" data-testid={`button-view-${commission.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-xs text-blue-600">
                                💡 Calculado
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enlace para oficializar comisiones */}
      {commissions.length > 0 && commissions.some((c: Commission) => c.status === 'calculated') && (
        <div className="flex justify-center">
          <Link to="/commissions/simple-old">
            <Button 
              className="px-6 py-3"
              data-testid="link-generate-commissions"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Oficializar Comisiones como Pagables
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
