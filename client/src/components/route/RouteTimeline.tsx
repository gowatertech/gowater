import React from "react";
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Truck,
  CircleCheck,
  CircleDollarSign,
  Warehouse,
  Building,
  Clipboard,
  Receipt,
  DollarSign,
  Recycle,
  Edit,
  Eye,
  Navigation
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RouteStop } from "@/types/route";

interface RouteTimelineProps {
  stops: RouteStop[];
  expandedStopId: number | null;
  darkMode: boolean;
  currentStopIndex: number;
  onToggleExpand: (stopId: number) => void;
  onMarkCompleted: (stop: RouteStop) => void;
  onDeliverOrder: (stop: RouteStop) => void;
  onRegisterBottleReturn: (orderId: number) => void;
  onEditOrder: (stop: RouteStop) => void;
  onViewOrderDetails: (stop: RouteStop) => void;
  onNavigateToLocation?: (latitude: number, longitude: number, address: string) => void;
}

const formatCurrency = (value: number | string): string => {
  // Asegurar que el valor es un número
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Formatear con formato de moneda dominicana
  return numValue.toLocaleString('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const RouteTimeline: React.FC<RouteTimelineProps> = ({
  stops,
  expandedStopId,
  darkMode,
  currentStopIndex,
  onToggleExpand,
  onMarkCompleted,
  onDeliverOrder,
  onRegisterBottleReturn,
  onEditOrder,
  onViewOrderDetails,
  onNavigateToLocation
}) => {
  // Verificar si hay algún envase retornable en la orden
  const hasReturnableItems = (stop: RouteStop): boolean => {
    return stop.products.some(product => product.isReturnable);
  };
  
  // Contar número total de productos
  const countTotalProducts = (stop: RouteStop): number => {
    return stop.products.reduce((acc, product) => acc + product.quantity, 0);
  };
  
  // Determinar el color y estado de la parada
  const getStopStatusColor = (status: string, index: number, currentIndex: number): string => {
    if (status === "completed") return "text-green-500";
    if (index === currentIndex) return "text-blue-500";
    return "text-gray-400";
  };
  
  return (
    <div className="relative">
      {stops.map((stop, index) => {
        // No mostrar la última línea conectora para la última parada
        const showConnector = index < stops.length - 1;
        
        // Determinar colores y estado visual
        const isCompleted = stop.status === "completed";
        // Forzar que solo la primera parada después del almacén sea la actual (índice 1)
        const isCurrent = index === 1 && !isCompleted;
        const isPending = !isCompleted && !isCurrent;
        const isExpanded = expandedStopId === stop.id;
        
        return (
          <div key={stop.id} className="relative">
            {/* Línea vertical de la cronología */}
            {showConnector && (
              <div 
                className={`absolute left-3 top-6 w-0.5 h-full ${
                  isCompleted ? "bg-green-500" : (index < currentStopIndex ? "bg-green-500" : "bg-gray-300")
                }`}
                style={{ height: "calc(100% - 1.5rem)" }}
              />
            )}
            
            {/* Tarjeta de parada */}
            <div className={`mb-4 ${isExpanded ? 'animate-in fade-in-50 duration-100' : ''}`}>
              <div className="flex gap-3">
                {/* Indicador de estado */}
                <div className="relative flex items-start pt-1">
                  {stop.isWarehouse ? (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isCompleted ? "border-green-500 bg-green-500/20" : "border-gray-400 bg-gray-200"
                    }`}>
                      <Warehouse className={`h-3 w-3 ${isCompleted ? "text-green-500" : "text-gray-600"}`} />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isCompleted ? "border-gray-500 bg-gray-700/20" : 
                      isCurrent ? "border-blue-500 bg-blue-500/20" : 
                      "border-gray-500 bg-gray-700/20"
                    }`}>
                      {/* Mostrar el estado actual como tooltip para depuración */}
                      <span className="sr-only">Estado: {stop.status}</span>
                      {!stop.isWarehouse && (
                        <span className="text-xs font-semibold">{stop.order}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Contenido principal de la parada */}
                <div className="flex-1">
                  <Card 
                    className={`overflow-hidden border ${
                      isCompleted ? "border-gray-500/30 bg-gray-700/5" : 
                      isCurrent ? "border-blue-500/30 bg-blue-500/5" : 
                      "border-gray-500/30 bg-gray-700/5"
                    } ${darkMode ? 'dark bg-gray-800 text-white' : ''}`}
                  >
                    {/* Encabezado de la parada */}
                    <div 
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between`}
                      onClick={() => onToggleExpand(stop.id)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          {stop.isWarehouse ? (
                            <>
                              <Warehouse className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="font-medium">{stop.customerName}</span>
                            </>
                          ) : (
                            <>
                              <Building className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="font-medium">
                                {stop.order}. {stop.customerName}
                              </span>
                            </>
                          )}
                          
                          {/* Badge de estado */}
                          <Badge 
                            variant="outline" 
                            className={`ml-2 px-2 py-0 text-xs ${
                              isCompleted ? "bg-gray-500/10 text-gray-500 border-gray-500/20" : 
                              isCurrent ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                              "bg-gray-500/10 text-gray-500 border-gray-500/20"
                            }`}
                          >
                            {stop.isWarehouse && isCompleted ? "Despachado" : 
                             isCompleted ? "Completada" : 
                             isCurrent ? "En progreso" : 
                             stop.status === "in_progress" || stop.status === "in_transit" ? "En progreso" : 
                             "Pendiente"}
                          </Badge>
                        </div>
                        
                        {/* Información adicional condensada */}
                        <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-y-1">
                          <span className="flex items-center max-w-full">
                            <MapPin className="h-3 w-3 mr-0.5 flex-shrink-0" />
                            <span className="truncate">{stop.address}</span>
                            
                            {!stop.isWarehouse && onNavigateToLocation && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 px-1.5 ml-1 text-[10px] text-blue-600 hover:text-blue-700"
                                onClick={(e) => {
                                  e.stopPropagation(); // Evitar que se expanda la tarjeta
                                  onNavigateToLocation(stop.latitude, stop.longitude, stop.address);
                                }}
                              >
                                <Navigation className="h-3 w-3 mr-0.5" />
                                Ir
                              </Button>
                            )}
                          </span>
                          
                          {!stop.isWarehouse && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-300 mx-1 hidden sm:inline-block" />
                              <span className="flex items-center sm:inline-block">
                                <span className="w-1 h-1 rounded-full bg-gray-300 mr-1 inline-block sm:hidden" />
                                {countTotalProducts(stop)} productos
                              </span>
                              
                              {typeof stop.totalValue !== 'undefined' && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300 mx-1 hidden sm:inline-block" />
                                  <span className="font-medium flex items-center sm:inline-block">
                                    <span className="w-1 h-1 rounded-full bg-gray-300 mr-1 inline-block sm:hidden" />
                                    {formatCurrency(stop.totalValue)}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Flecha para expandir/contraer */}
                      {!stop.isWarehouse && (
                        <div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Contenido expandido */}
                    {isExpanded && !stop.isWarehouse && (
                      <CardContent className="p-3 pt-1 border-t">
                        {/* Productos */}
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">
                            Productos ({stop.products.length})
                          </h4>
                          <div className="bg-muted/40 rounded-md p-2 text-sm max-h-40 overflow-y-auto">
                            <div className="min-w-full overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="text-muted-foreground">
                                  <tr>
                                    <th className="text-left font-medium py-1 sticky left-0 bg-muted/40">Producto</th>
                                    <th className="text-center font-medium py-1 px-2 whitespace-nowrap">Cant.</th>
                                    <th className="text-right font-medium py-1 whitespace-nowrap">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stop.products.map((product, i) => (
                                    <tr key={i} className="border-b last:border-0 border-border/40">
                                      <td className="py-1.5 sticky left-0 bg-muted/40">
                                        <div className="flex items-center">
                                          {product.isReturnable && (
                                            <Recycle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                                          )}
                                          <span className="truncate max-w-[120px] sm:max-w-none">
                                            {product.name}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-1 text-center px-2 whitespace-nowrap">{product.quantity}</td>
                                      <td className="py-1 text-right whitespace-nowrap">
                                        {formatCurrency(product.price * product.quantity)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="font-medium border-t border-border">
                                    <td colSpan={2} className="pt-2 text-right sticky left-0 bg-muted/40">Total:</td>
                                    <td className="pt-2 text-right whitespace-nowrap">{formatCurrency(stop.totalValue)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                        
                        {/* Acciones */}
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2 justify-end mt-3">
                          {isPending && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-8 w-full xs:w-auto"
                                onClick={() => onEditOrder(stop)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-8 w-full xs:w-auto"
                                onClick={() => onViewOrderDetails(stop)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Detalles
                              </Button>
                              
                              <Button 
                                variant="default" 
                                size="sm"
                                className="text-xs h-8 w-full col-span-1 xs:col-span-2 sm:w-auto"
                                onClick={() => onDeliverOrder(stop)}
                              >
                                <CircleDollarSign className="h-3 w-3 mr-1" />
                                Entregar y cobrar
                              </Button>
                            </>
                          )}
                          
                          {isCompleted && hasReturnableItems(stop) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-8 w-full xs:w-auto text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700"
                              onClick={() => onRegisterBottleReturn(stop.id)}
                            >
                              <Recycle className="h-3 w-3 mr-1" />
                              Registrar devolución
                            </Button>
                          )}
                          
                          {isCompleted && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-8 w-full xs:w-auto"
                              onClick={() => onViewOrderDetails(stop)}
                            >
                              <Receipt className="h-3 w-3 mr-1" />
                              Ver factura
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RouteTimeline;