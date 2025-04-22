import React from "react";
import { PlatformLayout } from "../_components/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function InterestedCompanies() {
  console.log("Renderizando componente InterestedCompanies");
  
  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Empresas Interesadas</h1>
          <p className="text-muted-foreground">
            Gestiona las empresas que han mostrado interés en nuestro servicio
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Empresas Interesadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p>Cargando datos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}