import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function TestBilling() {
  useEffect(() => {
    console.log("Componente TestBilling montado");
    
    // Hacer una solicitud directa a la API al cargar el componente
    fetch('/api/invoices')
      .then(response => response.json())
      .then(data => {
        console.log("Datos de facturas recibidos (fetch):", data);
      })
      .catch(error => {
        console.error("Error al obtener facturas (fetch):", error);
      });
  }, []);

  // Usar React Query para probar la solicitud
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      console.log("Solicitud React Query iniciada");
      const response = await apiRequest("GET", "/api/invoices");
      if (!response.ok) {
        throw new Error('Error al cargar facturas');
      }
      const data = await response.json();
      console.log("Datos recibidos (React Query):", data);
      return data;
    }
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Prueba de Facturación</h1>
      
      <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
        <h2 className="text-lg font-medium mb-2">Estado de la consulta:</h2>
        <p><strong>Cargando:</strong> {isLoading ? 'Sí' : 'No'}</p>
        <p><strong>Error:</strong> {error ? error.message : 'Ninguno'}</p>
        <p><strong>Datos recibidos:</strong> {invoices ? invoices.length : 0} facturas</p>
      </div>

      {invoices && invoices.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-2">Primeras 3 facturas:</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-80 text-sm">
            {JSON.stringify(invoices.slice(0, 3), null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200 mt-4">
          <h2 className="text-lg font-medium mb-2 text-red-600">Error:</h2>
          <p>{error.message}</p>
        </div>
      )}
    </div>
  );
}