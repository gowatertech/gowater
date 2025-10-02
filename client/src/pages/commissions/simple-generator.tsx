import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek, endOfWeek } from 'date-fns';

// Componente simple sin dependencias complejas
const SimpleCommissionGenerator = () => {
  // Estado básico para el formulario
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return format(start, 'yyyy-MM-dd');
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return format(end, 'yyyy-MM-dd');
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
      setSuccess(`Se han generado ${result.commissions?.length || 0} comisiones correctamente`);
      
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
  
  // Estilos directos para no depender de bibliotecas externas
  const styles = {
    container: {
      maxWidth: '600px',
      margin: '40px auto',
      padding: '30px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      fontFamily: 'system-ui, sans-serif'
    },
    header: {
      marginBottom: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '10px'
    },
    subtitle: {
      fontSize: '16px',
      color: '#666',
      marginBottom: '20px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '500'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px'
    },
    select: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px',
      backgroundColor: 'white'
    },
    button: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      width: '100%'
    },
    buttonDisabled: {
      backgroundColor: '#93c5fd',
      cursor: 'not-allowed'
    },
    buttonSecondary: {
      backgroundColor: '#f1f5f9',
      color: '#334155',
      border: '1px solid #cbd5e1',
      padding: '12px 20px',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      width: '100%',
      marginTop: '10px'
    },
    error: {
      backgroundColor: '#fee2e2',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '20px',
      color: '#b91c1c',
      fontSize: '14px',
      border: '1px solid #fecaca'
    },
    success: {
      backgroundColor: '#dcfce7',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '20px',
      color: '#15803d',
      fontSize: '14px',
      border: '1px solid #bbf7d0'
    },
    buttonRow: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Generar Comisiones</h1>
        <p style={styles.subtitle}>
          Complete el formulario para calcular las comisiones de choferes y ayudantes
        </p>
      </div>
      
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="startDate">Fecha de inicio</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="endDate">Fecha de fin</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="userRole">Tipo de empleado</label>
          <select
            id="userRole"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            style={styles.select}
            required
          >
            <option value="driver">Choferes</option>
            <option value="helper">Ayudantes</option>
          </select>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="userId">ID del empleado (opcional)</label>
          <input
            id="userId"
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Dejar vacío para todos los empleados"
            style={styles.input}
          />
        </div>
        
        <div style={styles.buttonRow}>
          <button
            type="button"
            onClick={() => window.location.href = '/commissions'}
            style={styles.buttonSecondary}
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Procesando...' : 'Generar Comisiones'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimpleCommissionGenerator;