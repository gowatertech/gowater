import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Clock, Edit, MoreHorizontal, PlayCircle, PlusCircle, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RecurringOrder } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const RecurringOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingOrderId, setGeneratingOrderId] = useState<number | null>(null);

  const { data: recurringOrders, isLoading } = useQuery({
    queryKey: ['/api/recurring-orders'],
    retry: 1,
  });

  const handleEdit = (orderId: number) => {
    setLocation(`/recurring-orders/${orderId}`);
  };

  const handleDelete = async () => {
    if (!deleteOrderId) return;

    try {
      await fetch(`/api/recurring-orders/${deleteOrderId}`, {
        method: 'DELETE'
      });

      // Invalidar la consulta para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });

      toast({
        title: t('recurringOrders.deleteSuccess'),
        description: t('recurringOrders.deleteSuccessDescription'),
      });
    } catch (error) {
      console.error('Error al eliminar pedido recurrente:', error);
      toast({
        title: t('recurringOrders.deleteError'),
        description: t('recurringOrders.deleteErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setShowDeleteDialog(false);
      setDeleteOrderId(null);
    }
  };

  const handleChangeStatus = async (orderId: number, status: 'active' | 'paused' | 'completed' | 'cancelled') => {
    try {
      await fetch(`/api/recurring-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      // Invalidar la consulta para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });

      toast({
        title: t('recurringOrders.statusChangeSuccess'),
        description: t('recurringOrders.statusChangeSuccessDescription'),
      });
    } catch (error) {
      console.error('Error al cambiar estado del pedido recurrente:', error);
      toast({
        title: t('recurringOrders.statusChangeError'),
        description: t('recurringOrders.statusChangeErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleGenerateOrder = async (orderId: number) => {
    setGeneratingOrderId(orderId);
    try {
      const response = await fetch(`/api/recurring-orders/${orderId}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Error al generar pedido');
      }

      const data = await response.json();

      // Invalidar la consulta para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

      toast({
        title: t('recurringOrders.generateSuccess'),
        description: t('recurringOrders.generateSuccessDescription', { id: data.id }),
      });
    } catch (error) {
      console.error('Error al generar pedido:', error);
      toast({
        title: t('recurringOrders.generateError'),
        description: t('recurringOrders.generateErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setGeneratingOrderId(null);
    }
  };

  // Filtrar pedidos recurrentes por estado para las pestañas
  const getFilteredOrders = (status: 'active' | 'paused' | 'completed' | 'cancelled') => {
    if (!recurringOrders) return [];
    return recurringOrders.filter((order: RecurringOrder) => order.status === status);
  };

  const activeOrders = recurringOrders ? getFilteredOrders('active') : [];
  const pausedOrders = recurringOrders ? getFilteredOrders('paused') : [];
  const completedOrders = recurringOrders ? getFilteredOrders('completed') : [];
  const cancelledOrders = recurringOrders ? getFilteredOrders('cancelled') : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">{t('recurringOrders.statusActive')}</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">{t('recurringOrders.statusPaused')}</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">{t('recurringOrders.statusCompleted')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">{t('recurringOrders.statusCancelled')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getFrequencyText = (frequency: string, dayOfWeek?: number | null, dayOfMonth?: number | null) => {
    switch (frequency) {
      case 'daily':
        return t('recurringOrders.frequencyDaily');
      case 'weekly':
        if (dayOfWeek !== undefined && dayOfWeek !== null) {
          const dayNames = [
            t('days.sunday'),
            t('days.monday'),
            t('days.tuesday'),
            t('days.wednesday'),
            t('days.thursday'),
            t('days.friday'),
            t('days.saturday'),
          ];
          return t('recurringOrders.frequencyWeekly', { day: dayNames[dayOfWeek] });
        }
        return t('recurringOrders.frequencyWeekly', { day: '' });
      case 'biweekly':
        if (dayOfWeek !== undefined && dayOfWeek !== null) {
          const dayNames = [
            t('days.sunday'),
            t('days.monday'),
            t('days.tuesday'),
            t('days.wednesday'),
            t('days.thursday'),
            t('days.friday'),
            t('days.saturday'),
          ];
          return t('recurringOrders.frequencyBiweekly', { day: dayNames[dayOfWeek] });
        }
        return t('recurringOrders.frequencyBiweekly', { day: '' });
      case 'monthly':
        if (dayOfMonth !== undefined && dayOfMonth !== null) {
          return t('recurringOrders.frequencyMonthly', { day: dayOfMonth });
        }
        return t('recurringOrders.frequencyMonthly', { day: '' });
      default:
        return frequency;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  const renderOrdersList = (orders: RecurringOrder[]) => {
    if (orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground mb-4">{t('recurringOrders.noOrders')}</p>
          <Button
            variant="outline"
            onClick={() => setLocation('/recurring-orders/new')}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('recurringOrders.createNew')}
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('recurringOrders.name')}</TableHead>
            <TableHead>{t('recurringOrders.customer')}</TableHead>
            <TableHead>{t('recurringOrders.frequency')}</TableHead>
            <TableHead>{t('recurringOrders.nextDate')}</TableHead>
            <TableHead>{t('recurringOrders.status')}</TableHead>
            <TableHead className="text-right">{t('recurringOrders.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order: RecurringOrder) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.name}</TableCell>
              <TableCell>{order.customerName}</TableCell>
              <TableCell>{getFrequencyText(order.frequency, order.dayOfWeek, order.dayOfMonth)}</TableCell>
              <TableCell>
                {order.nextGenerationDate ? formatDate(order.nextGenerationDate) : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">{t('common.openMenu')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(order.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    {order.status === 'active' && (
                      <DropdownMenuItem 
                        onClick={() => handleGenerateOrder(order.id)}
                        disabled={generatingOrderId === order.id}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {generatingOrderId === order.id 
                          ? t('recurringOrders.generating') 
                          : t('recurringOrders.generateNow')}
                      </DropdownMenuItem>
                    )}
                    {order.status === 'active' && (
                      <DropdownMenuItem onClick={() => handleChangeStatus(order.id, 'paused')}>
                        <Clock className="mr-2 h-4 w-4" />
                        {t('recurringOrders.pause')}
                      </DropdownMenuItem>
                    )}
                    {order.status === 'paused' && (
                      <DropdownMenuItem onClick={() => handleChangeStatus(order.id, 'active')}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {t('recurringOrders.activate')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleChangeStatus(order.id, 'completed')}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {t('recurringOrders.complete')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setDeleteOrderId(order.id);
                        setShowDeleteDialog(true);
                      }}
                      className="text-red-600"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('recurringOrders.title')}</h1>
        <Button onClick={() => setLocation('/recurring-orders/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('recurringOrders.createNew')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recurringOrders.cardTitle')}</CardTitle>
          <CardDescription>
            {t('recurringOrders.cardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">
                  {t('recurringOrders.statusActive')} ({activeOrders.length})
                </TabsTrigger>
                <TabsTrigger value="paused">
                  {t('recurringOrders.statusPaused')} ({pausedOrders.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  {t('recurringOrders.statusCompleted')} ({completedOrders.length})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                  {t('recurringOrders.statusCancelled')} ({cancelledOrders.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active">
                {renderOrdersList(activeOrders)}
              </TabsContent>
              <TabsContent value="paused">
                {renderOrdersList(pausedOrders)}
              </TabsContent>
              <TabsContent value="completed">
                {renderOrdersList(completedOrders)}
              </TabsContent>
              <TabsContent value="cancelled">
                {renderOrdersList(cancelledOrders)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recurringOrders.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('recurringOrders.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecurringOrdersPage;