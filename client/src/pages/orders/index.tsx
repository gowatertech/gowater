import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute, Route, Switch } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

// Componentes de páginas
import OrdersList from "./list";
import NewOrder from "./new";
import OrderDetails from "./details";
import OrderStatus from "./status";

// Iconos
import { ClipboardList, Plus, FileText } from "lucide-react";

// Componentes UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Este componente funciona como un enrutador interno para las páginas de pedidos
export default function Orders() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const [matched, params] = useRoute("/orders/details/:id");
  const orderId = params?.id;
  
  // Estado para controlar las pestañas
  const [activeTab, setActiveTab] = useState("list");
  
  useEffect(() => {
    // Al montar, redirigir a la lista por defecto si estamos en /orders exactamente
    if (location === "/orders") {
      console.log("Redirigiendo a lista de pedidos desde raíz");
      // Usar un timeout para evitar problemas de renderizado
      setTimeout(() => {
        window.location.href = "/orders/list";
      }, 100);
    }
  }, [location]);

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
    
    // Usamos directamente la redirección por window.location que es más confiable
    try {
      switch (value) {
        case "list":
          console.log("Navegando a la lista de pedidos");
          window.location.href = "/orders/list";
          break;
        case "new":
          console.log("Navegando a nuevo pedido");
          window.location.href = "/orders/new";
          break;
        case "details":
          // Solo navegar a details si hay un pedido seleccionado
          if (orderId) {
            console.log("Navegando a detalles del pedido:", orderId);
            window.location.href = `/orders/details/${orderId}`;
          } else {
            console.log("No hay pedido seleccionado, redirigiendo a lista");
            window.location.href = "/orders/list";
            // Por seguridad, también actualizamos el estado para reflejar donde estamos realmente
            setActiveTab("list");
          }
          break;
        default:
          console.warn("Valor de pestaña no reconocido:", value);
          window.location.href = "/orders/list";
          break;
      }
    } catch (error) {
      console.error("Error crítico en navegación:", error);
      // Si todo falla, recargar la página
      window.location.reload();
    }
  };

  // Si estamos en una ruta específica de pedidos, cargar el componente directamente
  if (location.startsWith("/orders/details/") || 
      location === "/orders/new" || 
      location === "/orders/list" ||
      location.startsWith("/orders/status/")) {
    
    return (
      <div className="container mx-auto px-2 py-4 max-w-7xl">
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={location === "/orders/list" ? "default" : "outline"}
              onClick={() => window.location.href = "/orders/list"}
              className="flex items-center gap-1"
            >
              <ClipboardList className="h-4 w-4" />
              <span>Pedidos</span>
            </Button>
            <Button
              variant={location === "/orders/new" ? "default" : "outline"}
              onClick={() => window.location.href = "/orders/new"}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo</span>
            </Button>
            {!isMobile && (
              <Button
                variant={location.includes("/orders/details/") ? "default" : "outline"}
                disabled={!location.includes("/orders/details/")}
                className="flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                <span>Detalles</span>
              </Button>
            )}
          </div>
        </div>

        <Switch>
          <Route path="/orders/list">
            <OrdersList />
          </Route>
          <Route path="/orders/new">
            <NewOrder />
          </Route>
          <Route path="/orders/details/:id">
            <OrderDetails />
          </Route>
          <Route path="/orders/status/:id">
            <OrderStatus />
          </Route>
        </Switch>
      </div>
    );
  }

  // Si se llega directo a /orders (sin subruta), mostrar un mensaje y redireccionar
  return (
    <div className="container mx-auto p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Cargando Pedidos...</h2>
      <p className="mb-4">Si no eres redirigido automáticamente, haz clic en el botón.</p>
      <Button 
        onClick={() => window.location.href = "/orders/list"}
        className="mx-auto"
      >
        Ver Lista de Pedidos
      </Button>
    </div>
  );
}