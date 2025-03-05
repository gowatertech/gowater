import { useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from "react-leaflet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Zone, type Customer } from "@shared/schema";
import { LatLngExpression, LatLng, Icon } from 'leaflet';
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

  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      const newPoint: LatLngExpression = [e.latlng.lat, e.latlng.lng];
      setPoints([...points, newPoint]);
    },
  });

  const handleComplete = () => {
    if (points.length >= 3) {
      onPolygonComplete(points);
      setPoints([]);
      setIsDrawing(false);
    }
  };

  return (
    <div className="absolute top-2 right-2 z-[1000] bg-white p-2 rounded-lg shadow-lg">
      <Button
        variant={isDrawing ? "destructive" : "default"}
        onClick={() => {
          if (isDrawing) {
            setPoints([]);
          }
          setIsDrawing(!isDrawing);
        }}
      >
        {isDrawing ? "Cancelar" : "Dibujar Zona"}
      </Button>
      {isDrawing && (
        <Button
          className="ml-2"
          disabled={points.length < 3}
          onClick={handleComplete}
        >
          Completar
        </Button>
      )}
    </div>
  );
}

export default function ZoneMap() {
  const { toast } = useToast();
  const [newZoneName, setNewZoneName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");

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
        title: "Zona creada",
        description: "La zona se ha creado exitosamente",
      });
      setNewZoneName("");
    },
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
      const coordStrings = coordinates.map(coord => {
        if (Array.isArray(coord)) {
          const [lat, lng] = coord;
          if (typeof lat === 'number' && typeof lng === 'number') {
            return `${lat},${lng}`;
          }
        } else if (coord instanceof LatLng) {
          return `${coord.lat},${coord.lng}`;
        }
        throw new Error('Coordenadas inválidas');
      });

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
    <div className="flex flex-col">
      <div className="absolute top-2 left-2 z-[1000] bg-white p-2 rounded-lg shadow-lg flex gap-2">
        <Input
          placeholder="Nombre de la zona"
          value={newZoneName}
          onChange={(e) => setNewZoneName(e.target.value)}
          className="w-48"
        />
        <Input
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-16"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm" style={{ 
        height: "500px",
        width: "650px",
        margin: "0 auto"
      }}>
        <MapContainer
          center={[18.4955, -69.8534]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          className="rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <DrawingControl onPolygonComplete={handlePolygonComplete} />

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
                  pathOptions={{ color: zone.color }}
                />
              );
            } catch (error) {
              console.error(`Error al renderizar zona ${zone.id}:`, error);
              return null;
            }
          })}

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
                  position={[lat, lng] as LatLngExpression}
                />
              );
            } catch (error) {
              console.error(`Error al renderizar cliente ${customer.id}:`, error);
              return null;
            }
          })}
        </MapContainer>
      </div>
    </div>
  );
}