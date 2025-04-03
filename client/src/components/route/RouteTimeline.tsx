import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  MapPin, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Recycle,
  CheckCircle,
  Compass,
  Info,
  Edit,
  Receipt,
  DollarSign
} from 'lucide-react';

// Define la interfaz de una parada/stop
interface RouteStop {
  id: number;
  order: number; // Orden en la secuencia de la ruta (0 para almacén, 1, 2, 3, etc.)
  customerId: number;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  estimatedArrival: string; // Hora estimada de llegada
  estimatedDuration: number; // Duración estimada en minutos
  distanceFromPrevious: number; // Distancia desde el punto anterior en km
  products: { id: number; name: string; quantity: number; price: number; isReturnable?: boolean }[];
  totalValue: number | string; // Valor total del pedido (puede venir como string desde la API)
  isWarehouse?: boolean; // Indica si es el almacén (punto 0)
}

// Props del componente
interface RouteTimelineProps {
  stops: RouteStop[];
  expandedStopId: number | null;
  darkMode: boolean;
  onToggleExpand: (stopId: number) => void;
  onMarkCompleted: (stop: RouteStop) => void;
  onDeliverOrder: (stop: RouteStop) => void;
  onRegisterBottleReturn: (orderId: number) => void;
  onEditOrder: (stop: RouteStop) => void;
  onViewOrderDetails: (stop: RouteStop) => void;
  currentStopIndex: number;
}

// Función para convertir string a número
const toNumber = (value: string | number): number => {
  if (typeof value === 'string') {
    return parseFloat(value) || 0;
  }
  return value;
};

