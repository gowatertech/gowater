import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { format, parseISO, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Clock,
  Check,
  AlertCircle,
  Edit,
  Calendar,
  BadgeDollarSign,
  User,
  MapPin,
  Loader2,
  ReceiptText,
  MoreHorizontal,
  Package,
  ExternalLink,
  Truck,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

type Status = 'pending' | 'paid' | 'cancelled';
type UserRole = 'driver' | 'helper';

type CommissionItem = {
  id: number;
  productId: number;
  productName: string;
  orderId: number;
  orderNumber?: string;
  quantity: number;
  commissionValue: string;
  commissionAmount: string;
  deliveryDate: string;
};

type CommissionDetails = {
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
  paymentReference?: string;
  routeName?: string;
  routeId?: number;
  notes?: string;
  items: CommissionItem[];
};

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

function UpdateStatusDialog({ 
  commissionId, 
  onStatusUpdate, 
  currentStatus 
}: { 
  commissionId: number; 
  onStatusUpdate: () => void; 
  currentStatus: Status; 
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(currentStatus);
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const queryClient = useQueryClient();

  const isPaid = status === 'paid';

  const handleUpdateStatus = async () => {
    setLoading(true);
    try {
      const url = `/api/commissions/${commissionId}/status`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          ...(paymentDate ? { paymentDate } : {}),
          ...(paymentReference ? { paymentReference } : {}),
          ...(notes ? { notes } : {}),
        })
      });

      queryClient.invalidateQueries({ queryKey: [`/api/commissions/${commissionId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/commissions'] });
      
      toast({
        title: "Estado actualizado",
        description: "El estado de la comisión ha sido actualizado correctamente",
      });
      
      onStatusUpdate();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la comisión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing dialog
      setStatus(currentStatus);
      setPaymentDate("");
      setPaymentReference("");
      setNotes("");
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Actualizar Estado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Actualizar Estado de Comisión</DialogTitle>
          <DialogDescription>
            Cambie el estado de la comisión y proporcione detalles adicionales si es necesario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as Status)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isPaid && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="paymentDate">Fecha de Pago</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentReference">Referencia de Pago</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ej. Transferencia #12345"
                />
              </div>
            </>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpdateStatus} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CommissionDetailsPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = params.id ? parseInt(params.id) : 0;

  const { data: commission, isLoading, refetch } = useQuery({
    queryKey: [`/api/commissions/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/commissions/${id}`);
      if (!res.ok) throw new Error('Error al obtener detalles de comisión');
      return res.json();
    },
    enabled: !!id
  });

  const handleStatusUpdate = () => {
    refetch();
  };

  const dailyBreakdown = useMemo(() => {
    if (!commission) return [];
    
    const start = parseISO(commission.weekStartDate);
    const end = parseISO(commission.weekEndDate);
    const days = eachDayOfInterval({ start, end });
    
    return days.map((day) => {
      const dayItems = commission.items.filter((item: CommissionItem) => 
        isSameDay(parseISO(item.deliveryDate), day)
      );
      
      const totalAmount = dayItems.reduce((sum, item) => 
        sum + parseFloat(item.commissionAmount), 0
      );
      
      const productCount = dayItems.reduce((sum, item) => 
        sum + item.quantity, 0
      );
      
      return {
        date: day,
        items: dayItems,
        totalAmount,
        productCount,
      };
    });
  }, [commission]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/commissions')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Skeleton className="h-8 w-56" />
              <Skeleton className="mt-1.5 h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!commission) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-medium">Comisión no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No se encontró la comisión solicitada o ha sido eliminada.
        </p>
        <Button onClick={() => navigate('/commissions')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Comisiones
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/commissions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{commission.userName}</h1>
            <p className="text-sm text-muted-foreground">
              {commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'} • Comisión #{commission.id}
            </p>
          </div>
        </div>
        <UpdateStatusDialog
          commissionId={commission.id}
          onStatusUpdate={handleStatusUpdate}
          currentStatus={commission.status}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="px-5 pb-3 pt-5">
            <CardTitle className="text-base">Información General</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-0">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between py-1.5">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="mr-2 h-4 w-4" />
                  Empleado
                </div>
                <div className="font-medium">{commission.userName}</div>
              </div>
              <div className="flex justify-between py-1.5">
                <div className="flex items-center text-sm text-muted-foreground">
                  <BadgeDollarSign className="mr-2 h-4 w-4" />
                  Rol
                </div>
                <div>{commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'}</div>
              </div>
              <div className="flex justify-between py-1.5">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Período
                </div>
                <div>
                  {format(parseISO(commission.weekStartDate), 'dd MMM', { locale: es })} - {format(parseISO(commission.weekEndDate), 'dd MMM yyyy', { locale: es })}
                </div>
              </div>
              {commission.routeName && (
                <div className="flex justify-between py-1.5">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Truck className="mr-2 h-4 w-4" />
                    Ruta
                  </div>
                  <div>{commission.routeName}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-5 pb-3 pt-5">
            <CardTitle className="text-base">Detalles del Pago</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-0">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between py-1.5">
                <div className="flex items-center text-sm text-muted-foreground">
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Estado
                </div>
                <StatusBadge status={commission.status} />
              </div>
              <div className="flex justify-between py-1.5">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Package className="mr-2 h-4 w-4" />
                  Productos
                </div>
                <div className="font-medium">{commission.productCount}</div>
              </div>
              <div className="flex justify-between py-1.5">
                <div className="flex items-center text-sm text-muted-foreground">
                  <BadgeDollarSign className="mr-2 h-4 w-4" />
                  Monto Total
                </div>
                <div className="text-lg font-semibold">${parseFloat(commission.totalAmount).toFixed(2)}</div>
              </div>
              {commission.status === 'paid' && commission.paymentDate && (
                <div className="flex justify-between py-1.5">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    Fecha de Pago
                  </div>
                  <div>{format(parseISO(commission.paymentDate), 'dd MMM yyyy', { locale: es })}</div>
                </div>
              )}
              {commission.status === 'paid' && commission.paymentReference && (
                <div className="flex justify-between py-1.5">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <ReceiptText className="mr-2 h-4 w-4" />
                    Referencia
                  </div>
                  <div>{commission.paymentReference}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {commission.notes && (
        <Card>
          <CardHeader className="px-5 pb-3 pt-5">
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-2">
            <p className="text-sm text-muted-foreground">{commission.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="px-6 pb-3 pt-6">
          <CardTitle>Desglose de Comisiones</CardTitle>
          <CardDescription>
            Detalle de los productos entregados y comisiones generadas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Fecha de Entrega</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Valor Comisión</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commission.items.map((item: CommissionItem) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>
                    {item.orderNumber ? (
                      <Link to={`/orders/${item.orderId}`} className="flex items-center text-primary hover:underline">
                        #{item.orderNumber}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    ) : (
                      `#${item.orderId}`
                    )}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(item.deliveryDate), 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${parseFloat(item.commissionValue).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${parseFloat(item.commissionAmount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="ml-auto flex items-center space-x-1">
            <p className="text-muted-foreground">Total:</p>
            <p className="text-lg font-bold">${parseFloat(commission.totalAmount).toFixed(2)}</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}