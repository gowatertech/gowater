import { useState, useEffect } from 'react';
import TestPrintOrder from '@/test-print-order';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function TestPage() {
  const [orderId, setOrderId] = useState<number | null>(null);
  
  // Obtener lista de pedidos disponibles
  const { data: ordersList, isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders');
      if (!response.ok) {
        throw new Error('Error al cargar los pedidos');
      }
      return await response.json();
    }
  });
  
  // Seleccionar automáticamente el primer pedido disponible
  useEffect(() => {
    if (ordersList && ordersList.length > 0 && orderId === null) {
      setOrderId(ordersList[ordersList.length - 1].id);
    }
  }, [ordersList, orderId]);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Página de Prueba de Impresión</h1>
      
      <div className="space-y-6">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Seleccionar Pedido</h2>
          
          {isLoading ? (
            <p>Cargando pedidos disponibles...</p>
          ) : ordersList && ordersList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ordersList.slice(-5).reverse().map((order: any) => (
                <Button
                  key={order.id}
                  variant="outline"
                  onClick={() => setOrderId(order.id)}
                  className={orderId === order.id ? "bg-primary text-white" : ""}
                >
                  #{order.id} - {order.customerName}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-red-500">No se encontraron pedidos disponibles.</p>
          )}
        </div>
        
        {orderId && <TestPrintOrder orderId={orderId} />}
        
        <div className="p-4 border rounded-lg bg-yellow-50">
          <h2 className="text-lg font-semibold mb-2">Información Importante</h2>
          <p>Para usar el componente PrinterService y probar la impresión:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Selecciona un pedido de la lista de pedidos recientes</li>
            <li>Los botones te permiten probar la impresión directa o generar un PDF</li>
            <li>El componente PrinterService tiene validación para evitar errores con datos nulos o indefinidos</li>
            <li>Todas las impresiones de pagos están configuradas para papel de 80mm</li>
          </ol>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">Esta página es solo para pruebas de impresión y no forma parte de la aplicación principal.</p>
        </div>
      </div>
    </div>
  );
}