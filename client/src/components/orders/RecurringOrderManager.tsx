import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { type RecurringOrder } from "@shared/schema";

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
              {currentFrequency}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {t("makeRecurring")}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("recurringDeliverySettings")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("frequency")}</label>
            <Select value={frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectFrequency")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("daily")}</SelectItem>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="biweekly">{t("biweekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {nextDelivery && (
            <div>
              <label className="text-sm font-medium">{t("nextDelivery")}</label>
              <p className="text-sm text-muted-foreground">
                {new Date(nextDelivery).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
