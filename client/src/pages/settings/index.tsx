import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { InsertSettings, Province, Municipality } from "@shared/schema";
import { insertSettingsSchema } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ResponsiveMapContainer } from "@/components/ui/responsive-map-container";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Save, MapPin } from "lucide-react";

function Settings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      logo: null,
      name: "",
      rnc: null,
      street: "",
      streetNumber: "",
      provinceId: undefined,
      municipalityId: undefined,
      contactPhone: "",
      email: null,
      country: "",
      currency: "",
      tax: "0.00",
      latitude: undefined,
      longitude: undefined,
    },
  });

  // Fetch provinces
  const { data: provinces = [] } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
  });

  // Fetch municipalities based on selected province
  const { data: municipalities = [], isLoading: isLoadingMunicipalities } = useQuery<Municipality[]>({
    queryKey: ["/api/municipalities", form.watch("provinceId")],
    queryFn: async () => {
      if (!form.watch("provinceId")) return [];
      const response = await apiRequest("GET", `/api/municipalities/${form.watch("provinceId")}`);
      return response.json();
    },
    enabled: !!form.watch("provinceId"),
  });

  // Fetch current settings
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertSettings) => {
      const formData = new FormData();

      // Handle logo file
      if (data.logo instanceof File) {
        formData.append('logo', data.logo);
      }

      // Add all other fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'logo' && value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await fetch("/api/settings", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al actualizar la configuración");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error("Error al actualizar:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: InsertSettings) => {
    updateMutation.mutate(data);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Configuración de la Empresa</CardTitle>
          {!isEditing && (
            <Button onClick={handleEditClick} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          {value && typeof value === 'string' && (
                            <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-white">
                              <img
                                src={`data:image/png;base64,${value}`}
                                alt="Logo de la empresa"
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  console.error('Error loading logo');
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          {isEditing && (
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "El archivo no debe superar los 5MB",
                                    });
                                    return;
                                  }
                                  onChange(file);
                                }
                              }}
                              {...field}
                              className="flex-1"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rnc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RNC</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calle</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="streetNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provinceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      {isEditing ? (
                        <Select
                          onValueChange={(value) => {
                            const newProvinceId = parseInt(value);
                            const currentProvinceId = field.value;

                            if (currentProvinceId && newProvinceId !== currentProvinceId) {
                              form.setValue("municipalityId", undefined);
                            }

                            field.onChange(newProvinceId);
                          }}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una provincia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {provinces.map((province) => (
                              <SelectItem key={province.id} value={province.id.toString()}>
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input
                            value={provinces.find(p => p.id === field.value)?.name || ''}
                            readOnly
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="municipalityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipio</FormLabel>
                      {isEditing ? (
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          disabled={!form.watch("provinceId") || isLoadingMunicipalities}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un municipio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {municipalities.map((municipality) => (
                              <SelectItem key={municipality.id} value={municipality.id.toString()}>
                                {municipality.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input
                            value={municipalities.find(m => m.id === field.value)?.name || ''}
                            readOnly
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Contacto</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ''} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ITBIS (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d.]/g, '');
                            const parts = value.split('.');
                            if (parts.length > 2) return;
                            if (parts[1]?.length > 2) return;
                            field.onChange(value);
                          }}
                          onBlur={(e) => {
                            const value = e.target.value || '0';
                            const number = parseFloat(value);
                            if (!isNaN(number)) {
                              field.onChange(number.toFixed(2));
                            }
                          }}
                          readOnly={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campos de ubicación con selector de mapa */}
                <div className="col-span-2">
                  <div className="flex flex-col space-y-2 mb-4">
                    <h3 className="text-lg font-medium">Ubicación de la Empresa</h3>
                    <p className="text-sm text-muted-foreground">
                      Estos datos serán utilizados como punto de inicio para las rutas de entrega.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitud</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="Ej: 18.4718"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.-]/g, '');
                                field.onChange(value);
                              }}
                              readOnly={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitud</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="Ej: -69.8923"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.-]/g, '');
                                field.onChange(value);
                              }}
                              readOnly={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isEditing && (
                    <div className="flex justify-center mt-2 mb-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline">
                            <MapPin className="h-4 w-4 mr-2" />
                            Seleccionar en mapa
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl h-[80vh]">
                          <LocationSelector 
                            initialPosition={
                              form.watch("latitude") && form.watch("longitude")
                                ? [parseFloat(form.watch("latitude") || "0"), parseFloat(form.watch("longitude") || "0")]
                                : [18.4718, -69.8923] // Santo Domingo por defecto
                            }
                            onPositionSelected={(lat, lng) => {
                              form.setValue("latitude", lat.toString());
                              form.setValue("longitude", lng.toString());
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para seleccionar ubicación en el mapa
interface LocationSelectorProps {
  initialPosition: [number, number];
  onPositionSelected: (lat: number, lng: number) => void;
}

function LocationSelector({ initialPosition, onPositionSelected }: LocationSelectorProps) {
  const [position, setPosition] = useState<LatLngExpression>(initialPosition);
  const markerRef = useRef<any>(null);

  // Función para manejar el movimiento del marcador
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
          onPositionSelected(latLng.lat, latLng.lng);
        }
      },
    }),
    [onPositionSelected],
  );

  // Componente para manejar clics en el mapa
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onPositionSelected(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <div className="w-full h-full">
      <h3 className="text-lg font-medium mb-2">Selecciona la ubicación de tu empresa</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Haz clic en el mapa o arrastra el marcador para seleccionar la ubicación exacta.
      </p>
      <ResponsiveMapContainer>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%", minHeight: "400px" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker 
            position={position} 
            draggable={true}
            ref={markerRef}
            eventHandlers={eventHandlers}
          />
          <MapClickHandler />
        </MapContainer>
      </ResponsiveMapContainer>
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Coordenadas seleccionadas: <br />
          <span className="font-mono">{typeof position === 'object' ? `Lat: ${(position as [number, number])[0].toFixed(6)}, Lng: ${(position as [number, number])[1].toFixed(6)}` : ''}</span>
        </p>
        <Button 
          className="mt-2" 
          onClick={() => {
            if (typeof position === 'object') {
              onPositionSelected((position as [number, number])[0], (position as [number, number])[1]);
            }
          }}
        >
          Confirmar ubicación
        </Button>
      </div>
    </div>
  );
}

export default Settings;