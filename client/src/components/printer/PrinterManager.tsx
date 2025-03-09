import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';

interface PrinterManagerProps {
  onPrinterReady: (printer: any) => void;
}

export function PrinterManager({ onPrinterReady }: PrinterManagerProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectPrinter = async () => {
    try {
      setIsConnecting(true);
      
      // Solicitar acceso Bluetooth
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // ID genérico para impresoras térmicas
        ]
      });

      // Conectar al dispositivo
      const server = await device.gatt?.connect();
      
      if (server) {
        toast({
          title: "Impresora Conectada",
          description: `Conectado a: ${device.name}`,
        });
        onPrinterReady(server);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: "No se pudo conectar con la impresora",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={connectPrinter}
      disabled={isConnecting}
    >
      <Printer className="w-4 h-4 mr-2" />
      {isConnecting ? "Conectando..." : "Conectar Impresora"}
    </Button>
  );
}
