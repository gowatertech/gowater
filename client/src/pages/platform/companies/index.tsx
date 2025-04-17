import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  PencilIcon, 
  PlusIcon, 
  TrashIcon, 
  RefreshCw, 
  Search,
  Building2,
  Check,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlatformLayout } from "../_components/PlatformLayout";

// Interfaz para representar una empresa
interface Company {
  id: number;
  name: string;
  subdomain: string;
  active: boolean;
  planId: number;
  expirationDate: string;
  planName?: string;
  logo?: string;
  createdAt?: string;
}

export default function CompaniesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // Consulta para obtener todas las empresas
  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform/companies"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/companies",
        method: "GET"
      }),
  });

  // Mutación para eliminar una empresa
  const deleteCompanyMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest({
        url: `/api/platform/companies/${id}`,
        method: "DELETE"
      }),
    onSuccess: () => {
      toast({
        title: "Empresa eliminada",
        description: "La empresa ha sido eliminada correctamente.",
      });
      setCompanyToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la empresa.",
        variant: "destructive",
      });
    },
  });

  // Filtrar empresas por el término de búsqueda
  const filteredCompanies = React.useMemo(() => {
    if (!companies?.data) return [];
    
    return companies.data.filter((company: Company) => 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  // Manejar la eliminación de una empresa
  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
  };

  // Confirmar la eliminación de una empresa
  const confirmDelete = () => {
    if (companyToDelete) {
      deleteCompanyMutation.mutate(companyToDelete.id);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Empresas</h1>
            <p className="text-muted-foreground">
              Administra todas las empresas registradas en la plataforma
            </p>
          </div>
          <Button onClick={() => setLocation("/platform/companies/new")}>
            <PlusIcon className="mr-2 h-4 w-4" /> Nueva Empresa
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Empresas</CardTitle>
            <CardDescription>
              Lista de todas las empresas registradas en la plataforma
            </CardDescription>
            <div className="flex items-center mt-2 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre o subdominio..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin">
                  <RefreshCw className="h-8 w-8 text-primary" />
                </div>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-lg font-medium">No hay empresas</h3>
                <p className="mt-1">
                  {searchTerm 
                    ? "No se encontraron empresas con el término de búsqueda" 
                    : "Aún no hay empresas registradas en la plataforma"}
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setLocation("/platform/companies/new")}
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> Crear Empresa
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Subdominio</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Expiración</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company: Company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.subdomain}</TableCell>
                        <TableCell>{company.planName || `Plan #${company.planId}`}</TableCell>
                        <TableCell>
                          {formatDate(company.expirationDate)}
                        </TableCell>
                        <TableCell>
                          {company.active ? (
                            <Badge className="bg-green-500">
                              <Check className="mr-1 h-3 w-3" /> Activa
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="mr-1 h-3 w-3" /> Inactiva
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setLocation(`/platform/companies/${company.id}`)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteCompany(company)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
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

      {/* Diálogo de confirmación para eliminar empresa */}
      <Dialog open={!!companyToDelete} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la empresa{" "}
              <span className="font-bold">{companyToDelete?.name}</span>?
              <p className="mt-2 text-destructive">
                Esta acción no se puede deshacer y eliminará todos los datos asociados a la empresa.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteCompanyMutation.isPending}
            >
              {deleteCompanyMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}