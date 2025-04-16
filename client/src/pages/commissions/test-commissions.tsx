import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function TestCommissionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    weekStartDate: '2025-04-01',
    weekEndDate: '2025-04-15',
    userRole: 'driver'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmitXHR = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    console.log("Enviando datos con XMLHttpRequest:", formData);
    
    // Usando XMLHttpRequest en lugar de fetch
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', '/api/commissions/generate', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log("Comisiones generadas exitosamente:", data);
          setResult(data);
          toast({
            title: "Comisiones generadas",
            description: `Se generaron ${data.commissions?.length || 0} comisiones correctamente`,
          });
        } catch (e) {
          console.error("Error al procesar la respuesta:", e);
          setError('Error al procesar la respuesta del servidor');
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          console.error("Error del servidor:", errorData);
          setError(errorData?.error || `Error ${xhr.status}: ${xhr.statusText}`);
        } catch (e) {
          console.error("Error al procesar error del servidor:", e);
          setError(`Error ${xhr.status}: ${xhr.statusText}`);
        }
      }
      setLoading(false);
    };
    
    xhr.onerror = function() {
      console.error("Error de red al intentar generar comisiones");
      setError('Error de red al intentar generar comisiones');
      setLoading(false);
    };
    
    xhr.timeout = 30000; // 30 segundos
    xhr.ontimeout = function() {
      console.error("La solicitud excedió el tiempo de espera");
      setError('La solicitud excedió el tiempo de espera');
      setLoading(false);
    };
    
    xhr.send(JSON.stringify(formData));
  };

  const handleFormSubmitFetch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    console.log("Enviando datos con Fetch:", formData);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/commissions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log("Respuesta obtenida:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Datos recibidos:", data);
      setResult(data);
      toast({
        title: "Comisiones generadas",
        description: `Se generaron ${data.commissions?.length || 0} comisiones correctamente`,
      });
    } catch (error: any) {
      console.error("Error al generar comisiones:", error);
      setError(error.message || "Error al generar comisiones");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-4">Test de Generación de Comisiones</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Formulario de Prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="weekStartDate">Fecha Inicio</Label>
                <Input
                  id="weekStartDate"
                  name="weekStartDate"
                  type="date"
                  value={formData.weekStartDate}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="weekEndDate">Fecha Fin</Label>
                <Input
                  id="weekEndDate"
                  name="weekEndDate"
                  type="date"
                  value={formData.weekEndDate}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="userRole">Rol</Label>
              <select
                id="userRole"
                name="userRole"
                value={formData.userRole}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="driver">Chofer</option>
                <option value="helper">Ayudante</option>
              </select>
            </div>
            
            {error && (
              <div className="bg-red-50 p-3 rounded border border-red-200 text-red-500 text-sm">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                {error}
              </div>
            )}
            
            <div className="flex space-x-2 mt-2">
              <Button onClick={handleFormSubmitXHR} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar con XMLHttpRequest
              </Button>
              <Button onClick={handleFormSubmitFetch} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar con Fetch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}