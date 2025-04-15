import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DebugApiViewProps {
  loadingId: number;
}

export default function DebugApiView({ loadingId }: DebugApiViewProps) {
  const [apiData, setApiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/route-settlements/${loadingId}`);
      if (!response.ok) {
        throw new Error(`Error de API: ${response.status}`);
      }
      const data = await response.json();
      setApiData(data);
      console.log('Datos recibidos:', data);
    } catch (err) {
      console.error('Error al obtener datos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loadingId) {
      fetchData();
    }
  }, [loadingId]);

  const renderObject = (obj: any, label: string, depth = 1) => {
    if (!obj) return <p className="text-red-500">No hay datos de {label}</p>;

    if (Array.isArray(obj)) {
      return (
        <div className="mb-4">
          <h3 className="font-medium">{label} ({obj.length} elementos)</h3>
          {obj.length === 0 ? (
            <p className="text-orange-500">Array vacío</p>
          ) : (
            <ul className="list-disc pl-4">
              {obj.slice(0, 10).map((item, index) => (
                <li key={index} className="mb-2">
                  {typeof item === 'object' ? (
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  ) : (
                    String(item)
                  )}
                </li>
              ))}
              {obj.length > 10 && <li>...y {obj.length - 10} más</li>}
            </ul>
          )}
        </div>
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      return (
        <div className="mb-4">
          <h3 className="font-medium">{label}</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(obj, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <h3 className="font-medium">{label}</h3>
        <p>{String(obj)}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Cargando datos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h2 className="text-red-600 font-medium">Error al cargar datos</h2>
        <p className="text-red-600">{error}</p>
        <Button 
          onClick={fetchData} 
          variant="outline" 
          className="mt-2"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!apiData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h2 className="text-yellow-600 font-medium">Sin datos</h2>
        <p>No se han cargado datos de la API.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-md p-4 overflow-auto max-h-[600px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Datos de API para carga #{loadingId}</h2>
        <Button onClick={fetchData} variant="outline" size="sm">
          Recargar datos
        </Button>
      </div>

      <div className="divide-y">
        {/* Información general */}
        <div className="py-3">
          <h3 className="font-medium mb-2">Información General</h3>
          <p><strong>Total órdenes encontradas:</strong> {apiData.totalOrdersFound || 0}</p>
          {apiData.warningMessage && (
            <p className="text-yellow-600">{apiData.warningMessage}</p>
          )}
        </div>

        {/* Órdenes relacionadas */}
        <div className="py-3">
          {renderObject(apiData.relatedOrders, 'Órdenes Relacionadas')}
        </div>

        {/* Resumen de productos */}
        <div className="py-3">
          {renderObject(apiData.productSummary, 'Resumen de Productos')}
        </div>

        {/* Devoluciones de envases */}
        <div className="py-3">
          {renderObject(apiData.bottleReturns, 'Devoluciones de Envases')}
        </div>

        {/* Información de carga */}
        <div className="py-3">
          {renderObject(apiData.loading, 'Información de Carga')}
        </div>

        {/* Datos crudos */}
        <div className="py-3">
          <h3 className="font-medium mb-2">Datos Crudos Completos</h3>
          <details>
            <summary className="cursor-pointer text-blue-600">Ver datos JSON completos</summary>
            <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}