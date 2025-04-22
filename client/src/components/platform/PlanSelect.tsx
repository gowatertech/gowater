import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { FormControl } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface Plan {
  id: number;
  name: string;
  price: string;
  description: string;
  maxUsers: number;
  maxTrucks: number;
  features: string[];
  isActive: boolean;
}

interface PlanSelectProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function PlanSelect({ value, onChange, disabled = false }: PlanSelectProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        console.log("Fetching plans directly...");
        const response = await fetch("/api/platform/plans");
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received plans data:", data);
        
        const plansArray = data.data || [];
        setPlans(plansArray);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching plans:", err);
        setError(err.message || "Error al cargar los planes");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 px-4 py-2 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Cargando planes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive h-10 px-4 py-2 border border-destructive rounded-md">
        Error: {error}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-muted-foreground h-10 px-4 py-2 border rounded-md">
        No hay planes disponibles
      </div>
    );
  }

  return (
    <Select
      value={value?.toString()}
      onValueChange={(v) => onChange(parseInt(v))}
      disabled={disabled}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un plan" />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {plans.map((plan) => (
          <SelectItem key={plan.id} value={plan.id.toString()}>
            {plan.name} - ${plan.price}/mes
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}