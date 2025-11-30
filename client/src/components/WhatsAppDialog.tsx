import { useState, useEffect } from "react";
import { MessageCircle, Send, AlertCircle, Download, FileText, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { openWhatsApp } from "@/lib/whatsapp";

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'invoice' | 'payment';
  customerName?: string;
  customerPhone?: string;
  companyName?: string;
  amount?: string | number;
  onGeneratePDF?: () => Promise<void>;
}

export function WhatsAppDialog({
  open,
  onOpenChange,
  type,
  customerName = "",
  customerPhone = "",
  companyName = "",
  amount = 0,
  onGeneratePDF,
}: WhatsAppDialogProps) {
  const [phone, setPhone] = useState(customerPhone);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone(customerPhone);
      setPdfDownloaded(false);
      setPdfError(false);
    }
  }, [open, customerPhone]);

  const handleDownloadPDF = async () => {
    if (!onGeneratePDF) return;
    
    setIsGeneratingPDF(true);
    setPdfError(false);
    setPdfDownloaded(false);
    try {
      await onGeneratePDF();
      setPdfDownloaded(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setPdfError(true);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSend = () => {
    if (!phone.trim()) return;

    if (type === 'invoice') {
      openWhatsApp({
        type: 'invoice',
        customerName,
        customerPhone: phone,
        companyName,
        amount,
      });
    } else {
      openWhatsApp({
        type: 'payment',
        customerPhone: phone,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar por WhatsApp
          </DialogTitle>
          <DialogDescription>
            {type === 'invoice' 
              ? `Enviar factura a ${customerName || 'cliente'}`
              : 'Enviar confirmación de pago'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {onGeneratePDF && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Paso 1: Descargar el documento PDF
              </Label>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className={`w-full ${pdfDownloaded ? 'border-green-500 text-green-600' : pdfError ? 'border-red-500 text-red-600' : ''}`}
                data-testid="button-download-pdf"
              >
                {pdfError ? (
                  <XCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isGeneratingPDF 
                  ? 'Generando PDF...' 
                  : pdfDownloaded 
                    ? 'PDF Descargado' 
                    : pdfError
                      ? 'Error - Reintentar'
                      : 'Descargar PDF'
                }
              </Button>
              {pdfDownloaded && (
                <p className="text-xs text-green-600">
                  El PDF se ha descargado. Podrás adjuntarlo en WhatsApp.
                </p>
              )}
              {pdfError && (
                <p className="text-xs text-red-600">
                  No se pudo generar el PDF. Intenta nuevamente.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              {onGeneratePDF ? 'Paso 2: Número de WhatsApp' : 'Número de WhatsApp'}
            </Label>
            <Input
              id="phone"
              placeholder="18091234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              data-testid="input-whatsapp-phone"
            />
          </div>

          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Favor poner el 1 delante del número (ej: 18091234567)
            </AlertDescription>
          </Alert>

          {onGeneratePDF && (
            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <FileText className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Al abrir WhatsApp, adjunta el PDF descargado usando el botón de adjuntar (clip) en la conversación.
              </AlertDescription>
            </Alert>
          )}

          {type === 'invoice' && (
            <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-1">Vista previa del mensaje:</p>
              <p className="italic">
                Hola {customerName || '[Cliente]'}, le enviamos su factura correspondiente a su pedido de {companyName || '[Empresa]'}.
                Total: RD$ {typeof amount === 'number' ? amount.toFixed(2) : parseFloat(String(amount)).toFixed(2)}.
                Gracias por preferirnos.
              </p>
            </div>
          )}

          {type === 'payment' && (
            <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-1">Vista previa del mensaje:</p>
              <p className="italic">
                Estimado cliente, su pago quedó registrado en nuestro sistema.
                Gracias por su preferencia.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-whatsapp"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!phone.trim()}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-send-whatsapp"
          >
            <Send className="h-4 w-4 mr-2" />
            {onGeneratePDF ? 'Abrir WhatsApp' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
