import { createRoot } from "react-dom/client";
import { GoogleMapsProvider } from "./components/map/GoogleMapsProvider";
import App from "./App";
import "./index.css";
import "./styles/map-responsive.css";

// Utilizar directamente la clave de API proporcionada
const googleMapsApiKey = "AIzaSyCKR-m2mB162WETaSakhurLxpYDXj3oGmU";

// Registro de información para depuración
console.log("Inicializando aplicación con Google Maps...");
console.log("Variable de API key disponible:", googleMapsApiKey ? "Sí" : "No");

// Renderizar la aplicación con el proveedor de Google Maps
createRoot(document.getElementById("root")!).render(
  <GoogleMapsProvider apiKey={googleMapsApiKey}>
    <App />
  </GoogleMapsProvider>
);
