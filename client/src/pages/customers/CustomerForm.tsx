import { type Customer } from "@shared/schema";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CustomerForm({ customer, onSuccess }: { customer?: Customer, onSuccess?: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      setIsSubmitting(true);
      setIsLoading(true);

      // Validar el archivo
      const logoFile = formData.get('logo') as File;
      console.log("Archivo seleccionado:", {
        name: logoFile?.name,
        type: logoFile?.type,
        size: logoFile?.size
      });

      if (logoFile && logoFile.size > 0) {
        // Validar tipo de archivo
        if (!logoFile.type.startsWith('image/')) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "El archivo debe ser una imagen"
          });
          return;
        }

        // Validar tamaño (5MB máximo)
        if (logoFile.size > 5 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "El archivo no debe exceder 5MB"
          });
          return;
        }

        console.log("Enviando formulario con logo");
      } else {
        // Si no hay nuevo archivo, remover el campo
        formData.delete('logo');
        console.log("Enviando formulario sin logo");
      }

      const endpoint = customer ? `/api/customers/${customer.id}` : '/api/customers';
      console.log("Enviando a endpoint:", endpoint);

      const response = await fetch(endpoint, {
        method: customer ? 'PATCH' : 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el cliente');
      }

      const updatedCustomer = await response.json();
      console.log("Respuesta del servidor:", {
        id: updatedCustomer.id,
        hasLogo: !!updatedCustomer.logo,
        logoLength: updatedCustomer.logo?.length,
        logoPreview: updatedCustomer.logo ? updatedCustomer.logo.substring(0, 50) + '...' : null
      });

      // Invalidar cache para actualizar la lista y forzar recarga
      await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      await queryClient.refetchQueries({ queryKey: ["/api/customers"] });

      toast({
        title: "Éxito",
        description: customer 
          ? "Cliente actualizado exitosamente"
          : "Cliente creado exitosamente",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-4"
    >
      {/* Logo upload field */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Logo</label>
        <Input
          type="file"
          name="logo"
          accept="image/*"
          className="cursor-pointer"
          disabled={isLoading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            console.log("Archivo seleccionado en input:", {
              name: file?.name,
              type: file?.type,
              size: file?.size
            });
          }}
        />
        <p className="text-xs text-muted-foreground">
          Formato: PNG, JPG. Tamaño máximo: 5MB
        </p>
        {customer?.logo && (
          <div className="mt-2">
            <img 
              src={`data:image/png;base64,${customer.logo}?t=${Date.now()}`}
              alt="Logo actual"
              className="w-32 h-32 object-contain"
              key={`${customer.id}-${Date.now()}`} // Forzar re-render y evitar caché
            />
          </div>
        )}
      </div>

      {/* Submit button */}
      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Guardando...
          </>
        ) : (
          customer ? "Actualizar" : "Crear"
        )}
      </Button>
    </form>
  );
}