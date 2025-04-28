import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Home,
  CreditCard
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zone } from "@shared/schema";

interface SimpleNewCustomerFormProps {
  onSuccess: () => void;
}

export function SimpleNewCustomerForm({ onSuccess }: SimpleNewCustomerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Datos básicos
  const [businessname, setBusinessname] = useState("");
  const [managername, setManagername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [rnc, setRnc] = useState("");
  
  // Ubicación
  const [street, setStreet] = useState("");
  const [streetnumber, setStreetnumber] = useState("");
  const [reference, setReference] = useState("");
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  
  // Financiero
  const [creditlimit, setCreditlimit] = useState("0.00");
  
  // Obtener provincias
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/geo/provinces"],
    queryFn: async () => {
      const response = await fetch('/api/geo/provinces');
      if (!response.ok) {
        throw new Error('Error al cargar provincias');
      }
      return await response.json();
    }
  });

  // Obtener municipios cuando se selecciona una provincia
  const { data: municipalities = [], isLoading: isLoadingMunicipalities } = useQuery({
    queryKey: ["/api/geo/municipalities", selectedProvinceId],
    queryFn: async () => {
      if (!selectedProvinceId) return [];
      const response = await fetch(`/api/geo/municipalities/${selectedProvinceId}`);
      if (!response.ok) {
        throw new Error('Error al cargar municipios');
      }
      return await response.json();
    },
    enabled: !!selectedProvinceId,
  });

  // Obtener zonas
  const { data: zones = [] } = useQuery({
    queryKey: ["/api/zones"],
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Enviando datos:", data);
      const result = await apiRequest({
        method: "POST",
        url: "/api/customers",
        data: data
      });
      console.log("Respuesta del servidor:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      });
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al crear el cliente",
      });
    },
  });

  const resetForm = () => {
    // Limpiar todos los campos
    setBusinessname("");
    setManagername("");
    setPhone("");
    setEmail("");
    setRnc("");
    setStreet("");
    setStreetnumber("");
    setReference("");
    setSelectedProvinceId(null);
    setSelectedMunicipalityId(null);
    setSelectedZoneId(null);
    setCreditlimit("0.00");
  };

  const handleSubmit = () => {
    // Validaciones básicas
    if (!businessname) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre del negocio es obligatorio",
      });
      return;
    }
    
    if (!managername) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre del encargado es obligatorio",
      });
      return;
    }
    
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El teléfono es obligatorio",
      });
      return;
    }

    if (!selectedProvinceId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe seleccionar una provincia",
      });
      return;
    }

    if (!selectedMunicipalityId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe seleccionar un municipio",
      });
      return;
    }
    
    // Datos completos para crear un cliente
    const data = {
      businessname,
      managername,
      phone,
      email: email || undefined,
      rnc: rnc || undefined,
      street: street || "",
      streetnumber: streetnumber || "",
      reference: reference || undefined,
      provinceid: selectedProvinceId,
      municipalityid: selectedMunicipalityId,
      zoneid: selectedZoneId || undefined,
      creditlimit: creditlimit || "0.00",
      balance: "0.00"
    };
    
    console.log("Datos preparados:", data);
    createMutation.mutate(data);
  };

  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-medium">Registrar Nuevo Cliente</h3>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Datos básicos */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <Building2 className="h-3.5 w-3.5 text-gray-600" />
              Nombre del Negocio*
            </label>
            <Input 
              value={businessname}
              onChange={(e) => setBusinessname(e.target.value)}
              placeholder="Nombre del negocio" 
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <User className="h-3.5 w-3.5 text-gray-600" />
              Nombre del Encargado*
            </label>
            <Input 
              value={managername}
              onChange={(e) => setManagername(e.target.value)}
              placeholder="Nombre del encargado" 
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <Phone className="h-3.5 w-3.5 text-gray-600" />
              Teléfono*
            </label>
            <Input 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono" 
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <Mail className="h-3.5 w-3.5 text-gray-600" />
              Email
            </label>
            <Input 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" 
              className="h-8 text-sm"
              type="email"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <Building2 className="h-3.5 w-3.5 text-gray-600" />
              RNC
            </label>
            <Input 
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              placeholder="RNC" 
              className="h-8 text-sm"
            />
          </div>
          
          {/* Ubicación */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <MapPin className="h-3.5 w-3.5 text-gray-600" />
              Provincia*
            </label>
            <Select 
              value={selectedProvinceId?.toString()} 
              onValueChange={(value) => {
                const id = parseInt(value);
                setSelectedProvinceId(id);
                setSelectedMunicipalityId(null); // Resetear municipio al cambiar provincia
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleccionar provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province: any) => (
                  <SelectItem key={province.id} value={province.id.toString()}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <MapPin className="h-3.5 w-3.5 text-gray-600" />
              Municipio*
            </label>
            <Select 
              value={selectedMunicipalityId?.toString()} 
              onValueChange={(value) => setSelectedMunicipalityId(parseInt(value))}
              disabled={!selectedProvinceId || isLoadingMunicipalities}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={isLoadingMunicipalities ? "Cargando..." : "Seleccionar municipio"} />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map((municipality: any) => (
                  <SelectItem key={municipality.id} value={municipality.id.toString()}>
                    {municipality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <MapPin className="h-3.5 w-3.5 text-gray-600" />
              Zona
            </label>
            <Select 
              value={selectedZoneId?.toString()} 
              onValueChange={(value) => setSelectedZoneId(parseInt(value))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone: any) => (
                  <SelectItem key={zone.id} value={zone.id.toString()}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <Home className="h-3.5 w-3.5 text-gray-600" />
              Calle
            </label>
            <Input 
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Calle" 
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <Home className="h-3.5 w-3.5 text-gray-600" />
              Número
            </label>
            <Input 
              value={streetnumber}
              onChange={(e) => setStreetnumber(e.target.value)}
              placeholder="Número" 
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <Home className="h-3.5 w-3.5 text-gray-600" />
              Referencia
            </label>
            <Input 
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Referencia" 
              className="h-8 text-sm"
            />
          </div>
          
          {/* Financiero */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <CreditCard className="h-3.5 w-3.5 text-gray-600" />
              Límite de Crédito (RD$)
            </label>
            <Input 
              value={creditlimit}
              onChange={(e) => setCreditlimit(e.target.value)}
              placeholder="Límite de crédito" 
              className="h-8 text-sm"
              type="number"
              step="0.01"
            />
          </div>
        </div>
        
        <div className="flex justify-between mt-4 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={resetForm}
            className="h-8 text-xs"
          >
            Limpiar
          </Button>
          
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending ? "Guardando..." : "Guardar Cliente"}
          </Button>
        </div>
      </div>
    </div>
  );
}