import { useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Polyline, useMapEvents } from "react-leaflet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { type Zone, type Customer } from "@shared/schema";
import { LatLngExpression, LatLng, Icon } from 'leaflet';
import { Pencil, X } from "lucide-react";
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DrawingControlProps {
  onPolygonComplete: (coordinates: LatLngExpression[]) => void;
}

function DrawingControl({ onPolygonComplete }: DrawingControlProps) {
  const [points, setPoints] = useState<LatLngExpression[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  const map = useMapEvents({
    click(e) {
      if (!isDrawing) return;
      const newPoint: LatLngExpression = [e.latlng.lat, e.latlng.lng];
      setPoints(prev => [...prev, newPoint]);

      // Feedback visual
      toast({
        description: `Punto añadido (${points.length + 1})`,
        duration: 1000,
      });
    },
  });

  const handleComplete = () => {
    if (points.length >= 3) {
      onPolygonComplete([...points]); // Send a copy of points
      setPoints([]);
      setIsDrawing(false);
      map.dragging.enable();
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Se necesitan al menos 3 puntos para crear una zona",
      });
    }
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
    map.dragging.disable();
    toast({
      description: "Haz clic en el mapa para añadir puntos a la zona",
    });
  };

  const handleCancel = () => {
    setIsDrawing(false);
    setPoints([]);
    map.dragging.enable();
  };

  return (
    <>
      <div className="absolute top-2 right-2 z-[1000] bg-white p-2 rounded-lg shadow-lg">
        {!isDrawing ? (
          <Button
            variant="default"
            onClick={handleStartDrawing}
            className="flex items-center gap-2"
          >
            <Pencil size={16} />
            Dibujar Zona
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X size={16} />
              Cancelar
            </Button>
            <Button
              variant="default"
              disabled={points.length < 3}
              onClick={handleComplete}
            >
              Completar ({points.length} puntos)
            </Button>
          </div>
        )}
      </div>

      {/* Visualizar los puntos mientras se dibuja */}
      {isDrawing && points.length > 0 && (
        <>
          <Polyline 
            positions={points} 
            color="blue" 
            weight={2} 
            dashArray="5,10"
          />
          {points.map((point, index) => (
            <Marker 
              key={index} 
              position={point}
            />
          ))}
        </>
      )}
    </>
  );
}

interface ZoneMapProps {
  newZoneName: string;
  selectedColor: string;
  onZoneCreated: () => void;
}

export default function ZoneMap({ newZoneName, selectedColor, onZoneCreated }: ZoneMapProps) {
  const { toast } = useToast();

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createZoneMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; coordinates: string[] }) => {
      const response = await apiRequest("POST", "/api/zones", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        description: "¡Zona creada exitosamente!",
      });
      onZoneCreated();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al crear la zona: " + error.message,
      });
    }
  });

  const handlePolygonComplete = (coordinates: LatLngExpression[]) => {
    if (!newZoneName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingrese un nombre para la zona",
      });
      return;
    }

    try {
      // Convert coordinates to strings
      const coordStrings = coordinates.map(coord => {
        if (Array.isArray(coord)) {
          return `${coord[0]},${coord[1]}`;
        } else if (coord instanceof LatLng) {
          return `${coord.lat},${coord.lng}`;
        }
        throw new Error('Formato de coordenadas inválido');
      });

      // Create the zone
      createZoneMutation.mutate({
        name: newZoneName,
        color: selectedColor,
        coordinates: coordStrings,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al procesar las coordenadas",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm" style={{ 
      height: "500px",
      width: "100%",
      position: "relative"
    }}>
      <MapContainer
        center={[18.4955, -69.8534]} // Santo Domingo coordinates
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <DrawingControl onPolygonComplete={handlePolygonComplete} />

        {/* Render existing zones */}
        {zones.map((zone) => {
          try {
            const positions = zone.coordinates.map((coord): LatLngExpression => {
              const [lat, lng] = coord.split(",").map(Number);
              if (isNaN(lat) || isNaN(lng)) {
                throw new Error(`Coordenadas inválidas en zona ${zone.id}: ${coord}`);
              }
              return [lat, lng];
            });

            return (
              <Polygon
                key={zone.id}
                positions={positions}
                pathOptions={{ 
                  color: zone.color,
                  fillColor: zone.color,
                  fillOpacity: 0.2,
                  weight: 2
                }}
              />
            );
          } catch (error) {
            console.error(`Error al renderizar zona ${zone.id}:`, error);
            return null;
          }
        })}

        {/* Render customer markers */}
        {customers.map((customer) => {
          if (!customer.coordinates) return null;
          try {
            const [lat, lng] = customer.coordinates.split(",").map(Number);
            if (isNaN(lat) || isNaN(lng)) {
              throw new Error(`Coordenadas inválidas para cliente ${customer.id}`);
            }
            return (
              <Marker
                key={customer.id}
                position={[lat, lng]}
                title={customer.name}
              />
            );
          } catch (error) {
            console.error(`Error al renderizar cliente ${customer.id}:`, error);
            return null;
          }
        })}
      </MapContainer>
    </div>
  );
}