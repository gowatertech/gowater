import React, { useState } from 'react';
import { getStartOfWeekRD, getEndOfWeekRD } from '@/lib/date-utils';

// Componente simple sin dependencias complejas
const SimpleCommissionGenerator = () => {
  // Estado básico para el formulario
  const [startDate, setStartDate] = useState(() => {
    return getStartOfWeekRD(1);
  });
  
  const [endDate, setEndDate] = useState(() => {
    return getEndOfWeekRD(1);
  });
  
  const [userRole, setUserRole] = useState('driver');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Función para manejar el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Preparar los datos para el envío
      const data: Record<string, any> = {
        weekStartDate: startDate,
        weekEndDate: endDate,
        userRole
      };
      
      if (userId) {
        const parsedUserId = parseInt(userId, 10);
        if (isNaN(parsedUserId)) {
          throw new Error('ID de usuario inválido');
        }
        data.userId = parsedUserId;
      }
      
      console.log('Datos a enviar:', data);
      
      // Realizar la petición
      const response = await fetch('/api/commissions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error('Respuesta del servidor inválida');
      }
      
      // Manejar la respuesta
      if (!response.ok) {
        throw new Error(result.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      console.log('Respuesta recibida:', result);
      setSuccess(`Se han oficializado ${result.commissions?.length || 0} comisiones correctamente. Ahora están disponibles para pago.`);
      
      // Redireccionar después de un tiempo
      setTimeout(() => {
        window.location.href = '/commissions';
      }, 2000);
      
    } catch (err: any) {
      console.error('Error al generar comisiones:', err);
      setError(err.message || 'Error desconocido al generar comisiones');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">Oficializar Comisiones</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Complete el formulario para oficializar las comisiones calculadas y marcarlas como pagables
            </p>
          </div>
          
          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:p-4">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 sm:p-4">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="startDate" className="block mb-2 text-sm font-medium">
                Fecha de inicio
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
                data-testid="input-start-date"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block mb-2 text-sm font-medium">
                Fecha de fin
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
                data-testid="input-end-date"
              />
            </div>
            
            <div>
              <label htmlFor="userRole" className="block mb-2 text-sm font-medium">
                Tipo de empleado
              </label>
              <select
                id="userRole"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
                data-testid="select-user-role"
              >
                <option value="driver">Choferes</option>
                <option value="helper">Ayudantes</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="userId" className="block mb-2 text-sm font-medium">
                ID del empleado (opcional)
              </label>
              <input
                id="userId"
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Dejar vacío para todos los empleados"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="input-user-id"
              />
            </div>
            
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.href = '/commissions'}
                className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="button-cancel"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="button-submit"
              >
                {loading ? 'Oficializando...' : 'Oficializar Comisiones'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SimpleCommissionGenerator;