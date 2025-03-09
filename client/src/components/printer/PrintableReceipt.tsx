import QRCode from 'qrcode';
import { formatCurrency } from "@/lib/format";

interface PrintableReceiptProps {
  delivery: {
    id: number;
    businessName: string;
    address: string;
    order: string;
    total?: number;
  };
  printer: any;
}

export function PrintableReceipt({ delivery, printer }: PrintableReceiptProps) {
  const printReceipt = async () => {
    try {
      // Generar QR para verificación
      const qrCode = await QRCode.toDataURL(`https://gowater.app/verify/${delivery.id}`);
      
      // Formato del ticket
      const receiptContent = [
        "\x1B\x40",  // Inicializar impresora
        "\x1B\x61\x01",  // Centrar texto
        "GoWater\n",
        "==================\n",
        `Cliente: ${delivery.businessName}\n`,
        `Dirección: ${delivery.address}\n`,
        "==================\n",
        "Productos:\n",
        `${delivery.order}\n`,
        "==================\n",
        delivery.total ? `Total: ${formatCurrency(delivery.total)}\n` : '',
        "\n",
        "Firma: _________________\n",
        "\n",
        // Aquí iría el código QR
        qrCode,
        "\n\n\n\n\n"  // Espacio para cortar
      ].join('');

      // Enviar a la impresora
      const service = await printer.getPrimaryService('printing');
      const characteristic = await service.getCharacteristic('print');
      await characteristic.writeValue(new TextEncoder().encode(receiptContent));
    } catch (error) {
      console.error('Error al imprimir:', error);
    }
  };

  return { printReceipt };
}
