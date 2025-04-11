import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrinterService } from "@/services/PrinterService";
import { useQuery } from "@tanstack/react-query";

export default function TestPrintPayment() {
  // Obtener la configuración
  const { data: settings } = useQuery({
    queryKey: ['api/settings'],
    refetchOnWindowFocus: false,
  });

  // Datos de prueba para un pago
  const samplePayment = {
    id: 999,
    date: new Date().toISOString(),
    amount: "245.50",
    method: "cash",
    customerName: "Cliente Prueba",
    invoiceNumber: "789",
    notes: "Este es un recibo de prueba para verificar el formato de impresión en 80mm."
  };

  // Cliente de prueba
  const sampleCustomer = {
    id: 1,
    businessname: "Cliente Prueba",
    address: "Calle Principal #123",
    municipality: "Santo Domingo",
    province: "Distrito Nacional",
    phone: "829-555-1234",
  };

  // Función para imprimir pago usando método directo en el servicio
  const printTestPayment = async () => {
    try {
      await PrinterService.printPayment(samplePayment, sampleCustomer, settings);
      console.log("Impresión iniciada correctamente");
    } catch (error) {
      console.error("Error al imprimir pago de prueba:", error);
    }
  };

  // Función para generar PDF de pago
  const generatePaymentPDF = async () => {
    try {
      await PrinterService.generatePaymentPDF(samplePayment, sampleCustomer, settings);
      console.log("PDF generado correctamente");
    } catch (error) {
      console.error("Error al generar PDF de pago:", error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Prueba de Impresión de Pagos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Impresión Directa (80mm)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Esta opción imprime un recibo de pago en formato ticket de 80mm usando el método de impresión directa.</p>
            <Button onClick={printTestPayment} className="w-full">
              Imprimir Pago de Prueba
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Generar PDF (80mm)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Esta opción genera un PDF de un recibo de pago en formato ticket de 80mm para guardar o imprimir más tarde.</p>
            <Button onClick={generatePaymentPDF} className="w-full" variant="outline">
              Generar PDF de Pago
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-bold mb-4">Datos de Prueba</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify({ payment: samplePayment, customer: sampleCustomer }, null, 2)}
        </pre>
      </div>
    </div>
  );
}