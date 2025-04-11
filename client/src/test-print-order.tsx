import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PrinterService } from '@/services/PrinterService';

export function TestPrintOrder({ orderId = 33 }: { orderId?: number }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);

  const handlePrintTest = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      toast({
        title: "Prueba de impresión",
        description: `Procesando pedido #${orderId}...`,
      });
      
      // Obtener datos del pedido
      const response = await apiRequest("GET", `/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error(`Error al cargar el pedido: ${await response.text()}`);
      }
      const order = await response.json();
      
      // Obtener items del pedido
      const itemsResponse = await apiRequest("GET", `/api/orders/${orderId}/items`);
      if (!itemsResponse.ok) {
        throw new Error(`Error al cargar los items del pedido: ${await itemsResponse.text()}`);
      }
      const orderItems = await itemsResponse.json();
      
      // Obtener datos del cliente
      const customerResponse = await apiRequest("GET", `/api/customers/${order.customerId}`);
      if (!customerResponse.ok) {
        throw new Error(`Error al cargar el cliente: ${await customerResponse.text()}`);
      }
      const customer = await customerResponse.json();
      
      // Obtener productos
      const productsResponse = await apiRequest("GET", `/api/products`);
      if (!productsResponse.ok) {
        throw new Error(`Error al cargar los productos: ${await productsResponse.text()}`);
      }
      const products = await productsResponse.json();
      
      // Obtener configuración de la empresa
      const settingsResponse = await apiRequest("GET", `/api/settings`);
      if (!settingsResponse.ok) {
        throw new Error(`Error al cargar la configuración: ${await settingsResponse.text()}`);
      }
      const settings = await settingsResponse.json();
      
      // Imprimir el pedido usando el servicio mejorado
      await PrinterService.printOrder(
        order,
        orderItems,
        customer,
        settings,
        products
      );
      
      // Mostrar resultado de éxito
      setResult({
        success: true,
        message: `Pedido #${orderId} enviado a impresión correctamente`
      });
      
      toast({
        title: "Éxito",
        description: `Pedido #${orderId} enviado a impresión correctamente`,
      });
    } catch (error: any) {
      console.error('Error en prueba de impresión:', error);
      
      // Mostrar resultado de error
      setResult({
        success: false,
        message: error.message || "Error al imprimir el pedido"
      });
      
      toast({
        variant: "destructive",
        title: "Error de impresión",
        description: error.message || "Error al imprimir el pedido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfTest = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      toast({
        title: "Prueba de PDF",
        description: `Generando PDF para pedido #${orderId}...`,
      });
      
      // Obtener datos del pedido
      const response = await apiRequest("GET", `/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error(`Error al cargar el pedido: ${await response.text()}`);
      }
      const order = await response.json();
      
      // Obtener items del pedido
      const itemsResponse = await apiRequest("GET", `/api/orders/${orderId}/items`);
      if (!itemsResponse.ok) {
        throw new Error(`Error al cargar los items del pedido: ${await itemsResponse.text()}`);
      }
      const orderItems = await itemsResponse.json();
      
      // Obtener datos del cliente
      const customerResponse = await apiRequest("GET", `/api/customers/${order.customerId}`);
      if (!customerResponse.ok) {
        throw new Error(`Error al cargar el cliente: ${await customerResponse.text()}`);
      }
      const customer = await customerResponse.json();
      
      // Obtener productos
      const productsResponse = await apiRequest("GET", `/api/products`);
      if (!productsResponse.ok) {
        throw new Error(`Error al cargar los productos: ${await productsResponse.text()}`);
      }
      const products = await productsResponse.json();
      
      // Obtener configuración de la empresa
      const settingsResponse = await apiRequest("GET", `/api/settings`);
      if (!settingsResponse.ok) {
        throw new Error(`Error al cargar la configuración: ${await settingsResponse.text()}`);
      }
      const settings = await settingsResponse.json();
      
      // Generar PDF del pedido usando el servicio mejorado
      await PrinterService.generateOrderPDF(
        order,
        orderItems,
        customer,
        settings,
        products
      );
      
      // Mostrar resultado de éxito
      setResult({
        success: true,
        message: `PDF del pedido #${orderId} generado correctamente`
      });
      
      toast({
        title: "Éxito",
        description: `PDF del pedido #${orderId} generado correctamente`,
      });
    } catch (error: any) {
      console.error('Error en prueba de PDF:', error);
      
      // Mostrar resultado de error
      setResult({
        success: false,
        message: error.message || "Error al generar el PDF del pedido"
      });
      
      toast({
        variant: "destructive",
        title: "Error de PDF",
        description: error.message || "Error al generar el PDF del pedido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-lg font-semibold">Prueba de Impresión y PDF - Pedido #{orderId}</h2>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={handlePrintTest} 
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          Imprimir Pedido #{orderId}
        </Button>
        
        <Button 
          onClick={handlePdfTest} 
          disabled={isLoading}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Generar PDF Pedido #{orderId}
        </Button>
      </div>
      
      {result && (
        <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}

export default TestPrintOrder;