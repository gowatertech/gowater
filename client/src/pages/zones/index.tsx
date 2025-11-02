import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDateRD } from "@/lib/date-utils";

// Componentes
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveZonesList } from "@/components/routes/ResponsiveZonesList";
import ZoneMap from "./ZoneMap";

// Diálogos
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Íconos
import {
  PlusCircle,
  RefreshCw,
  MapPin,
  Eye,
  Edit,
  X,
  Activity,
  BarChart,
} from "lucide-react";

// Tipos
import { Zone } from "@shared/schema";

export default function ZonesPage() {
  const { t } = useTranslation();
  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneColor, setZoneColor] = useState("#0088FE");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [viewZoneDialogOpen, setViewZoneDialogOpen] = useState(false);
  const [editZoneDialogOpen, setEditZoneDialogOpen] = useState(false);
  const [editZoneName, setEditZoneName] = useState("");
  const [editZoneColor, setEditZoneColor] = useState("");
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  
  // Usamos el hook para detección de móvil
  const isMobile = useIsMobile();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Obtener zonas
  const { data: zones = [], isLoading: isLoadingZones } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
  });

  // Estadísticas básicas de zonas
  const zoneStats = {
    totalZones: zones.length,
    totalPoints: zones.reduce((acc, zone) => acc + zone.coordinates.length, 0),
  };

  // Mutation para actualizar una zona
  const updateZoneMutation = useMutation({
    mutationFn: async (zone: { id: number; name: string; color: string }) => {
      return await apiRequest({
        url: `/api/zones/${zone.id}`,
        method: "PATCH",
        data: { name: zone.name, color: zone.color }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      setEditZoneDialogOpen(false);
      toast({
        description: "Zona actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  // Mutation para eliminar una zona
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest({
        url: `/api/zones/${id}`,
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      toast({
        description: "Zona eliminada exitosamente",
      });
      setDeleteAlertOpen(false);
      setSelectedZone(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  // Handler para ver zona
  const handleViewZone = (zone: Zone) => {
    setSelectedZone(zone);
    setViewZoneDialogOpen(true);
  };

  // Handler para editar zona
  const handleEditZone = (zone: Zone) => {
    setSelectedZone(zone);
    setEditZoneName(zone.name);
    setEditZoneColor(zone.color);
    setEditZoneDialogOpen(true);
  };

  // Handler para eliminar zona
  const handleDeleteZone = (zone: Zone) => {
    setSelectedZone(zone);
    setDeleteAlertOpen(true);
  };

  // Handler para guardar edición de zona
  const handleSaveZone = () => {
    if (selectedZone && editZoneName.trim()) {
      updateZoneMutation.mutate({
        id: selectedZone.id,
        name: editZoneName,
        color: editZoneColor
      });
    }
  };

  // Handler para confirmar eliminación
  const handleConfirmDelete = () => {
    if (selectedZone) {
      deleteZoneMutation.mutate(selectedZone.id);
    }
  };

  // When a zone is created successfully
  const handleZoneCreated = () => {
    setIsCreatingZone(false);
    setZoneName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Gestión de Zonas</h1>
        <p className="text-muted-foreground">Administre las zonas geográficas para clientes y rutas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Estadísticas y Acciones */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Tarjeta de estadísticas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Estadísticas</CardTitle>
              <CardDescription>Resumen de zonas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total de Zonas</span>
                  <span className="font-medium">{zoneStats.totalZones}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total de Puntos</span>
                  <span className="font-medium">{zoneStats.totalPoints}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones rápidas */}
          <Card className="col-span-1 sm:col-span-1 md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Acciones Rápidas</CardTitle>
              <CardDescription>Operaciones frecuentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                  onClick={() => setIsCreatingZone(true)}
                >
                  <PlusCircle className="h-5 w-5" />
                  <div className="text-xs sm:text-sm font-medium">Nueva Zona</div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/zones"] })}
                >
                  <RefreshCw className="h-5 w-5" />
                  <div className="text-xs sm:text-sm font-medium">Actualizar</div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                  onClick={() => window.open("/routes", "_self")}
                >
                  <Activity className="h-5 w-5" />
                  <div className="text-xs sm:text-sm font-medium">Ver Rutas</div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                  onClick={() => window.open("/dashboard", "_self")}
                >
                  <BarChart className="h-5 w-5" />
                  <div className="text-xs sm:text-sm font-medium">Dashboard</div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle>Lista de Zonas</CardTitle>
                <Button size="sm" onClick={() => setIsCreatingZone(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nueva Zona
                </Button>
              </div>
              <CardDescription>
                Zonas geográficas definidas para distribución
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingZones ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-6">No hay zonas definidas</p>
                  <Button onClick={() => setIsCreatingZone(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Crear primera zona
                  </Button>
                </div>
              ) : (
                <ResponsiveZonesList
                  zones={zones}
                  onViewZone={handleViewZone}
                  onEditZone={handleEditZone}
                  onDeleteZone={handleDeleteZone}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de creación de zona */}
      <Dialog open={isCreatingZone} onOpenChange={setIsCreatingZone}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nueva Zona</DialogTitle>
          </DialogHeader>
          
          <ZoneMap 
            newZoneName={zoneName} 
            selectedColor={zoneColor}
            onZoneCreated={handleZoneCreated}
            setNewZoneName={setZoneName}
            setSelectedColor={setZoneColor} 
          />
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreatingZone(false)}
              className="sm:order-1"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de vista de zona */}
      <Dialog open={viewZoneDialogOpen} onOpenChange={setViewZoneDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedZone?.name || "Ver zona"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedZone && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedZone.color }}
                />
                <span className="font-medium">{selectedZone.name}</span>
              </div>
              
              <div className="border rounded-md overflow-hidden" style={{ height: "300px" }}>
                <ZoneMap
                  newZoneName={selectedZone.name}
                  selectedColor={selectedZone.color}
                  onZoneCreated={() => {}}
                  viewOnly={true}
                  viewZoneId={selectedZone.id}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Detalles</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedZone.coordinates.length} puntos de coordenadas
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Fecha de Creación</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDateRD(selectedZone.createdAt, {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewZoneDialogOpen(false)}>
                  Cerrar
                </Button>
                <Button variant="default" onClick={() => {
                  setViewZoneDialogOpen(false);
                  handleEditZone(selectedZone);
                }}>
                  Editar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de edición de zona */}
      <Dialog open={editZoneDialogOpen} onOpenChange={setEditZoneDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Zona</DialogTitle>
          </DialogHeader>
          
          {selectedZone && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="zoneName" className="text-sm font-medium">
                    Nombre de la Zona
                  </label>
                  <input
                    id="zoneName"
                    type="text"
                    value={editZoneName}
                    onChange={(e) => setEditZoneName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="zoneColor" className="text-sm font-medium">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="zoneColor"
                      type="color"
                      value={editZoneColor}
                      onChange={(e) => setEditZoneColor(e.target.value)}
                      className="w-10 h-10 border rounded-md"
                    />
                    <span className="text-sm">{editZoneColor}</span>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditZoneDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="default" onClick={handleSaveZone}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Confirmación de eliminación */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Eliminar esta zona afectará a todos los clientes y rutas asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}