import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook personalizado para prevenir la navegación hacia atrás después de cerrar sesión.
 * Redirige a la ruta de destino si el usuario intenta volver a una página protegida
 * después de cerrar sesión.
 * 
 * @param redirectTo Ruta a la que redirigir si el usuario no está autenticado
 * @param authEndpoint Endpoint para verificar la autenticación (por defecto es '/api/user')
 * @param interval Intervalo en milisegundos para verificar autenticación (opcional, default 5000)
 */
export function usePreventBackNavigation(
  redirectTo: string = '/', 
  authEndpoint: string = '/api/user',
  interval: number = 5000
) {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Primera comprobación al cargar la página
    checkAuthentication();

    // Función para verificar la autenticación y redirigir si es necesario
    async function checkAuthentication() {
      try {
        // Usar el endpoint específico para cada sistema (company, platform, mobile)
        const response = await fetch(authEndpoint);
        if (!response.ok) {
          // Si no hay sesión, redirigir a la página de inicio
          console.log(`[usePreventBackNavigation] No hay sesión activa en ${authEndpoint}, redirigiendo a ${redirectTo}`);
          setIsAuthenticated(false);
          setLocation(redirectTo, { replace: true });
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error(`[usePreventBackNavigation] Error verificando autenticación en ${authEndpoint}:`, error);
        
        // Si estamos offline, verificar si hay usuario en localStorage antes de redirigir
        if (!navigator.onLine) {
          const savedUser = localStorage.getItem('offlineUser');
          if (savedUser) {
            console.log('[usePreventBackNavigation] Sin conexión pero hay usuario offline, manteniendo sesión');
            setIsAuthenticated(true);
            return; // No redirigir
          }
        }
        
        // En caso de error online o sin usuario guardado, redirigir por seguridad
        setIsAuthenticated(false);
        setLocation(redirectTo, { replace: true });
      }
    }

    // Escuchar eventos de visibilidad de la página 
    // (cuando el usuario regresa desde otra pestaña o desde el historial)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuthentication();
      }
    };

    // Escuchar eventos de navegación en el historial
    const handlePopState = () => {
      checkAuthentication();
    };

    // Agregar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);
    
    // Verificar periódicamente la autenticación
    // Esto es especialmente útil después de un logout
    const intervalId = setInterval(() => {
      // Solo verificar si la página está visible
      if (document.visibilityState === 'visible') {
        checkAuthentication();
      }
    }, interval);

    // Limpiar listeners y intervalo al desmontar
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
      clearInterval(intervalId);
    };
  }, [redirectTo, authEndpoint, interval, setLocation]);
}