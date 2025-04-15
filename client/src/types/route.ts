export interface RouteStop {
  id: number;
  order: number;
  customerId: number;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "delivered" | "returned" | "in_transit";
  actualStatus?: string; // Estado real en la base de datos
  estimatedArrival: string;
  estimatedDuration: number;
  distanceFromPrevious: number | string;
  products: { id: number; name: string; quantity: number; price: number; isReturnable?: boolean }[];
  totalValue: number | string;
  isWarehouse?: boolean;
}