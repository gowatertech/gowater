import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { InsertSettings, Province, Municipality } from "@shared/schema";
import { insertSettingsSchema } from "@shared/schema";

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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";

function Settings() {
  const { toast } = useToast();
  const previousProvinceIdRef = useRef<number | undefined>();

  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      logo: null,
      name: "",
      rnc: null,
      street: "",
      streetNumber: "",
      province_id: 0,
      municipality_id: 0,
      contactPhone: "",
      email: null,
      country: "",
      currency: "",
      tax: "0.00",
    },
  });

  // Fetch provinces
  const { data: provinces = [] } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
  });

  // Fetch municipalities based on selected province
  const { data: municipalities = [] } = useQuery<Municipality[]>({
    queryKey: ["/api/municipalities", form.watch("province_id")],
    enabled: !!form.watch("province_id"),
  });

  // Fetch current settings
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      console.log("Cargando configuración:", settings);
      previousProvinceIdRef.current = settings.province_id;
      form.reset(settings);
    }
  }, [settings, form]);

  // Reset municipality_id only when province changes
  useEffect(() => {
    const currentProvinceId = form.watch("province_id");
    console.log("Cambio de provincia:", { 
      current: currentProvinceId, 
      previous: previousProvinceIdRef.current 
    });

    if (currentProvinceId && currentProvinceId !== previousProvinceIdRef.current) {
      form.setValue("municipality_id", 0);
      previousProvinceIdRef.current = currentProvinceId;
    }
  }, [form.watch("province_id")]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertSettings) => {
      const formData = new FormData();

      if (data.logo instanceof File) {
        formData.append('logo', data.logo);
      }

      // Add all other fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'logo' && value !== undefined && value !== null) {
          formData.append(key, String(value));
          console.log(`Agregando al FormData: ${key} = ${value}`);
        }
      });

      console.log("Enviando datos al servidor:", {
        province_id: data.province_id,
        municipality_id: data.municipality_id
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
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: InsertSettings) => {
    console.log("Datos del formulario a enviar:", data);

    const formattedData = {
      ...data,
      province_id: data.province_id || 0,
      municipality_id: data.municipality_id || 0,
      tax: data.tax || "0.00"
    };

    console.log("Datos formateados para enviar:", formattedData);
    updateMutation.mutate(formattedData);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de la Empresa</CardTitle>
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
                                alt="Logo"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
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
                          />
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
                        <Input {...field} />
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
                        <Input {...field} value={field.value || ''} />
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
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="province_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? field.value.toString() : "0"}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="municipality_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipio</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? field.value.toString() : "0"}
                        disabled={!form.watch("province_id")}
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
                        <Input {...field} />
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
                        <Input type="email" {...field} value={field.value || ''} />
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Settings;