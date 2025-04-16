import React, { useState } from 'react';
import { useLocation } from 'wouter';

export default function BasicCommissionForm() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Datos formulario
  const [weekStartDate, setWeekStartDate] = useState('2025-04-01');
  const [weekEndDate, setWeekEndDate] = useState('2025-04-15');
  const [userRole, setUserRole] = useState('driver');
  const [userId, setUserId] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Preparar datos
      const data: any = {
        weekStartDate,
        weekEndDate,
        userRole
      };
      
      // Añadir userId si está presente
      if (userId) {
        data.userId = parseInt(userId);
      }
      
      console.log('Enviando datos:', data);
      
      // Enviar petición
      const response = await fetch('/api/commissions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      // Procesar respuesta
      const resultData = await response.json();
      console.log('Respuesta recibida:', resultData);
      
      if (!response.ok) {
        throw new Error(resultData.error || 'Error al generar comisiones');
      }
      
      setSuccess(`Se han generado ${resultData.commissions?.length || 0} comisiones correctamente`);
      
      // Redireccionar tras 2 segundos
      setTimeout(() => {
        navigate('/commissions');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: 'white' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Generar Comisiones</h1>
      
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#FFEBEE', color: '#D32F2F', borderRadius: '4px', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}
      
      {success && (
        <div style={{ padding: '10px', backgroundColor: '#E8F5E9', color: '#2E7D32', borderRadius: '4px', marginBottom: '20px' }}>
          {success}
          <div>Redirigiendo a la lista de comisiones...</div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fecha Inicio:</label>
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fecha Fin:</label>
          <input
            type="date"
            value={weekEndDate}
            onChange={(e) => setWeekEndDate(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo:</label>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          >
            <option value="driver">Chofer</option>
            <option value="helper">Ayudante</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ID Usuario (opcional):</label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Dejar vacío para todos"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => navigate('/commissions')}
            style={{ padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#f1f1f1', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={loading}
            style={{ 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: '4px', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Procesando...' : 'Generar Comisiones'}
          </button>
        </div>
      </form>
    </div>
  );
}