import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { type Zone, type Customer } from "@shared/schema";
import { LatLngExpression, LatLng, Icon } from 'leaflet';
import { Pencil, X, Search, Trash2, Edit, Eye, AlertTriangle } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { AddressSearchBox } from "@/components/map/AddressSearchBox";
import { ZonePolygons } from "@/components/map/ZonePolygons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showZoneDetails, setShowZoneDetails] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      console.log("ZoneMap - Zonas cargadas exitosamente:", zonesQuery.data);
      
      // Verificar si zonesQuery.data es un array o un objeto
      if (Array.isArray(zonesQuery.data)) {
        console.log("ZoneMap - zonesQuery.data es un array con", zonesQuery.data.length, "elementos");
        
        // Analizar cada zona para ver si tiene los campos esperados
        zonesQuery.data.forEach((zone, index) => {
          console.log(`ZoneMap - Zona ${index}:`, {
            id: zone.id,
            name: zone.name,
            color: zone.color,
            coordinates_type: Array.isArray(zone.coordinates) ? "array" : typeof zone.coordinates,
            coordinates_length: Array.isArray(zone.coordinates) ? zone.coordinates.length : "N/A",
            coordinates_sample: Array.isArray(zone.coordinates) && zone.coordinates.length > 0 
              ? zone.coordinates.slice(0, 3) 
              : "No coordinates"
          });
        });
      } else {
        console.warn("ZoneMap - zonesQuery.data no es un array:", typeof zonesQuery.data);
      }
    }
    if (zonesQuery.error) {
      console.error("ZoneMap - Error al cargar zonas:", zonesQuery.error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las zonas existentes"
      });
    }
  }, [zonesQuery.data, zonesQuery.error, toast]);
  
  // Asegurémonos de que zones sea un array
  const zones = Array.isArray(zonesQuery.data) ? zonesQuery.data : [];

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

  const updateZoneMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; color: string }) => {
      const response = await apiRequest("PATCH", `/api/zones/${data.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar la zona');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        description: "¡Zona actualizada exitosamente!",
      });
      setShowZoneDetails(false);
      setSelectedZone(null);
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/zones/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la zona');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        description: "Zona eliminada exitosamente",
      });
      setShowZoneDetails(false);
      setSelectedZone(null);
      setShowDeleteConfirm(false);
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

  const handleViewZone = (zone: Zone) => {
    setSelectedZone(zone);
    setShowZoneDetails(true);
    setIsEditing(false);
  };

  const handleEditZone = () => {
    setIsEditing(true);
  };

  const handleDeleteZone = () => {
    setShowDeleteConfirm(true);
  };

  const handleUpdateZone = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedZone) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const color = formData.get('color') as string;

    if (!name || !color) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nombre y color son requeridos"
      });
      return;
    }

    updateZoneMutation.mutate({
      id: selectedZone.id,
      name,
      color
    });
  };

  const handleConfirmDelete = () => {
    if (selectedZone) {
      deleteZoneMutation.mutate(selectedZone.id);
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
    <div className="flex flex-col gap-4">
      {/* Mapa para dibujar la nueva zona */}
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

      {/* Diálogo de ver/editar zona */}
      <Dialog open={showZoneDetails} onOpenChange={setShowZoneDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Zona" : "Detalles de la Zona"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Modifique los datos de la zona" 
                : "Información detallada de la zona seleccionada"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedZone && (
            <div className="py-4">
              {isEditing ? (
                <form onSubmit={handleUpdateZone}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Nombre de la zona
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        defaultValue={selectedZone.name}
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="color" className="text-sm font-medium">
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="color"
                          name="color"
                          defaultValue={selectedZone.color}
                          className="w-12 h-8"
                          required
                        />
                        <input
                          type="text"
                          value={selectedZone.color}
                          readOnly
                          className="flex-grow px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Puntos en el polígono: {selectedZone.coordinates.length}
                      </p>
                      <p className="text-sm text-gray-500">
                        Para modificar los puntos, debe crear una nueva zona.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Guardar Cambios</Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold">Nombre:</h4>
                    <p>{selectedZone.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Color:</h4>
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: selectedZone.color }}
                      ></div>
                      {selectedZone.color}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Creado:</h4>
                    <p>{new Date(selectedZone.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Número de Puntos:</h4>
                    <p>{selectedZone.coordinates.length}</p>
                  </div>
                  <div className="pt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowZoneDetails(false)}
                    >
                      Cerrar
                    </Button>
                    <Button onClick={handleEditZone}>Editar</Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteZone}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                ¿Está seguro de eliminar esta zona?
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la zona
              <strong> {selectedZone?.name}</strong> y todos los datos relacionados con ella.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}