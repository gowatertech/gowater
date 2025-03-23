import { createRoot } from "react-dom/client";
import { GoogleMapsProvider } from "./components/map/GoogleMapsProvider";
import App from "./App";
import "./index.css";
import "./styles/map-responsive.css";

// Renderizar la aplicación con el proveedor de Google Maps
createRoot(document.getElementById("root")!).render(
  <GoogleMapsProvider>
    <App />
  </GoogleMapsProvider>
);
