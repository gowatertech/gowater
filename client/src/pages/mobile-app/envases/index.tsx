import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Recycle,
  Search,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";

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

interface CustomerWithBottles {
  id: number;
  name: string;
  totalPending: number;
  totalReturned: number;
  bottleReturns: BottleReturn[];
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const TABS = [
  { key: "pendientes", label: "Pendientes" },
  { key: "completados", label: "Completados" },
  { key: "todos", label: "Todos" },
];

export default function MobileBottleReturns() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { companyName } = useCompanySettings();
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithBottles[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pendientes");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const syncData = () => {
    toast({ title: "Sincronizando datos", description: "Actualizando información de envases..." });
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const ordersResponse = await fetch("/api/orders");
      if (!ordersResponse.ok) throw new Error("Error al obtener órdenes");
      const ordersData = await ordersResponse.json();
      const allBottleReturns: BottleReturn[] = [];
      await Promise.all(
        ordersData.map(async (order: any) => {
          try {
            const res = await fetch(`/api/orders/${order.id}/bottle-returns`);
            if (res.ok) {
              const returns = await res.json();
              allBottleReturns.push(...returns);
            }
          } catch {}
        })
      );
      const customerMap = new Map<number, CustomerWithBottles>();
      ordersData.forEach((order: any) => {
        if (!customerMap.has(order.customerId)) {
          customerMap.set(order.customerId, { id: order.customerId, name: order.customerName, totalPending: 0, totalReturned: 0, bottleReturns: [] });
        }
      });
      allBottleReturns.forEach((br) => {
        const order = ordersData.find((o: any) => o.id === br.orderId);
        if (order) {
          const customer = customerMap.get(order.customerId);
          if (customer) {
            customer.bottleReturns.push(br);
            customer.totalPending += br.pendingQuantity;
            customer.totalReturned += br.returnedQuantity;
          }
        }
      });
      const arr = Array.from(customerMap.values()).sort((a, b) => b.totalPending - a.totalPending);
      setCustomers(arr);
    } catch {
      toast({ title: "Error al cargar datos", description: "No se pudieron obtener los datos de envases", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const tabFilter = activeTab === "pendientes" ? c.totalPending > 0 : activeTab === "completados" ? c.totalPending === 0 && c.totalReturned > 0 : true;
    const searchFilter = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return tabFilter && searchFilter;
  });

  useEffect(() => { loadData(); }, []);

  const totalPending = useMemo(() => customers.reduce((s, c) => s + c.totalPending, 0), [customers]);
  const totalReturned = useMemo(() => customers.reduce((s, c) => s + c.totalReturned, 0), [customers]);
  const totalAll = totalPending + totalReturned;
  const recoveryRate = totalAll > 0 ? Math.round((totalReturned / totalAll) * 100) : 0;

  const counts = {
    pendientes: customers.filter((c) => c.totalPending > 0).length,
    completados: customers.filter((c) => c.totalPending === 0 && c.totalReturned > 0).length,
    todos: customers.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader title="Control de Envases" user={user} onSyncData={syncData} companyName={companyName} showBackButton onBackButtonClick={() => setLocation("/mobile-app")} />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando envases...</p>
          </div>
        </div>
        <MobileFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Control de Envases" user={user} onSyncData={syncData} companyName={companyName} showBackButton onBackButtonClick={() => setLocation("/mobile-app")} />

      <main className="px-4 pb-6">
        <div className="py-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Recycle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Resumen de Envases</p>
                <p className="text-xs text-gray-400">Tasa de recuperación</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-amber-600 font-medium">Pendientes</p>
                <p className="text-xl font-bold text-amber-700">{totalPending}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-emerald-600 font-medium">Devueltos</p>
                <p className="text-xl font-bold text-emerald-700">{totalReturned}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-blue-600 font-medium">Recuperación</p>
                <p className="text-xl font-bold text-blue-700">{recoveryRate}%</p>
              </div>
            </div>

            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${recoveryRate}%` }}
              />
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              className="pl-12 h-12 text-base rounded-2xl border-gray-200 bg-white shadow-sm"
              placeholder="Buscar por cliente"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center"
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
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    activeTab === tab.key ? "bg-white/30 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {counts[tab.key as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <Package className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">No hay resultados</p>
                {searchTerm && (
                  <button className="text-sm text-blue-600 font-medium mt-2" onClick={() => setSearchTerm("")}>
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const isExpanded = expandedId === customer.id;
                const total = customer.totalPending + customer.totalReturned;
                const rate = total > 0 ? Math.round((customer.totalReturned / total) * 100) : 0;

                return (
                  <div key={customer.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      className="w-full p-4 text-left active:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          customer.totalPending > 0 ? "bg-amber-100" : "bg-emerald-100"
                        }`}>
                          <span className={`text-sm font-bold ${
                            customer.totalPending > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}>
                            {getInitials(customer.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{customer.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-amber-600 font-medium">{customer.totalPending} pendientes</span>
                            <span className="text-xs text-emerald-600 font-medium">{customer.totalReturned} devueltos</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-sm font-bold ${rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                            {rate}%
                          </span>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && customer.bottleReturns.length > 0 && (
                      <div className="border-t border-gray-100 px-4 pb-4">
                        <div className="space-y-2 pt-3">
                          {customer.bottleReturns.map((br) => (
                            <div
                              key={br.id}
                              className={`p-3 rounded-xl text-sm ${
                                br.status === "complete" ? "bg-emerald-50" : "bg-amber-50"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  {br.status === "complete" ? (
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                  )}
                                  <span className="font-medium text-gray-900">{br.productName}</span>
                                </div>
                                <span className={`text-xs font-bold ${
                                  br.status === "complete" ? "text-emerald-600" : "text-amber-600"
                                }`}>
                                  {br.returnedQuantity}/{br.expectedQuantity}
                                </span>
                              </div>
                              {br.pendingQuantity > 0 && (
                                <p className="text-xs text-amber-600 mt-1 ml-6">
                                  {br.pendingQuantity} pendientes · RD$ {(parseFloat(br.depositAmount) * br.pendingQuantity).toFixed(2)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
