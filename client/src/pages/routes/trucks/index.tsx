import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Truck, insertTruckSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusCircle,
  Eye,
  Edit,
  Save,
  Truck as TruckIcon,
  AlertCircle,
  ArrowLeft,
  Search,
  X,
  Settings,
  CheckCircle,
  AlertTriangle,
  Calendar,
  CircleX,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TruckFormData = typeof insertTruckSchema._type;

export default function TrucksPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const queryClient = useQueryClient();

  // Obtener camiones
  const { data: trucks = [], isLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  // Filtrar camiones según término de búsqueda
  const filteredTrucks = trucks.filter(
    truck => 
      truck.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const form = useForm<TruckFormData>({
    resolver: zodResolver(insertTruckSchema),
    defaultValues: {
      brand: "",
      model: "",
      year: "",
      plate: "",
      color: "",
      capacity: "",
      status: "disponible",
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: TruckFormData) => {
      return await apiRequest({
        method: "POST",
        url: "/api/trucks",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      toast({
        title: "Éxito",
        description: "Vehículo creado correctamente",
      });
      form.reset({
        brand: "",
        model: "",
        year: "",
        plate: "",
        color: "",
        capacity: "",
        status: "disponible",
      });
      setActiveTab("list");
    },
    onError: (error: Error) => {
      console.error("Error creating truck:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TruckFormData & { id: number }) => {
      const { id, ...updateData } = data;
      return await apiRequest({
        method: "PUT",
        url: `/api/trucks/${id}`,
        data: updateData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      toast({
        title: "Éxito",
        description: "Vehículo actualizado correctamente",
      });
      setIsEditing(false);
      setActiveTab("list");
    },
    onError: (error: Error) => {
      console.error("Error al actualizar:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "disponible" | "en_reparacion" | "en_ruta" }) => {
      return await apiRequest({
        method: "PATCH",
        url: `/api/trucks/${id}/status`,
        data: { status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      toast({
        title: "Éxito",
        description: "Estado del vehículo actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      console.error("Error al actualizar estado:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: TruckFormData) => {
    try {
      if (isEditing && selectedTruck) {
        await updateMutation.mutateAsync({ ...data, id: selectedTruck.id });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error en el envío del formulario:", error);
    }
  };

  const handleViewTruck = (truck: Truck) => {
    setSelectedTruck(truck);
    setIsEditing(false);
    
    const formData = {
      brand: truck.brand,
      model: truck.model,
      year: truck.year,
      plate: truck.plate,
      color: truck.color,
      capacity: truck.capacity,
      status: truck.status as "disponible" | "en_reparacion" | "en_ruta",
    };
    
    form.reset(formData);
    setActiveTab("details");
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleStatusChange = (truckId: number, newStatus: "disponible" | "en_reparacion" | "en_ruta") => {
    updateStatusMutation.mutate({ id: truckId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "disponible":
        return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Disponible</Badge>;
      case "en_reparacion":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200">En Reparación</Badge>;
      case "en_ruta":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200">En Ruta</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200">Desconocido</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "disponible":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "en_reparacion":
        return <Settings className="h-4 w-4 text-amber-600" />;
      case "en_ruta":
        return <TruckIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <CircleX className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponible":
        return "border-l-green-500";
      case "en_reparacion":
        return "border-l-amber-500";
      case "en_ruta":
        return "border-l-blue-500";
      default:
        return "border-l-gray-500";
    }
  };

  if (isLoading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className={`${isMobile ? 'p-1' : 'p-2'} max-w-6xl mx-auto`}>
      {/* Cabecera con título y botón de nuevo vehículo */}
      <div className="flex justify-between items-center mb-2">
        <h1 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold flex items-center`}>
          <TruckIcon className="h-4 w-4 mr-1.5 text-blue-600" />
          Gestión de Vehículos
        </h1>
        {!isMobile && (
          <Button 
            size="sm"
            onClick={() => setActiveTab("new")} 
            className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Nuevo Vehículo
          </Button>
        )}
      </div>
      
      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} mb-2 h-8`}>
          <TabsTrigger value="list" className="flex items-center gap-1 text-xs px-2">
            <TruckIcon className="h-3.5 w-3.5" />
            <span>Vehículos</span>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-1 text-xs px-2">
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Nuevo</span>
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="details" disabled={!selectedTruck} className="flex items-center gap-1 text-xs px-2">
              <Eye className="h-3.5 w-3.5" />
              <span>{isEditing ? "Editar" : "Detalles"}</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* Contenido del Tab de Lista de Vehículos */}
        <TabsContent value="list" className="space-y-4">
          {/* Buscador */}
          <Card className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input 
                placeholder="Buscar por marca, modelo o placa..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <TruckIcon className="h-3.5 w-3.5 text-blue-600" />
                <h2 className="text-xs font-medium">Flota de Vehículos</h2>
              </div>
              <Badge variant="outline" className="text-[10px] py-0 h-5">{filteredTrucks.length} vehículos</Badge>
            </div>

            {isMobile ? (
              /* Vista de tarjetas para móvil */
              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="space-y-1.5">
                  {filteredTrucks.length === 0 ? (
                    <div className="text-center py-2 text-xs text-gray-500">
                      No se encontraron vehículos
                    </div>
                  ) : (
                    filteredTrucks.map((truck) => (
                      <Card 
                        key={truck.id} 
                        className={`p-2 border-l-2 ${getStatusColor(truck.status)}`}
                        onClick={() => handleViewTruck(truck)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xs font-medium leading-tight">{truck.brand} {truck.model}</h3>
                            <p className="text-[10px] text-gray-500 leading-tight">Placa: {truck.plate}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge variant="outline" className="flex items-center gap-0.5 text-[10px] h-4 px-1.5">
                              {getStatusIcon(truck.status)}
                              <span>
                                {truck.status === 'disponible' ? 'Disponible' : 
                                truck.status === 'en_reparacion' ? 'En Rep.' : 
                                truck.status === 'en_ruta' ? 'En Ruta' : 'Descon.'}
                              </span>
                            </Badge>
                            <p className="text-[10px] mt-0.5 leading-tight">
                              Cap: {truck.capacity}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-1 mt-1 text-[10px]">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 px-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTruck(truck);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-0.5" />
                            <span className="leading-none">Ver</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-5 text-green-600 hover:text-green-700 hover:bg-green-50 p-0 px-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(truck.id, "disponible");
                            }}
                            disabled={truck.status === "disponible"}
                          >
                            <CheckCircle className="h-3 w-3 mr-0.5" />
                            <span className="leading-none">Disp.</span>
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 p-0 px-1 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(truck.id, "en_reparacion");
                            }}
                            disabled={truck.status === "en_reparacion"}
                          >
                            <Settings className="h-3 w-3 mr-0.5" />
                            <span className="leading-none">Rep.</span>
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              /* Tabla para escritorio */
              <div className="overflow-x-auto">
                <Table className="min-w-full text-xs">
                  <TableHeader>
                    <TableRow className="h-7">
                      <TableHead className="py-1">Marca</TableHead>
                      <TableHead className="py-1">Modelo</TableHead>
                      <TableHead className="py-1">Placa</TableHead>
                      <TableHead className="py-1">Cap.</TableHead>
                      <TableHead className="py-1">Estado</TableHead>
                      <TableHead className="py-1">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrucks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-2 text-xs text-gray-500">
                          No se encontraron vehículos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrucks.map((truck) => (
                        <TableRow key={truck.id} className="h-8 hover:bg-gray-50">
                          <TableCell className="py-1 font-medium">{truck.brand}</TableCell>
                          <TableCell className="py-1">{truck.model}</TableCell>
                          <TableCell className="py-1">{truck.plate}</TableCell>
                          <TableCell className="py-1">{truck.capacity}</TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(truck.status)}
                              <span className="text-xs">
                                {truck.status === 'disponible' ? 'Disponible' : 
                                truck.status === 'en_reparacion' ? 'En Rep.' : 
                                truck.status === 'en_ruta' ? 'En Ruta' : 'Descon.'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewTruck(truck)}
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1.5"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver
                              </Button>
                              <Select
                                value={truck.status}
                                onValueChange={(value) => handleStatusChange(truck.id, value as "disponible" | "en_reparacion" | "en_ruta")}
                              >
                                <SelectTrigger className="w-[100px] h-6 text-xs">
                                  <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="disponible" className="text-xs py-1">
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span>Disponible</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="en_reparacion" className="text-xs py-1">
                                    <div className="flex items-center gap-1">
                                      <Settings className="h-3 w-3 text-amber-600" />
                                      <span>En Reparación</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="en_ruta" className="text-xs py-1">
                                    <div className="flex items-center gap-1">
                                      <TruckIcon className="h-3 w-3 text-blue-600" />
                                      <span>En Ruta</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Estadísticas de vehículos */}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <div className="bg-green-50 rounded-md p-1.5 border border-green-100">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <p className="text-[10px] text-green-600 font-medium">Disponibles</p>
                </div>
                <p className="text-base font-bold text-green-700 mt-0.5">
                  {trucks.filter(t => t.status === "disponible").length}
                </p>
              </div>
              <div className="bg-amber-50 rounded-md p-1.5 border border-amber-100">
                <div className="flex items-center gap-1">
                  <Settings className="h-3 w-3 text-amber-600" />
                  <p className="text-[10px] text-amber-600 font-medium">En Reparación</p>
                </div>
                <p className="text-base font-bold text-amber-700 mt-0.5">
                  {trucks.filter(t => t.status === "en_reparacion").length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-md p-1.5 border border-blue-100">
                <div className="flex items-center gap-1">
                  <TruckIcon className="h-3 w-3 text-blue-600" />
                  <p className="text-[10px] text-blue-600 font-medium">En Ruta</p>
                </div>
                <p className="text-base font-bold text-blue-700 mt-0.5">
                  {trucks.filter(t => t.status === "en_ruta").length}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Contenido del Tab de Nuevo Vehículo */}
        <TabsContent value="new" className="space-y-2">
          <Card className="p-2">
            <CardHeader className="px-0 pt-0 pb-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                <CardTitle className="text-sm">Registro de Vehículo</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Ingresa la información del nuevo vehículo para la flota
              </CardDescription>
            </CardHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <div className="grid md:grid-cols-3 gap-x-3 gap-y-2">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs mb-1">Marca</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Toyota, Honda, etc." className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs mb-1">Modelo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Hilux, Dyna, etc." className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs mb-1">Año</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="2025" className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="plate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs mb-1">Placa</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ABC-123" className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs mb-1">Color</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Blanco, Rojo, etc." className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs mb-1">Capacidad</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="500, 1000, etc." className="h-7 text-xs" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel className="text-xs mb-1">Estado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="disponible" className="text-xs py-1">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                <span>Disponible</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="en_reparacion" className="text-xs py-1">
                              <div className="flex items-center gap-1">
                                <Settings className="h-3.5 w-3.5 text-amber-600" />
                                <span>En Reparación</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="en_ruta" className="text-xs py-1">
                              <div className="flex items-center gap-1">
                                <TruckIcon className="h-3.5 w-3.5 text-blue-600" />
                                <span>En Ruta</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-blue-50 p-1.5 rounded-md border border-blue-100 mt-2">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-blue-800">Importante:</p>
                      <p className="text-[10px] text-blue-700">La capacidad se refiere a la cantidad de productos que puede transportar el vehículo.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("list")}
                    className="h-7 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" 
                    size="sm"
                    disabled={createMutation.isPending} 
                    className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                  >
                    {createMutation.isPending ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        <span>Guardando...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Save className="h-3.5 w-3.5" />
                        <span>Guardar</span>
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </TabsContent>

        {/* Contenido del Tab de Detalles del Vehículo */}
        <TabsContent value="details" className="space-y-4">
          <Card className="p-4">
            <CardHeader className="px-0 pt-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-blue-600" />
                  <CardTitle>{isEditing ? "Editar Vehículo" : "Detalles del Vehículo"}</CardTitle>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("list")}
                  size="sm"
                  className="h-8"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver
                </Button>
              </div>
            </CardHeader>

            {selectedTruck && (
              <>
                {!isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">{selectedTruck.brand} {selectedTruck.model}</h2>
                        {getStatusBadge(selectedTruck.status)}
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> Año {selectedTruck.year}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Marca</h3>
                        <p className="text-base">{selectedTruck.brand}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Modelo</h3>
                        <p className="text-base">{selectedTruck.model}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Placa</h3>
                        <p className="text-base">{selectedTruck.plate}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Color</h3>
                        <p className="text-base">{selectedTruck.color}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Capacidad</h3>
                        <p className="text-base">{selectedTruck.capacity}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                        <div className="flex items-center gap-1 mt-1">
                          {getStatusIcon(selectedTruck.status)}
                          <span>
                            {selectedTruck.status === 'disponible' ? 'Disponible' : 
                            selectedTruck.status === 'en_reparacion' ? 'En reparación' : 
                            selectedTruck.status === 'en_ruta' ? 'En ruta' : 'Desconocido'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleEditClick}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Vehículo
                      </Button>
                      
                      <Select
                        value={selectedTruck.status}
                        onValueChange={(value) => handleStatusChange(selectedTruck.id, value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Cambiar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Disponible</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="en_reparacion">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4 text-amber-600" />
                              <span>En Reparación</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="en_ruta">
                            <div className="flex items-center gap-2">
                              <TruckIcon className="h-4 w-4 text-blue-600" />
                              <span>En Ruta</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marca</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Toyota, Honda, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modelo</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Hilux, Dyna, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Año</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="2025" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="plate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Placa</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="ABC-123" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Blanco, Rojo, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacidad</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="500, 1000, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Estado</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar estado" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="disponible">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span>Disponible</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="en_reparacion">
                                    <div className="flex items-center gap-2">
                                      <Settings className="h-4 w-4 text-amber-600" />
                                      <span>En Reparación</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="en_ruta">
                                    <div className="flex items-center gap-2">
                                      <TruckIcon className="h-4 w-4 text-blue-600" />
                                      <span>En Ruta</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            form.reset({
                              brand: selectedTruck.brand,
                              model: selectedTruck.model,
                              year: selectedTruck.year,
                              plate: selectedTruck.plate,
                              color: selectedTruck.color,
                              capacity: selectedTruck.capacity,
                              status: selectedTruck.status as "disponible" | "en_reparacion" | "en_ruta",
                            });
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {updateMutation.isPending ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              Actualizando...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Save className="h-4 w-4" />
                              Guardar Cambios
                            </span>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}