import * as turf from '@turf/turf';
import { addMinutes } from 'date-fns';
import { type Order, type Route } from '@shared/schema';

interface Point {
  type: 'Feature';
  properties: {
    id: number;
    type: 'depot' | 'delivery';
    estimatedTime: number; // minutos
    orderIds?: number[]; // IDs de los pedidos en esta parada
    deliveryCount?: number; // Número de entregas en esta parada
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface OptimizedRoute {
  sequence: number[];
  totalDistance: number;
  estimatedDuration: number;
  points: Point[];
  truckId?: number;
  assistantId?: number;
}

const AVERAGE_SPEED = 30; // km/h
const DELIVERY_TIME = 10; // minutos por entrega

export function calculateOptimalRoute(
  orders: Order[], 
  depotCoordinates?: { latitude: number; longitude: number }
): OptimizedRoute {
  // Usar coordenadas del almacén proporcionadas o coordenadas por defecto
  const DEPOT_COORDINATES: [number, number] = depotCoordinates 
    ? [depotCoordinates.longitude, depotCoordinates.latitude] 
    : [-69.8734, 18.4955]; // Santo Domingo por defecto

  console.log("📍 Coordenadas del almacén:", DEPOT_COORDINATES);

  // Agrupar pedidos por ubicación (mismo cliente/coordenadas)
  const locationGroups = new Map<string, Order[]>();
  
  orders.forEach(order => {
    // Intentar usar deliveryCoordinates primero, si no existe usar coordinates del cliente
    const coordString = order.deliveryCoordinates || (order as any).coordinates;
    
    if (!coordString) {
      throw new Error(`Pedido ${order.id} no tiene coordenadas de entrega ni coordenadas del cliente`);
    }

    // Usar coordenadas como clave para agrupar
    if (!locationGroups.has(coordString)) {
      locationGroups.set(coordString, []);
    }
    locationGroups.get(coordString)!.push(order);
  });

  console.log(`📦 Total de pedidos: ${orders.length}, Paradas únicas: ${locationGroups.size}`);

  // Convertir grupos de ubicación a puntos para el cálculo
  const points: Point[] = [];
  let stopIndex = 1;
  
  locationGroups.forEach((ordersAtLocation, coordString) => {
    console.log(`Pedidos en ${coordString}: ${ordersAtLocation.map(o => o.id).join(', ')} (${ordersAtLocation.length} entregas)`);

    const [lat, lng] = coordString.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error(`Coordenadas inválidas: ${coordString}`);
    }

    const orderIds = ordersAtLocation.map(o => o.id);
    const deliveryCount = ordersAtLocation.length;

    points.push({
      type: 'Feature',
      properties: {
        id: orderIds[0], // Usar el ID del primer pedido como referencia
        type: 'delivery',
        estimatedTime: DELIVERY_TIME * deliveryCount, // Tiempo por cada entrega
        orderIds: orderIds,
        deliveryCount: deliveryCount
      },
      geometry: {
        type: 'Point',
        coordinates: [lng, lat] as [number, number]
      }
    });
    
    stopIndex++;
  });

  // Agregar el depósito como punto inicial y final
  const depot: Point = {
    type: 'Feature',
    properties: {
      id: 0,
      type: 'depot',
      estimatedTime: 0
    },
    geometry: {
      type: 'Point',
      coordinates: DEPOT_COORDINATES
    }
  };

  points.unshift(depot);
  points.push({ ...depot, properties: { ...depot.properties, id: -1 } });

  // Crear matriz de distancias
  const distances: number[][] = points.map((from, i) => 
    points.map((to, j) => {
      if (i === j) return 0;
      return turf.distance(from, to, { units: 'kilometers' });
    })
  );

  console.log("Matriz de distancias calculada:", distances);

  // Algoritmo del vecino más cercano
  const visited = new Set([0]);
  const sequence = [0];
  let totalDistance = 0;

  console.log("\n=== CÁLCULO DE DISTANCIA PASO A PASO ===");
  console.log(`Punto inicial: Almacén (índice 0)`);

  while (visited.size < points.length - 1) {
    const last = sequence[sequence.length - 1];
    let nearest = -1;
    let minDist = Infinity;

    for (let i = 1; i < points.length - 1; i++) {
      if (!visited.has(i) && distances[last][i] < minDist) {
        nearest = i;
        minDist = distances[last][i];
      }
    }

    if (nearest !== -1) {
      sequence.push(nearest);
      visited.add(nearest);
      totalDistance += minDist;
      
      const fromPoint = points[last];
      const toPoint = points[nearest];
      const fromLabel = fromPoint.properties.type === 'depot' ? 'Almacén' : `Pedido ${fromPoint.properties.id}`;
      const toLabel = toPoint.properties.type === 'depot' ? 'Almacén' : `Pedido ${toPoint.properties.id}`;
      
      console.log(`  ${fromLabel} → ${toLabel}: ${minDist.toFixed(2)} km (Total acumulado: ${totalDistance.toFixed(2)} km)`);
    }
  }

  // Agregar regreso al depósito
  sequence.push(points.length - 1);
  const returnDistance = distances[sequence[sequence.length - 2]][points.length - 1];
  totalDistance += returnDistance;
  
  const lastPoint = points[sequence[sequence.length - 2]];
  const lastLabel = lastPoint.properties.type === 'depot' ? 'Almacén' : `Pedido ${lastPoint.properties.id}`;
  console.log(`  ${lastLabel} → Almacén (regreso): ${returnDistance.toFixed(2)} km (Total acumulado: ${totalDistance.toFixed(2)} km)`);
  console.log(`\n✅ DISTANCIA TOTAL: ${totalDistance.toFixed(2)} km`);
  console.log("=== FIN CÁLCULO ===\n");

  // Calcular duración estimada
  const estimatedDuration = Math.ceil(
    (totalDistance / AVERAGE_SPEED) * 60 + // Tiempo de viaje en minutos
    points.reduce((sum, p) => sum + p.properties.estimatedTime, 0) // Tiempo de entrega
  );

  // Expandir la secuencia para incluir todos los pedidos
  const expandedSequence: number[] = [];
  for (const pointIndex of sequence.slice(1, -1)) {
    const point = points[pointIndex];
    // Si hay múltiples pedidos en esta parada, agregarlos todos
    if (point.properties.orderIds && point.properties.orderIds.length > 0) {
      expandedSequence.push(...point.properties.orderIds);
    } else {
      expandedSequence.push(point.properties.id);
    }
  }

  console.log("Ruta optimizada:", {
    sequence: expandedSequence,
    stops: sequence.slice(1, -1).length,
    deliveries: expandedSequence.length,
    totalDistance,
    estimatedDuration
  });

  return {
    sequence: expandedSequence,
    totalDistance: Math.round(totalDistance * 100) / 100,
    estimatedDuration,
    points: points.slice(1, -1)
  };
}

export function updateEstimatedDeliveryTimes(
  route: Route,
  orders: Order[],
  startTime: Date = new Date()
): Order[] {
  const sequence = route.deliverySequence || [];
  let currentTime = startTime;

  return orders.map(order => {
    const sequenceIndex = sequence.indexOf(order.id.toString());
    if (sequenceIndex === -1) return order;

    // Calcular tiempo estimado basado en la posición en la secuencia
    const estimatedDeliveryTime = addMinutes(
      currentTime,
      sequenceIndex * (DELIVERY_TIME + 15) // 15 minutos promedio entre entregas
    );

    return {
      ...order,
      estimatedDeliveryTime: estimatedDeliveryTime,
      deliverySequence: sequenceIndex + 1
    };
  });
}