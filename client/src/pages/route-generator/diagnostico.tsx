import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DiagnosticoPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const probarEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);
    setRawResponse(null);
    
    try {
      console.log("Probando endpoint de pedidos pendientes...");
      
      const response = await fetch('/api/route-generator/orders/pending', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const responseText = await response.text();
      setRawResponse(responseText);
      
      console.log("Respuesta:", response.status, response.statusText);
      console.log("Texto de respuesta:", responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }
      
      try {
        const data = JSON.parse(responseText);
        setResultado(data);
        console.log("Datos parseados:", data);
      } catch (e) {
        const parseError = e as Error;
        console.error("Error al parsear JSON:", parseError);
        setError(`Error al parsear JSON: ${parseError.message}`);
      }
    } catch (e) {
      const error = e as Error;
      console.error("Error al probar endpoint:", error);
      setError(`Error al probar endpoint: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Diagnóstico del Generador de Rutas</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Prueba de conexión a API</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={probarEndpoint} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? 'Probando...' : 'Probar Endpoint de Pedidos Pendientes'}
          </Button>
          
          {error && (
            <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded mb-4">
              <h3 className="font-bold mb-2">Error:</h3>
              <p>{error}</p>
            </div>
          )}
          
          {resultado && (
            <div className="p-4 border border-green-300 bg-green-50 text-green-700 rounded mb-4">
              <h3 className="font-bold mb-2">Resultado exitoso:</h3>
              <p>Se encontraron {Array.isArray(resultado) ? resultado.length : 0} pedidos pendientes</p>
              
              {Array.isArray(resultado) && resultado.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">Primer pedido:</h4>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(resultado[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {rawResponse && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Respuesta Raw:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {rawResponse.length > 500 ? rawResponse.substring(0, 500) + '...' : rawResponse}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DiagnosticoPage;