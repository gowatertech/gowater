import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Esquema de validación con Zod
const formSchema = z.object({
  companyName: z
    .string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),
  address: z
    .string()
    .min(5, { message: "La dirección debe tener al menos 5 caracteres" })
    .max(200, { message: "La dirección no puede exceder 200 caracteres" }),
  country: z
    .string()
    .min(3, { message: "El país debe tener al menos 3 caracteres" })
    .max(100, { message: "El país no puede exceder 100 caracteres" }),
  managerName: z
    .string()
    .min(3, { message: "El nombre del encargado debe tener al menos 3 caracteres" })
    .max(100, { message: "El nombre del encargado no puede exceder 100 caracteres" }),
  phone: z
    .string()
    .min(7, { message: "El teléfono debe tener al menos 7 dígitos" })
    .max(20, { message: "El teléfono no puede exceder 20 caracteres" }),
  email: z
    .string()
    .email({ message: "Debe ingresar un correo electrónico válido" })
    .optional()
    .or(z.literal("")),
  approximateClients: z
    .number()
    .min(0, { message: "El número de clientes no puede ser negativo" })
    .or(z.string().regex(/^\d*$/).transform(Number)),
  vehicleCount: z
    .number()
    .min(0, { message: "El número de vehículos no puede ser negativo" })
    .or(z.string().regex(/^\d*$/).transform(Number)),
  comments: z
    .string()
    .max(500, { message: "Los comentarios no pueden exceder 500 caracteres" })
    .optional()
    .or(z.literal("")),
  interestedInPlan: z
    .string()
    .optional()
    .or(z.literal("")),
  status: z.enum(["new", "contacted", "converted", "declined"]),
});

// Tipo para los datos del formulario
type FormData = z.infer<typeof formSchema>;

interface CompanyLead {
  id?: number;
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
  createdAt?: string;
  status: "new" | "contacted" | "converted" | "declined";
}

interface FormularioEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
  empresa?: CompanyLead;
  onSave: (data: FormData) => Promise<void>;
}

export function FormularioEmpresa({
  isOpen,
  onClose,
  empresa,
  onSave,
}: FormularioEmpresaProps) {
  const { toast } = useToast();
  const isEditing = !!empresa?.id;

  // Configurar el formulario con valores predeterminados
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: empresa?.companyName || "",
      address: empresa?.address || "",
      country: empresa?.country || "República Dominicana",
      managerName: empresa?.managerName || "",
      phone: empresa?.phone || "",
      email: empresa?.email || "",
      approximateClients: empresa?.approximateClients || 0,
      vehicleCount: empresa?.vehicleCount || 0,
      comments: empresa?.comments || "",
      interestedInPlan: empresa?.interestedInPlan || "",
      status: empresa?.status || "new",
    },
  });

  // Manejar el envío del formulario
  const onSubmit = async (data: FormData) => {
    try {
      await onSave(data);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la empresa. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar empresa interesada" : "Registrar nueva empresa interesada"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Agua Cristalina" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="managerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del encargado</FormLabel>
                    <FormControl>
                      <Input placeholder="José Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle Principal #123, Santo Domingo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="República Dominicana" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="809-555-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="ejemplo@dominio.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="approximateClients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clientes aproximados</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="50" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === "" ? "0" : e.target.value;
                          field.onChange(parseInt(value));
                        }}
                        value={field.value.toString()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de vehículos</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="5" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === "" ? "0" : e.target.value;
                          field.onChange(parseInt(value));
                        }}
                        value={field.value.toString()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="interestedInPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan de interés</FormLabel>
                    <Select 
                      value={field.value || ""} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin especificar</SelectItem>
                        <SelectItem value="Básico">Básico</SelectItem>
                        <SelectItem value="Profesional">Profesional</SelectItem>
                        <SelectItem value="Empresarial">Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
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
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Nuevo</SelectItem>
                        <SelectItem value="contacted">Contactado</SelectItem>
                        <SelectItem value="converted">Convertido</SelectItem>
                        <SelectItem value="declined">Descartado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre el interés de la empresa..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? "Guardar cambios" : "Registrar empresa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}