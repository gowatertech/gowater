import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { AddressSearchBox } from "./AddressSearchBox";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { useCompanySettings } from "@/hooks/use-company-settings";

interface LocationSelectorProps {
  value?: string;
  onChange: (coordinates: string) => void;
  initialCenter?: [number, number];
}

interface MapControlProps {
  position: LatLngExpression;
  onChange: (lat: number, lng: number) => void;
}

// Componente para manejar el cambio de posición del marcador
function DraggableMarker({ position, onChange }: MapControlProps) {
  const map = useMap();
  
  useEffect(() => {
    // Centrar el mapa en la posición inicial
    map.setView(position as [number, number], map.getZoom());
  }, [position, map]);

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const position = marker.getLatLng();
          onChange(position.lat, position.lng);
        }
      }}
    />
  );
}

export function LocationSelector({ value, onChange, initialCenter }: LocationSelectorProps) {
  // Use useCompanySettings hook to get configured coordinates
  const { settings } = useCompanySettings();
  
  // Default center from company settings or fallback to Dominican Republic
  const defaultCenter: [number, number] = useMemo(() => {
    if (initialCenter) {
      return initialCenter;
    }
    if (settings?.latitude && settings?.longitude) {
      const lat = parseFloat(settings.latitude);
      const lng = parseFloat(settings.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return [19.0, -70.0]; // Default center (Dominican Republic) if no other source
  }, [initialCenter, settings?.latitude, settings?.longitude]);
  // Inicializar con el valor proporcionado o el centro predeterminado
  const [position, setPosition] = useState<LatLngExpression>(() => {
    if (value) {
      const [lat, lng] = value.split(',').map(parseFloat);
      return [lat, lng];
    }
    return defaultCenter;
  });

  // Actualizar cuando cambie el valor externamente
  useEffect(() => {
    if (value) {
      const [lat, lng] = value.split(',').map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('[LocationSelector] Actualizando posición desde value:', { lat, lng });
        setPosition([lat, lng]);
      } else {
        console.warn('[LocationSelector] Coordenadas inválidas en value:', value);
      }
    }
  }, [value]);

  const handlePositionChange = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange(`${lat},${lng}`);
  };

  const handleSearchLocationSelected = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange(`${lat},${lng}`);
  };

  return (
    <div className="space-y-2">
      <AddressSearchBox onLocationSelected={(lat, lng, address) => handleSearchLocationSelected(lat, lng)} />
      
      <ResponsiveMapContainer fixedHeight aspectRatio="square">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <DraggableMarker position={position} onChange={handlePositionChange} />
        </MapContainer>
      </ResponsiveMapContainer>
      
      <div className="text-xs text-muted-foreground">
        Coordenadas: {Array.isArray(position) ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : 'No disponible'}
      </div>
    </div>
  );
}