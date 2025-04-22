import React from "react";
import { PlatformLayout } from "../_components/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EmpresasInteresadas() {
  const { toast } = useToast();
  
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Encargado</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Clientes/Vehículos</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      Agua Cristalina
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        Santo Domingo
                      </div>
                    </TableCell>
                    <TableCell>José Pérez</TableCell>
                    <TableCell>
                      <div>809-555-1234</div>
                      <div className="text-xs text-muted-foreground">jose@example.com</div>
                    </TableCell>
                    <TableCell>
                      <div>Clientes: 50</div>
                      <div>Vehículos: 5</div>
                    </TableCell>
                    <TableCell>
                      2 de abril 2023
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        Nuevo
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}