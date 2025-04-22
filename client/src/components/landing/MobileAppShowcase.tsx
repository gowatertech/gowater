import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { 
  Smartphone, 
  MapPin, 
  Package, 
  CreditCard, 
  BarChart3, 
  Route,
  Check,
  RefreshCw,
  Droplet,
  Navigation
} from "lucide-react";

export default function MobileAppShowcase() {
  const [activeTab, setActiveTab] = useState("routes");

  // Contenido de las pestañas
  const tabs = [
    {
      id: "routes",
      title: "Rutas",
      icon: <Route className="h-4 w-4 mr-1" />,
      description: "Los conductores pueden ver sus rutas asignadas, direcciones y órdenes a entregar.",
      mockupContent: (
        <div className="p-3 text-xs space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-primary">Mis Rutas</h4>
            <RefreshCw className="h-4 w-4 text-primary" />
          </div>
          
          <Card className="p-2 border-l-4 border-l-primary">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Ruta #243</div>
                <div className="text-muted-foreground text-xs">12 paradas • 3.2 km</div>
              </div>
              <Button size="sm" className="h-8">Iniciar</Button>
            </div>
          </Card>
          
          <Card className="p-2 border-l-4 border-l-muted">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Ruta #244</div>
                <div className="text-muted-foreground text-xs">8 paradas • 2.5 km</div>
              </div>
              <Button size="sm" variant="outline" className="h-8">Iniciar</Button>
            </div>
          </Card>
          
          <Card className="p-2 border-l-4 border-l-muted">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Ruta #245</div>
                <div className="text-muted-foreground text-xs">15 paradas • 4.8 km</div>
              </div>
              <Button size="sm" variant="outline" className="h-8">Iniciar</Button>
            </div>
          </Card>
        </div>
      )
    },
    {
      id: "deliveries",
      title: "Entregas",
      icon: <Package className="h-4 w-4 mr-1" />,
      description: "Registro de entregas con firma del cliente, seguimiento de productos y gestión de envases.",
      mockupContent: (
        <div className="p-3 text-xs space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-primary">Entregas Pendientes</h4>
            <div className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">8 restantes</div>
          </div>
          
          <Card className="p-2 border-l-4 border-l-green-500">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Residencial Las Palmas #42</div>
                <div className="flex items-center text-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  <span>Entregado (10:15 AM)</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div>2 × 5gal</div>
                <div className="text-primary font-medium">$12.50</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-2 border-l-4 border-l-primary">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Cafetería El Grano #12</div>
                <div className="text-muted-foreground">Calle Principal 123</div>
              </div>
              <div className="flex flex-col items-end">
                <div>5 × 5gal</div>
                <div className="text-primary font-medium">$27.50</div>
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <Button size="sm" className="h-7 px-2 text-xs">Completar</Button>
            </div>
          </Card>
          
          <Card className="p-2 border-l-4 border-l-muted">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Oficina Legal Ramírez</div>
                <div className="text-muted-foreground">Av. Central 456</div>
              </div>
              <div className="flex flex-col items-end">
                <div>3 × 5gal</div>
                <div className="text-primary font-medium">$18.75</div>
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs">Completar</Button>
            </div>
          </Card>
        </div>
      )
    },
    {
      id: "navigation",
      title: "Navegación",
      icon: <Navigation className="h-4 w-4 mr-1" />,
      description: "Mapas en tiempo real con optimización de rutas y localización de clientes.",
      mockupContent: (
        <div className="relative h-full">
          <div className="bg-blue-50 h-full flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-3/4 bg-blue-100 rounded-lg flex items-center justify-center relative">
                <div className="absolute top-2 left-2 p-1 bg-white rounded-md shadow-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                
                {/* Representación simple de un mapa */}
                <div className="h-full w-full p-2 relative">
                  {/* Calles */}
                  <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gray-300"></div>
                  <div className="absolute top-2/4 left-0 right-0 h-0.5 bg-gray-300"></div>
                  <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gray-300"></div>
                  <div className="absolute left-1/4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                  <div className="absolute left-2/4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                  <div className="absolute left-3/4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                  
                  {/* Puntos en el mapa */}
                  <div className="absolute top-1/4 left-2/4 h-2 w-2 bg-primary rounded-full"></div>
                  <div className="absolute top-3/5 left-3/4 h-2 w-2 bg-primary rounded-full"></div>
                  <div className="absolute top-2/3 left-1/4 h-2 w-2 bg-primary rounded-full"></div>
                  
                  {/* Ruta trazada */}
                  <div className="absolute top-2/4 left-2/4 h-2 w-2 bg-green-600 rounded-full"></div>
                  <div className="absolute top-2/4 left-2/4 h-6 w-6 bg-green-600/20 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-3 left-3 right-3">
              <Card className="p-2 bg-white shadow-md">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div className="text-xs">
                    <div className="font-medium">Próxima parada: Oficina Legal Ramírez</div>
                    <div className="text-muted-foreground">2.3 km • 8 min</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "payments",
      title: "Pagos",
      icon: <CreditCard className="h-4 w-4 mr-1" />,
      description: "Registro de pagos en efectivo o tarjeta y generación de facturas digitales instantáneas.",
      mockupContent: (
        <div className="p-3 text-xs space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-primary">Registro de Pago</h4>
            <div className="text-muted-foreground">Orden #1254</div>
          </div>
          
          <Card className="p-3 border-l-4 border-l-primary">
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="font-medium">Cafetería El Grano</div>
                <div className="font-medium">$27.50</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>5 × Botellón 5gal</span>
                  <span>$25.00</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Impuesto</span>
                  <span>$2.50</span>
                </div>
              </div>
              
              <div className="flex justify-between pt-2 border-t text-muted-foreground">
                <span>Método de pago</span>
                <div className="flex gap-1">
                  <div className="bg-primary/10 px-2 py-0.5 rounded-full text-primary font-medium">Efectivo</div>
                  <div className="bg-muted px-2 py-0.5 rounded-full">Tarjeta</div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <div>
                  <div className="mb-1">Monto recibido</div>
                  <div className="flex items-center border px-2 py-1 rounded-md">
                    <div className="font-medium mr-1">$</div>
                    <div className="font-medium">30.00</div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Cambio a devolver:</span>
                  <span className="font-medium">$2.50</span>
                </div>
              </div>
              
              <Button className="w-full">Confirmar Pago</Button>
            </div>
          </Card>
        </div>
      )
    },
    {
      id: "containers",
      title: "Envases",
      icon: <Droplet className="h-4 w-4 mr-1" />,
      description: "Control de entrega y recogida de envases con balance actualizado para cada cliente.",
      mockupContent: (
        <div className="p-3 text-xs space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-primary">Balance de Envases</h4>
            <div className="text-muted-foreground">Cafetería El Grano</div>
          </div>
          
          <Card className="p-3 border">
            <div className="flex justify-between mb-2">
              <div className="font-medium">Resumen</div>
              <div className="text-muted-foreground">Actualizado: Hoy 11:30 AM</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-1 border-b">
                <div className="flex items-center">
                  <Droplet className="h-3 w-3 mr-1 text-blue-500" />
                  <span>Botellón 5gal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-center w-10">
                    +5
                  </div>
                  <div className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-center w-10">
                    -3
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-center w-10 font-medium">
                    2
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-1 border-b">
                <div className="flex items-center">
                  <Droplet className="h-3 w-3 mr-1 text-blue-300" />
                  <span>Botellón 3gal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-center w-10">
                    +2
                  </div>
                  <div className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-center w-10">
                    -2
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-center w-10 font-medium">
                    0
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Balance Total</span>
                <span className="font-medium text-primary">2 envases</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="flex-1">Entregar</Button>
              <Button size="sm" variant="outline" className="flex-1">Recoger</Button>
            </div>
          </Card>
        </div>
      )
    },
    {
      id: "reports",
      title: "Informes",
      icon: <BarChart3 className="h-4 w-4 mr-1" />,
      description: "Estadísticas y reportes de entregas, pagos y rendimiento para conductores y supervisores.",
      mockupContent: (
        <div className="p-3 text-xs space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-primary">Resumen del Día</h4>
            <div className="text-muted-foreground">22/04/2025</div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Card className="p-2 border">
              <div className="text-primary font-medium">Entregas</div>
              <div className="text-2xl font-bold">14/20</div>
              <div className="text-xs text-muted-foreground">70% completado</div>
            </Card>
            
            <Card className="p-2 border">
              <div className="text-primary font-medium">Cobrado</div>
              <div className="text-2xl font-bold">$175</div>
              <div className="text-xs text-muted-foreground">+$25 vs ayer</div>
            </Card>
            
            <Card className="p-2 border">
              <div className="text-primary font-medium">Tiempo</div>
              <div className="text-2xl font-bold">3:45h</div>
              <div className="text-xs text-muted-foreground">Tiempo en ruta</div>
            </Card>
            
            <Card className="p-2 border">
              <div className="text-primary font-medium">Distancia</div>
              <div className="text-2xl font-bold">12km</div>
              <div className="text-xs text-muted-foreground">Recorrida hoy</div>
            </Card>
          </div>
          
          <Card className="p-2 border relative pt-5">
            <div className="absolute top-2 left-2 text-xs font-medium">Progreso por Hora</div>
            <div className="h-12 flex items-end justify-between gap-1 pt-3">
              <div className="w-1/12 bg-primary/20 h-3 rounded-t"></div>
              <div className="w-1/12 bg-primary/30 h-4 rounded-t"></div>
              <div className="w-1/12 bg-primary/40 h-6 rounded-t"></div>
              <div className="w-1/12 bg-primary/50 h-8 rounded-t"></div>
              <div className="w-1/12 bg-primary/60 h-10 rounded-t"></div>
              <div className="w-1/12 bg-primary/70 h-12 rounded-t"></div>
              <div className="w-1/12 bg-primary/80 h-10 rounded-t"></div>
              <div className="w-1/12 bg-primary/70 h-9 rounded-t"></div>
              <div className="w-1/12 bg-primary/60 h-7 rounded-t"></div>
              <div className="w-1/12 bg-primary/50 h-5 rounded-t"></div>
              <div className="w-1/12 bg-muted h-2 rounded-t"></div>
              <div className="w-1/12 bg-muted h-1 rounded-t"></div>
            </div>
            <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
              <span>8am</span>
              <span>10am</span>
              <span>12pm</span>
              <span>2pm</span>
              <span>4pm</span>
              <span>6pm</span>
            </div>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="py-16 md:py-24 bg-gradient-to-b from-muted/50 to-background">
      <div className="container px-4 md:px-6">
        <div className="text-center max-w-[800px] mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Descubre la <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-primary">experiencia móvil</span>
          </h2>
          <p className="mt-4 text-muted-foreground md:text-xl">
            Nuestra aplicación móvil permite a tus conductores gestionar rutas, entregas y pagos de forma eficiente desde cualquier lugar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <Tabs defaultValue="routes" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-6">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center text-xs md:text-sm">
                    {tab.icon}
                    <span className="hidden md:inline">{tab.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="mt-6">
                {tabs.map(tab => (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0">
                    <h3 className="text-xl font-bold mb-2 text-primary">{tab.title}</h3>
                    <p className="mb-4 text-muted-foreground">{tab.description}</p>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
            
            <div className="mt-8 space-y-4">
              <h4 className="font-medium text-lg">Beneficios clave:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <span>Funciona sin conexión, sincronizando datos cuando hay conexión disponible</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <span>Reduce errores en la entrega y mejora la satisfacción del cliente</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <span>Ahorra tiempo con navegación optimizada y reducción de papeleo</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <span>Mejora el control de inventario y reduce pérdidas de envases</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative w-[280px] h-[580px] bg-gray-900 rounded-[3rem] shadow-xl overflow-hidden border-[8px] border-gray-900">
              {/* Notch del teléfono */}
              <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-xl z-10"></div>
              
              {/* Pantalla */}
              <div className="absolute inset-x-0 top-0 h-full z-0 bg-background overflow-hidden">
                {/* Header de la app */}
                <div className="bg-primary text-white p-4 pt-7">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Droplet className="h-5 w-5 mr-2" />
                      <span className="font-medium">GoWater Móvil</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400"></div>
                      <span className="text-xs">Online</span>
                    </div>
                  </div>
                </div>
                
                {/* Contenido de la pestaña activa */}
                <div className="h-[calc(100%-56px)]">
                  {tabs.find(tab => tab.id === activeTab)?.mockupContent}
                </div>
              </div>
              
              {/* Botón home */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-gray-700 rounded-full"></div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <Link href="/contact">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <Smartphone className="mr-2 h-5 w-5" />
              Solicitar Demo de la App
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}