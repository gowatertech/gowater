import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { PlatformLayout } from "../_components/PlatformLayout";
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
import { Badge } from "@/components/ui/badge";
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
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  RefreshCw, 
  Search,
  User,
  ShieldCheck,
  Building2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Interfaz para representar un usuario de plataforma
interface PlatformUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  companyId?: number;
  phone?: string;
  lastLogin?: string;
  createdAt?: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userToDelete, setUserToDelete] = useState<PlatformUser | null>(null);

  // Consulta para obtener todos los usuarios de plataforma
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform/platform-users"],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/platform-users",
        method: "GET"
      }),
  });

  // Mutación para eliminar un usuario
  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest({
        url: `/api/platform/platform-users/${id}`,
        method: "DELETE"
      }),
    onSuccess: () => {
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      });
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    },
  });

  // Filtrar usuarios por término de búsqueda y rol
  const filteredUsers = React.useMemo(() => {
    if (!users?.data) return [];
    
    return users.data.filter((user: PlatformUser) => {
      // Filtrar por término de búsqueda (nombre o email)
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrar por rol
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Manejar la eliminación de un usuario
  const handleDeleteUser = (user: PlatformUser) => {
    setUserToDelete(user);
  };

  // Confirmar la eliminación de un usuario
  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Traducir el rol para mostrar
  const translateRole = (role: string) => {
    switch (role) {
      case 'platform_admin':
        return 'Administrador de Plataforma';
      case 'company_admin':
        return 'Administrador de Empresa';
      default:
        return role;
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
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
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra los usuarios de la plataforma y sus permisos
            </p>
          </div>
          <Button onClick={() => setLocation("/platform/users/new")}>
            <PlusIcon className="mr-2 h-4 w-4" /> Nuevo Usuario
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Usuarios de Plataforma</CardTitle>
            <CardDescription>
              Lista de administradores de plataforma y empresas
            </CardDescription>
            <div className="flex items-center mt-2 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre o email..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={setRoleFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="platform_admin">Administrador de Plataforma</SelectItem>
                  <SelectItem value="company_admin">Administrador de Empresa</SelectItem>
                </SelectContent>
              </Select>
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
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-lg font-medium">No hay usuarios</h3>
                <p className="mt-1">
                  {searchTerm || roleFilter !== "all"
                    ? "No se encontraron usuarios con los filtros aplicados" 
                    : "Aún no hay usuarios registrados en la plataforma"}
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setLocation("/platform/users/new")}
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> Crear Usuario
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Empresas</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: PlatformUser) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'platform_admin' ? 'default' : 'outline'}>
                            {user.role === 'platform_admin' ? (
                              <ShieldCheck className="mr-1 h-3 w-3" />
                            ) : (
                              <Building2 className="mr-1 h-3 w-3" />
                            )}
                            {translateRole(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.companyId ? (
                            <span>Empresa #{user.companyId}</span>
                          ) : (
                            <span className="text-muted-foreground">Ninguna</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(user.createdAt || '')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setLocation(`/platform/users/${user.id}`)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteUser(user)}
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

      {/* Diálogo de confirmación para eliminar usuario */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el usuario{" "}
              <span className="font-bold">{userToDelete?.name}</span> ({userToDelete?.email})?
              <p className="mt-2 text-destructive">
                Esta acción no se puede deshacer. El usuario perderá todos sus accesos y permisos.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}