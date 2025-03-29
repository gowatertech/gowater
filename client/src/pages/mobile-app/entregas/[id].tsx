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
  Recycle,
  Edit,
  Save,
  CreditCard,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [routeId, setRouteId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProducts, setEditedProducts] = useState<{id: number; name: string; quantity: number; price: number}[]>([]);
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const [paymentReceived, setPaymentReceived] = useState(0);
  const [updateCustomerBalance, setUpdateCustomerBalance] = useState(true);
  
  const deliveryId = params?.id ? parseInt(params.id) : null;
  
  // Obtener el ID de la ruta desde localStorage
  useEffect(() => {
    const savedRouteId = localStorage.getItem('activeRouteId');
    if (savedRouteId) {
      setRouteId(parseInt(savedRouteId));
    }
  }, []);
  
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

  // Iniciar edición de productos
  const startEditing = () => {
    if (delivery) {
      setEditedProducts([...delivery.products]);
      setIsEditing(true);
    }
  };

  // Actualizar cantidad de un producto
  const updateProductQuantity = (id: number, quantity: number) => {
    setEditedProducts(
      editedProducts.map(product => 
        product.id === id ? { ...product, quantity } : product
      )
    );
  };

  // Calcular el nuevo total después de la edición
  const calculateTotal = (products: {id: number; name: string; quantity: number; price: number}[]) => {
    return products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
  };

  // Guardar cambios de productos
  const saveProductChanges = async () => {
    if (!delivery) return;

    try {
      setIsLoading(true);
      
      // Calcular el nuevo total
      const newTotal = calculateTotal(editedProducts);
      
      // Preparar datos para enviar al servidor
      const productsData = editedProducts.map(product => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        price: product.price.toString()
      }));
      
      // Enviar la actualización al servidor
      const response = await fetch(`/api/orders/${delivery.orderId}/products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ products: productsData })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar los productos');
      }
      
      const result = await response.json();
      
      // Actualizar el estado local con la respuesta del servidor
      setDelivery({
        ...delivery,
        products: editedProducts,
        total: newTotal
      });
      
      setIsEditing(false);
      
      toast({
        title: "Cambios guardados",
        description: "Los productos fueron actualizados correctamente y se generó una nueva factura"
      });
    } catch (error) {
      console.error('Error al guardar cambios de productos:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cancelar edición
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedProducts([]);
  };

  // Abrir diálogo de confirmación de entrega
  const openDeliveryConfirm = () => {
    if (delivery) {
      // Establecer el método de pago en efectivo por defecto
      setPaymentMethod("cash");
      setPaymentReceived(delivery.total);
      setUpdateCustomerBalance(true);
      setShowDeliveryConfirm(true);
      
      // Log para depuración
      console.log("Abriendo diálogo de confirmación, total a cobrar:", delivery.total);
    }
  };

  // Procesar entrega y pago
  const processDelivery = async () => {
    if (!delivery) return;
    
    // Validar que se haya seleccionado un método de pago
    if (!paymentMethod || !["cash", "credit"].includes(paymentMethod)) {
      toast({
        title: "Error",
        description: "Debes seleccionar un método de pago válido (Efectivo o Crédito)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar datos para la actualización
      const updateData = {
        orderId: delivery.orderId,
        status: "delivered",
        paymentMethod: paymentMethod,
        paymentAmount: paymentReceived,
        updateCustomerBalance: updateCustomerBalance
      };

      console.log("Procesando entrega con datos:", JSON.stringify(updateData));
      console.log("Método de pago seleccionado:", paymentMethod);
      
      // Enviar datos al servidor
      const response = await fetch(`/api/orders/${delivery.orderId}/deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error("No se pudo procesar la entrega");
      }

      const responseData = await response.json();
      
      // Actualizar datos locales
      setDelivery({
        ...delivery,
        status: "delivered"
      });
      
      // Mostrar mensaje de éxito
      toast({
        title: "Entrega procesada",
        description: `Entrega marcada como completada. ${responseData.invoiceCreated ? 'Factura generada.' : ''}`
      });
      
      // Cerrar diálogo
      setShowDeliveryConfirm(false);
      
    } catch (error) {
      console.error("Error al procesar la entrega:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la entrega",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
          
          <div className="flex space-x-2 justify-center">
            {routeId ? (
              <Button onClick={() => setLocation(`/mobile-app/ruta?routeId=${routeId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a ruta
              </Button>
            ) : (
              <Button onClick={() => setLocation('/mobile-app/entregas')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a entregas
              </Button>
            )}
          </div>
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
              onClick={() => routeId ? setLocation(`/mobile-app/ruta?routeId=${routeId}`) : setLocation('/mobile-app/entregas')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Detalles de la Entrega</h1>
            {routeId && (
              <Badge variant="outline" className="ml-auto">
                <Truck className="h-3 w-3 mr-1" />
                Ruta activa
              </Badge>
            )}
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
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg">Productos</h3>
            {!isEditing && delivery.status !== "delivered" && delivery.status !== "cancelled" && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2"
                onClick={startEditing}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {isEditing && (
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={saveProductChanges}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
          
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="space-y-3">
                {isEditing ? (
                  // Modo edición
                  editedProducts.map(product => (
                    <div key={product.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Precio unitario: ${product.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0 mr-2"
                          onClick={() => updateProductQuantity(product.id, Math.max(0, product.quantity - 1))}
                        >
                          -
                        </Button>
                        <div className="w-12 text-center font-medium">
                          {product.quantity}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0 ml-2"
                          onClick={() => updateProductQuantity(product.id, product.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  // Modo vista normal
                  delivery.products.map(product => (
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
                  ))
                )}
              </div>
              
              {isEditing && (
                <div className="mt-4 pt-3 border-t flex justify-between">
                  <div className="font-medium">Nuevo total:</div>
                  <div className="font-bold text-lg">
                    ${calculateTotal(editedProducts).toFixed(2)}
                  </div>
                </div>
              )}
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
              disabled={delivery.status === "delivered" || delivery.status === "cancelled" || isEditing}
              onClick={openDeliveryConfirm}
            >
              {delivery.status === "delivered" ? "Entregado" : "Marcar como Entregado"}
            </Button>
            
            {routeId ? (
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => setLocation(`/mobile-app/ruta?routeId=${routeId}`)}
                disabled={isEditing}
              >
                Volver a Ruta
              </Button>
            ) : (
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => setLocation('/mobile-app/entregas')}
                disabled={isEditing}
              >
                Volver a Entregas
              </Button>
            )}
          </div>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
      
      {/* Diálogo de confirmación de entrega */}
      <Dialog open={showDeliveryConfirm} onOpenChange={setShowDeliveryConfirm}>
        <DialogContent className={`sm:max-w-md ${darkMode ? 'dark bg-gray-800 text-white border-gray-700' : ''}`}>
          <DialogHeader>
            <DialogTitle>Confirmar Entrega</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="block mb-2">Método de Pago</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={() => {
                    console.log("Seleccionando método de pago: cash");
                    setPaymentMethod("cash");
                  }}
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className="flex-1 flex items-center justify-center"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Efectivo
                </Button>
                
                <Button
                  type="button"
                  onClick={() => {
                    console.log("Seleccionando método de pago: credit");
                    setPaymentMethod("credit");
                  }}
                  variant={paymentMethod === "credit" ? "default" : "outline"}
                  className="flex-1 flex items-center justify-center"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Crédito
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="payment-amount" className="block mb-2">
                Monto Recibido {paymentMethod === "cash" ? "(Efectivo)" : "(A Crédito)"}
              </Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(parseFloat(e.target.value) || 0)}
                className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
                disabled={paymentMethod === "credit"}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="update-balance" 
                checked={updateCustomerBalance} 
                onCheckedChange={(checked) => setUpdateCustomerBalance(!!checked)}
              />
              <Label htmlFor="update-balance" className="cursor-pointer">
                Actualizar balance del cliente
              </Label>
            </div>
            
            <div className="rounded-md bg-primary/10 p-3 border border-primary/20">
              <div className="flex justify-between mb-2">
                <span>Total del pedido:</span>
                <span className="font-medium">${delivery.total.toFixed(2)}</span>
              </div>
              
              {paymentMethod === "cash" && paymentReceived > delivery.total && (
                <div className="flex justify-between text-sm">
                  <span>Cambio a devolver:</span>
                  <span className="font-medium">${(paymentReceived - delivery.total).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button 
              variant="outline" 
              onClick={() => setShowDeliveryConfirm(false)}
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={processDelivery}
              disabled={
                !paymentMethod || // Deshabilitar si no se ha seleccionado un método de pago
                (paymentMethod === "cash" && paymentReceived < delivery.total)
              }
            >
              Confirmar entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}