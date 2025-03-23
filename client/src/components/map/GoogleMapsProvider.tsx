import React, { createContext, useState, useEffect, useContext } from 'react';

// Crear contexto para la API de Google Maps
type GoogleMapsContextType = {
  isLoaded: boolean;
  hasError: boolean;
  apiKey: string;
  error: string | null;
};

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  hasError: false,
  apiKey: '',
  error: null
});

// Hook personalizado para usar el contexto
export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
  apiKey?: string;
}

export function GoogleMapsProvider({ children, apiKey: propApiKey }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Obtener la API key del secreto de entorno
  // Usamos la API key proporcionada directamente si está disponible en las props
  // O usamos la API key de las variables de entorno (probando dos posibles nombres)
  // Para depuración, usamos una clave constante si no hay nada más disponible
  const apiKey = propApiKey || "AIzaSyCKR-m2mB162WETaSakhurLxpYDXj3oGmU";
                
  console.log("Google Maps API Key disponible en GoogleMapsProvider:", apiKey ? "Sí" : "No");

  useEffect(() => {
    // Si ya está cargado o hay un error, no hacer nada
    if (isLoaded || hasError) return;
    
    // Verificar que tenemos una API key
    if (!apiKey) {
      console.error("No se ha proporcionado una API key para Google Maps");
      setHasError(true);
      setError("Falta la API key de Google Maps");
      return;
    }

    console.log("Cargando Google Maps con API key:", apiKey ? "Configurada correctamente" : "Faltante");
    console.log("API Key actual:", apiKey);

    // Comprobar si la API ya está cargada
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Función que se llamará cuando el script se cargue
    window.initGoogleMapsAPI = () => {
      console.log("Google Maps API cargada correctamente");
      setIsLoaded(true);
    };

    // Crear el script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry&callback=initGoogleMapsAPI`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error("Error al cargar Google Maps API:", e);
      setHasError(true);
      setError("Error al cargar la API de Google Maps. Verifique que la clave proporcionada sea válida y tenga los permisos necesarios habilitados.");
    };

    // Añadir el script al documento
    document.head.appendChild(script);

    // Limpieza al desmontar
    return () => {
      // Eliminar el script si existe
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      
      // Limpiar el callback global
      window.initGoogleMapsAPI = null as any;
    };
  }, [apiKey, isLoaded, hasError]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, hasError, apiKey, error }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

// Declaración para TypeScript
declare global {
  interface Window {
    initGoogleMapsAPI: (() => void) | null;
    google: any;
  }
}