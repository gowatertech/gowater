import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek, endOfWeek } from 'date-fns';
import {
  CalendarIcon,
  ArrowRight,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Filter,
  Calendar,
  BadgeDollarSign,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';

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

function CommissionsFilters({
  onFilterChange
}: {
  onFilterChange: (filters: Record<string, string>) => void;
}) {
  const [status, setStatus] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [date, setDate] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [open, setOpen] = useState(false);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range) {
      setDate({
        from: range.from,
        to: range.to || range.from
      });
    }
  };

  const applyFilters = () => {
    const filters: Record<string, string> = {};
    
    if (status) filters.status = status;
    if (userRole) filters.userRole = userRole;
    if (date.from) filters.startDate = format(date.from, 'yyyy-MM-dd');
    if (date.to) filters.endDate = format(date.to, 'yyyy-MM-dd');
    
    onFilterChange(filters);
    setOpen(false);
  };

  const resetFilters = () => {
    setStatus('');
    setUserRole('');
    setDate({ from: undefined, to: undefined });
    onFilterChange({});
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
          {(status || userRole || date.from) && (
            <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal lg:hidden">
              Activo
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Filtrar comisiones</h4>
            <p className="text-sm text-muted-foreground">
              Seleccione los filtros que desea aplicar
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={status}
                onValueChange={setStatus}
              >
                <SelectTrigger id="status" className="col-span-2 h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="userRole">Rol</Label>
              <Select
                value={userRole}
                onValueChange={setUserRole}
              >
                <SelectTrigger id="userRole" className="col-span-2 h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="driver">Chofer</SelectItem>
                  <SelectItem value="helper">Ayudante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="date">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={`col-span-2 h-8 justify-start text-left font-normal ${!date.from && "text-muted-foreground"}`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {date.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "P", { locale: es })} -{" "}
                          {format(date.to, "P", { locale: es })}
                        </>
                      ) : (
                        format(date.from, "P", { locale: es })
                      )
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={date.from}
                    selected={date}
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={applyFilters} size="sm" className="flex-1">Aplicar</Button>
            <Button onClick={resetFilters} size="sm" variant="outline" className="flex-1">Limpiar</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CommissionCards({ commissions, isLoading }: { commissions: Commission[]; isLoading: boolean }) {
  console.log("CommissionCards - commissions:", commissions);
  console.log("CommissionCards - tipo de commissions:", typeof commissions);
  if (Array.isArray(commissions)) {
    console.log("CommissionCards - es un array con longitud:", commissions.length);
  } else {
    console.log("CommissionCards - no es un array");
  }
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando comisiones...</p>
      </div>
    );
  }

  if (!commissions || commissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No se encontraron comisiones</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
      {commissions.map((commission) => (
        <Card key={commission.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{commission.userName}</CardTitle>
                <CardDescription>
                  {commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'}
                  {commission.routeName && ` • Ruta: ${commission.routeName}`}
                </CardDescription>
              </div>
              <StatusBadge status={commission.status} />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                <span>
                  {format(new Date(commission.weekStartDate), 'dd MMM', { locale: es })} - {' '}
                  {format(new Date(commission.weekEndDate), 'dd MMM yyyy', { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {commission.productCount} productos
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xl font-semibold">
                ${parseFloat(commission.totalAmount).toFixed(2)}
              </div>
              <Link
                to={`/commissions/details/${commission.id}`}
                className="flex items-center text-sm font-medium text-primary"
              >
                Ver detalles
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CommissionsTable({ commissions, isLoading }: { commissions: Commission[]; isLoading: boolean }) {
  console.log("CommissionsTable - commissions:", commissions);
  
  if (isLoading) {
    return (
      <div className="hidden flex-col items-center justify-center p-8 lg:flex">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando comisiones...</p>
      </div>
    );
  }

  if (!commissions || commissions.length === 0) {
    return (
      <div className="hidden flex-col items-center justify-center p-8 lg:flex">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No se encontraron comisiones</p>
      </div>
    );
  }

  return (
    <div className="hidden rounded-md border lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Ruta</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((commission) => (
            <TableRow key={commission.id}>
              <TableCell className="font-medium">{commission.userName}</TableCell>
              <TableCell>{commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {format(new Date(commission.weekStartDate), 'dd MMM', { locale: es })} - {' '}
                    {format(new Date(commission.weekEndDate), 'dd MMM yyyy', { locale: es })}
                  </span>
                </div>
              </TableCell>
              <TableCell>{commission.routeName || "—"}</TableCell>
              <TableCell>{commission.productCount}</TableCell>
              <TableCell className="font-medium">${parseFloat(commission.totalAmount).toFixed(2)}</TableCell>
              <TableCell>
                <StatusBadge status={commission.status} />
              </TableCell>
              <TableCell className="text-right">
                <Link to={`/commissions/details/${commission.id}`}>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">Ver detalles</span>
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700">
          <Clock className="mr-1 h-3 w-3" />
          Pendiente
        </Badge>
      );
    case 'paid':
      return (
        <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700">
          <Check className="mr-1 h-3 w-3" />
          Pagado
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700">
          <AlertCircle className="mr-1 h-3 w-3" />
          Cancelado
        </Badge>
      );
    default:
      return null;
  }
}

function GenerateCommissionsDialog({ onGenerate }: { onGenerate: (data: any) => void }) {
  console.log("Renderizando GenerateCommissionsDialog con carga optimizada");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [weekDates, setWeekDates] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });  // 1 = lunes
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return { from: start, to: end };
  });
  const [userRole, setUserRole] = useState<string>("driver");
  const [userId, setUserId] = useState<string>("");
  const [submissionAttempted, setSubmissionAttempted] = useState(false);


  // Obtener lista de choferes y ayudantes
  const { data: users = [] } = useQuery({ 
    queryKey: ['/api/users/drivers'],
    staleTime: 300000 // 5 minutos
  });
  
  const filteredUsers = Array.isArray(users) 
    ? users
        .filter((user: any) => 
          userRole === "driver" 
            ? user.role === "driver" 
            : user.role === "assistant"
        )
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
    : [];

  // Efecto para manejar estado del diálogo
  useEffect(() => {
    // Al abrir el diálogo, reiniciar los estados
    if (open) {
      console.log("Diálogo abierto: Reiniciando estados");
      
      // Reiniciar fechas a la semana actual
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      setWeekDates({ from: start, to: end });
      
      // Reiniciar otros estados
      setUserRole("driver");
      setUserId("");
      setErrorMessage(null);
      setSubmissionAttempted(false);
    } else {
      // Al cerrar, solo limpiar mensajes de error
      setErrorMessage(null);
      setSubmissionAttempted(false);
    }
  }, [open]);

  // Controlador simplificado que no depende de la función externa
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSubmissionAttempted(true);
      
      console.log("Preparando datos para generar comisiones...");
      
      // Formatear fechas para la API
      const data = {
        weekStartDate: format(weekDates.from, 'yyyy-MM-dd'),
        weekEndDate: format(weekDates.to, 'yyyy-MM-dd'),
        ...(userId ? { userId: parseInt(userId) } : {}),
        userRole
      };
      
      console.log("Enviando datos para generar comisiones:", data);
      
      // Usando XMLHttpRequest en lugar de fetch para evitar problemas
      const xhr = new XMLHttpRequest();
      const promise = new Promise<any>((resolve, reject) => {
        xhr.open('POST', '/api/commissions/generate', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error('Error al procesar la respuesta del servidor'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData?.error || 'Error al generar comisiones'));
            } catch (e) {
              reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
            }
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Error de red al intentar generar comisiones'));
        };
        
        xhr.timeout = 30000; // 30 segundos
        xhr.ontimeout = function() {
          reject(new Error('La solicitud excedió el tiempo de espera'));
        };
        
        xhr.send(JSON.stringify(data));
      });
      
      const result = await promise;
      console.log("Comisiones generadas exitosamente:", result);
      
      // Mostrar notificación de éxito
      toast({
        title: "Comisiones generadas",
        description: `Se generaron ${result.commissions?.length || 0} comisiones correctamente`,
      });
      
      // Invalidar consultas para refrescar la vista
      queryClient.invalidateQueries({ queryKey: ['/api/commissions'] });
      
      // Cerrar el modal
      setOpen(false);
      
      // Notificar
      if (typeof onGenerate === 'function') {
        onGenerate(result);
      }
      
      return result;
    } catch (error: any) {
      console.error("Error al generar comisiones:", error);
      const errorMsg = error instanceof Error ? error.message : "No se pudieron generar las comisiones";
      setErrorMessage(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setWeekDates({ 
        from: range.from, 
        to: range.to || range.from 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <BadgeDollarSign className="mr-2 h-4 w-4" />
          Generar Comisiones
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generar Comisiones Semanales</DialogTitle>
          <DialogDescription>
            Seleccione el período y el tipo de empleado para calcular las comisiones
            sobre las entregas realizadas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="week">Semana</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(weekDates.from, "P", { locale: es })} -{" "}
                  {format(weekDates.to, "P", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={weekDates.from}
                  selected={{ from: weekDates.from, to: weekDates.to }}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="userRole">Tipo de Empleado</Label>
            <Select
              value={userRole}
              onValueChange={setUserRole}
            >
              <SelectTrigger id="userRole">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">Choferes</SelectItem>
                <SelectItem value="helper">Ayudantes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="userId">Empleado Específico (Opcional)</Label>
            <Select
              value={userId}
              onValueChange={setUserId}
            >
              <SelectTrigger id="userId">
                <SelectValue placeholder="Todos los empleados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los empleados</SelectItem>
                {filteredUsers.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {errorMessage && (
            <div className="text-red-500 text-sm mt-2 bg-red-50 p-2 rounded border border-red-200">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              {errorMessage}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Comisiones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CommissionsPage() {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState<string>("all");
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  
  // Estados para el formulario de generación
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [weekDates, setWeekDates] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return { from: start, to: end };
  });
  const [userRole, setUserRole] = useState<string>("driver");
  const [userId, setUserId] = useState<string>("");

  // Construir el string de query params para el filtrado
  const queryString = Object.entries(filters)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  // Añadir el filtro de estado según la pestaña seleccionada
  const tabQueryParam = currentTab !== 'all' ? `status=${currentTab}` : '';
  const finalQueryString = [queryString, tabQueryParam].filter(Boolean).join('&');
  
  // Obtener la lista de comisiones
  const fetchCommissions = async () => {
    console.log("Obteniendo comisiones...");
    const url = `/api/commissions${finalQueryString ? `?${finalQueryString}` : ''}`;
    console.log("URL de consulta:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener comisiones');
    const data = await res.json();
    console.log("Comisiones recibidas:", data);
    return data;
  };

  // Obtener lista de choferes y ayudantes
  const { data: users = [] } = useQuery({ 
    queryKey: ['/api/users/drivers'],
    staleTime: 300000 // 5 minutos
  });
  
  const filteredUsers = Array.isArray(users) 
    ? users
        .filter((user: any) => 
          userRole === "driver" 
            ? user.role === "driver" 
            : user.role === "assistant"
        )
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
    : [];

  const { data: commissions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/commissions', finalQueryString],
    queryFn: fetchCommissions,
    staleTime: 0, // Siempre refrescar los datos
    refetchOnMount: true, // Refrescar datos al montar el componente
    refetchOnWindowFocus: true // Refrescar datos cuando se vuelve a enfocar la ventana
  });

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setWeekDates({ 
        from: range.from, 
        to: range.to || range.from 
      });
    }
  };

  // Manejar la generación de comisiones
  const handleGenerateCommissions = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      // Formatear fechas para la API
      const data = {
        weekStartDate: format(weekDates.from, 'yyyy-MM-dd'),
        weekEndDate: format(weekDates.to, 'yyyy-MM-dd'),
        ...(userId ? { userId: parseInt(userId) } : {}),
        userRole
      };
      
      console.log("Generando comisiones con datos:", data);
      
      // Agregar timeout para evitar bloqueos indefinidos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout
      
      try {
        const response = await fetch('/api/commissions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Limpiar el timeout si la respuesta llega a tiempo
        
        console.log("Respuesta del servidor:", response.status, response.statusText);
        
        // Primero verificamos el tipo de contenido de la respuesta
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("La respuesta no es JSON:", contentType);
          throw new Error('El servidor no devolvió JSON. Contacta al administrador.');
        }
        
        // Obtenemos los datos JSON
        const result = await response.json();
        console.log("Datos JSON recibidos:", result);
        
        if (!response.ok) {
          throw new Error(result?.error || 'Error al generar comisiones');
        }

        // Si llegamos aquí, todo fue exitoso
        toast({
          title: "Comisiones generadas",
          description: `Se generaron ${result.commissions?.length || 0} comisiones correctamente`,
        });
        
        // Refrescar la lista de comisiones
        refetch();
        
        // Ocultar el formulario
        setShowGenerateForm(false);
        
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        const fetchError = error as Error;
        if (fetchError.name === 'AbortError') {
          throw new Error('La solicitud tardó demasiado tiempo. Intente nuevamente.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Error completo:", error);
      const errorMsg = error instanceof Error ? error.message : "No se pudieron generar las comisiones";
      setErrorMessage(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b pb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comisiones</h1>
          <p className="text-sm text-muted-foreground">
            Gestione las comisiones de choferes y ayudantes basadas en entregas completadas
          </p>
        </div>
        <a href="/generate-commissions.html" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
          <BadgeDollarSign className="mr-2 h-4 w-4" />
          Generar Comisiones
        </a>
      </div>

      {/* Formulario de Generación de Comisiones (visible/oculto según estado) */}
      {showGenerateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generar Comisiones Semanales</CardTitle>
            <CardDescription>
              Seleccione el período y el tipo de empleado para calcular las comisiones
              sobre las entregas realizadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="week">Período (Semana)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(weekDates.from, "P", { locale: es })} -{" "}
                      {format(weekDates.to, "P", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={weekDates.from}
                      selected={{ from: weekDates.from, to: weekDates.to }}
                      onSelect={handleDateSelect}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">Tipo de Empleado</Label>
                <Select
                  value={userRole}
                  onValueChange={setUserRole}
                >
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Choferes</SelectItem>
                    <SelectItem value="helper">Ayudantes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="userId">Empleado Específico (Opcional)</Label>
                <Select
                  value={userId}
                  onValueChange={setUserId}
                >
                  <SelectTrigger id="userId">
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los empleados</SelectItem>
                    {filteredUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {errorMessage && (
                <div className="text-red-500 text-sm mt-2 bg-red-50 p-2 rounded border border-red-200 sm:col-span-2">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {errorMessage}
                </div>
              )}
            </div>
          </CardContent>
          <div className="flex items-center justify-end p-6 pt-0">
            <Button onClick={handleGenerateCommissions} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar Comisiones
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Tabs
            value={currentTab}
            onValueChange={setCurrentTab}
            className="w-full"
          >
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="paid">Pagadas</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <CommissionsFilters onFilterChange={setFilters} />
              </div>
            </div>
          </Tabs>
        </div>

        <CommissionCards commissions={commissions} isLoading={isLoading} />
        <CommissionsTable commissions={commissions} isLoading={isLoading} />
      </div>
    </div>
  );
}