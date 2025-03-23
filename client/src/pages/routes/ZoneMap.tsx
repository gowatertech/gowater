import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { type Zone, type Customer } from "@shared/schema";
import { Pencil, X, Search, MapPin } from "lucide-react";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { AddressSearchBox } from "@/components/map/AddressSearchBox";
import { GoogleMap, useJsApiLoader, Polygon as GooglePolygon, Marker as GoogleMarker, Polyline as GooglePolyline, InfoWindow } from '@react-google-maps/api';

// Definición de tipos
type LatLng = google.maps.LatLng | google.maps.LatLngLiteral;
type PolygonCoordinates = LatLng[];
type MapClickHandler = (event: google.maps.MapMouseEvent) => void;

// Configuraciones del mapa
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const defaultOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: true,
  fullscreenControl: true,
};

// Cargador de la API de Google Maps
function MapApiLoader({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'drawing', 'geometry'],
  });

  if (!isLoaded) {
    return (
      <ResponsiveMapContainer className="flex items-center justify-center bg-white">
        <p className="text-muted-foreground">Cargando mapa de Google...</p>
      </ResponsiveMapContainer>
    );
  }

  return <>{children}</>;
}

// Componente para dibujar zonas
interface DrawingControlProps {
  map: google.maps.Map | null;
  onPolygonComplete: (coordinates: LatLng[]) => void;
}

function DrawingControl({ map, onPolygonComplete }: DrawingControlProps) {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const { toast } = useToast();
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  // Registrar el manejador de clics cuando se activa el modo dibujo
  useEffect(() => {
    if (!map) return;

    // Si estamos en modo dibujo, activamos el listener de clics
    if (isDrawing) {
      // Desactivar el paneo del mapa para facilitar el dibujo
      map.setOptions({ draggable: false });
      
      // Registrar manejador de clics
      clickListenerRef.current = google.maps.event.addListener(map, 'click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        
        // Verificar si el clic es en un elemento del DOM de la UI
        if (e.domEvent && e.domEvent.target) {
          const target = e.domEvent.target as HTMLElement;
          if (
            target.closest('button') || 
            target.closest('input') || 
            target.closest('.absolute') ||
            target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'LABEL' || 
            target.tagName === 'A'
          ) {
            return;
          }
        }
        
        const newPoint = e.latLng.toJSON();
        setPoints(prev => [...prev, newPoint]);
        
        // Feedback visual
        toast({
          description: `Punto añadido (${points.length + 1})`,
          duration: 1000,
        });
      });
    } else {
      // Si no estamos en modo dibujo, eliminamos el listener y permitimos el paneo
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
      map.setOptions({ draggable: true });
    }
    
    return () => {
      // Limpiar al desmontar
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [isDrawing, map, points.length, toast]);
  
  // Función para manejar la selección de ubicación desde el cuadro de búsqueda
  const handleLocationSelected = (lat: number, lng: number, address: string) => {
    if (!isDrawing || !map) return;
    
    const newPoint = { lat, lng };
    setPoints(prev => [...prev, newPoint]);
    
    // Centrar el mapa en la ubicación seleccionada
    map.panTo(newPoint);
    
    // Feedback visual
    toast({
      description: `Punto añadido: ${address.split(',')[0]}`,
      duration: 2000,
    });
  };

  // Completar el dibujo del polígono
  const handleComplete = () => {
    if (points.length >= 3) {
      onPolygonComplete([...points]); // Enviar una copia de los puntos
      setPoints([]);
      setIsDrawing(false);
      if (map) map.setOptions({ draggable: true });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Se necesitan al menos 3 puntos para crear una zona",
      });
    }
  };

  // Iniciar el dibujo
  const handleStartDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
    toast({
      description: "Haz clic en el mapa para añadir puntos a la zona",
    });
  };

  // Cancelar el dibujo
  const handleCancel = () => {
    setIsDrawing(false);
    setPoints([]);
    if (map) map.setOptions({ draggable: true });
  };

  return (
    <>
      {/* Panel de controles principal */}
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
          </div>
        )}
      </div>
      
      {/* Panel de búsqueda */}
      {isDrawing && (
        <div className="absolute top-2 left-2 z-[1000] bg-white p-2 rounded-lg shadow-lg max-w-md">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Buscar pueblos o ciudades</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchVisible(!searchVisible)}
                className="h-7 w-7 p-0"
              >
                {searchVisible ? <X size={15} /> : <Search size={15} />}
              </Button>
            </div>
            
            {searchVisible && (
              <div className="w-full mt-2">
                <AddressSearchBox onLocationSelected={handleLocationSelected} />
                <p className="text-xs text-muted-foreground mt-1">
                  Busca una ubicación y al seleccionarla se añadirá automáticamente como punto.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Renderizar líneas entre puntos */}
      {isDrawing && points.length > 1 && (
        <GooglePolyline
          path={points}
          options={{
            strokeColor: '#0088FE',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            strokeDashArray: [5, 5]
          }}
        />
      )}
      
      {/* Renderizar marcadores para cada punto */}
      {isDrawing && points.map((point, index) => (
        <GoogleMarker 
          key={`draw-point-${index}`}
          position={point}
          label={(index + 1).toString()}
        />
      ))}
    </>
  );
}

