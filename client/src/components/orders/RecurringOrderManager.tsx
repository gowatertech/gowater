import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { type RecurringOrder } from "@shared/schema";
import { formatDateRD } from "@/lib/date-utils";

interface Props {
  orderId: number;
  isRecurring?: boolean;
  currentFrequency?: string;
  nextDelivery?: string;
  onUpdateFrequency?: (frequency: string) => void;
}

export default function RecurringOrderManager({ 
  orderId,
  isRecurring,
  currentFrequency,
  nextDelivery,
  onUpdateFrequency 
}: Props) {
  const { t } = useTranslation();
  const [frequency, setFrequency] = useState(currentFrequency);

  const handleFrequencyChange = (value: string) => {
    setFrequency(value);
    onUpdateFrequency?.(value);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2">
          {isRecurring ? (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="w-3 h-3" />
              {currentFrequency === 'daily' && 'Diario'}
              {currentFrequency === 'weekly' && 'Semanal'}
              {currentFrequency === 'biweekly' && 'Quincenal'}
              {currentFrequency === 'monthly' && 'Mensual'}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              Hacer Recurrente
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración de Entrega Recurrente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Frecuencia</label>
            <Select value={frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quincenal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {nextDelivery && (
            <div>
              <label className="text-sm font-medium">Próxima Entrega</label>
              <p className="text-sm text-muted-foreground">
                {formatDateRD(nextDelivery, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}