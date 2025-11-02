
import { useState, useEffect } from 'react';
import { formatDateRD } from '@/lib/date-utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Definir tipos básicos
interface Commission {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  weekStartDate: string;
  weekEndDate: string;
  productCount: number;
  totalAmount: string;
  status: 'pending' | 'paid' | 'cancelled';
  routeName?: string;
}

export default function SimpleCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/commissions');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setCommissions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error al cargar comisiones:', err);
        setError(err.message || 'Error al cargar las comisiones');
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando comisiones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No se encontraron comisiones</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Comisiones (Vista Simple)</h1>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {commissions.map((commission) => (
          <Card key={commission.id} className="overflow-hidden">
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="text-base">
                {commission.userName} - {commission.userRole === 'driver' ? 'Chofer' : 'Ayudante'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Fecha:</span>{' '}
                {formatDateRD(commission.weekStartDate, { day: '2-digit', month: 'short' })} -{' '}
                {formatDateRD(commission.weekEndDate, { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Productos:</span> {commission.productCount}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Ruta:</span> {commission.routeName || 'N/A'}
              </p>
              <div className="mt-2 text-xl font-bold">
                ${parseFloat(commission.totalAmount).toFixed(2)}
              </div>
              <div className="mt-2">
                <span 
                  className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                    commission.status === 'pending' 
                      ? 'bg-amber-100 text-amber-800' 
                      : commission.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {commission.status === 'pending' 
                    ? 'Pendiente' 
                    : commission.status === 'paid' 
                    ? 'Pagado' 
                    : 'Cancelado'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
