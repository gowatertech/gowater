import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Truck, insertTruckSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { PlusCircle, Eye, Edit, Save, Truck as TruckIcon, AlertCircle, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TruckFormData = typeof insertTruckSchema._type;

export default function TrucksPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("list");
  const queryClient = useQueryClient();

  // Obtener camiones
  const { data: trucks = [], isLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

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
      const response = await apiRequest("POST", "/api/trucks", data);
      return response.json();
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
      const response = await apiRequest("PUT", `/api/trucks/${id}`, updateData);
      return response.json();
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
      const response = await apiRequest("PATCH", `/api/trucks/${id}/status`, { status });
      return response.json();
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
        return <Badge className="bg-green-500">Disponible</Badge>;
      case "en_reparacion":
        return <Badge className="bg-amber-500">En Reparación</Badge>;
      case "en_ruta":
        return <Badge className="bg-blue-500">En Ruta</Badge>;
      default:
        return <Badge className="bg-gray-500">Desconocido</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vehículos</h1>
        <Button onClick={() => setActiveTab("new")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nuevo Vehículo
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Lista de Vehículos</TabsTrigger>
          <TabsTrigger value="new">Nuevo Vehículo</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedTruck}>Detalles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="border rounded-md p-2 sm:p-4">
          <Card>
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks?.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">{truck.brand}</TableCell>
                      <TableCell>{truck.model}</TableCell>
                      <TableCell>{truck.year}</TableCell>
                      <TableCell>{truck.plate}</TableCell>
                      <TableCell>{truck.capacity}</TableCell>
                      <TableCell>{getStatusBadge(truck.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewTruck(truck)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Select
                            value={truck.status}
                            onValueChange={(value) => handleStatusChange(truck.id, value as "disponible" | "en_reparacion" | "en_ruta")}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Cambiar estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disponible">Disponible</SelectItem>
                              <SelectItem value="en_reparacion">En Reparación</SelectItem>
                              <SelectItem value="en_ruta">En Ruta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="new" className="border rounded-md p-2 sm:p-4">
          <Card className="p-2 sm:p-4">
            <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4">Nuevo Vehículo</h2>
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
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
                            <SelectItem value="disponible">Disponible</SelectItem>
                            <SelectItem value="en_reparacion">En Reparación</SelectItem>
                            <SelectItem value="en_ruta">En Ruta</SelectItem>
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
                    onClick={() => setActiveTab("list")}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para ver detalles del vehículo */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <TruckIcon className="h-5 w-5 mr-2" />
              {isEditing ? "Editar Vehículo" : "Detalles del Vehículo"}
            </DialogTitle>
          </DialogHeader>

          {selectedTruck && (
            <>
              {!isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Marca:</h3>
                    <p>{selectedTruck.brand}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Modelo:</h3>
                    <p>{selectedTruck.model}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Año:</h3>
                    <p>{selectedTruck.year}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Placa:</h3>
                    <p>{selectedTruck.plate}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Color:</h3>
                    <p>{selectedTruck.color}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Capacidad:</h3>
                    <p>{selectedTruck.capacity}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Estado:</h3>
                    <p>{getStatusBadge(selectedTruck.status)}</p>
                  </div>
                  

                  <Button
                    onClick={handleEditClick}
                    className="col-span-2 mt-4"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marca</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                              <Input {...field} />
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
                              <Input {...field} />
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
                              <Input {...field} />
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
                              <Input {...field} />
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
                              <Input {...field} />
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
                                <SelectItem value="disponible">Disponible</SelectItem>
                                <SelectItem value="en_reparacion">En Reparación</SelectItem>
                                <SelectItem value="en_ruta">En Ruta</SelectItem>
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
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 
                          "Guardando..." : 
                          <><Save className="h-4 w-4 mr-2" />Guardar</>
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}