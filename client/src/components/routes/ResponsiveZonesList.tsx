import React from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Componentes UI
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Iconos
import { Eye, Edit, X } from "lucide-react";

// Tipos
import { Zone } from "@shared/schema";

interface ResponsiveZonesListProps {
  zones: Zone[];
  onViewZone: (zone: Zone) => void;
  onEditZone: (zone: Zone) => void;
  onDeleteZone: (zone: Zone) => void;
}

export function ResponsiveZonesList({ 
  zones, 
  onViewZone, 
  onEditZone, 
  onDeleteZone 
}: ResponsiveZonesListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (zones.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {t("noZones")}
      </div>
    );
  }

  return (
    <>
      {/* Vista para móviles (tarjetas) */}
      <div className="block md:hidden space-y-3">
        {zones.map((zone) => (
          <Card key={zone.id} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="font-medium">{zone.name}</span>
              </div>
              <Badge variant="outline" title="Cada punto representa una coordenada geográfica que forma el perímetro de la zona">
                {zone.coordinates.length} {t("points")}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onViewZone(zone)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" /> Ver
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onEditZone(zone)}
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDeleteZone(zone)}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Vista para desktop */}
      <div className="hidden md:block space-y-3">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: zone.color }}
              />
              <span className="font-medium">{zone.name}</span>
              <Badge variant="outline" title="Cada punto representa una coordenada geográfica que forma el perímetro de la zona">
                {zone.coordinates.length} {t("points")}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() => onViewZone(zone)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-secondary"
                onClick={() => onEditZone(zone)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteZone(zone)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}