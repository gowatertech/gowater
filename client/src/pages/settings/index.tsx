import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Edit,
  FileText,
  Globe,
  Home,
  Image,
  Mail,
  Map,
  MapPin,
  MapPinned,
  Percent,
  Phone,
  Save,
  Banknote,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LocationSelector } from "@/components/map/LocationSelector";
import { useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { apiRequest } from "@/lib/api";

// Tipos para provincias y municipios
type Province = {
  id: number;
  name: string;
  code: string;
};

type Municipality = {
  id: number;
  name: string;
  provinceId: number;
};

// Tipo para la configuración
type Settings = {
  id: number;
  companyId: number;
  logo: string | null;
  name: string;
  rnc: string | null;
  street: string;
  streetNumber: string;
  provinceId: number;
  municipalityId: number;
  contactPhone: string;
  email: string | null;
  country: string;
  currency: string;
  tax: string;
  latitude: string | null;
  longitude: string | null;
};

// Tipo para inserción de configuración
type InsertSettings = Omit<Settings, "id" | "companyId"> & {
  logo?: File | string | null;
};

export default function SettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Formulario con react-hook-form
  const form = useForm<InsertSettings>({
    defaultValues: {
      logo: null,
      name: "",
      rnc: "",
      street: "",
      streetNumber: "",
      provinceId: undefined as any,
      municipalityId: undefined as any,
      contactPhone: "",
      email: "",
      country: "República Dominicana",
      currency: "DOP",
      tax: "0.00",
      latitude: null,
      longitude: null,
    },
  });

  // Fetch provincias
  const { data: provinces = [] } = useQuery<Province[]>({
    queryKey: ["/api/geo/provinces"],
  });

  // Fetch municipios basado en la provincia seleccionada
  const { data: municipalities = [], isLoading: isLoadingMunicipalities } = useQuery<Municipality[]>({
    queryKey: ["/api/geo/municipalities", form.watch("provinceId")],
    queryFn: async () => {
      if (!form.watch("provinceId")) return [];
      const response = await fetch(`/api/geo/municipalities/${form.watch("provinceId")}`);
      return response.json();
    },
    enabled: !!form.watch("provinceId"),
  });

  // Fetch configuración actual
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Actualizar formulario cuando se carga la configuración
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertSettings) => {
      const formData = new FormData();

      // Manejar archivo de logo
      if (data.logo instanceof File) {
        formData.append('logo', data.logo);
      }

      // Agregar todos los otros campos
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
    <div className="space-y-2 p-2">
      {/* Configuración de la empresa */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row justify-between items-center px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Edit className="h-3.5 w-3.5 text-blue-500" />
            <CardTitle className="text-sm font-medium">Configuración de la Empresa</CardTitle>
          </div>
          {!isEditing && (
            <Button onClick={handleEditClick} variant="outline" size="sm" className="h-7 text-xs px-2 py-0">
              <Edit className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Sección de información general - Siempre 1 columna en móvil para mejor visualización */}
              <div className="mb-2">
                <h3 className="text-sm font-semibold mb-2">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Image className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Logo</FormLabel>
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            {value && typeof value === 'string' && (
                              <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-white shadow-inner">
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
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Nombre de la Empresa</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rnc"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">RNC</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" {...field} value={field.value || ''} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Home className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Calle</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetNumber"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPinned className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Número</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Teléfono de Contacto</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Email</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" type="email" {...field} value={field.value || ''} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">País</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Banknote className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Moneda</FormLabel>
                        </div>
                        <FormControl>
                          <Input className="h-7 text-xs" {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Percent className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">ITBIS (%)</FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            className="h-7 text-xs"
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
                </div>
              </div>

              {/* Sección de ubicación con selector de mapa - Reorganizada para mejor visibilidad */}
              <div className="mb-2">
                <div className="flex flex-col space-y-1 mb-2">
                  <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-md border-l-4 border-purple-500">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-medium text-gray-700">Ubicación Geográfica</h3>
                  </div>
                  <p className="text-xs text-muted-foreground px-2">
                    Estos datos serán utilizados como punto de inicio para las rutas de entrega.
                  </p>
                </div>
                
                {/* Grupo Provincial - Destacado con fondo coloreado */}
                <div className="p-3 mb-3 rounded-lg bg-purple-50 border border-purple-100">
                  <h4 className="text-sm font-medium mb-2 text-purple-700">Provincia y Municipio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="provinceId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Map className="h-3.5 w-3.5 text-purple-500" />
                            <FormLabel className="text-xs font-medium">Provincia</FormLabel>
                          </div>
                          {isEditing ? (
                            <Select
                              onValueChange={(value) => {
                                const newProvinceId = parseInt(value);
                                const currentProvinceId = field.value;

                                if (currentProvinceId && newProvinceId !== currentProvinceId) {
                                  form.setValue("municipalityId", null as any);
                                }

                                field.onChange(newProvinceId);
                              }}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs bg-white">
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
                                className="h-7 text-xs"
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
                        <FormItem className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-purple-500" />
                            <FormLabel className="text-xs font-medium">Municipio</FormLabel>
                          </div>
                          {isEditing ? (
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                              disabled={!form.watch("provinceId") || isLoadingMunicipalities}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs bg-white">
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
                                className="h-7 text-xs"
                                value={municipalities.find(m => m.id === field.value)?.name || ''}
                                readOnly
                              />
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Coordenadas exactas */}
                <h4 className="text-sm font-medium mb-2 text-gray-700">Coordenadas Exactas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPinned className="h-3.5 w-3.5 text-blue-500" />
                          <FormLabel className="text-xs">Latitud</FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            className="h-7 text-xs font-mono"
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
                      <FormItem className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPinned className="h-3.5 w-3.5 text-green-500" />
                          <FormLabel className="text-xs">Longitud</FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            className="h-7 text-xs font-mono"
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
                  <div className="flex justify-start mt-1 mb-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2 py-0">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          Seleccionar en mapa
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto sm:h-auto md:h-auto">
                        <LocationSelector 
                          initialCenter={
                            form.watch("latitude") && form.watch("longitude")
                              ? [parseFloat(form.watch("latitude") || "0"), parseFloat(form.watch("longitude") || "0")]
                              : [18.4718, -69.8923] // Santo Domingo por defecto
                          }
                          onChange={(coordinates) => {
                            const [lat, lng] = coordinates.split(',').map(parseFloat);
                            form.setValue("latitude", lat.toString());
                            form.setValue("longitude", lng.toString());
                            
                            // Notificar al usuario que las coordenadas se han guardado
                            toast({
                              title: "Ubicación actualizada",
                              description: `Latitud: ${lat.toFixed(6)}, Longitud: ${lng.toFixed(6)}`,
                            });
                            
                            // Cerrar el diálogo automáticamente
                            setTimeout(() => {
                              const closeButton = document.querySelector('[data-radix-focus-guard]')?.parentElement?.querySelector('[aria-label="Close"]');
                              if (closeButton) {
                                (closeButton as HTMLButtonElement).click();
                              }
                            }, 100);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="bg-blue-50 rounded-md p-2 mt-2">
                  <Button 
                    type="submit" 
                    variant="default" 
                    size="sm" 
                    className="h-8 w-full text-xs bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <span className="mr-1 h-3.5 w-3.5 animate-spin inline-block rounded-full border-2 border-white border-t-transparent"></span>
                        Guardando configuración...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1 h-3.5 w-3.5" />
                        Guardar Configuración
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para centrar el mapa en una ubicación
function MapCenterController({ position }: { position: LatLngExpression }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [map, position]);
  
  return null;
}