import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";
import { 
  Package, 
  Search, 
  Filter, 
  XCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Printer,
  FileDown,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";

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
  products: { id: number; name: string; quantity: number; price: number; isReturnable?: boolean }[];
  total: number;
  bottleReturns: BottleReturn[];
}

export default function DriverDeliveries() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pendientes");
  
  // Guard para evitar llamadas concurrentes a loadDeliveries
  const isFetchingRef = useRef(false);
  
  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };

  // Sincronizar datos
  const syncData = async () => {
    console.log('[Entregas] syncData llamado desde MobileHeader');
    
    toast({
      title: "Sincronizando entregas",
      description: "Actualizando información..."
    });
    
    try {
      // Llamar directamente a loadDeliveries (sin setTimeout para evitar bucles)
      await loadDeliveries();
      
      toast({
        title: "Entregas actualizadas",
        description: "Los datos han sido actualizados",
        variant: "default"
      });
    } catch (error) {
      // El error ya se maneja en loadDeliveries, no mostrar toast de éxito
      console.error('[Entregas] Error en syncData:', error);
    }
  };

  // Cargar datos de entregas usando el endpoint optimizado
  const loadDeliveries = async () => {
    // Guard: evitar llamadas concurrentes
    if (isFetchingRef.current) {
      console.log('[Entregas] Ya hay una carga en progreso, ignorando llamada duplicada');
      return;
    }
    
    isFetchingRef.current = true;
    console.log('[Entregas] Iniciando carga de entregas...');
    setIsLoading(true);
    
    try {
      // Usar el nuevo endpoint optimizado que trae todo en una sola llamada
      console.log('[Entregas] Llamando a /api/mobile/deliveries');
      const response = await fetch('/api/mobile/deliveries', {
        credentials: 'include'
      });
      
      console.log('[Entregas] Respuesta recibida:', response.status);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const deliveriesData = await response.json();
      console.log('[Entregas] Datos recibidos:', deliveriesData.length, 'entregas');
      
      // Mapear los datos al formato esperado por la interfaz
      const mappedDeliveries = deliveriesData.map((delivery: any) => ({
        id: delivery.id,
        orderId: delivery.id,
        customerId: delivery.customerId,
        customerName: delivery.customerName,
        address: delivery.address || '',
        status: delivery.status as "pending" | "in_progress" | "delivered" | "cancelled",
        scheduledTime: new Date(delivery.date).toLocaleTimeString('es-DO', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        products: delivery.products || [],
        total: parseFloat(delivery.total),
        bottleReturns: delivery.bottleReturns || []
      }));
      
      setDeliveries(mappedDeliveries);
      console.log('[Entregas] Entregas cargadas exitosamente');
    } catch (error) {
      console.error('[Entregas] ERROR al cargar entregas:', error);
      toast({
        title: "Error al cargar datos",
        description: error instanceof Error ? error.message : "No se pudieron obtener las entregas",
        variant: "destructive"
      });
      // Establecer array vacío para evitar errores en el render
      setDeliveries([]);
    } finally {
      console.log('[Entregas] Finalizando carga, setIsLoading(false)');
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Filtrar entregas por estado y término de búsqueda
  const filteredDeliveries = deliveries.filter(delivery => {
    // Filtrar por estado según la pestaña activa
    const statusFilter = 
      activeTab === "pendientes" ? 
        (delivery.status === "pending" || delivery.status === "in_progress") :
      activeTab === "completadas" ?
        delivery.status === "delivered" :
      activeTab === "canceladas" ?
        delivery.status === "cancelled" :
        true; // "todas"
    
    // Filtrar por término de búsqueda (nombre de cliente, dirección)
    const searchFilter = 
      searchTerm === "" ||
      delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusFilter && searchFilter;
  });

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDeliveries();
  }, []);

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-slate-50'} pb-20`}>
        <MobileHeader 
          user={user} 
          darkMode={darkMode} 
          onToggleDarkMode={toggleDarkMode} 
          onSyncData={syncData}
        />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="font-medium text-primary">Cargando entregas...</h3>
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
        onSyncData={syncData}
      />
      
      <main className="container max-w-md mx-auto px-4 pb-6">
        <div className="py-4">
          <h1 className="text-2xl font-bold mb-1">Mis Entregas</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {new Date().toLocaleDateString('es-DO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
          
          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              className={`pl-9 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
              placeholder="Buscar por cliente o dirección"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-7 w-7 p-0"
                onClick={() => setSearchTerm("")}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Pestañas de estado */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className={`grid w-full grid-cols-4 ${darkMode ? 'bg-gray-800' : ''}`}>
              <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
              <TabsTrigger value="completadas">Completadas</TabsTrigger>
              <TabsTrigger value="canceladas">Canceladas</TabsTrigger>
              <TabsTrigger value="todas">Todas</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Lista de entregas */}
          <div className="space-y-3">
            {filteredDeliveries.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-muted-foreground">No hay entregas para mostrar</p>
                {searchTerm && (
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setSearchTerm("")}
                  >
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            ) : (
              filteredDeliveries.map((delivery) => (
                <Card 
                  key={delivery.id}
                  className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}
                  onClick={() => setLocation(`/mobile-app/entregas/${delivery.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{delivery.customerName}</h3>
                        <p className="text-xs text-muted-foreground">{delivery.address}</p>
                      </div>
                      
                      <Badge 
                        variant={
                          delivery.status === "delivered" ? "secondary" :
                          delivery.status === "in_progress" ? "outline" :
                          delivery.status === "cancelled" ? "destructive" :
                          "default"
                        }
                        className="ml-2"
                      >
                        {delivery.status === "pending" && "Pendiente"}
                        {delivery.status === "in_progress" && "En camino"}
                        {delivery.status === "delivered" && "Entregado"}
                        {delivery.status === "cancelled" && "Cancelado"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm mt-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="text-muted-foreground">{delivery.scheduledTime}</span>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground">Total:</span>
                        <span className="font-medium">${delivery.total.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-1">
                      {delivery.products.map(product => (
                        <span 
                          key={`${delivery.id}-${product.id}`}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            darkMode 
                              ? 'bg-gray-700' 
                              : 'bg-gray-100'
                          }`}
                        >
                          {product.quantity} × {product.name}
                        </span>
                      ))}
                    </div>
                    
                    {/* Información de retornos de envases */}
                    {(() => {
                      // Verificar si hay productos retornables
                      const returnableProducts = delivery.products.filter(p => p.isReturnable);
                      
                      if (returnableProducts.length > 0) {
                        // Calcular envases pendientes de retornar
                        const pendingBottles = delivery.bottleReturns && delivery.bottleReturns.length > 0
                          ? delivery.bottleReturns.reduce((total, br) => total + br.pendingQuantity, 0)
                          : returnableProducts.reduce((total, p) => total + p.quantity, 0);
                        
                        return (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center text-xs text-muted-foreground mb-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span>Envases por retornar: {pendingBottles}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      
      <MobileFooter darkMode={darkMode} />
    </div>
  );
}