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

  // Determinar la pestaña activa basado en la URL
  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.includes("/orders/new")) {
      setActiveTab("new");
    } else if (pathname.includes("/orders/details/")) {
      setActiveTab("details");
    } else {
      setActiveTab("list");
    }
  }, []);

  // Manejar cambios de pestaña y actualizar la URL
  const handleTabChange = (value: string) => {
    console.log("Cambiando a pestaña:", value);
    setActiveTab(value);
    try {
      switch (value) {
        case "list":
          setLocation("/orders/list");
          break;
        case "new":
          setLocation("/orders/new");
          break;
        case "details":
          // Solo navegar a details si hay un pedido seleccionado
          if (orderId) {
            setLocation(`/orders/details/${orderId}`);
          } else {
            // Si no hay pedido seleccionado, volver a la lista
            setLocation("/orders/list");
          }
          break;
      }
    } catch (error) {
      console.error("Error al cambiar de pestaña:", error);
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