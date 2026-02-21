import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  CalendarIcon,
  MapPin,
  TruckIcon,
  DollarSign,
  Clock,
  Play,
  Pause,
  Loader2,
  Route,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompanySettings } from "@/hooks/use-company-settings";

interface RouteData {
  id: number;
  name: string;
  driverId: number;
  status: string;
  date: string;
  totalDistance: string | null;
  totalRevenue: number | null;
  deliverySequence: string[];
  stops: string[];
}

export default function MobileRoutesInProgress() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const { companyName } = useCompanySettings();

  const { data: routes = [], isLoading: isLoadingRoutes, error: routesError } = useQuery<RouteData[]>({
    queryKey: ["/api/routes"],
    retry: 3,
  });

  const [routesInProgress, setRoutesInProgress] = useState<RouteData[]>([]);

  useEffect(() => {
    if (Array.isArray(routes) && routes.length > 0) {
      const dbInProgress = routes.filter((r) => r.status === "in_progress");
      const lsInProgress = routes.filter((r) => {
        const saved = localStorage.getItem(`routeStatus_${r.id}`);
        return saved === "in_progress" || saved === "paused";
      });
      const all = [...dbInProgress];
      lsInProgress.forEach((r) => { if (!all.find((x) => x.id === r.id)) all.push(r); });
      if (all.length === 0 && routes.length > 0) {
        const notCompleted = routes.filter((r) => r.status !== "completed");
        if (notCompleted.length > 0) {
          all.push(notCompleted[0]);
          localStorage.setItem(`routeStatus_${notCompleted[0].id}`, "in_progress");
        }
      }
      setRoutesInProgress(all);
    }
  }, [routes]);

  const continueRoute = (routeId: number) => setLocation(`/mobile-app/ruta?routeId=${routeId}`);

  if (isLoadingUser || isLoadingRoutes) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader title="Rutas en Progreso" user={user} companyName={companyName} />
        <div className="flex-1 flex items-center justify-center h-[calc(100vh-132px)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando rutas...</p>
          </div>
        </div>
        <MobileFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Rutas en Progreso" user={user} companyName={companyName} />

      <main className="px-4 py-4 pb-6">
        {routesError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-600">Error al cargar los datos. Intenta nuevamente.</p>
          </div>
        ) : routesInProgress.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <TruckIcon className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No hay rutas en progreso</h3>
            <p className="text-sm text-gray-500 text-center">No tienes ninguna ruta en curso o pausada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {routesInProgress.map((route) => {
              const routeDate = new Date(route.date);
              const localStatus = localStorage.getItem(`routeStatus_${route.id}`);
              const routeStatus = localStatus || route.status;
              const isPaused = routeStatus === "paused";
              const stopsCount = route.stops ? route.stops.length - 1 : 0;

              return (
                <div key={route.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className={`h-1.5 ${isPaused ? "bg-amber-400" : "bg-blue-500"}`} />

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isPaused ? "bg-amber-100" : "bg-blue-100"
                        }`}>
                          <Route className={`h-6 w-6 ${isPaused ? "text-amber-600" : "text-blue-600"}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{route.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold mt-1 ${
                            isPaused ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {isPaused ? (
                              <><Pause className="h-3 w-3" /> Pausada</>
                            ) : (
                              <><Play className="h-3 w-3" /> En curso</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { icon: CalendarIcon, label: format(routeDate, "dd MMM yyyy", { locale: es }), color: "bg-gray-50 text-gray-600" },
                        { icon: MapPin, label: `${stopsCount} paradas`, color: "bg-gray-50 text-gray-600" },
                        { icon: DollarSign, label: `RD$ ${route.totalRevenue?.toFixed(2) || "0.00"}`, color: "bg-gray-50 text-gray-600" },
                        { icon: Clock, label: route.totalDistance ? `${route.totalDistance} km` : "Dist. N/A", color: "bg-gray-50 text-gray-600" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                          <item.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600 font-medium truncate">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => continueRoute(route.id)}
                      className={`w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md ${
                        isPaused
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-200"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200"
                      }`}
                    >
                      <Play className="h-4 w-4" />
                      {isPaused ? "Continuar Ruta" : "Ver Ruta"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <MobileFooter />
    </div>
  );
}
