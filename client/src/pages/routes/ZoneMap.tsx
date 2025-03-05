import { useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from "react-leaflet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Zone, type Customer } from "@shared/schema";
import type { LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DrawingControlProps {
  onPolygonComplete: (coordinates: [number, number][]) => void;
}

function DrawingControl({ onPolygonComplete }: DrawingControlProps) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (!isDrawing) return;

      const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
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
  const [selectedColor, setSelectedColor] = useState("#3B82F6"); // Blue default

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

  const handlePolygonComplete = (coordinates: [number, number][]) => {
    if (!newZoneName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingrese un nombre para la zona",
      });
      return;
    }

    createZoneMutation.mutate({
      name: newZoneName,
      color: selectedColor,
      coordinates: coordinates.map(([lat, lng]) => `${lat},${lng}`),
    });
  };

  return (
    <div className="h-[80vh] relative">
      <div className="absolute top-2 left-2 z-[1000] bg-white p-2 rounded-lg shadow-lg flex gap-2">
        <Input
          placeholder="Nombre de la zona"
          value={newZoneName}
          onChange={(e) => setNewZoneName(e.target.value)}
        />
        <Input
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-16"
        />
      </div>

      <MapContainer
        center={[18.4955, -69.8734]} // Santo Domingo
        zoom={13}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <DrawingControl onPolygonComplete={handlePolygonComplete} />

        {/* Render zonas */}
        {zones.map((zone) => (
          <Polygon
            key={zone.id}
            positions={zone.coordinates.map((coord) => {
              const [lat, lng] = coord.split(",").map(Number);
              return [lat, lng] as [number, number];
            })}
            pathOptions={{ color: zone.color }}
          />
        ))}

        {/* Render clientes */}
        {customers.map((customer) => {
          if (!customer.coordinates) return null;
          const [lat, lng] = customer.coordinates.split(",").map(Number);
          return (
            <Marker
              key={customer.id}
              position={[lat, lng]}
            >
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}