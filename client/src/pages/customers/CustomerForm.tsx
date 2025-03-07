import { type Customer } from "@shared/schema";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ... rest of the imports

export function CustomerForm({ customer, onSuccess }: { customer?: Customer, onSuccess?: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch(
        customer 
          ? `/api/customers/${customer.id}`
          : '/api/customers', 
        {
          method: customer ? 'PATCH' : 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Error al guardar el cliente');
      }

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
    }
  };

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleSubmit(formData);
      }}
      encType="multipart/form-data"
    >
      {/* Logo upload field */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Logo</label>
        <Input
          type="file"
          name="logo"
          accept="image/*"
          className="cursor-pointer"
        />
      </div>

      {/* Rest of the form fields */}
      {/* ... */}
    </form>
  );
}