interface ZoneMapProps {
  newZoneName: string;
  selectedColor: string;
  onZoneCreated: () => void;
}

function ZoneMapContent({ newZoneName, selectedColor, onZoneCreated }: ZoneMapProps) {
  const { toast } = useToast();
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({ 
    lat: 18.4955, 
    lng: -69.8534 // Por defecto Santo Domingo
  });
  
  // Consultar la configuración del negocio para obtener la ubicación inicial
  const settingsQuery = useQuery({
    queryKey: ["/api/settings"],
    staleTime: Infinity,
  });
  
  // Consultar zonas existentes
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  // Consultar clientes
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Mutation para crear una nueva zona
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

  // Efecto para actualizar el centro del mapa cuando se cargan los ajustes
  useEffect(() => {
    if (settingsQuery.data && settingsQuery.data.latitude && settingsQuery.data.longitude) {
      const lat = parseFloat(settingsQuery.data.latitude);
      const lng = parseFloat(settingsQuery.data.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setCenter({ lat, lng });
      }
    }
  }, [settingsQuery.data]);
  
  // Manejador de carga del mapa
  const onLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);
  
  // Manejador de desmontaje del mapa
  const onUnmount = useCallback(() => {
    setMapRef(null);
  }, []);

  // Manejador cuando se completa un polígono
  const handlePolygonComplete = (points: LatLng[]) => {
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
      if (points.length < 3) {
        throw new Error("Se necesitan al menos 3 puntos para crear una zona");
      }

      // Convertir coordenadas al formato requerido por el schema
      const coordStrings = points.map(point => {
        // Asegurar formato exacto con 6 decimales
        return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
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

  // Convertir coordenadas para zonas existentes
  const getPolygonPathForZone = (zone: Zone): LatLng[] => {
    return zone.coordinates.map(coordStr => {
      const [lat, lng] = coordStr.split(',').map(Number);
      return { lat, lng };
    });
  };

  return (
    <ResponsiveMapContainer className="bg-white" fixedHeight>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={defaultOptions}
      >
        {/* Controles de dibujo */}
        <DrawingControl 
          map={mapRef} 
          onPolygonComplete={handlePolygonComplete} 
        />
        
        {/* Renderizar zonas existentes */}
        {zones.map(zone => (
          <GooglePolygon
            key={`zone-${zone.id}`}
            paths={getPolygonPathForZone(zone)}
            options={{
              fillColor: zone.color,
              fillOpacity: 0.2,
              strokeColor: zone.color,
              strokeOpacity: 1,
              strokeWeight: 2,
            }}
          />
        ))}
        
        {/* Renderizar marcadores de clientes */}
        {customers.map(customer => {
          // Intentar obtener las coordenadas del cliente
          let position: google.maps.LatLngLiteral | null = null;
          
          if (customer.coordinates) {
            const [lat, lng] = customer.coordinates.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              position = { lat, lng };
            }
          } else if (customer.latitude && customer.longitude) {
            const lat = parseFloat(customer.latitude);
            const lng = parseFloat(customer.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              position = { lat, lng };
            }
          }
          
          if (!position) return null;
          
          return (
            <GoogleMarker
              key={`customer-${customer.id}`}
              position={position}
              title={customer.businessname || `Cliente ${customer.id}`}
            />
          );
        })}
      </GoogleMap>
    </ResponsiveMapContainer>
  );
}

export default function ZoneMap(props: ZoneMapProps) {
  return (
    <MapApiLoader>
      <ZoneMapContent {...props} />
    </MapApiLoader>
  );
}