import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFetch } from "@/hooks/useFetch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderAnalysisFormProps {
  onAnalysisComplete: (data: any) => void;
}

const OrderAnalysisForm: React.FC<OrderAnalysisFormProps> = ({ onAnalysisComplete }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: zones = [] } = useFetch({ url: '/api/zones', key: ['zones'] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast({
        title: "Campos incompletos",
        description: "Por favor, selecciona las fechas de inicio y fin para el análisis.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest({
        url: '/api/ai/assistant/analyze-orders',
        method: 'POST',
        data: { 
          startDate,
          endDate,
          ...(selectedZone ? { zoneId: parseInt(selectedZone) } : {})
        }
      });

      // Notificamos al componente padre que el análisis está completo
      onAnalysisComplete(response);
      
      toast({
        title: "Análisis completado",
        description: "Se ha completado el análisis de pedidos correctamente."
      });
    } catch (error) {
      console.error('Error al analizar pedidos:', error);
      toast({
        title: "Error",
        description: "No se pudieron analizar los pedidos en el período seleccionado. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="text-primary" />
          Análisis de Pedidos con IA
        </CardTitle>
        <CardDescription>
          Analiza datos de pedidos para obtener insights valiosos y recomendaciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zone">Zona (opcional)</Label>
            <Select 
              value={selectedZone} 
              onValueChange={setSelectedZone}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una zona (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las zonas</SelectItem>
                {zones.map((zone: any) => (
                  <SelectItem key={zone.id} value={zone.id.toString()}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || !startDate || !endDate}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando datos...
            </>
          ) : (
            'Analizar Pedidos'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OrderAnalysisForm;