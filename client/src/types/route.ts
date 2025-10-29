export interface RouteStop {
  id: number;
  order: number;
  customerId: number;
  customerName: string;
  customerIsCharity?: boolean;
  paymentMethod?: string;
  invoiceId?: number; // ID de factura prepagada si existe
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
  // Soporte para múltiples órdenes en la misma parada
  orders?: RouteOrder[]; // Array de órdenes cuando hay múltiples en la misma parada
}

// Tipo para órdenes individuales dentro de una parada
export interface RouteOrder {
  id: number;
  customerId: number;
  customerName: string;
  customerIsCharity?: boolean;
  paymentMethod?: string;
  invoiceId?: number;
  address: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "delivered" | "returned" | "in_transit";
  actualStatus?: string;
  products: { id: number; name: string; quantity: number; price: number; isReturnable?: boolean }[];
  totalValue: number | string;
}