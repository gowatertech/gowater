import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, User, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface Customer {
  id: number;
  businessname: string;
  managername: string;
  phone: string;
  street: string;
  streetnumber: string;
  sector: string;
  city: string;
}

export default function NuevoPedidoPaso1() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Obtener clientes
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      return apiRequest({
        method: "GET",
        url: "/api/customers"
      });
    }
  });

  // Filtrar clientes según búsqueda
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter((customer) => 
      customer.businessname.toLowerCase().includes(term) ||
      customer.managername.toLowerCase().includes(term) ||
      customer.phone.includes(term) ||
      customer.street.toLowerCase().includes(term) ||
      customer.streetnumber?.toLowerCase().includes(term) ||
      customer.sector?.toLowerCase().includes(term) ||
      customer.city?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    // Guardar el cliente seleccionado en sessionStorage
    sessionStorage.setItem("nuevoPedido_cliente", JSON.stringify(customer));
    // Navegar al paso 2
    setLocation("/mobile-app/nuevo-pedido/paso2");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-16">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/mobile-app")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Nuevo Pedido</h1>
            <p className="text-xs opacity-90">Paso 1 de 3: Seleccionar Cliente</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container max-w-md mx-auto px-4 py-4">
        {/* Barra de búsqueda */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, teléfono o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
              data-testid="input-search-customer"
            />
          </div>
        </div>

        {/* Lista de clientes */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando clientes...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="p-8 text-center">
            <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchTerm ? "No se encontraron clientes" : "No hay clientes disponibles"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]"
                onClick={() => handleSelectCustomer(customer)}
                data-testid={`card-customer-${customer.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1 truncate">
                        {customer.businessname}
                      </h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{customer.managername}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {customer.street} #{customer.streetnumber}
                            {customer.sector && `, ${customer.sector}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
