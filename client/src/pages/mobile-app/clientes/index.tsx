import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search,
  Users,
  Navigation,
  MapPinned,
  AlertCircle,
  CreditCard,
  Phone,
  MapPin,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { apiRequest } from "@/lib/api";
import type { Customer } from "@shared/schema";

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

export default function MobileAppClientesPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const { toast } = useToast();
  const { companyName } = useCompanySettings();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/mobile/customers"],
  });

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const s = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        (c.businessname ?? "").toLowerCase().includes(s) ||
        (c.managername ?? "").toLowerCase().includes(s) ||
        (c.phone ?? "").toLowerCase().includes(s) ||
        (c.rnc ?? "").toLowerCase().includes(s)
    );
  }, [customers, searchTerm]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleCaptureLocation = async () => {
    if (!selectedCustomer) return;
    setIsCapturingLocation(true);
    try {
      if (!navigator.geolocation) {
        toast({ title: "GPS no disponible", description: "Tu dispositivo no soporta geolocalización", variant: "destructive" });
        setIsCapturingLocation(false);
        return;
      }
      toast({ title: "Esperando GPS...", description: "Permite el acceso a tu ubicación" });
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coordinates = `${latitude},${longitude}`;
          try {
            await apiRequest(`/api/mobile/customers/${selectedCustomer.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coordinates }),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/mobile/customers"] });
            toast({ title: "Ubicación capturada", description: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
          } catch {
            toast({ title: "Error al guardar", description: "No se pudieron guardar las coordenadas", variant: "destructive" });
          }
          setIsCapturingLocation(false);
        },
        (error) => {
          let msg = "No se pudo obtener la ubicación";
          if (error.code === error.PERMISSION_DENIED) msg = "Permiso denegado. Habilita el acceso a ubicación.";
          else if (error.code === error.POSITION_UNAVAILABLE) msg = "Ubicación no disponible. Verifica que el GPS esté activado.";
          else if (error.code === error.TIMEOUT) msg = "Tiempo agotado. Verifica tu señal GPS.";
          toast({ title: "Error de GPS", description: msg, variant: "destructive" });
          setIsCapturingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } catch {
      toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
      setIsCapturingLocation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Buscar Clientes" showBackButton onBackButtonClick={() => navigate("/mobile-app")} companyName={companyName} />

      <main className="px-4 pb-6">
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre, teléfono, RNC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base rounded-2xl border-gray-200 bg-white shadow-sm"
              data-testid="input-search-customer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-4 shadow-md shadow-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-blue-100 font-medium">Total</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-4 shadow-md shadow-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-emerald-100 font-medium">Encontrados</p>
                  <p className="text-2xl font-bold">{filteredCustomers.length}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Search className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-base font-medium text-gray-600">
                {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm ? "Intenta con otra búsqueda" : "Los clientes aparecerán aquí"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => {
                const balance = parseFloat(customer.balance || "0");
                const debe = balance > 0;
                return (
                  <button
                    key={customer.id}
                    className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-all"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    data-testid={`card-customer-${customer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        debe ? "bg-red-100" : "bg-emerald-100"
                      }`}>
                        <span className={`text-sm font-bold ${debe ? "text-red-700" : "text-emerald-700"}`}>
                          {getInitials(customer.businessname || "")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{customer.businessname}</p>
                        {customer.managername && customer.managername !== customer.businessname && (
                          <p className="text-xs text-gray-400 truncate">{customer.managername}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-sm font-bold ${debe ? "text-red-600" : "text-gray-600"}`}>
                          RD$ {balance.toFixed(2)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                          debe ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {debe ? "Debe" : "Al día"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {selectedCustomerId && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomerId(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white z-10 px-6 pt-4 pb-3 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-700">{getInitials(selectedCustomer.businessname || "")}</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-base">{selectedCustomer.businessname}</h2>
                    {selectedCustomer.managername && (
                      <p className="text-xs text-gray-500">{selectedCustomer.managername}</p>
                    )}
                  </div>
                </div>
                <button
                  className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
                  onClick={() => setSelectedCustomerId(null)}
                  data-testid="button-close-customer-balance"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {selectedCustomer.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}

              <div className="bg-white rounded-2xl border-2 border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MapPinned className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Ubicación GPS</span>
                </div>
                {selectedCustomer.coordinates ? (
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Coordenadas</p>
                      <p className="text-sm font-mono text-gray-700">{selectedCustomer.coordinates}</p>
                      <a
                        href={`https://www.google.com/maps?q=${selectedCustomer.coordinates}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-xs mt-2 inline-flex items-center gap-1 font-medium"
                      >
                        Ver en Google Maps <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <button
                      onClick={handleCaptureLocation}
                      disabled={isCapturingLocation}
                      className="w-full h-12 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                      data-testid="button-update-location"
                    >
                      {isCapturingLocation ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Capturando...</>
                      ) : (
                        <><Navigation className="h-4 w-4" /> Actualizar Ubicación</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700">Sin ubicación GPS registrada</p>
                    </div>
                    <button
                      onClick={handleCaptureLocation}
                      disabled={isCapturingLocation}
                      className="w-full h-12 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                      data-testid="button-capture-location"
                    >
                      {isCapturingLocation ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Obteniendo GPS...</>
                      ) : (
                        <><MapPinned className="h-4 w-4" /> Capturar Ubicación GPS</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Pagos y Balance</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Balance Actual</span>
                    <span className={`text-lg font-bold ${parseFloat(selectedCustomer.balance || "0") > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      RD$ {parseFloat(selectedCustomer.balance || "0").toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Aplica pagos a facturas pendientes</p>
                </div>
                <button
                  onClick={() => navigate(`/mobile-app/payments/abono-cuenta?customerId=${selectedCustomer.id}`)}
                  className="w-full h-12 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md shadow-emerald-200"
                  data-testid="button-abono-cuenta"
                >
                  <CreditCard className="h-4 w-4" />
                  Abono a Cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileFooter />
    </div>
  );
}
