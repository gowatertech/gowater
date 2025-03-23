import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/map-responsive.css";

// Función para cargar Google Maps API asíncronamente
const loadGoogleMapsAPI = () => {
  // Comprobar si la API ya está cargada
  if (window.google && window.google.maps) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    // Función callback que será llamada cuando el script esté cargado
    window.initGoogleMapsAPI = () => {
      resolve();
      // Asignar null es más seguro que usar delete
      window.initGoogleMapsAPI = null as any;
    };

    // Crear el script
    const script = document.createElement("script");
    // Obtener la API key del archivo .env a través de Vite
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    console.log("Using Google Maps API Key:", apiKey ? "Configured" : "Missing");
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing&callback=initGoogleMapsAPI`;
    script.async = true;
    script.defer = true;
    script.onerror = (error) => {
      console.error("Error al cargar Google Maps API:", error);
      reject(error);
    };

    // Añadir el script al documento
    document.head.appendChild(script);
  });
};

// Declaración para TypeScript
declare global {
  interface Window {
    initGoogleMapsAPI: () => void;
  }
}

// Cargar la API y luego renderizar la aplicación
loadGoogleMapsAPI()
  .then(() => {
    console.log("Google Maps API cargada correctamente");
    createRoot(document.getElementById("root")!).render(<App />);
  })
  .catch((error) => {
    console.error("Error al cargar Google Maps API:", error);
    // Renderizar la aplicación de todos modos, pero los componentes de mapa mostrarán un error
    createRoot(document.getElementById("root")!).render(<App />);
  });
