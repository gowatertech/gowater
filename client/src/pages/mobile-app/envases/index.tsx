import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Package, 
  Recycle, 
  Search, 
  Filter, 
  XCircle,
  ArrowLeft,
  CheckCircle, 
  AlertCircle,
  PillBottle,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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

// Tipo para cliente con envases
interface CustomerWithBottles {
  id: number;
  name: string;
  totalPending: number;
  totalReturned: number;
  bottleReturns: BottleReturn[];
}

export default function MobileBottleReturns() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithBottles[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pendientes");
  
  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkMode ? 'light' : 'dark');
  };

  // Sincronizar datos
  const syncData = () => {
    toast({
      title: "Sincronizando datos",
      description: "Actualizando información de envases..."
    });
    
    loadData();
  };

  // Cargar datos de retornos de envases
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Obtener órdenes
      const ordersResponse = await fetch('/api/orders');
      if (!ordersResponse.ok) {
        throw new Error('Error al obtener órdenes');
      }
      const ordersData = await ordersResponse.json();
      
      // Obtener bottle returns para cada orden
      const allBottleReturns: BottleReturn[] = [];
      
      await Promise.all(
        ordersData.map(async (order: any) => {
          try {
            const bottleReturnsResponse = await fetch(`/api/orders/${order.id}/bottle-returns`);
            if (bottleReturnsResponse.ok) {
              const returns = await bottleReturnsResponse.json();
              allBottleReturns.push(...returns);
            }
          } catch (error) {
            console.error(`Error al obtener retornos para orden ${order.id}:`, error);
          }
        })
      );
      
      // Agrupar por cliente
      const customerMap = new Map<number, CustomerWithBottles>();
      
      ordersData.forEach((order: any) => {
        if (!customerMap.has(order.customerId)) {
          customerMap.set(order.customerId, {
            id: order.customerId,
            name: order.customerName,
            totalPending: 0,
            totalReturned: 0,
            bottleReturns: []
          });
        }
      });
      
      // Agregar bottle returns a cada cliente
      allBottleReturns.forEach(bottleReturn => {
        const order = ordersData.find((o: any) => o.id === bottleReturn.orderId);
        if (order) {
          const customer = customerMap.get(order.customerId);
          if (customer) {
            customer.bottleReturns.push(bottleReturn);
            customer.totalPending += bottleReturn.pendingQuantity;
            customer.totalReturned += bottleReturn.returnedQuantity;
          }
        }
      });
      
      // Convertir el mapa a un array
      const customersArray = Array.from(customerMap.values());
      
      // Ordenar clientes por cantidad pendiente (de mayor a menor)
      customersArray.sort((a, b) => b.totalPending - a.totalPending);
      
      setCustomers(customersArray);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron obtener los datos de envases",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar clientes por pestaña y término de búsqueda
  const filteredCustomers = customers.filter(customer => {
    // Filtrar por pestaña
    const tabFilter = 
      activeTab === "pendientes" ? 
        customer.totalPending > 0 :
      activeTab === "completados" ?
        customer.totalPending === 0 && customer.totalReturned > 0 :
        true; // "todos"
    
    // Filtrar por término de búsqueda
    const searchFilter = 
      searchTerm === "" ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return tabFilter && searchFilter;
  });

  // Volver a la página principal
  const goBack = () => {
    setLocation('/mobile-app');
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
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
            <h3 className="font-medium text-primary">Cargando envases...</h3>
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
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2 p-1" 
              onClick={goBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Control de Envases</h1>
          </div>
          
          {/* Resumen */}
          <Card className={`mb-4 ${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Recycle className="h-5 w-5 text-primary mr-2" />
                  <h2 className="font-medium">Resumen de Envases</h2>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Pendientes</div>
                  <div className="text-xl font-bold">
                    {customers.reduce((sum, c) => sum + c.totalPending, 0)}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Devueltos</div>
                  <div className="text-xl font-bold">
                    {customers.reduce((sum, c) => sum + c.totalReturned, 0)}
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Tasa de recuperación: 
                <span className="font-medium ml-1">
                  {(() => {
                    const returned = customers.reduce((sum, c) => sum + c.totalReturned, 0);
                    const total = returned + customers.reduce((sum, c) => sum + c.totalPending, 0);
                    return total > 0 ? `${Math.round((returned / total) * 100)}%` : '0%';
                  })()}
                </span>
              </div>
              
              <Progress 
                value={(() => {
                  const returned = customers.reduce((sum, c) => sum + c.totalReturned, 0);
                  const total = returned + customers.reduce((sum, c) => sum + c.totalPending, 0);
                  return total > 0 ? (returned / total) * 100 : 0;
                })()} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>
          
          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              className={`pl-9 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
              placeholder="Buscar por cliente"
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
          
          {/* Pestañas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className={`grid w-full grid-cols-3 ${darkMode ? 'bg-gray-800' : ''}`}>
              <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
              <TabsTrigger value="completados">Completados</TabsTrigger>
              <TabsTrigger value="todos">Todos</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Lista de clientes con envases */}
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-6">
                <PillBottle className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-muted-foreground">No hay resultados para mostrar</p>
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
              filteredCustomers.map((customer) => (
                <Card 
                  key={customer.id}
                  className={`${darkMode ? 'bg-gray-800 text-white border-gray-700' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{customer.name}</h3>
                      </div>
                      
                      <Badge 
                        variant={customer.totalPending > 0 ? "default" : "secondary"}
                        className="ml-2"
                      >
                        {customer.totalPending > 0 ? `${customer.totalPending} pendientes` : "Completado"}
                      </Badge>
                    </div>
                    
                    {/* Detalles de envases */}
                    <div className="mt-2 space-y-2">
                      {customer.bottleReturns.map((bottleReturn) => (
                        <div 
                          key={bottleReturn.id}
                          className={`p-2 rounded-md text-sm ${
                            bottleReturn.status === "complete" 
                              ? 'bg-green-100 dark:bg-green-900/20' 
                              : 'bg-amber-100 dark:bg-amber-900/20'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <PillBottle className={`h-4 w-4 mr-1 ${
                                bottleReturn.status === "complete" 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-amber-600 dark:text-amber-400'
                              }`} />
                              <span className="font-medium">{bottleReturn.productName}</span>
                            </div>
                            
                            <div className="flex items-center">
                              {bottleReturn.status === "complete" ? (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-1" />
                              )}
                              <span>
                                {bottleReturn.returnedQuantity}/{bottleReturn.expectedQuantity}
                              </span>
                            </div>
                          </div>
                          
                          {bottleReturn.pendingQuantity > 0 && (
                            <div className="mt-1 text-xs">
                              <span className={
                                bottleReturn.status === "complete" 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-amber-600 dark:text-amber-400'
                              }>
                                {bottleReturn.pendingQuantity} pendientes (RD$ {
                                  (parseFloat(bottleReturn.depositAmount) * bottleReturn.pendingQuantity).toFixed(2)
                                })
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Total */}
                    <div className="mt-3 pt-2 border-t flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Total:
                      </div>
                      <div className="font-medium">
                        {customer.totalReturned} devueltos / {customer.totalPending} pendientes
                      </div>
                    </div>
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