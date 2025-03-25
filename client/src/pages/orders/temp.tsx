import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function SimpleOrders() {
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? 'p-1' : 'p-2'} max-w-6xl mx-auto`}>
      <div className="flex justify-between items-center mb-2">
        <h1 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold flex items-center`}>
          <ShoppingCart className="h-4 w-4 mr-1.5 text-blue-600" />
          Gestión de Pedidos
        </h1>
      </div>
      
      <Card className="p-4">
        <p>Componente temporal para probar la página de pedidos.</p>
      </Card>
    </div>
  );
}