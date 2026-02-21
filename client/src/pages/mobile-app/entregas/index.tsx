import { useState } from "react";
import { useLocation } from "wouter";
import {
  Package,
  Search,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Truck,
  X,
  MapPin,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useOfflineDeliveries } from "@/hooks/use-offline-data";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { formatTimeRD } from "@/lib/date-utils";

interface BottleReturn {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  expectedQuantity: number;
  returnedQuantity: number;
  pendingQuantity: number;
  returnDate: string;
  status: "pending" | "complete" | "incomplete";
  amountCharged: string;
  depositAmount: string;
  responsibleType: "customer" | "driver" | "both" | null;
  chargeMethod: "commission" | "cash" | null;
}

interface Delivery {
  id: number;
  orderId: number;
  customerId: number;
  customerName: string;
  address: string;
  status: "pending" | "in_progress" | "delivered" | "cancelled";
  scheduledTime: string;
  products: { id: number; name: string; quantity: number; price: number; isReturnable?: boolean }[];
  total: number;
  bottleReturns: BottleReturn[];
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500", icon: Clock },
  in_progress: { label: "En camino", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500", icon: Truck },
  delivered: { label: "Entregado", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", dot: "bg-red-500", icon: X },
};

const TABS = [
  { key: "pendientes", label: "Pendientes" },
  { key: "completadas", label: "Entregados" },
  { key: "canceladas", label: "Cancelados" },
  { key: "todas", label: "Todos" },
];

export default function DriverDeliveries() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { companyName } = useCompanySettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pendientes");

  const { data: deliveriesData = [], isLoading, refetch } = useOfflineDeliveries();

  const syncData = async () => {
    toast({ title: "Sincronizando entregas", description: "Actualizando información..." });
    try {
      await refetch();
      toast({ title: "Entregas actualizadas", description: "Los datos han sido actualizados" });
    } catch {
      toast({ title: "Error al actualizar", description: "No se pudieron actualizar las entregas", variant: "destructive" });
    }
  };

  const deliveries: Delivery[] = deliveriesData.map((delivery: any) => ({
    id: delivery.id,
    orderId: delivery.id,
    customerId: delivery.customerId,
    customerName: delivery.customerName,
    address: delivery.address || "",
    status: delivery.status as Delivery["status"],
    scheduledTime: formatTimeRD(delivery.date, { hour: "2-digit", minute: "2-digit" }),
    products: delivery.products || [],
    total: parseFloat(delivery.total),
    bottleReturns: delivery.bottleReturns || [],
  }));

  const filteredDeliveries = deliveries.filter((d) => {
    const statusMatch =
      activeTab === "pendientes"
        ? d.status === "pending" || d.status === "in_progress"
        : activeTab === "completadas"
        ? d.status === "delivered"
        : activeTab === "canceladas"
        ? d.status === "cancelled"
        : true;
    const searchMatch =
      !searchTerm ||
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.address.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  const counts = {
    pendientes: deliveries.filter((d) => d.status === "pending" || d.status === "in_progress").length,
    completadas: deliveries.filter((d) => d.status === "delivered").length,
    canceladas: deliveries.filter((d) => d.status === "cancelled").length,
    todas: deliveries.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader title="Mis Entregas" user={user} onSyncData={syncData} companyName={companyName} />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando entregas...</p>
          </div>
        </div>
        <MobileFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Mis Entregas" user={user} onSyncData={syncData} companyName={companyName} />

      <main className="px-4 pb-6">
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              className="pl-12 h-12 text-base rounded-2xl border-gray-200 bg-white shadow-sm"
              placeholder="Buscar por cliente o dirección"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                onClick={() => setSearchTerm("")}
              >
                <XCircle className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {counts[tab.key as keyof typeof counts] > 0 && (
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      activeTab === tab.key ? "bg-white/30 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {counts[tab.key as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <Package className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 mb-2">No hay entregas para mostrar</p>
                {searchTerm && (
                  <button className="text-sm text-blue-600 font-medium" onClick={() => setSearchTerm("")}>
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              filteredDeliveries.map((delivery) => {
                const config = STATUS_CONFIG[delivery.status];
                const StatusIcon = config.icon;
                const returnableProducts = delivery.products.filter((p) => p.isReturnable);
                const pendingBottles =
                  delivery.bottleReturns?.length > 0
                    ? delivery.bottleReturns.reduce((t, br) => t + br.pendingQuantity, 0)
                    : returnableProducts.reduce((t, p) => t + p.quantity, 0);

                return (
                  <button
                    key={delivery.id}
                    className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-all"
                    onClick={() => setLocation(`/mobile-app/entregas/${delivery.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        delivery.status === "delivered" ? "bg-emerald-100" :
                        delivery.status === "cancelled" ? "bg-red-100" :
                        delivery.status === "in_progress" ? "bg-blue-100" : "bg-amber-100"
                      }`}>
                        <span className={`text-sm font-bold ${
                          delivery.status === "delivered" ? "text-emerald-700" :
                          delivery.status === "cancelled" ? "text-red-700" :
                          delivery.status === "in_progress" ? "text-blue-700" : "text-amber-700"
                        }`}>
                          {getInitials(delivery.customerName)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate">{delivery.customerName}</p>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0 ${config.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </div>

                        {delivery.address && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{delivery.address}</span>
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {delivery.scheduledTime}
                          </div>
                          <p className="text-sm font-bold text-gray-900">RD$ {delivery.total.toFixed(2)}</p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {delivery.products.map((product) => (
                            <span
                              key={`${delivery.id}-${product.id}`}
                              className="text-[11px] px-2 py-1 rounded-lg bg-gray-50 text-gray-600 font-medium"
                            >
                              {product.quantity} × {product.name}
                            </span>
                          ))}
                        </div>

                        {returnableProducts.length > 0 && pendingBottles > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-medium">{pendingBottles} envases por retornar</span>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0 mt-3" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>

      <MobileFooter />
    </div>
  );
}
