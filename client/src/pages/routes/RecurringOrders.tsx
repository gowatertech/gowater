import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";
import RecurringOrderManager from "@/components/orders/RecurringOrderManager";

// Define el tipo específico para la respuesta de pedidos recurrentes,
// ya que no coincide exactamente con el tipo Route del schema
type RecurringOrderResponse = {
  id: number;
  customerId: number;
  frequency: string;
  nextDeliveryDate: string;
  customerName: string;
  order: string;
  isActive: boolean;
};

export default function RecurringOrders() {
  const { t } = useTranslation();

  const { data: recurringOrders = [] } = useQuery<RecurringOrderResponse[]>({
    queryKey: ['/api/recurring-orders']
  });

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pedidos Recurrentes</h1>

      <Card className="p-4">
        <ScrollArea className="h-[70vh]">
          <div className="space-y-4">
            {recurringOrders.map((order) => (
              <Card key={order.id} className="p-4 hover:bg-accent/5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{order.customerName}</h3>
                    <p className="text-sm text-muted-foreground">{order.order}</p>
                  </div>
                  <RecurringOrderManager
                    orderId={order.id}
                    isRecurring={true}
                    currentFrequency={order.frequency}
                    nextDelivery={order.nextDeliveryDate}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Próxima entrega: {new Date(order.nextDeliveryDate).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}