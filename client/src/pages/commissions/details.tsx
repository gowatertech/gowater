import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  Check,
  AlertCircle,
  ShoppingCart,
  User,
  Truck,
  CreditCard,
  CalendarDays,
  Receipt,
  Send,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

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
  currentStatus, 
  onStatusUpdated 
}: { 
  commissionId: number; 
  currentStatus: Status; 
  onStatusUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(currentStatus);
  const [paymentDate, setPaymentDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      status: Status;
      paymentDate?: string;
      paymentReference?: string;
      notes?: string;
    }) => {
      return apiRequest(`/api/commissions/${commissionId}/status`, {
        method: 'PATCH',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/commissions/${commissionId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/commissions'] });
      setOpen(false);
      
      const successMessage = status === 'paid' 
        ? 'Comisión marcada como pagada' 
        : status === 'cancelled' 
          ? 'Comisión cancelada' 
          : 'Estado de comisión actualizado';
          
      toast({
        title: "Operación exitosa",
        description: successMessage,
      });
      
      onStatusUpdated();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data: any = { status };
    
    if (status === 'paid') {
      data.paymentDate = paymentDate;
      data.paymentReference = paymentReference;
    }
    
    if (notes.trim()) {
      data.notes = notes;
    }
    
    updateStatusMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {currentStatus === 'pending' ? (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Actualizar Estado
            </>
          ) : (
            <>
              <Clock className="mr-2 h-4 w-4" />
              Cambiar Estado
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar Estado de Comisión</DialogTitle>
          <DialogDescription>
            Seleccione el nuevo estado para esta comisión
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RadioGroup defaultValue={currentStatus} onValueChange={(value) => setStatus(value as Status)}>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <RadioGroupItem value="pending" id="pending" />
              <Label htmlFor="pending" className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-amber-500" />
                Pendiente
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <RadioGroupItem value="paid" id="paid" />
              <Label htmlFor="paid" className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Pagado
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <RadioGroupItem value="cancelled" id="cancelled" />
              <Label htmlFor="cancelled" className="flex items-center">
                <Ban className="mr-2 h-4 w-4 text-red-500" />
                Cancelado
              </Label>
            </div>
          </RadioGroup>

          {status === 'paid' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="paymentDate">Fecha de Pago</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentReference">Referencia de Pago</Label>
                <Input
                  id="paymentReference"
                  placeholder="Ej. Transferencia #1234"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Agregar notas o comentarios adicionales"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CommissionDetailsPage() {
  const [, params] = useRoute<{ id: string }>('/commissions/details/:id');
  const [, navigate] = useLocation();
  
  if (!params) {
    navigate('/commissions');
    return null;
  }

  const commissionId = parseInt(params.id);

  const { data: commission, isLoading, refetch } = useQuery({
    queryKey: [`/api/commissions/${commissionId}`],
    queryFn: async () => {
      const res = await fetch(`/api/commissions/${commissionId}`);
      if (!res.ok) throw new Error('Error al obtener detalles de comisión');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando detalles de comisión...</p>
      </div>
    );
  }

  if (!commission) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="mt-2 text-sm text-foreground">No se pudo encontrar la comisión solicitada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/commissions')}>
          Volver a Comisiones
        </Button>
      </div>
    );
  }

  const commissionData = commission as CommissionDetails;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center">
          <Button variant="outline" size="icon" className="mr-2" onClick={() => navigate('/commissions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Detalle de Comisión</h1>
            <p className="text-sm text-muted-foreground">
              Comisión #{commissionData.id} • {commissionData.userName}
            </p>
          </div>
        </div>
        {commissionData.status === 'pending' && (
          <UpdateStatusDialog 
            commissionId={commissionData.id} 
            currentStatus={commissionData.status}
            onStatusUpdated={refetch}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Información del Empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{commissionData.userName}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="ml-6">
                  {commissionData.userRole === 'driver' ? 'Chofer' : 'Ayudante'}
                </span>
              </div>
              {commissionData.routeName && (
                <div className="flex items-center mt-2">
                  <Truck className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Ruta: {commissionData.routeName}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Información de Comisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(commissionData.weekStartDate), 'dd MMM', { locale: es })} - {' '}
                  {format(new Date(commissionData.weekEndDate), 'dd MMM yyyy', { locale: es })}
                </span>
              </div>
              <div className="flex items-center">
                <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {commissionData.productCount} productos
                </span>
              </div>
              <div className="flex items-center mt-2">
                <span className="ml-6 text-2xl font-bold">
                  ${parseFloat(commissionData.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center">
                <StatusBadge status={commissionData.status} />
              </div>
              {commissionData.status === 'paid' && commissionData.paymentDate && (
                <>
                  <div className="flex items-center mt-2">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Pagado el: {format(new Date(commissionData.paymentDate), 'PPP', { locale: es })}
                    </span>
                  </div>
                  {commissionData.paymentReference && (
                    <div className="flex items-center">
                      <Receipt className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Ref: {commissionData.paymentReference}
                      </span>
                    </div>
                  )}
                </>
              )}
              {commissionData.notes && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notas:</p>
                  <p className="text-sm">{commissionData.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Detalle de Productos</h2>
        <Card>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Valor Comisión</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>
                      {item.orderNumber ? (
                        <Link to={`/orders/details/${item.orderId}`} className="text-primary hover:underline">
                          {item.orderNumber}
                        </Link>
                      ) : (
                        `#${item.orderId}`
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.deliveryDate), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${parseFloat(item.commissionValue).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${parseFloat(item.commissionAmount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${parseFloat(commissionData.totalAmount).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden">
            <div className="divide-y">
              {commissionData.items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.productName}</span>
                    <span className="font-bold">${parseFloat(item.commissionAmount).toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Orden: 
                      <Link to={`/orders/details/${item.orderId}`} className="text-primary hover:underline ml-1">
                        {item.orderNumber || `#${item.orderId}`}
                      </Link>
                    </div>
                    <div>Fecha: {format(new Date(item.deliveryDate), 'dd/MM/yyyy')}</div>
                    <div>Cantidad: {item.quantity}</div>
                    <div>Valor: ${parseFloat(item.commissionValue).toFixed(2)}</div>
                  </div>
                </div>
              ))}
              <div className="p-4 flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">${parseFloat(commissionData.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}