import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlatformLayout } from "../_components/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, FileDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface CompanyLead {
  id: number;
  companyName: string;
  address: string;
  country: string;
  managerName: string;
  phone: string;
  email: string | null;
  approximateClients: number;
  vehicleCount: number;
  comments: string | null;
  interestedInPlan: string | null;
  createdAt: string;
  status: "new" | "contacted" | "converted" | "declined";
}

const statusLabels = {
  new: { label: "Nuevo", variant: "default" },
  contacted: { label: "Contactado", variant: "secondary" },
  converted: { label: "Convertido", variant: "success" },
  declined: { label: "Descartado", variant: "destructive" }
};

export default function InterestedCompanies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Obtener la lista de empresas interesadas
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/interested-companies"],
    queryFn: async () => {
      const response = await apiRequest({
        url: "/api/interested-companies",
        method: "GET"
      });
      return response;
    }
  });

  // Actualizar el estado de una empresa interesada
  const updateStatus = async (id: number, status: string) => {
    try {
      await apiRequest({
        url: `/api/interested-companies/${id}`,
        method: "PATCH",
        data: { status }
      });

      // Invalidar la consulta y recargar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/interested-companies"] });
      
      toast({
        title: "Estado actualizado",
        description: "El estado de la empresa ha sido actualizado correctamente",
      });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la empresa",
        variant: "destructive",
      });
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Filtrar los datos según los filtros seleccionados
  const filteredData = React.useMemo(() => {
    if (!data || !data.data) return [];
    
    return data.data.filter((lead: CompanyLead) => {
      // Filtrar por estado
      if (statusFilter && lead.status !== statusFilter) {
        return false;
      }
      
      // Filtrar por término de búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          lead.companyName.toLowerCase().includes(searchLower) ||
          lead.managerName.toLowerCase().includes(searchLower) ||
          lead.phone.includes(searchTerm) ||
          (lead.email && lead.email.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  // Exportar a CSV
  const exportToCsv = () => {
    if (!filteredData.length) return;
    
    const headers = [
      "ID", 
      "Empresa", 
      "Dirección", 
      "País", 
      "Encargado", 
      "Teléfono", 
      "Email", 
      "Clientes Aprox.", 
      "Vehículos", 
      "Comentarios", 
      "Plan Interesado", 
      "Fecha", 
      "Estado"
    ];
    
    const csvContent = [
      // Encabezados
      headers.join(","),
      // Datos
      ...filteredData.map((lead: CompanyLead) => [
        lead.id,
        `"${lead.companyName.replace(/"/g, '""')}"`,
        `"${lead.address.replace(/"/g, '""')}"`,
        `"${lead.country.replace(/"/g, '""')}"`,
        `"${lead.managerName.replace(/"/g, '""')}"`,
        `"${lead.phone}"`,
        lead.email ? `"${lead.email}"` : "",
        lead.approximateClients,
        lead.vehicleCount,
        lead.comments ? `"${lead.comments.replace(/"/g, '""')}"` : "",
        lead.interestedInPlan ? `"${lead.interestedInPlan}"` : "",
        `"${formatDate(lead.createdAt)}"`,
        `"${statusLabels[lead.status].label}"`
      ].join(","))
    ].join("\n");
    
    // Crear un enlace para descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `empresas-interesadas-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Empresas Interesadas</h1>
          <p className="text-muted-foreground">
            Gestiona las empresas que han mostrado interés en nuestro servicio
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, encargado, teléfono..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="new">Nuevos</SelectItem>
                <SelectItem value="contacted">Contactados</SelectItem>
                <SelectItem value="converted">Convertidos</SelectItem>
                <SelectItem value="declined">Descartados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" onClick={exportToCsv} disabled={!filteredData.length}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Empresas Interesadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-destructive">
                Ocurrió un error al cargar los datos. Por favor, intenta nuevamente.
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron empresas con los filtros seleccionados.
              </div>
            ) : (
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
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((lead: CompanyLead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.companyName}
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {lead.address}
                          </div>
                        </TableCell>
                        <TableCell>{lead.managerName}</TableCell>
                        <TableCell>
                          <div>{lead.phone}</div>
                          {lead.email && (
                            <div className="text-xs text-muted-foreground">{lead.email}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>Clientes: {lead.approximateClients}</div>
                          <div>Vehículos: {lead.vehicleCount}</div>
                        </TableCell>
                        <TableCell>
                          {formatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lead.status === 'new' ? 'default' :
                              lead.status === 'contacted' ? 'secondary' :
                              lead.status === 'converted' ? 'success' :
                              'destructive'
                            }
                          >
                            {statusLabels[lead.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={lead.status}
                            onValueChange={(value) => updateStatus(lead.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Cambiar estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Nuevo</SelectItem>
                              <SelectItem value="contacted">Contactado</SelectItem>
                              <SelectItem value="converted">Convertido</SelectItem>
                              <SelectItem value="declined">Descartado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}