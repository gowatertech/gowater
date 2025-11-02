import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { getStartOfWeekRD, getEndOfWeekRD } from '@/lib/date-utils';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function GenerateCommissionsPage() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  // Configurar fechas iniciales (semana actual en RD timezone)
  const [formData, setFormData] = useState({
    weekStartDate: getStartOfWeekRD(1),
    weekEndDate: getEndOfWeekRD(1),
    userRole: 'driver',
    userId: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      // Preparar datos para enviar
      const postData = {
        ...formData,
        userId: formData.userId ? parseInt(formData.userId) : undefined
      };
      
      console.log("Enviando solicitud con datos:", postData);
      
      // Realizar petición con un timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/commissions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Verificar respuesta
      const contentType = response.headers.get("content-type");
      const responseData = contentType && contentType.includes("application/json") 
        ? await response.json() 
        : null;
      
      if (!response.ok) {
        throw new Error(responseData?.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      // Mostrar resultado exitoso
      setResult(responseData);
      toast({
        title: "Comisiones generadas",
        description: `Se generaron ${responseData.commissions?.length || 0} comisiones correctamente`,
      });
      
      // Después de 2 segundos, redireccionar a la lista de comisiones
      setTimeout(() => {
        navigate('/commissions');
      }, 2000);
      
    } catch (err: any) {
      console.error("Error al generar comisiones:", err);
      
      if (err.name === 'AbortError') {
        setError('La solicitud excedió el tiempo límite. Por favor intente nuevamente.');
      } else {
        setError(err.message || 'Ocurrió un error al generar las comisiones');
      }
      
      toast({
        title: "Error",
        description: err.message || "No se pudieron generar las comisiones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/commissions')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Comisiones
        </Button>
        
        <h1 className="text-2xl font-bold">Generar Comisiones</h1>
        <p className="text-muted-foreground">
          Complete el formulario para generar comisiones sobre las entregas realizadas
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Formulario de Generación de Comisiones</CardTitle>
          <CardDescription>
            Seleccione el período y tipo de empleado para calcular las comisiones
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weekStartDate">Fecha de inicio</Label>
                <Input
                  id="weekStartDate"
                  name="weekStartDate"
                  type="date"
                  value={formData.weekStartDate}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weekEndDate">Fecha de fin</Label>
                <Input
                  id="weekEndDate"
                  name="weekEndDate"
                  type="date"
                  value={formData.weekEndDate}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userRole">Tipo de empleado</Label>
                <select
                  id="userRole"
                  name="userRole"
                  value={formData.userRole}
                  onChange={handleChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  required
                >
                  <option value="driver">Choferes</option>
                  <option value="helper">Ayudantes</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userId">ID de empleado (opcional)</Label>
                <Input
                  id="userId"
                  name="userId"
                  type="number"
                  placeholder="Dejar vacío para todos"
                  value={formData.userId}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 inline-block mr-2" />
                {error}
              </div>
            )}
            
            {result && (
              <div className="bg-green-50 p-3 rounded-md border border-green-200 text-green-600 text-sm">
                ✓ Se generaron {result.commissions?.length || 0} comisiones correctamente.
                Redirigiendo...
              </div>
            )}
          
            <CardFooter className="px-0 pt-4">
              <Button 
                type="submit" 
                className="ml-auto" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar Comisiones
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}