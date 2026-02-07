import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/map-responsive.css";
import { initSyncService } from "./lib/sync-service";
import { isNative } from "./lib/capacitor";

// Inicializar el servicio de sincronización para modo offline
initSyncService();

if (isNative) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
  });
} else {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado correctamente:', registration);
        })
        .catch(error => {
          console.error('Error al registrar el Service Worker:', error);
        });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
