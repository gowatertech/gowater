import { useEffect, useState } from 'react';
import { Polygon, Tooltip, Marker } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
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
    console.log("ZonePolygons - Zonas recibidas:", zones);
    
    // Verificar si zones es un array
    if (!Array.isArray(zones)) {
      console.error("ZonePolygons - zonas no es un array:", zones);
      return;
    }
    
    // Verificar si hay zonas
    if (zones.length === 0) {
      console.log("ZonePolygons - No hay zonas para mostrar");
      return;
    }

    try {
      console.log("ZonePolygons - Procesando zonas:", JSON.stringify(zones));
      
      // Filtrar zonas válidas
      const validZones = zones.filter(zone => {
        const isValid = zone && 
          zone.coordinates && 
          Array.isArray(zone.coordinates) && 
          zone.coordinates.length >= 3;
          
        if (!isValid) {
          console.error(`ZonePolygons - Zona inválida:`, zone);
        }
        
        return isValid;
      });
      
      console.log("ZonePolygons - Zonas válidas:", validZones.length);
      
      const processedZones = validZones.map(zone => {
        try {
          console.log(`ZonePolygons - Procesando zona ${zone.id} con ${zone.coordinates.length} coordenadas`);
          
          const positions = zone.coordinates
            .map(coord => {
              if (typeof coord !== 'string') {
                console.error(`ZonePolygons - Formato inválido para coordenada en zona ${zone.id}:`, coord);
                return null;
              }
              
              const parts = coord.split(',');
              if (parts.length !== 2) {
                console.error(`ZonePolygons - Formato inválido para coordenada en zona ${zone.id}: ${coord}`);
                return null;
              }
              
              const lat = parseFloat(parts[0]);
              const lng = parseFloat(parts[1]);
              
              if (isNaN(lat) || isNaN(lng)) {
                console.error(`ZonePolygons - Valores numéricos inválidos en coordenada de zona ${zone.id}: ${coord}`);
                return null;
              }
              
              console.log(`ZonePolygons - Coordenada procesada para zona ${zone.id}: [${lat}, ${lng}]`);
              return [lat, lng] as LatLngExpression;
            })
            .filter(coord => coord !== null) as LatLngExpression[];
            
          console.log(`ZonePolygons - Zona ${zone.id} tiene ${positions.length} coordenadas válidas`);
            
          if (positions.length < 3) {
            console.error(`ZonePolygons - La zona ${zone.id} no tiene suficientes coordenadas válidas para formar un polígono`);
            return null;
          }
          
          return {
            id: zone.id,
            name: zone.name || `Zona ${zone.id}`,
            color: zone.color || '#3388ff',
            positions,
          };
        } catch (error) {
          console.error(`ZonePolygons - Error al procesar zona ${zone.id}:`, error);
          return null;
        }
      })
      .filter(zone => zone !== null) as {
        id: number;
        name: string;
        color: string;
        positions: LatLngExpression[];
      }[];
      
      console.log("ZonePolygons - Zonas procesadas:", processedZones);
      setPolygons(processedZones);
    } catch (error) {
      console.error("ZonePolygons - Error al procesar zonas:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron procesar las zonas"
      });
    }
  }, [zones, toast]);

  console.log("ZonePolygons - Renderizando:", polygons);

  if (!polygons || polygons.length === 0) {
    console.log("ZonePolygons - No hay polígonos para renderizar");
    return null;
  }

  return (
    <>
      {/* Renderizar marcadores en los vértices para debug */}
      {polygons.map(polygon => 
        polygon.positions.map((pos, idx) => (
          <Marker
            key={`marker-${polygon.id}-${idx}`}
            position={pos}
          />
        ))
      )}
      
      {/* Renderizar polígonos */}
      {polygons.map(polygon => {
        console.log(`ZonePolygons - Renderizando polígono ${polygon.id} con ${polygon.positions.length} posiciones`);
        return (
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
        );
      })}
    </>
  );
}