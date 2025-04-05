import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/map-responsive.css";
import { initSyncService } from "./lib/syncService";
import { registerServiceWorker } from "./lib/registerServiceWorker";

// Inicializar el servicio de sincronización
initSyncService();

// Registrar el Service Worker mejorado
window.addEventListener('load', async () => {
  try {
    const registration = await registerServiceWorker();
    if (registration) {
      console.log('Service Worker registrado y configurado correctamente');
    } else {
      console.log('No se pudo registrar el Service Worker');
    }
  } catch (error) {
    console.error('Error al registrar el Service Worker:', error);
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
