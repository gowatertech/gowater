import React from 'react';
import { Button } from '@/components/ui/button';
import { runAllTests } from './test-printer';
import { toast } from '@/hooks/use-toast'; 

export const TestPrinterButton = () => {
  const handleClick = async () => {
    toast({
      title: "Iniciando pruebas",
      description: "Ejecutando pruebas de impresión y PDF...",
    });
    
    try {
      const results = await runAllTests();
      
      if (results.orderPrintResult && results.orderPDFResult && 
          results.paymentPrintResult && results.paymentPDFResult) {
        toast({
          title: "Pruebas exitosas",
          description: "¡Todas las pruebas de impresión y PDF fueron exitosas!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Algunas pruebas fallaron",
          description: `Impresión pedido: ${results.orderPrintResult ? '✓' : '✗'}, PDF pedido: ${results.orderPDFResult ? '✓' : '✗'}, Impresión pago: ${results.paymentPrintResult ? '✓' : '✗'}, PDF pago: ${results.paymentPDFResult ? '✓' : '✗'}`,
        });
      }
    } catch (error) {
      console.error("Error en las pruebas:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al ejecutar las pruebas de impresión",
      });
    }
  };
  
  return (
    <Button onClick={handleClick}>
      Probar Impresión y PDF
    </Button>
  );
};

export default TestPrinterButton;