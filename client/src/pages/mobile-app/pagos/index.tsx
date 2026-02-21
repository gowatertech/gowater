import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Search,
  XCircle,
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  Wallet,
  Loader2,
  ChevronRight,
  Banknote,
  ArrowRightLeft,
  Filter,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  amount: string;
  paymentMethod: "cash" | "credit" | "card" | "transfer";
  date: string;
  reference?: string;
  notes?: string;
}

interface PaymentStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  pendingAmount: number;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const METHOD_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  cash: { label: "Efectivo", icon: Banknote, bg: "bg-emerald-100", text: "text-emerald-700" },
  card: { label: "Tarjeta", icon: CreditCard, bg: "bg-purple-100", text: "text-purple-700" },
  credit: { label: "Crédito", icon: FileText, bg: "bg-blue-100", text: "text-blue-700" },
  transfer: { label: "Transferencia", icon: ArrowRightLeft, bg: "bg-amber-100", text: "text-amber-700" },
};

const TABS = [
  { key: "all", label: "Todos" },
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
];

export default function MobilePayments() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: payments, isLoading, refetch } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: true,
  });

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    let filtered = [...payments];
    if (filterMethod) filtered = filtered.filter((p) => p.paymentMethod === filterMethod);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.customerName.toLowerCase().includes(term) ||
          p.invoiceNumber.includes(term) ||
          (p.notes && p.notes.toLowerCase().includes(term))
      );
    }
    if (activeTab === "today") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((p) => new Date(p.date) >= today);
    } else if (activeTab === "week") {
      const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay()); ws.setHours(0, 0, 0, 0);
      filtered = filtered.filter((p) => new Date(p.date) >= ws);
    } else if (activeTab === "month") {
      const ms = new Date(); ms.setDate(1); ms.setHours(0, 0, 0, 0);
      filtered = filtered.filter((p) => new Date(p.date) >= ms);
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, activeTab, filterMethod]);

  const paymentStats: PaymentStats = useMemo(() => {
    if (!payments || payments.length === 0) return { totalToday: 0, totalWeek: 0, totalMonth: 0, pendingAmount: 0 };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ws = new Date(today); ws.setDate(today.getDate() - today.getDay());
    const ms = new Date(today.getFullYear(), today.getMonth(), 1);
    let totalToday = 0, totalWeek = 0, totalMonth = 0;
    payments.forEach((p) => {
      const d = new Date(p.date);
      const a = parseFloat(p.amount);
      if (d >= today) totalToday += a;
      if (d >= ws) totalWeek += a;
      if (d >= ms) totalMonth += a;
    });
    return { totalToday, totalWeek, totalMonth, pendingAmount: 0 };
  }, [payments]);

  const formatCurrency = (value: number | string) => {
    const n = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader title="Pagos" onSyncData={() => refetch()} />
        <div className="h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando pagos...</p>
          </div>
        </div>
        <MobileFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Pagos" onSyncData={() => refetch()} />

      <main className="px-4 pb-6">
        <div className="py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Pagos Hoy", value: paymentStats.totalToday, icon: Calendar, color: "blue" },
              { label: "Esta Semana", value: paymentStats.totalWeek, icon: Wallet, color: "emerald" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    stat.color === "blue" ? "bg-blue-100" : "bg-emerald-100"
                  }`}>
                    <stat.icon className={`h-4 w-4 ${
                      stat.color === "blue" ? "text-blue-600" : "text-emerald-600"
                    }`} />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stat.value)}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar pagos..."
                className="pl-12 h-12 text-base rounded-2xl border-gray-200 bg-white shadow-sm"
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
            <button
              className={`h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all active:scale-95 ${
                filterMethod
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {filterOpen && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Filtrar por método</p>
                {filterMethod && (
                  <button
                    className="text-xs text-blue-600 font-medium"
                    onClick={() => { setFilterMethod(""); setFilterOpen(false); }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(METHOD_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                        filterMethod === key
                          ? `${config.bg} border-current`
                          : "bg-white border-gray-100"
                      }`}
                      onClick={() => {
                        setFilterMethod(filterMethod === key ? "" : key);
                        setFilterOpen(false);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.text}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <DollarSign className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">No hay pagos que mostrar</p>
              </div>
            ) : (
              filteredPayments.map((payment) => {
                const mc = METHOD_CONFIG[payment.paymentMethod] || METHOD_CONFIG.cash;
                const McIcon = mc.icon;
                return (
                  <button
                    key={payment.id}
                    className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:scale-[0.98] transition-all"
                    onClick={() => setSelectedPayment(selectedPayment?.id === payment.id ? null : payment)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${mc.bg}`}>
                        <span className={`text-sm font-bold ${mc.text}`}>
                          {getInitials(payment.customerName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate">{payment.customerName}</p>
                          <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(payment.amount)}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            #{payment.invoiceNumber} · {format(new Date(payment.date), "dd/MM/yyyy", { locale: es })}
                          </p>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${mc.bg} ${mc.text}`}>
                            <McIcon className="h-3 w-3" />
                            {mc.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedPayment?.id === payment.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {payment.reference && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Referencia</span>
                            <span className="text-gray-700 font-medium">{payment.reference}</span>
                          </div>
                        )}
                        {payment.notes && (
                          <div className="text-xs">
                            <span className="text-gray-400">Notas: </span>
                            <span className="text-gray-700">{payment.notes}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Fecha</span>
                          <span className="text-gray-700 font-medium">
                            {format(new Date(payment.date), "PPP", { locale: es })}
                          </span>
                        </div>
                      </div>
                    )}
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
