import * as turf from '@turf/turf';
import { addMinutes } from 'date-fns';
import { type Order, type Route } from '@shared/schema';

interface Point {
  type: 'Feature';
  properties: {
    id: number;
    type: 'depot' | 'delivery';
    estimatedTime: number; // minutos
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
}

const AVERAGE_SPEED = 30; // km/h
const DELIVERY_TIME = 10; // minutos por entrega
const DEPOT_COORDINATES: [number, number] = [-69.8734, 18.4955]; // Santo Domingo

export function calculateOptimalRoute(orders: Order[]): OptimizedRoute {
  console.log("Optimizando ruta para pedidos:", orders.map(o => ({ id: o.id, coords: o.deliveryCoordinates })));

  // Convertir órdenes a puntos para el cálculo
  const points: Point[] = orders.map(order => {
    if (!order.deliveryCoordinates) {
      throw new Error(`Pedido ${order.id} no tiene coordenadas de entrega`);
    }

    const [lat, lng] = order.deliveryCoordinates.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error(`Coordenadas inválidas para pedido ${order.id}: ${order.deliveryCoordinates}`);
    }

    return {
      type: 'Feature',
      properties: {
        id: order.id,
        type: 'delivery',
        estimatedTime: DELIVERY_TIME
      },
      geometry: {
        type: 'Point',
        coordinates: [lng, lat] as [number, number]
      }
    };
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
    }
  }

  // Agregar regreso al depósito
  sequence.push(points.length - 1);
  totalDistance += distances[sequence[sequence.length - 2]][points.length - 1];

  // Calcular duración estimada
  const estimatedDuration = Math.ceil(
    (totalDistance / AVERAGE_SPEED) * 60 + // Tiempo de viaje en minutos
    points.reduce((sum, p) => sum + p.properties.estimatedTime, 0) // Tiempo de entrega
  );

  console.log("Ruta optimizada:", {
    sequence: sequence.slice(1, -1).map(i => points[i].properties.id),
    totalDistance,
    estimatedDuration
  });

  return {
    sequence: sequence.slice(1, -1).map(i => points[i].properties.id),
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
      estimatedDeliveryTime: estimatedDeliveryTime.toISOString(),
      deliverySequence: sequenceIndex + 1
    };
  });
}