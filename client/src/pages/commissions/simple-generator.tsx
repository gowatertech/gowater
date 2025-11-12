import React, { useState } from 'react';
import { formatDateRD } from '@/lib/date-utils';

// Componente simple sin dependencias complejas
const SimpleCommissionGenerator = () => {
  // Estado básico para el formulario - Modelo diario: una sola fecha
  const [commissionDate, setCommissionDate] = useState(() => {
    // Fecha de hoy en formato YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
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
      // Preparar los datos para el envío - Modelo diario
      const data: Record<string, any> = {
        date: commissionDate, // Una sola fecha para comisión diaria
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
      const count = result.commissions?.length || 0;
      if (count === 0) {
        setSuccess('No se encontraron comisiones calculadas para la fecha seleccionada. Verifique que existan pedidos entregados con productos comisionables.');
      } else {
        setSuccess(`✅ Se han oficializado ${count} comisión(es) correctamente. Las comisiones ahora están guardadas en la base de datos con estado "PENDIENTE" y listas para pago.`);
      }
      
      // Redireccionar después de un tiempo
      setTimeout(() => {
        window.location.href = '/commissions';
      }, 3000);
      
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
            <h1 className="text-2xl font-bold sm:text-3xl">Oficializar Comisiones Diarias</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Seleccione una fecha para oficializar las comisiones calculadas de ese día y marcarlas como pendientes de pago
            </p>
          </div>
          
          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:p-4">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 sm:p-4">
              <p className="text-sm text-green-800">{success}</p>
              <button
                onClick={() => window.location.href = '/commissions'}
                className="mt-3 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                data-testid="button-back-to-dashboard"
              >
                Volver al Dashboard de Comisiones
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="commissionDate" className="block mb-2 text-sm font-medium">
                Fecha de Comisión
              </label>
              <input
                id="commissionDate"
                type="date"
                value={commissionDate}
                onChange={(e) => setCommissionDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
                data-testid="input-commission-date"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Seleccione la fecha para la cual desea oficializar comisiones
              </p>
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