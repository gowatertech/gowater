import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

// Componentes de páginas
import OrdersList from "./list";
import NewOrder from "./new";
import OrderDetails from "./details";

// Iconos
import { ClipboardList, Plus, FileText } from "lucide-react";

// Componentes UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Orders() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/orders/details/:id");
  const orderId = params?.id;
  
  // Estado para controlar las pestañas
  const [activeTab, setActiveTab] = useState("list");

  // Determinar la pestaña activa basado en la URL y actualizarla cuando cambia la ruta
  useEffect(() => {
    const updateActiveTab = () => {
      const pathname = window.location.pathname;
      console.log("URL actual:", pathname);
      if (pathname.includes("/orders/new")) {
        setActiveTab("new");
      } else if (pathname.includes("/orders/details/")) {
        setActiveTab("details");
      } else {
        setActiveTab("list");
      }
    };

    // Actualizar la pestaña al montar el componente
    updateActiveTab();

    // Agregar un listener para cambios en la URL
    window.addEventListener('popstate', updateActiveTab);
    
    // Limpiar el listener al desmontar
    return () => {
      window.removeEventListener('popstate', updateActiveTab);
    };
  }, []);

  // Manejar cambios de pestaña y actualizar la URL
  const handleTabChange = (value: string) => {
    console.log("Cambiando a pestaña:", value);
    
    // Primero actualizamos el estado local
    setActiveTab(value);
    
    try {
      // Luego navegamos a la URL correspondiente
      switch (value) {
        case "list":
          console.log("Navegando a la lista de pedidos");
          setLocation("/orders/list");
          break;
        case "new":
          console.log("Navegando a nuevo pedido");
          setLocation("/orders/new");
          break;
        case "details":
          // Solo navegar a details si hay un pedido seleccionado
          if (orderId) {
            console.log("Navegando a detalles del pedido:", orderId);
            try {
              // Usamos setTimeout para asegurar que la navegación sucede después de la actualización del estado
              setTimeout(() => {
                setLocation(`/orders/details/${orderId}`);
              }, 0);
            } catch (innerError) {
              console.error("Error al navegar a detalles:", innerError);
              // Método alternativo si falla el router wouter
              window.location.href = `/orders/details/${orderId}`;
            }
          } else {
            console.log("No hay pedido seleccionado, redirigiendo a lista");
            setLocation("/orders/list");
            
            // Por seguridad, también actualizamos el estado para reflejar donde estamos realmente
            setActiveTab("list");
          }
          break;
        default:
          console.warn("Valor de pestaña no reconocido:", value);
          setLocation("/orders/list");
          break;
      }
    } catch (error) {
      console.error("Error al cambiar de pestaña:", error);
      
      // Intentar usar un método alternativo si falla el router
      try {
        console.log("Intentando método alternativo de navegación");
        switch (value) {
          case "list":
            window.location.href = "/orders/list";
            break;
          case "new":
            window.location.href = "/orders/new";
            break;
          case "details":
            if (orderId) {
              window.location.href = `/orders/details/${orderId}`;
            } else {
              window.location.href = "/orders/list";
            }
            break;
        }
      } catch (fallbackError) {
        console.error("Error crítico en navegación:", fallbackError);
      }
    }
  };

  return (
    <div className="container mx-auto px-2 py-4 max-w-7xl">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} mb-4 h-10`}>
          <TabsTrigger value="list" className="flex items-center gap-1 text-sm">
            <ClipboardList className="h-4 w-4" />
            <span>Pedidos</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1 text-sm">
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="details" disabled={!orderId} className="flex items-center gap-1 text-sm">
              <FileText className="h-4 w-4" />
              <span>Detalles</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list">
          <OrdersList />
        </TabsContent>

        <TabsContent value="new">
          <NewOrder />
        </TabsContent>

        <TabsContent value="details">
          <OrderDetails />
        </TabsContent>
      </Tabs>
    </div>
  );
}