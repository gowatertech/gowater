import { createRoot } from "react-dom/client";
import { GoogleMapsProvider } from "./components/map/GoogleMapsProvider";
import App from "./App";
import "./index.css";
import "./styles/map-responsive.css";

// Acceder a la variable de entorno para la API key
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string || "";

// Registro de información para depuración
console.log("Inicializando aplicación con Google Maps...");
console.log("Variable de API key disponible:", googleMapsApiKey ? "Sí" : "No");

// Renderizar la aplicación con el proveedor de Google Maps
createRoot(document.getElementById("root")!).render(
  <GoogleMapsProvider apiKey={googleMapsApiKey}>
    <App />
  </GoogleMapsProvider>
);
