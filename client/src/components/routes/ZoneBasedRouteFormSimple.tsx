import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ZoneBasedRouteFormProps {
  onRouteCreated: () => void;
  compact?: boolean;
}

export default function ZoneBasedRouteFormSimple({ onRouteCreated, compact = false }: ZoneBasedRouteFormProps) {
  const { toast } = useToast();
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [useDebugMode, setUseDebugMode] = useState<boolean>(true);
  const [debugCompanyId, setDebugCompanyId] = useState<number | null>(15);
  const [selectedZone, setSelectedZone] = useState<number | null>(4);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const renderDebugPanel = () => {
    if (!showDebugPanel) return null;
    
    return (
      <Card className="mb-4 border-dashed border-yellow-500">
        <CardHeader className="bg-yellow-50 dark:bg-yellow-950">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base text-yellow-700 dark:text-yellow-400">Panel de Depuración</CardTitle>
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">DEBUG</Badge>
          </div>
          <CardDescription>Herramientas para diagnosticar problemas de carga de pedidos por zona</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="debug-mode" className="cursor-pointer">Modo Debug</Label>
              <Switch 
                id="debug-mode" 
                checked={useDebugMode} 
                onCheckedChange={setUseDebugMode}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="company-id">ID Compañía:</Label>
              <Input 
                id="company-id" 
                value={debugCompanyId || ""}
                onChange={e => setDebugCompanyId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-16"
                disabled={!useDebugMode}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="zone-id">ID Zona:</Label>
              <Input 
                id="zone-id" 
                value={selectedZone || ""}
                onChange={e => setSelectedZone(e.target.value ? parseInt(e.target.value) : null)}
                className="w-16"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                toast({
                  title: "Recargando pedidos",
                  description: `Se han recargado los pedidos para la zona ${selectedZone} de la compañía ${debugCompanyId}`
                });
              }}
              disabled={!selectedZone}
              className="h-8"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Recargar
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>URL de diagnóstico: {selectedZone ? 
              `/api/zones/${selectedZone}/pending-orders${useDebugMode ? `?debug=true&companyId=${debugCompanyId || 15}` : ""}`
              : "Seleccione una zona primero"
            }</p>
            
            {authError && (
              <div className="bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 inline-block mr-1" />
                {authError}
              </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
              <p>Estado: 
                {isLoading 
                  ? <span className="text-blue-600 dark:text-blue-400 ml-1">Cargando pedidos...</span>
                  : <span className="text-green-600 dark:text-green-400 ml-1">
                      Panel de depuración cargado correctamente. Cuando selecciones una zona, podrás ver los pedidos pendientes.
                    </span>
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Panel de Depuración para Rutas basadas en Zona</h3>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
        >
          {showDebugPanel ? "Ocultar" : "Mostrar"} Panel Debug
        </Button>
      </div>
      
      {renderDebugPanel()}
      
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">Panel de Depuración Simplificado</h3>
            <p className="text-muted-foreground mb-4">
              Este es un panel de depuración simplificado para probar la funcionalidad de carga de pedidos por zona.
            </p>
            <p className="text-sm mb-4">
              Para usar el panel completo, necesitas seleccionar una zona, una empresa (ID: {debugCompanyId || 15}) y configurar los valores adecuados.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                variant="default"
                onClick={() => {
                  toast({
                    title: "Pedidos cargados",
                    description: `Se usó el modo de depuración: ${useDebugMode ? "Activado" : "Desactivado"} con companyId=${debugCompanyId || 15} y zoneId=${selectedZone || 4}`
                  });
                }}
              >
                Simular carga de pedidos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}