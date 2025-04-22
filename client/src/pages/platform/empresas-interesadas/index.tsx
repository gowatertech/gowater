import React, { useEffect, useState } from "react";
import { PlatformLayout } from "../_components/PlatformLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Plus, Edit, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormularioEmpresa } from "./FormularioEmpresa";

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

export default function EmpresasInteresadas() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para el formulario modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CompanyLead | undefined>(undefined);
  
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      console.log("Obteniendo datos de empresas interesadas...");
      const response = await fetch("/api/interested-companies");
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Datos recibidos:", responseData);
      
      if (responseData.success && Array.isArray(responseData.data)) {
        setLeads(responseData.data);
      } else {
        console.error("Formato de respuesta inválido:", responseData);
        throw new Error("Formato de respuesta inválido");
      }
    } catch (err) {
      console.error("Error al obtener empresas interesadas:", err);
      setError(true);
      toast({
        title: "Error",
        description: "No se pudieron cargar las empresas interesadas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [toast]);

  // Función para formatear la fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      console.error("Error al formatear fecha:", e);
      return dateString;
    }
  };

  // Filtrar los resultados según el término de búsqueda
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      lead.companyName.toLowerCase().includes(term) ||
      lead.managerName.toLowerCase().includes(term) ||
      lead.phone.includes(searchTerm) ||
      (lead.email && lead.email.toLowerCase().includes(term))
    );
  });

  // Mapeo de los estados a sus variantes de badge
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'contacted': return 'secondary';
      case 'converted': return 'success';
      case 'declined': return 'destructive';
      default: return 'default';
    }
  };

  // Mapeo de los estados a sus etiquetas en español
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nuevo';
      case 'contacted': return 'Contactado';
      case 'converted': return 'Convertido';
      case 'declined': return 'Descartado';
      default: return status;
    }
  };

  // Abrir formulario para editar
  const handleEdit = (lead: CompanyLead) => {
    setSelectedLead(lead);
    setIsFormOpen(true);
  };

  // Abrir formulario para crear nuevo
  const handleCreate = () => {
    setSelectedLead(undefined);
    setIsFormOpen(true);
  };

  // Cambiar estado directamente
  const handleChangeStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/interested-companies/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      toast({
        title: "Estado actualizado",
        description: "El estado de la empresa se ha actualizado correctamente",
      });

      // Actualizar la lista
      fetchLeads();
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la empresa",
        variant: "destructive",
      });
    }
  };

  // Guardar empresa (nueva o editada)
  const handleSave = async (data: any) => {
    try {
      const isEditing = !!selectedLead?.id;
      const url = isEditing 
        ? `/api/interested-companies/${selectedLead.id}` 
        : '/api/interested-companies';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      toast({
        title: isEditing ? "Empresa actualizada" : "Empresa registrada",
        description: isEditing 
          ? "Los datos de la empresa se han actualizado correctamente" 
          : "La empresa ha sido registrada correctamente",
      });

      // Actualizar la lista
      fetchLeads();
    } catch (error) {
      console.error("Error al guardar empresa:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información de la empresa",
        variant: "destructive",
      });
      throw error; // Re-lanzar error para manejo en el componente del formulario
    }
  };
  
  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Empresas Interesadas</h1>
            <p className="text-muted-foreground">
              Gestiona las empresas que han mostrado interés en nuestro servicio
            </p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Nueva empresa</span>
          </Button>
        </div>
        
        {/* Buscador */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, encargado, teléfono..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Empresas Interesadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Cargando datos...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Ocurrió un error al cargar los datos.</p>
                <p>Por favor, intenta nuevamente más tarde.</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm 
                  ? "No se encontraron empresas con el término de búsqueda."
                  : "No hay empresas interesadas registradas."}
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
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.companyName}
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {lead.address} ({lead.country})
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
                          <Badge variant={getStatusBadgeVariant(lead.status)}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(lead)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Más acciones</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEdit(lead)}>
                                  Editar detalles
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                                <DropdownMenuItem 
                                  disabled={lead.status === "new"}
                                  onClick={() => handleChangeStatus(lead.id, "new")}
                                >
                                  Marcar como Nuevo
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  disabled={lead.status === "contacted"}
                                  onClick={() => handleChangeStatus(lead.id, "contacted")}
                                >
                                  Marcar como Contactado
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  disabled={lead.status === "converted"}
                                  onClick={() => handleChangeStatus(lead.id, "converted")}
                                >
                                  Marcar como Convertido
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  disabled={lead.status === "declined"}
                                  onClick={() => handleChangeStatus(lead.id, "declined")}
                                >
                                  Marcar como Descartado
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

      {/* Formulario Modal */}
      <FormularioEmpresa
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        empresa={selectedLead}
        onSave={handleSave}
      />
    </PlatformLayout>
  );
}