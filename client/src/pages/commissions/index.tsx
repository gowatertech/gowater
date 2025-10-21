import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { format, startOfWeek, endOfWeek, getISOWeek, getISOWeekYear, setISOWeek, setYear, getISOWeeksInYear } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Status = 'pending' | 'paid' | 'cancelled';
type UserRole = 'driver' | 'helper';

type Commission = {
  id: number;
  userId: number;
  userName: string;
  userRole: UserRole;
  weekStartDate: string;
  weekEndDate: string;
  productCount: number;
  totalAmount: string;
  status: Status;
  paymentDate?: string;
  routeName?: string;
  createdAt?: string;
};

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
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

function getWeekNumber(date: Date): number {
  return getISOWeek(date);
}

function getDateFromWeekNumber(year: number, week: number): { start: Date; end: Date } {
  let date = new Date(year, 0, 4);
  date = setYear(date, year);
  date = setISOWeek(date, week);
  
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  
  return { start, end };
}

export default function CommissionsPage() {
  const [, navigate] = useLocation();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(getISOWeekYear(currentDate));
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(currentDate));
  
  const weekDates = useMemo(() => {
    return getDateFromWeekNumber(selectedYear, selectedWeek);
  }, [selectedYear, selectedWeek]);

  const handlePreviousWeek = () => {
    if (selectedWeek === 1) {
      const prevYear = selectedYear - 1;
      setSelectedYear(prevYear);
      setSelectedWeek(getISOWeeksInYear(new Date(prevYear, 0, 4)));
    } else {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const handleNextWeek = () => {
    const weeksInYear = getISOWeeksInYear(new Date(selectedYear, 0, 4));
    if (selectedWeek === weeksInYear) {
      setSelectedYear(selectedYear + 1);
      setSelectedWeek(1);
    } else {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  const handleCurrentWeek = () => {
    const now = new Date();
    setSelectedYear(getISOWeekYear(now));
    setSelectedWeek(getWeekNumber(now));
  };

  const handleYearChange = (newYear: string) => {
    const year = parseInt(newYear);
    const weeksInNewYear = getISOWeeksInYear(new Date(year, 0, 4));
    setSelectedYear(year);
    if (selectedWeek > weeksInNewYear) {
      setSelectedWeek(weeksInNewYear);
    }
  };

  const fetchCommissions = async () => {
    const startDate = format(weekDates.start, 'yyyy-MM-dd');
    const endDate = format(weekDates.end, 'yyyy-MM-dd');
    const url = `/api/commissions?startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener comisiones');
    const data = await res.json();
    return data;
  };

  const { data: commissions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/commissions', selectedWeek, selectedYear],
    queryFn: fetchCommissions,
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
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const totalWeekAmount = Array.isArray(commissions) 
      ? commissions.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0) 
      : 0;
    
    const avgPerDay = totalWeekAmount / 7;
    
    return days.map((day, index) => {
      const dayDate = new Date(weekDates.start);
      dayDate.setDate(dayDate.getDate() + index);
      
      return {
        day,
        amount: avgPerDay,
        date: format(dayDate, 'dd/MM'),
      };
    });
  }, [commissions, weekDates]);

  const maxAmount = useMemo(() => {
    return Math.max(...(commissions?.map((c: Commission) => parseFloat(c.totalAmount)) || []), 100);
  }, [commissions]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header con Selector de Semana */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comisiones</h1>
          <p className="text-muted-foreground">
            Gestione las comisiones de choferes y ayudantes basadas en entregas completadas
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Selector de semana - optimizado para móvil */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousWeek}
              data-testid="button-previous-week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[200px]">
              <Select
                value={selectedWeek.toString()}
                onValueChange={(value) => setSelectedWeek(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-week">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: getISOWeeksInYear(new Date(selectedYear, 0, 4)) }, (_, i) => i + 1).map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Semana {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-full sm:w-[120px]" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextWeek}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCurrentWeek}
              data-testid="button-current-week"
              className="hidden sm:inline-flex"
            >
              Semana Actual
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCurrentWeek}
              data-testid="button-current-week-mobile"
              className="sm:hidden"
              title="Semana Actual"
              aria-label="Ir a semana actual"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Rango de fechas */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2 self-start">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(weekDates.start, 'dd MMM', { locale: es })} - {format(weekDates.end, 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
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
              Esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica de Barras por Día */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Promedio Diario de Comisiones
          </CardTitle>
          <CardDescription>
            Distribución promedio de comisiones por día (total semanal / 7 días)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10 }}
                  className="text-[10px] sm:text-xs"
                  label={{ value: '', position: 'insideBottom', offset: -5 }}
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
                    return item ? `${label} (${item.date})` : label;
                  }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Comisiones Mejorada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Comisiones</CardTitle>
          <CardDescription>
            Comisiones generadas para la semana seleccionada
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
              <p className="text-sm font-medium">No hay comisiones para esta semana</p>
              <p className="text-xs text-muted-foreground mt-1">
                Genere comisiones para ver los datos aquí
              </p>
            </div>
          ) : (
            <>
              {/* Vista de tarjetas para móvil */}
              <div className="md:hidden space-y-4">
                {commissions.map((commission) => {
                  const progressPercent = Math.min((parseFloat(commission.totalAmount) / maxAmount) * 100, 100);
                  
                  return (
                    <Card key={commission.id} className="overflow-hidden" data-testid={`card-commission-${commission.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base truncate">{commission.userName}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {commission.userRole === 'driver' ? '🚗 Chofer' : '👤 Ayudante'}
                              </Badge>
                              <StatusBadge status={commission.status} />
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
                        {commission.routeName && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Ruta:</span>
                            <span className="font-medium text-sm truncate max-w-[150px]">{commission.routeName}</span>
                          </div>
                        )}
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {progressPercent.toFixed(0)}% del objetivo
                          </p>
                        </div>
                        <Link to={`/commissions/details/${commission.id}`} className="w-full">
                          <Button variant="default" size="sm" className="w-full" data-testid={`button-view-mobile-${commission.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </Button>
                        </Link>
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
                      
                      return (
                        <TableRow key={commission.id}>
                          <TableCell className="font-medium">{commission.userName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {commission.userRole === 'driver' ? '🚗 Chofer' : '👤 Ayudante'}
                            </Badge>
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
                                {progressPercent.toFixed(0)}% del objetivo
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={commission.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/commissions/details/${commission.id}`}>
                              <Button variant="ghost" size="sm" data-testid={`button-view-${commission.id}`}>
                                <Eye className="mr-1 h-3 w-3" />
                                Ver
                              </Button>
                            </Link>
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

      {/* Enlace para Generar Comisiones */}
      <div className="flex justify-center">
        <a 
          href="/generate-commissions.html" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="link-generate-commissions"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Generar Comisiones para esta Semana
        </a>
      </div>
    </div>
  );
}
