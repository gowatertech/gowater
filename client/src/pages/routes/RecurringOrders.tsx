import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";
import RecurringOrderManager from "@/components/orders/RecurringOrderManager";
import type { Route } from "@shared/schema";

export default function RecurringOrders() {
  const { t } = useTranslation();
  
  const { data: recurringOrders = [] } = useQuery<Route[]>({
    queryKey: ['/api/recurring-orders'],
    queryFn: async () => {
      // Temporalmente retornamos datos de ejemplo
      return [
        {
          id: 1,
          customerId: 1,
          frequency: "weekly",
          nextDeliveryDate: "2025-03-16",
          customerName: "Supermercado Nacional",
          order: "5 Botellones",
          isActive: true
        },
        {
          id: 2,
          customerId: 2,
          frequency: "biweekly",
          nextDeliveryDate: "2025-03-23",
          customerName: "Restaurante La Plaza",
          order: "8 Botellones",
          isActive: true
        }
      ];
    }
  });

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t("recurringOrders")}</h1>
      
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
                    {t("nextDelivery")}: {new Date(order.nextDeliveryDate).toLocaleDateString()}
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