// Componente principal
const RouteTimeline: React.FC<RouteTimelineProps> = ({ 
  stops, 
  expandedStopId, 
  darkMode, 
  onToggleExpand, 
  onMarkCompleted, 
  onDeliverOrder,
  onRegisterBottleReturn,
  onEditOrder,
  onViewOrderDetails,
  currentStopIndex
}) => {
  return (
    <div className="space-y-4">
      {stops.map((stop, index) => (
        <div 
          key={stop.id}
          className={`border rounded-lg p-3 relative ${
            stop.status === 'completed' 
              ? `${darkMode ? 'border-green-800 bg-green-900/10' : 'border-green-200 bg-green-50'}`
              : `${darkMode ? 'border-gray-700' : 'border-gray-200'}`
          } ${
            expandedStopId === stop.id ? 'ring-2 ring-primary/50' : ''
          }`}
        >
          {/* Decorador de línea de tiempo vertical */}
          {index < stops.length - 1 && (
            <div className="absolute left-6 top-9 bottom-0 w-[2px] bg-primary/20"></div>
          )}
          
          {/* Cabecera con estado e información principal */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                stop.isWarehouse
                  ? `${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`
                  : stop.status === 'completed' 
                    ? `${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}` 
                    : `${darkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`
              }`}>
                {stop.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{stop.order}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`font-medium ${stop.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                  {stop.customerName}
                </span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className={`text-xs ${
                    stop.status === 'completed' 
                      ? `${darkMode ? 'text-green-400' : 'text-green-600'}` 
                      : 'text-muted-foreground'
                  }`}>
                    {stop.status === 'completed' 
                      ? 'Completado' 
                      : stop.estimatedArrival ? stop.estimatedArrival : 'Hora estimada N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Badge de estado */}
            <Badge 
              variant={
                stop.status === 'completed' ? "success" :
                stop.status === 'in_progress' ? "default" :
                stop.status === 'cancelled' ? "destructive" :
                "outline"
              }
              className="capitalize text-xs"
            >
              {stop.status === 'completed' && "Completado"}
              {stop.status === 'in_progress' && "En curso"}
              {stop.status === 'pending' && "Pendiente"}
              {stop.status === 'cancelled' && "Cancelado"}
              {!stop.status && "Programado"}
            </Badge>
          </div>
          
          {/* Contenido de la tarjeta */}
          <div className="ml-10 text-sm">
            {/* Dirección */}
            <div className="flex items-start gap-1 mb-2">
              <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs flex-1">
                {stop.address}{!stop.isWarehouse ? ", Cotuí, Sánchez Ramírez" : ""}
              </p>
            </div>
            
            {/* Información de productos */}
            {stop.products && stop.products.length > 0 ? (
              <div className="mt-2 mb-2">
                <div className={`rounded-md p-2 ${
                  darkMode ? 'bg-gray-800/50' : 'bg-primary/5'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Productos ({stop.products.length})
                    </h4>
                    <span className="text-xs font-medium">
                      {stop.products.reduce((total, product) => total + product.quantity, 0)} unidades
                    </span>
                  </div>
                  
                  <ul className="space-y-1">
                    {stop.products.slice(0, expandedStopId === stop.id ? stop.products.length : 2).map(product => (
                      <li 
                        key={product.id}
                        className={`text-xs flex justify-between pb-1 ${
                          expandedStopId === stop.id ? 'border-b last:border-0' : ''
                        }`}
                      >
                        <span className="font-medium flex items-center gap-1">
                          {product.isReturnable && <Recycle className="h-2.5 w-2.5 text-green-500" />}
                          {product.name}
                        </span>
                        <span className="font-bold whitespace-nowrap">
                          {product.quantity} × ${product.price.toFixed(2)}
                        </span>
                      </li>
                    ))}
                    
                    {stop.products.length > 2 && expandedStopId !== stop.id && (
                      <li className="text-xs text-center pt-1 italic text-muted-foreground">
                        + {stop.products.length - 2} productos más...
                      </li>
                    )}
                  </ul>
                  
                  {/* Total y valor */}
                  <div className={`mt-2 pt-2 flex justify-between ${
                    darkMode ? 'border-t border-gray-700' : 'border-t border-primary/20'
                  }`}>
                    <span className="text-xs font-bold">Total:</span>
                    <span className="text-xs font-bold text-primary">
                      ${toNumber(stop.totalValue).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-2">
                {stop.isWarehouse && (
                  <Badge variant="outline" className="text-xs">
                    Punto de inicio
                  </Badge>
                )}
              </div>
            )}

            <div className="flex justify-between mt-2">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Duración estimada:</span>
                <span className="text-xs font-medium">{stop.estimatedDuration} min</span>
              </div>
              
              <div className="flex items-center gap-2">
                {!stop.isWarehouse && (
                  <Button
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8 flex items-center gap-1"
                    onClick={() => onToggleExpand(stop.id)}
                  >
                    {expandedStopId === stop.id ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    Detalles
                  </Button>
                )}
                
                <Button
                  variant="default" 
                  size="sm" 
                  className="text-xs h-8 flex items-center gap-1"
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`, '_blank')}
                >
                  <Compass className="h-3 w-3" />
                  Navegar
                </Button>
              </div>
            </div>
            
            {/* Panel expandible con acciones para la parada */}
            {expandedStopId === stop.id && !stop.isWarehouse && (
              <div className="mt-4 p-3 bg-muted rounded-md animate-in fade-in-50 duration-200 space-y-3">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  Acciones para esta parada
                </h4>
                
                {/* Botones de acción */}
                <div className={`grid grid-cols-2 gap-2 ${stop.status === 'completed' ? 'opacity-50' : ''}`}>
                  {stop.status !== 'completed' ? (
                    <>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="text-xs h-9 w-full"
                        onClick={() => onDeliverOrder(stop)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Entregar y Cobrar
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-9 w-full"
                        onClick={() => onEditOrder(stop)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar Pedido
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="text-xs h-9 w-full"
                        onClick={() => onViewOrderDetails(stop)}
                      >
                        <Receipt className="h-3 w-3 mr-1" />
                        Ver Recibo
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-9 w-full"
                        onClick={() => onRegisterBottleReturn(stop.id)}
                        disabled={!stop.products.some(p => p.isReturnable)}
                      >
                        <Recycle className="h-3 w-3 mr-1" />
                        Retorno de Envases
                      </Button>
                    </>
                  )}
                </div>
                
                {/* Productos y envases retornables cuando es una entrega completada */}
                {stop.status === 'completed' && (
                  <div className="mt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Valor cobrado:
                      </span>
                      <span className="font-bold">${toNumber(stop.totalValue).toFixed(2)}</span>
                    </div>
                    
                    {stop.products.some(p => p.isReturnable) && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-medium flex items-center gap-1">
                          <Recycle className="h-3 w-3" />
                          Envases a retornar:
                        </span>
                        <span className="font-medium">
                          {stop.products.filter(p => p.isReturnable).reduce((sum, p) => sum + p.quantity, 0)} unidades
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RouteTimeline;