import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, MapPin, Phone, Mail, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomerBalance } from "@/components/customers/CustomerBalance";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import type { Customer } from "@shared/schema";

export default function MobileAppClientesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    
    const searchLower = searchTerm.toLowerCase();
    return customers.filter(customer => 
      (customer.businessname ?? "").toLowerCase().includes(searchLower) ||
      (customer.managername ?? "").toLowerCase().includes(searchLower) ||
      (customer.phone ?? "").toLowerCase().includes(searchLower) ||
      (customer.rnc ?? "").toLowerCase().includes(searchLower)
    );
  }, [customers, searchTerm]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <MobileHeader title="Buscar Clientes" showBackButton onBackButtonClick={() => window.history.back()} />

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, teléfono, RNC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base border-2 focus:border-primary"
            data-testid="input-search-customer"
          />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Clientes</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </div>
                <Users className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Encontrados</p>
                  <p className="text-2xl font-bold">{filteredCustomers.length}</p>
                </div>
                <Search className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">
                  {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
                </p>
                <p className="text-sm mt-1">
                  {searchTerm ? "Intenta con otra búsqueda" : "Los clientes aparecerán aquí"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
                onClick={() => setSelectedCustomerId(customer.id)}
                data-testid={`card-customer-${customer.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-primary">
                        {customer.businessname}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {customer.managername}
                      </p>
                    </div>
                    {customer.isCharity && (
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700 border-pink-300">
                        Benéfica
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-blue-500" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-green-500" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  
                  {customer.street && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span className="truncate">
                        {customer.street} {customer.streetnumber && `#${customer.streetnumber}`}
                      </span>
                    </div>
                  )}

                  {customer.creditlimit && (
                    <div className="flex items-center gap-2 text-sm pt-2 border-t">
                      <DollarSign className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">
                        Balance: RD$ {parseFloat(customer.creditlimit).toFixed(2)}
                      </span>
                      {parseFloat(customer.creditlimit) < 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          Debe
                        </Badge>
                      )}
                      {parseFloat(customer.creditlimit) > 0 && (
                        <Badge variant="default" className="ml-auto bg-green-500">
                          Favor
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customer Balance Dialog */}
      <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedCustomer && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary">
                  {selectedCustomer.businessname}
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedCustomerId(null)}
                  data-testid="button-close-customer-balance"
                >
                  Cerrar
                </Button>
              </div>
              <CustomerBalance 
                customerId={selectedCustomer.id}
                customerName={selectedCustomer.businessname || ""}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MobileFooter />
    </div>
  );
}
