import { useEffect, useState } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { useToast } from "@/hooks/use-toast";

interface Zone {
  id: number;
  name: string;
  color: string;
  coordinates: string[];
  createdAt: string;
}

interface ZonePolygonsProps {
  zones: Zone[];
}

export function ZonePolygons({ zones }: ZonePolygonsProps) {
  const { toast } = useToast();
  const [polygons, setPolygons] = useState<{
    id: number;
    name: string;
    color: string;
    positions: LatLngExpression[];
  }[]>([]);

  useEffect(() => {
    if (!zones || zones.length === 0) {
      console.log("No hay zonas para mostrar");
      return;
    }

    try {
      console.log("Procesando zonas:", zones);
      
      const processedZones = zones
        .filter(zone => 
          zone && 
          zone.coordinates && 
          Array.isArray(zone.coordinates) && 
          zone.coordinates.length >= 3
        )
        .map(zone => {
          try {
            const positions = zone.coordinates
              .map(coord => {
                if (typeof coord !== 'string') {
                  console.error(`Formato inválido para coordenada en zona ${zone.id}:`, coord);
                  return null;
                }
                
                const parts = coord.split(',');
                if (parts.length !== 2) {
                  console.error(`Formato inválido para coordenada en zona ${zone.id}: ${coord}`);
                  return null;
                }
                
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                
                if (isNaN(lat) || isNaN(lng)) {
                  console.error(`Valores numéricos inválidos en coordenada de zona ${zone.id}: ${coord}`);
                  return null;
                }
                
                return [lat, lng] as LatLngExpression;
              })
              .filter(coord => coord !== null) as LatLngExpression[];
              
            if (positions.length < 3) {
              console.error(`La zona ${zone.id} no tiene suficientes coordenadas válidas para formar un polígono`);
              return null;
            }
            
            return {
              id: zone.id,
              name: zone.name || `Zona ${zone.id}`,
              color: zone.color || '#3388ff',
              positions,
            };
          } catch (error) {
            console.error(`Error al procesar zona ${zone.id}:`, error);
            return null;
          }
        })
        .filter(zone => zone !== null) as {
          id: number;
          name: string;
          color: string;
          positions: LatLngExpression[];
        }[];
        
      console.log("Zonas procesadas:", processedZones);
      setPolygons(processedZones);
    } catch (error) {
      console.error("Error al procesar zonas:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron procesar las zonas"
      });
    }
  }, [zones, toast]);

  if (!polygons || polygons.length === 0) {
    return null;
  }

  return (
    <>
      {polygons.map(polygon => (
        <Polygon
          key={polygon.id}
          positions={polygon.positions}
          pathOptions={{
            color: polygon.color,
            fillColor: polygon.color,
            fillOpacity: 0.2,
            weight: 2
          }}
        >
          <Tooltip sticky>
            {polygon.name}
          </Tooltip>
        </Polygon>
      ))}
    </>
  );
}