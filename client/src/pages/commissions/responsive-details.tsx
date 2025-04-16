import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { format, parseISO } from 'date-fns';
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
  Truck,
  Loader2,
  ReceiptText,
  Package,
  FileText,
  Link as LinkIcon,
  CalendarRange,
  LucideIcon,
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
// El hook useIsMobile ya está importado, no necesitamos useMediaQuery
import { useIsMobile } from '@/hooks/use-is-mobile';

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
          <span className="hidden sm:inline">Actualizar Estado</span>
          <span className="sm:hidden">Actualizar</span>
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

type DetailItemProps = {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  className?: string;
}

function DetailItem({ icon: Icon, label, value, className }: DetailItemProps) {
  return (
    <div className={cn("flex justify-between items-center py-2 gap-2", className)}>
      <div className="flex items-center text-sm text-muted-foreground">
        <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
      <div className="text-right font-medium">{value}</div>
    </div>
  );
}

function CommissionItemsMobile({ items }: { items: CommissionItem[] }) {
  return (
    <div className="space-y-3 px-4 py-2">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardHeader className="bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{item.productName}</div>
              <Badge variant="outline" className="bg-primary/5 text-xs">
                Orden #{item.orderId}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 p-3 text-sm">
            <DetailItem 
              icon={Calendar} 
              label="Fecha" 
              value={format(parseISO(item.deliveryDate), 'dd MMM yyyy', { locale: es })} 
            />
            <DetailItem 
              icon={Package} 
              label="Cantidad" 
              value={item.quantity} 
            />
            <DetailItem 
              icon={BadgeDollarSign} 
              label="Valor" 
              value={`$${parseFloat(item.commissionValue).toFixed(2)}`} 
            />
            <DetailItem 
              icon={ReceiptText} 
              label="Comisión" 
              value={`$${parseFloat(item.commissionAmount).toFixed(2)}`} 
              className="font-semibold"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CommissionItemsDesktop({ items }: { items: CommissionItem[] }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Orden</TableHead>
            <TableHead>Fecha de Entrega</TableHead>
            <TableHead className="text-center">Cantidad</TableHead>
            <TableHead className="text-center">Valor</TableHead>
            <TableHead className="text-right">Comisión</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.productName}</TableCell>
              <TableCell>
                <Link href={`/orders/details/${item.orderId}`} className="flex items-center text-sm text-primary hover:underline">
                  #{item.orderId}
                  <LinkIcon className="ml-1 h-3 w-3" />
                </Link>
              </TableCell>
              <TableCell>
                {format(parseISO(item.deliveryDate), 'dd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell className="text-center">{item.quantity}</TableCell>
              <TableCell className="text-center">${parseFloat(item.commissionValue).toFixed(2)}</TableCell>
              <TableCell className="text-right font-semibold">${parseFloat(item.commissionAmount).toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">
              Total:
            </TableCell>
            <TableCell className="text-right font-bold">
              ${items.reduce((sum, item) => sum + parseFloat(item.commissionAmount), 0).toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function ResponsiveCommissionDetailsPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = params.id ? parseInt(params.id) : 0;
  const isMobile = useIsMobile();

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

  // En dispositivos móviles, ponemos la tarjeta de total primero para mejor visibilidad
  const mobileView = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate('/commissions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold truncate">{commission.userName}</h1>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>{commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'}</span>
            <span>•</span>
            <span>#{commission.id}</span>
          </div>
        </div>
        <StatusBadge status={commission.status} />
      </div>

      {/* Tarjeta de resumen - destacada primero en móvil */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-sm font-medium">Total de Comisión:</span>
              <span className="text-xl font-bold text-primary">${parseFloat(commission.totalAmount).toFixed(2)}</span>
            </div>
            <DetailItem 
              icon={Package} 
              label="Productos" 
              value={commission.productCount} 
            />
            <DetailItem 
              icon={CalendarRange} 
              label="Período" 
              value={`${format(parseISO(commission.weekStartDate), 'dd/MM')} - ${format(parseISO(commission.weekEndDate), 'dd/MM/yy')}`} 
            />
          </div>
          <div className="mt-3 flex justify-end">
            <UpdateStatusDialog
              commissionId={commission.id}
              onStatusUpdate={handleStatusUpdate}
              currentStatus={commission.status}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs para organizar la información */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="items">Productos</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="pt-2">
          <h3 className="px-1 text-sm font-medium mb-2">Productos Comisionables</h3>
          <CommissionItemsMobile items={commission.items} />
        </TabsContent>
        <TabsContent value="details" className="pt-2">
          <Card>
            <CardContent className="p-4 space-y-3">
              <DetailItem 
                icon={User} 
                label="Empleado" 
                value={commission.userName} 
              />
              <DetailItem 
                icon={BadgeDollarSign} 
                label="Rol" 
                value={commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'} 
              />
              {commission.routeName && (
                <DetailItem 
                  icon={Truck} 
                  label="Ruta" 
                  value={commission.routeName} 
                />
              )}
              {commission.status === 'paid' && commission.paymentDate && (
                <DetailItem 
                  icon={Calendar} 
                  label="Fecha de Pago" 
                  value={format(parseISO(commission.paymentDate), 'dd MMM yyyy', { locale: es })} 
                />
              )}
              {commission.status === 'paid' && commission.paymentReference && (
                <DetailItem 
                  icon={FileText} 
                  label="Referencia" 
                  value={commission.paymentReference} 
                />
              )}
              {commission.notes && (
                <div className="space-y-1 pt-2 border-t">
                  <h4 className="text-sm font-medium">Notas:</h4>
                  <p className="text-sm text-muted-foreground">{commission.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Vista de escritorio más completa y espaciosa
  const desktopView = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/commissions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{commission.userName}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'}</span>
              <span>•</span>
              <span>Comisión #{commission.id}</span>
              <StatusBadge status={commission.status} />
            </div>
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
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base">Información General</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0 pb-4">
            <div className="flex flex-col space-y-3">
              <DetailItem 
                icon={User} 
                label="Empleado" 
                value={commission.userName} 
              />
              <DetailItem 
                icon={BadgeDollarSign} 
                label="Rol" 
                value={commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'} 
              />
              <DetailItem 
                icon={Calendar} 
                label="Período" 
                value={`${format(parseISO(commission.weekStartDate), 'dd/MM')} - ${format(parseISO(commission.weekEndDate), 'dd/MM/yy')}`} 
              />
              {commission.routeName && (
                <DetailItem 
                  icon={Truck} 
                  label="Ruta" 
                  value={commission.routeName} 
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base">Detalles del Pago</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-0 pb-4">
            <div className="flex flex-col space-y-3">
              <DetailItem 
                icon={ReceiptText} 
                label="Estado" 
                value={<StatusBadge status={commission.status} />} 
              />
              <DetailItem 
                icon={Package} 
                label="Productos" 
                value={commission.productCount} 
              />
              <DetailItem 
                icon={BadgeDollarSign} 
                label="Monto Total" 
                value={<span className="text-lg font-semibold">${parseFloat(commission.totalAmount).toFixed(2)}</span>} 
              />
              {commission.status === 'paid' && commission.paymentDate && (
                <DetailItem 
                  icon={Calendar} 
                  label="Fecha de Pago" 
                  value={format(parseISO(commission.paymentDate), 'dd MMM yyyy', { locale: es })} 
                />
              )}
              {commission.status === 'paid' && commission.paymentReference && (
                <DetailItem 
                  icon={FileText} 
                  label="Referencia" 
                  value={commission.paymentReference} 
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {commission.notes && (
        <Card>
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-2">
            <p className="text-sm text-muted-foreground">{commission.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle>Desglose de Comisiones</CardTitle>
          <CardDescription>
            Detalle de los productos entregados y comisiones generadas
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <CommissionItemsDesktop items={commission.items} />
        </CardContent>
      </Card>
    </div>
  );

  return isMobile ? mobileView : desktopView;
}