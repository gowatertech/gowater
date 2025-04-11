import { useState, useEffect } from 'react';
import TestPrintOrder from '@/test-print-order';
import { Button } from '@/components/ui/button';

export default function TestPage() {
  const [orderId, setOrderId] = useState(33);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Página de Prueba de Impresión</h1>
      
      <div className="space-y-6">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Seleccionar Pedido</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOrderId(33)}
              className={orderId === 33 ? "bg-primary text-white" : ""}
            >
              Pedido #33
            </Button>
            <Button
              variant="outline"
              onClick={() => setOrderId(32)}
              className={orderId === 32 ? "bg-primary text-white" : ""}
            >
              Pedido #32
            </Button>
            <Button
              variant="outline"
              onClick={() => setOrderId(31)}
              className={orderId === 31 ? "bg-primary text-white" : ""}
            >
              Pedido #31
            </Button>
          </div>
        </div>
        
        <TestPrintOrder orderId={orderId} />
        
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">Esta página es solo para pruebas de impresión y no forma parte de la aplicación principal.</p>
        </div>
      </div>
    </div>
  );
}