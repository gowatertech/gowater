import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { type Zone, type Customer } from "@shared/schema";
import { LatLngExpression, LatLng, Icon } from 'leaflet';
import { Pencil, X, Search } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { AddressSearchBox } from "@/components/map/AddressSearchBox";
import { ZonePolygons } from "@/components/map/ZonePolygons";

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
  const [drawMode, setDrawMode] = useState<'manual' | 'search'>('manual');
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
  
  // Esta función maneja cuando se selecciona una ubicación desde la búsqueda
  const handleLocationSelected = (lat: number, lng: number, address: string) => {
    if (!isDrawing) return;
    
    const newPoint: LatLngExpression = [lat, lng];
    setPoints(prev => [...prev, newPoint]);
    
    // Centrar el mapa en la ubicación seleccionada
    map.setView([lat, lng], map.getZoom());
    
    // Feedback visual
    toast({
      description: `Punto añadido: ${address.split(',')[0]}`,
      duration: 2000,
    });
  };

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
    setDrawMode('manual');
    map.dragging.disable();
    toast({
      description: "Haz clic en el mapa para añadir puntos a la zona",
    });
  };

  const handleStartSearch = () => {
    setIsDrawing(true);
    setPoints([]);
    setDrawMode('search');
    toast({
      description: "Busca ubicaciones para añadir puntos a la zona",
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
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={handleStartDrawing}
              className="flex items-center gap-2"
            >
              <Pencil size={16} />
              Dibujar Manualmente
            </Button>
            <Button
              variant="outline"
              onClick={handleStartSearch}
              className="flex items-center gap-2"
            >
              <Search size={16} />
              Dibujar con Búsqueda
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
            
            {drawMode === 'search' && (
              <div className="w-full mt-2">
                <AddressSearchBox onLocationSelected={handleLocationSelected} />
              </div>
            )}
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

// Componente para centrar el mapa en una ubicación específica
function MapCenterController({ position }: { position: LatLngExpression }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [map, position]);
  
  return null;
}

interface ZoneMapProps {
  newZoneName: string;
  selectedColor: string;
  onZoneCreated: () => void;
}

export default function ZoneMap({ newZoneName, selectedColor, onZoneCreated }: ZoneMapProps) {
  const { toast } = useToast();
  const [initialPosition, setInitialPosition] = useState<LatLngExpression>([18.4955, -69.8534]); // Default Santo Domingo
  const [mapReady, setMapReady] = useState(false);

  // Consultar la configuración del negocio para obtener la ubicación inicial
  const settingsQuery = useQuery({
    queryKey: ["/api/settings"],
    staleTime: Infinity,
  });
  
  // Efecto para manejar los cambios en los datos de configuración
  useEffect(() => {
    if (settingsQuery.data) {
      const data = settingsQuery.data;
      if (data?.latitude && data?.longitude) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setInitialPosition([lat, lng]);
        }
      }
      setMapReady(true);
    } else if (settingsQuery.error || settingsQuery.isError) {
      // Si hay error, seguimos con la posición por defecto
      setMapReady(true);
    }
  }, [settingsQuery.data, settingsQuery.error, settingsQuery.isError]);

  const zonesQuery = useQuery({
    queryKey: ["/api/zones"],
  });
  
  useEffect(() => {
    if (zonesQuery.data) {
      console.log("Zonas cargadas exitosamente:", zonesQuery.data);
    }
    if (zonesQuery.error) {
      console.error("Error al cargar zonas:", zonesQuery.error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las zonas existentes"
      });
    }
  }, [zonesQuery.data, zonesQuery.error, toast]);
  
  const zones = zonesQuery.data || [];

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createZoneMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; coordinates: string[] }) => {
      const response = await apiRequest("POST", "/api/zones", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la zona');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        description: "¡Zona creada exitosamente!",
      });
      onZoneCreated();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
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
      // Asegurar que tenemos suficientes puntos
      if (coordinates.length < 3) {
        throw new Error("Se necesitan al menos 3 puntos para crear una zona");
      }

      // Convertir coordenadas al formato requerido por el schema
      const coordStrings = coordinates.map(coord => {
        let lat: number, lng: number;

        if (Array.isArray(coord)) {
          [lat, lng] = coord;
        } else if (coord instanceof LatLng) {
          lat = coord.lat;
          lng = coord.lng;
        } else {
          throw new Error('Formato de coordenadas inválido');
        }

        // Asegurar formato exacto con 6 decimales
        return `${lat.toFixed(6)},${lng.toFixed(6)}`;
      });

      // Crear la zona
      createZoneMutation.mutate({
        name: newZoneName,
        color: selectedColor,
        coordinates: coordStrings,
      });
    } catch (error) {
      console.error("Error processing coordinates:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar las coordenadas"
      });
    }
  };

  // Si no estamos listos para renderizar el mapa, mostrar un mensaje de carga
  if (!mapReady) {
    return (
      <ResponsiveMapContainer className="flex items-center justify-center bg-white">
        <p className="text-muted-foreground">Cargando mapa...</p>
      </ResponsiveMapContainer>
    );
  }

  return (
    <ResponsiveMapContainer className="bg-white" fixedHeight>
      <MapContainer
        center={initialPosition}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Este componente mantendrá el mapa centrado en la posición deseada */}
        <MapCenterController position={initialPosition} />
        
        {/* Control de dibujo para crear nuevas zonas */}
        <DrawingControl onPolygonComplete={handlePolygonComplete} />

        {/* Renderizar zonas existentes usando el componente dedicado */}
        <ZonePolygons zones={zones} />

        {/* Renderizar marcadores de clientes */}
        {customers.map((customer: any) => {
          // Buscar si el cliente tiene coordenadas en sus datos
          if (customer.coordinates) {
            try {
              const [lat, lng] = customer.coordinates.split(",").map(Number);
              if (isNaN(lat) || isNaN(lng)) {
                return null;
              }
              return (
                <Marker
                  key={customer.id}
                  position={[lat, lng]}
                  title={customer.businessname || customer.name || `Cliente ${customer.id}`}
                />
              );
            } catch (error) {
              console.error(`Error al renderizar cliente ${customer.id}:`, error);
              return null;
            }
          } else if (customer.latitude && customer.longitude) {
            try {
              const lat = parseFloat(customer.latitude);
              const lng = parseFloat(customer.longitude);
              if (isNaN(lat) || isNaN(lng)) {
                return null;
              }
              return (
                <Marker
                  key={customer.id}
                  position={[lat, lng]}
                  title={customer.businessname || customer.name || `Cliente ${customer.id}`}
                />
              );
            } catch (error) {
              console.error(`Error al renderizar cliente ${customer.id}:`, error);
              return null;
            }
          }
          return null;
        })}
      </MapContainer>
    </ResponsiveMapContainer>
  );
}