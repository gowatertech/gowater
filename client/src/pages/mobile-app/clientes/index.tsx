import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, MapPin, Phone, Mail, DollarSign, Navigation, MapPinned, AlertCircle, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AccountPaymentDialog } from "@/components/payments/AccountPaymentDialog";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { apiRequest } from "@/lib/api";
import type { Customer } from "@shared/schema";

export default function MobileAppClientesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { toast } = useToast();
  const { companyName } = useCompanySettings();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/mobile/customers"],
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

  // Función para capturar coordenadas GPS del cliente
  const handleCaptureLocation = async () => {
    if (!selectedCustomer) return;

    console.log("Iniciando captura de ubicación GPS...");
    setIsCapturingLocation(true);

    try {
      // Verificar si el navegador soporta geolocalización
      if (!navigator.geolocation) {
        console.error("Geolocalización no soportada");
        toast({
          title: "GPS no disponible",
          description: "Tu dispositivo no soporta geolocalización",
          variant: "destructive"
        });
        setIsCapturingLocation(false);
        return;
      }

      console.log("Solicitando permiso de ubicación...");
      
      // Mostrar toast de que estamos esperando permisos
      toast({
        title: "Esperando GPS...",
        description: "Permite el acceso a tu ubicación cuando se solicite",
      });

      // Obtener la ubicación actual
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log("Ubicación obtenida:", position.coords);
          const { latitude, longitude } = position.coords;
          const coordinates = `${latitude},${longitude}`;

          try {
            console.log("Guardando coordenadas en el servidor...");
            // Actualizar las coordenadas del cliente en el backend
            await apiRequest(`/api/mobile/customers/${selectedCustomer.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                coordinates: coordinates
              })
            });

            console.log("Coordenadas guardadas exitosamente");

            // Actualizar el caché de clientes
            queryClient.invalidateQueries({ queryKey: ["/api/mobile/customers"] });

            toast({
              title: "✓ Ubicación capturada",
              description: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            });

            setIsCapturingLocation(false);
          } catch (error) {
            console.error("Error al actualizar coordenadas en servidor:", error);
            toast({
              title: "Error al guardar",
              description: "No se pudieron guardar las coordenadas en el servidor",
              variant: "destructive"
            });
            setIsCapturingLocation(false);
          }
        },
        (error) => {
          console.error("Error de geolocalización:", error.code, error.message);
          
          let errorMessage = "No se pudo obtener la ubicación";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permiso denegado. Habilita el acceso a ubicación en tu navegador.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Ubicación no disponible. Verifica que el GPS esté activado.";
              break;
            case error.TIMEOUT:
              errorMessage = "Tiempo agotado. Verifica tu señal GPS e intenta nuevamente.";
              break;
          }

          toast({
            title: "Error de GPS",
            description: errorMessage,
            variant: "destructive"
          });

          setIsCapturingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Aumentado a 15 segundos
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error("Error inesperado al capturar ubicación:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive"
      });
      setIsCapturingLocation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <MobileHeader title="Buscar Clientes" showBackButton onBackButtonClick={() => window.history.back()} companyName={companyName} />

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

                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    <DollarSign className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">
                      Balance: RD$ {parseFloat(customer.balance || "0").toFixed(2)}
                    </span>
                    {parseFloat(customer.balance || "0") > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        Debe
                      </Badge>
                    )}
                    {parseFloat(customer.balance || "0") < 0 && (
                      <Badge variant="default" className="ml-auto bg-green-500">
                        Favor
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customer Balance Dialog */}
      <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedCustomer && (
            <div className="p-4 sm:p-6">
              {/* Header - Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-primary break-words">
                  {selectedCustomer.businessname}
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedCustomerId(null)}
                  data-testid="button-close-customer-balance"
                  className="w-full sm:w-auto"
                >
                  Cerrar
                </Button>
              </div>

              {/* Sección de Ubicación GPS - Responsive */}
              <Card className="mb-6 border-2 border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <MapPinned className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">Ubicación del Cliente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-3 sm:px-6">
                  {selectedCustomer.coordinates ? (
                    <div className="space-y-2">
                      {/* Info de coordenadas - Responsive */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 text-sm bg-white p-3 rounded-lg border">
                        <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700 text-xs sm:text-sm">Coordenadas GPS registradas:</p>
                          <p className="text-gray-600 font-mono text-xs break-all mt-1">
                            {selectedCustomer.coordinates}
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${selectedCustomer.coordinates}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs mt-2 inline-flex items-center gap-1"
                          >
                            <MapPin className="h-3 w-3" />
                            Ver en Google Maps →
                          </a>
                        </div>
                      </div>
                      
                      {/* Botón actualizar - Full width en móvil */}
                      <Button
                        onClick={handleCaptureLocation}
                        disabled={isCapturingLocation}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                        size="sm"
                        data-testid="button-update-location"
                      >
                        {isCapturingLocation ? (
                          <>
                            <Navigation className="h-4 w-4 mr-2 animate-spin" />
                            <span className="truncate">Capturando ubicación...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="h-4 w-4 mr-2" />
                            <span className="truncate">Actualizar Ubicación GPS</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Alerta - Responsive */}
                      <div className="flex items-start gap-2 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-yellow-800 text-xs sm:text-sm">Sin ubicación GPS registrada</p>
                          <p className="text-yellow-700 text-xs mt-1">
                            Captura la ubicación GPS del cliente para facilitar futuras entregas
                          </p>
                        </div>
                      </div>
                      
                      {/* Botón capturar - Full width en móvil */}
                      <Button
                        onClick={handleCaptureLocation}
                        disabled={isCapturingLocation}
                        className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                        size="default"
                        data-testid="button-capture-location"
                      >
                        {isCapturingLocation ? (
                          <>
                            <Navigation className="h-5 w-5 mr-2 animate-spin" />
                            <span className="truncate">Obteniendo ubicación GPS...</span>
                          </>
                        ) : (
                          <>
                            <MapPinned className="h-5 w-5 mr-2" />
                            <span className="truncate">Capturar Ubicación GPS</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botón Abono a Cuenta */}
              <Card className="border-2 border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    Pagos y Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Balance Actual:</span>
                      <span className="text-lg font-bold text-red-600">
                        RD$ {parseFloat(selectedCustomer.balance || "0").toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aplica pagos directamente a las facturas pendientes del cliente
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => setShowPaymentDialog(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                    size="lg"
                    data-testid="button-abono-cuenta"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Abono a Cuenta
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Payment Dialog */}
      <AccountPaymentDialog 
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        preselectedCustomerId={selectedCustomerId}
      />

      <MobileFooter />
    </div>
  );
}
