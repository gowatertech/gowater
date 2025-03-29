import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  DollarSign,
  Recycle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { Separator } from "@/components/ui/separator";

// Tipo para un retorno de envase
interface BottleReturn {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  expectedQuantity: number;
  returnedQuantity: number;
  pendingQuantity: number;
  returnDate: string;
  status: "pending" | "complete" | "incomplete";
  amountCharged: string;
  depositAmount: string;
  responsibleType: "customer" | "driver" | "both" | null;
  chargeMethod: "commission" | "cash" | null;
}

// Tipo para una entrega
interface Delivery {
  id: number;
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  status: "pending" | "in_progress" | "delivered" | "cancelled";
  scheduledTime: string;
  products: { id: number; name: string; quantity: number; price: number }[];
  total: number;
  bottleReturns: BottleReturn[];
}

export default function DeliveryDetails() {
  const [, params] = useRoute('/mobile-app/entregas/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  
  const deliveryId = params?.id ? parseInt(params.id) : null;
  
  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };
  
  // Cargar datos de la entrega
  const loadDeliveryDetails = async () => {
    if (!deliveryId) {
      toast({
        title: "Error",
        description: "No se encontró un ID de entrega válido",
        variant: "destructive"
      });
      setLocation('/mobile-app/entregas');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Obtener orden específica
      const orderResponse = await fetch(`/api/orders/${deliveryId}`);
      if (!orderResponse.ok) {
        throw new Error('Error al obtener la orden');
      }
      const orderData = await orderResponse.json();
      
      // Obtener retornos de botellas para esta orden
      const bottleReturnsResponse = await fetch(`/api/orders/${deliveryId}/bottle-returns`);
      let bottleReturnsData: BottleReturn[] = [];
      if (bottleReturnsResponse.ok) {
        bottleReturnsData = await bottleReturnsResponse.json();
      }
      
      // Convertir los datos al formato necesario
      const deliveryData: Delivery = {
        id: orderData.id,
        orderId: orderData.id,
        customerId: orderData.customerId,
        customerName: orderData.customerName,
        address: orderData.customerAddress,
        status: orderData.status as "pending" | "in_progress" | "delivered" | "cancelled",
        scheduledTime: new Date(orderData.date).toLocaleTimeString('es-DO', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        products: orderData.products.map((product: any) => ({
          id: product.productId,
          name: product.name,
          quantity: product.quantity,
          price: parseFloat(product.price)
        })),
        total: parseFloat(orderData.total),
        bottleReturns: bottleReturnsData
      };
      
      setDelivery(deliveryData);
    } catch (error) {
      console.error('Error al cargar detalles de la entrega:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la entrega",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Registrar retorno de envases
  const registerBottleReturn = (productId: number, quantity: number) => {
    // Aquí implementarías la lógica para registrar el retorno de envases
    toast({
      title: "Envases retornados",
      description: `Se registraron ${quantity} envases del producto ${productId}`,
    });
  };
  
  // Cargar datos al montar el componente
  useEffect(() => {
    loadDeliveryDetails();
  }, [deliveryId]);
  
  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode}
        />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="font-medium text-primary">Cargando detalles...</h3>
          </div>
        </div>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  // Si no hay entrega encontrada
  if (!delivery) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode}
        />
        <div className="container max-w-md mx-auto px-4 py-8 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Entrega no encontrada</h2>
          <p className="text-muted-foreground mb-6">No se pudo encontrar la información de esta entrega</p>
          <Button onClick={() => setLocation('/mobile-app/entregas')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a entregas
          </Button>
        </div>
        <MobileFooter darkMode={darkMode} />
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
      <MobileHeader 
        user={user} 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode}
      />
      
      <main className="container max-w-md mx-auto px-4 pb-6">
        <div className="py-4">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2 p-1" 
              onClick={() => setLocation('/mobile-app/entregas')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Detalles de la Entrega</h1>
          </div>
          
          {/* Información de la entrega */}
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-medium text-lg">{delivery.customerName}</h2>
                <Badge 
                  variant={
                    delivery.status === "delivered" ? "secondary" :
                    delivery.status === "in_progress" ? "outline" :
                    delivery.status === "cancelled" ? "destructive" :
                    "default"
                  }
                >
                  {delivery.status === "pending" && "Pendiente"}
                  {delivery.status === "in_progress" && "En camino"}
                  {delivery.status === "delivered" && "Entregado"}
                  {delivery.status === "cancelled" && "Cancelado"}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{delivery.address}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Programado para: {delivery.scheduledTime}</span>
                </div>
                <div className="flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Orden #: {delivery.orderId}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Total: ${delivery.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Lista de productos */}
          <h3 className="font-medium text-lg mb-2">Productos</h3>
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="space-y-3">
                {delivery.products.map(product => (
                  <div key={product.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Precio unitario: ${product.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{product.quantity} unidades</div>
                      <div className="font-medium">${(product.quantity * product.price).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Sección de envases retornables */}
          <h3 className="font-medium text-lg mb-2 flex items-center">
            <Recycle className="h-5 w-5 mr-2" />
            Envases Retornables
          </h3>
          
          {delivery.bottleReturns && delivery.bottleReturns.length > 0 ? (
            <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {delivery.bottleReturns.map(bottleReturn => (
                    <div key={bottleReturn.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{bottleReturn.productName}</div>
                        <Badge 
                          variant={
                            bottleReturn.status === "complete" ? "secondary" : 
                            bottleReturn.status === "incomplete" ? "outline" : 
                            "default"
                          }
                        >
                          {bottleReturn.status === "pending" && "Pendiente"}
                          {bottleReturn.status === "complete" && "Completo"}
                          {bottleReturn.status === "incomplete" && "Incompleto"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div>
                          <div className="text-muted-foreground">Esperados</div>
                          <div className="font-medium">{bottleReturn.expectedQuantity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Retornados</div>
                          <div className="font-medium">{bottleReturn.returnedQuantity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Pendientes</div>
                          <div className="font-medium">{bottleReturn.pendingQuantity}</div>
                        </div>
                      </div>
                      
                      {bottleReturn.status !== "complete" && (
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => registerBottleReturn(bottleReturn.productId, bottleReturn.pendingQuantity)}
                          >
                            Registrar Retorno
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
              <CardContent className="p-4 text-center">
                <div className="text-muted-foreground">No hay envases retornables para esta entrega</div>
              </CardContent>
            </Card>
          )}
          
          {/* Botones de acción */}
          <div className="flex space-x-2 mt-6">
            <Button 
              className="flex-1" 
              variant={delivery.status === "delivered" ? "outline" : "default"}
              disabled={delivery.status === "delivered" || delivery.status === "cancelled"}
            >
              {delivery.status === "delivered" ? "Entregado" : "Marcar como Entregado"}
            </Button>
            
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => setLocation('/mobile-app/entregas')}
            >
              Volver
            </Button>
          </div>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}