import { useQuery } from "@tanstack/react-query";

interface Settings {
  id: number;
  name: string;
  logo: string;
  rnc: string;
  street: string;
  streetNumber: string;
  provinceId: number;
  municipalityId: number;
  contactPhone: string;
  email: string;
  country: string;
  currency: string;
  tax: string;
  latitude: string;
  longitude: string;
}

export function useCompanySettings() {
  // Consulta para obtener la configuración (nombre de la empresa)
  const { data: settings, isLoading, error } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });

  return {
    settings,
    isLoading,
    error,
    companyName: settings?.name || ''
  };
}