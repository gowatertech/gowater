import React from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { MapPin, Calendar, Truck, ArrowRight, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface RouteProps {
  id: number;
  name: string;
  date: string | Date;
  stops?: string[] | null;
  totalDistance?: string | number | null;
  isCompleted: boolean;
  driverStartedAt?: string | Date | null;
  driverCompletedAt?: string | Date | null;
}

export function RutaCompletada({ 
  id, 
  name, 
  date, 
  stops, 
  totalDistance,
  isCompleted,
  driverStartedAt,
  driverCompletedAt 
}: RouteProps) {
  const { t } = useTranslation();
  
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center p-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="font-medium text-sm">
              {name || `Ruta #${id}`}
            </span>
            <Badge variant="success" className="ml-auto text-xs py-0 h-5 bg-green-500 hover:bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t("completed")}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 text-muted-foreground mr-1" />
              <span className="text-muted-foreground">
                {format(new Date(date), "dd/MM/yyyy")}
              </span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
              <span className="text-muted-foreground">
                {stops?.length || 0} paradas
              </span>
            </div>
            <div className="flex items-center justify-end">
              {totalDistance
                ? `${Number(totalDistance).toFixed(1)} km`
                : "No disponible"}
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 ml-2"
        >
          <Link href={`/routes/${id}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export default RutaCompletada;