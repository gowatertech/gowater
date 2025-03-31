import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Definición de tipos para los settings
 */
interface Settings {
  name: string;
  [key: string]: any;
}

/**
 * Componente que muestra el nombre de la empresa en la parte inferior de la pantalla
 * como un elemento fijo.
 */
export function CompanyFooter() {
  const [companyName, setCompanyName] = useState<string>("GoWater");

  // Fetch settings para obtener el nombre de la empresa
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Actualizar nombre de la empresa cuando se cargan las configuraciones
  useEffect(() => {
    if (settings && settings.name) {
      setCompanyName(settings.name);
    }
  }, [settings]);

  return (
    <div className="fixed bottom-2 left-4 z-40 bg-background/80 backdrop-blur-sm py-1 px-3 text-left border rounded-md text-sm font-medium text-primary/70">
      {companyName}
    </div>
  );
}