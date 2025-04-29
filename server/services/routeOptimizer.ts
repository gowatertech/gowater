/**
 * Servicio para la optimización de rutas de entrega
 * 
 * Este servicio proporciona funciones para:
 * - Calcular la ruta óptima entre múltiples puntos de entrega
 * - Estimar tiempos de llegada
 * - Calcular distancias entre puntos
 */

export interface DeliveryPoint {
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  coordinates?: string; // Podría ser "lat,lng" o una dirección
  sequenceNumber: number;
  estimatedArrivalTime?: Date | null;
}

export interface OptimizedPoint extends DeliveryPoint {
  distance?: number; // distancia desde el punto anterior en metros
  duration?: number; // tiempo estimado desde el punto anterior en segundos
}

/**
 * Optimiza una ruta de entregas
 * 
 * Esta es una implementación simple. En un entorno de producción,
 * se debería usar un servicio como Google Maps Directions API,
 * GraphHopper, o similar para obtener la ruta óptima.
 * 
 * @param points Puntos de entrega que deben ser ordenados de manera óptima
 * @param startingPoint Punto de partida (opcional, por defecto se asume el almacén)
 * @returns Puntos de entrega ordenados de manera óptima
 */
export function calculateOptimalRoute(
  points: DeliveryPoint[], 
  startingPoint?: { lat: number, lng: number }
): OptimizedPoint[] {
  console.log(`Calculando ruta óptima para ${points.length} puntos de entrega`);
  
  if (points.length === 0) {
    return [];
  }
  
  // Si solo hay un punto, simplemente devolvemos ese punto
  if (points.length === 1) {
    return [{
      ...points[0],
      sequenceNumber: 1,
      distance: 0,
      duration: 0
    }];
  }
  
  // Extraer coordenadas de los puntos (si están disponibles)
  const pointsWithCoords = points.map(point => {
    let lat = 0, lng = 0;
    
    if (point.coordinates) {
      const [latStr, lngStr] = point.coordinates.split(',');
      lat = parseFloat(latStr);
      lng = parseFloat(lngStr);
    }
    
    return {
      ...point,
      lat,
      lng
    };
  });
  
  // Crear una matriz de distancias entre todos los puntos
  // En una implementación real, aquí se usaría una API como Google Maps Distance Matrix
  const distanceMatrix = calculateDistanceMatrix(pointsWithCoords, startingPoint);
  
  // Implementación simple del problema del viajante (TSP) usando algoritmo greedy
  const optimizedRoute: OptimizedPoint[] = [];
  const visited = new Set<number>();
  
  // Punto actual, comenzamos desde el almacén (o el primer punto si no hay coordenadas)
  let currentPoint = startingPoint 
    ? { lat: startingPoint.lat, lng: startingPoint.lng } 
    : { lat: pointsWithCoords[0].lat, lng: pointsWithCoords[0].lng };
  
  // Tiempo acumulado desde el inicio
  let cumulativeTime = 0;
  
  // Mientras no hayamos visitado todos los puntos
  while (visited.size < points.length) {
    let minDistance = Number.MAX_VALUE;
    let nextPointIndex = -1;
    
    // Encontrar el punto más cercano que no haya sido visitado
    for (let i = 0; i < pointsWithCoords.length; i++) {
      if (visited.has(i)) continue;
      
      const distance = calculateDistance(
        currentPoint.lat, 
        currentPoint.lng, 
        pointsWithCoords[i].lat, 
        pointsWithCoords[i].lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nextPointIndex = i;
      }
    }
    
    if (nextPointIndex === -1) break; // No se encontraron más puntos válidos
    
    // Marcar este punto como visitado
    visited.add(nextPointIndex);
    
    // Calcular el tiempo estimado basado en la distancia (asumiendo 30 km/h)
    // 30 km/h = 8.33 m/s
    const duration = Math.round(minDistance / 8.33);
    cumulativeTime += duration;
    
    // Calcular tiempo estimado de llegada
    const estimatedArrivalTime = new Date();
    estimatedArrivalTime.setSeconds(estimatedArrivalTime.getSeconds() + cumulativeTime);
    
    // Agregar a la ruta optimizada
    optimizedRoute.push({
      ...points[nextPointIndex],
      sequenceNumber: optimizedRoute.length + 1,
      distance: Math.round(minDistance),
      duration,
      estimatedArrivalTime
    });
    
    // Actualizar el punto actual
    currentPoint = {
      lat: pointsWithCoords[nextPointIndex].lat,
      lng: pointsWithCoords[nextPointIndex].lng
    };
  }
  
  console.log(`Ruta optimizada calculada: ${optimizedRoute.length} puntos`);
  return optimizedRoute;
}

/**
 * Calcula la ruta más rápida entre múltiples paradas
 * 
 * @param origins Puntos de origen (por ejemplo, ubicación actual)
 * @param destinations Puntos de destino (por ejemplo, clientes)
 * @returns Matriz de distancias y duraciones
 */
export function calculateDistanceMatrix(
  points: Array<any>,
  startingPoint?: { lat: number, lng: number }
): Array<Array<number>> {
  const n = points.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  // Llenar la matriz con distancias euclidiana entre puntos
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
        continue;
      }
      
      matrix[i][j] = calculateDistance(
        points[i].lat, 
        points[i].lng, 
        points[j].lat, 
        points[j].lng
      );
    }
  }
  
  return matrix;
}

/**
 * Calcula la distancia en metros entre dos puntos usando la fórmula de Haversine
 * 
 * @param lat1 Latitud del punto 1
 * @param lng1 Longitud del punto 1
 * @param lat2 Latitud del punto 2
 * @param lng2 Longitud del punto 2
 * @returns Distancia en metros
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Si no tenemos coordenadas válidas, devolvemos una distancia predeterminada
  if (!lat1 || !lng1 || !lat2 || !lng2) {
    return 1000; // 1 km por defecto
  }
  
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Estima el tiempo de viaje entre dos puntos
 * 
 * @param distance Distancia en metros
 * @param speedKmh Velocidad promedio en km/h (por defecto 30 km/h)
 * @returns Tiempo en segundos
 */
export function estimateTravelTime(distance: number, speedKmh: number = 30): number {
  // Convertir velocidad de km/h a m/s
  const speedMs = speedKmh * 1000 / 3600;
  
  // Calcular tiempo en segundos
  return Math.round(distance / speedMs);
}