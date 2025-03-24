// Traducciones para uso en el componente ZoneBasedRouteForm.tsx
export const formTranslations = {
  es: {
    // Pestañas
    zone: "Zona",
    customers: "Clientes",
    reviewRoute: "Revisar Ruta",
    
    // Sección de zona
    deliveryZone: "Zona de Entrega",
    selectAZone: "Selecciona una zona",
    continueToCustomerSelection: "Continuar a Selección de Clientes",
    selectAll: "Seleccionar todos",
    reviewRoute2: "Revisar Ruta",
    zoneMap: "Mapa de la Zona",
    
    // Sección de clientes
    customersInZone: "Clientes en la Zona",
    selected: "seleccionados",
    noCustomersInZone: "No hay clientes registrados en esta zona",
    back: "Atrás",
    reviewAndSaveRoute: "Revisar y Guardar Ruta",
    optimizing: "Optimizando...",
    optimizeRoute: "Optimizar Ruta",
    
    // Sección de revisión
    routeName: "Nombre de la Ruta",
    driver: "Conductor",
    selectADriver: "Seleccionar un conductor",
    deliveryDate: "Fecha de entrega",
    selectADate: "Selecciona una fecha",
    stopsSequence: "Secuencia de Paradas",
    start: "Inicio",
    optimizedRouteMap: "Mapa de Ruta Optimizada",
    mainWarehouse: "Almacén Principal (Inicio)",
    stop: "Parada",
    saveRoute: "Guardar Ruta"
  },
  en: {
    // Tabs
    zone: "Zone",
    customers: "Customers",
    reviewRoute: "Review Route",
    
    // Zone section
    deliveryZone: "Delivery Zone",
    selectAZone: "Select a zone",
    continueToCustomerSelection: "Continue to Customer Selection",
    selectAll: "Select All",
    reviewRoute2: "Review Route",
    zoneMap: "Zone Map",
    
    // Customers section
    customersInZone: "Customers in Zone",
    selected: "selected",
    noCustomersInZone: "No customers registered in this zone",
    back: "Back",
    reviewAndSaveRoute: "Review and Save Route",
    optimizing: "Optimizing...",
    optimizeRoute: "Optimize Route",
    
    // Review section
    routeName: "Route Name",
    driver: "Driver",
    selectADriver: "Select a driver",
    deliveryDate: "Delivery Date",
    selectADate: "Select a date",
    stopsSequence: "Stops Sequence",
    start: "Start",
    optimizedRouteMap: "Optimized Route Map",
    mainWarehouse: "Main Warehouse (Start)",
    stop: "Stop",
    saveRoute: "Save Route"
  }
};

// Función para obtener las traducciones según el idioma
export function getTranslations(lang: 'es' | 'en' = 'es') {
  return formTranslations[lang];
}