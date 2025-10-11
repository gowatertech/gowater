import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InstallPromptProps {
  onClose: () => void;
}

export function InstallPrompt({ onClose }: InstallPromptProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // Detectar si es iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
  }, []);
  
  const handleInstall = async () => {
    // Acceder al evento guardado de beforeinstallprompt
    // Esto es tipicamente hecho a través de una variable global o un estado
    // Aquí sólo simulamos el proceso
    
    try {
      // @ts-ignore - simulación de instalación
      if (window.deferredPrompt) {
        // @ts-ignore 
        const promptResult = await window.deferredPrompt.prompt();
        
        if (promptResult.outcome === 'accepted') {
          toast({
            title: "Instalación iniciada",
            description: "GoWater Driver se está instalando en tu dispositivo",
            variant: "default"
          });
        } else {
          toast({
            title: "Instalación cancelada",
            description: "Puedes instalar la aplicación más tarde desde el menú",
            variant: "default"
          });
        }
        
        // @ts-ignore
        window.deferredPrompt = null;
      }
    } catch (error) {
      console.error("Error al intentar instalar la PWA:", error);
      toast({
        title: "Error de instalación",
        description: "No se pudo instalar la aplicación. Inténtalo más tarde.",
        variant: "destructive"
      });
    }
    
    // Cerrar el prompt
    setOpen(false);
    onClose();
  };
  
  const handleClose = () => {
    // Guardar que ya se mostró el prompt para no molestar de nuevo
    localStorage.setItem('pwaPromptShown', 'true');
    setOpen(false);
    onClose();
  };
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="rounded-t-xl sm:max-w-md mx-auto p-0" side="bottom">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle>Instalar GoWater</SheetTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription>
            Instala esta aplicación en tu dispositivo para un acceso más rápido y una mejor experiencia.
          </SheetDescription>
        </SheetHeader>
        
        <div className="p-4 pt-0">
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 mb-4">
            <h3 className="font-medium text-sm mb-2">Beneficios de la instalación:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Acceso rápido desde la pantalla de inicio</li>
              <li>• Funcionamiento sin conexión</li>
              <li>• Experiencia similar a una app nativa</li>
              <li>• No ocupa espacio en tu dispositivo</li>
            </ul>
          </div>
          
          {isIOS ? (
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Share className="h-4 w-4" />
                  Cómo instalar en iOS:
                </h3>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Toca el botón de compartir <Share className="h-3 w-3 inline" /> en Safari</li>
                  <li>Selecciona "Agregar a pantalla de inicio"</li>
                  <li>Toca "Agregar" para confirmar</li>
                </ol>
              </div>
              <Button className="w-full" onClick={handleClose}>
                Entendido
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Ahora no
              </Button>
              <Button className="flex-1 gap-2" onClick={handleInstall}>
                <Download className="h-4 w-4" />
                Instalar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}