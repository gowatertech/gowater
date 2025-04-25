import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook personalizado para prevenir la navegación hacia atrás después de cerrar sesión.
 * Redirige a la ruta de destino si el usuario intenta volver a una página protegida
 * después de cerrar sesión.
 * 
 * @param redirectTo Ruta a la que redirigir si el usuario no está autenticado
 * @param authEndpoint Endpoint para verificar la autenticación (por defecto es '/api/user')
 */
export function usePreventBackNavigation(redirectTo: string = '/', authEndpoint: string = '/api/user') {
  const [, setLocation] = useLocation();

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
          setLocation(redirectTo, { replace: true });
        }
      } catch (error) {
        console.error(`[usePreventBackNavigation] Error verificando autenticación en ${authEndpoint}:`, error);
        // En caso de error, también redirigir por seguridad
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

    // Limpiar listeners al desmontar
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [redirectTo, authEndpoint, setLocation]);
}