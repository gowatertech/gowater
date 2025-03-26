import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import Customers from "@/pages/customers";
import OrdersPage from "@/pages/orders/OrdersPage";
import Routes from "@/pages/routes";
import RouteDetails from "@/pages/routes/RouteDetails";
import Users from "@/pages/users";
import Payments from "@/pages/payments";
import Billing from "@/pages/billing";
import TutorialPage from "@/pages/tutorial";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import Entregas from "@/pages/entregas";
import DevolucionEnvases from "@/pages/envases/devolucion";
import BalanceEnvases from "@/pages/envases/balance";
import Faltantes from "@/pages/envases/faltantes";
import AsignarResponsabilidad from "@/pages/envases/asignar-responsabilidad";
import InventoryPage from "@/pages/inventory";
import WarehousesPage from "@/pages/inventory/warehouses";
import ProductionRegistration from "@/pages/inventory/production";
import InventoryAdjustments from "@/pages/inventory/adjustments";
import DriverView from "@/pages/drivers/DriverView";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import VehicleLoadingPage from "@/pages/routes/vehicle-loading";
import RouteSettlementPage from "@/pages/routes/settlements";
import VehicleSettlementPage from "./pages/routes/vehicle-settlement";
import RecurringOrders from "./pages/routes/RecurringOrders";
import TrucksPage from "./pages/routes/trucks";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/billing" component={Billing} />
        <Route path="/payments" component={Payments} />
        <Route path="/customers" component={Customers} />

        {/* Inventory Routes - Specific routes first */}
        <Route path="/inventory/warehouses" component={WarehousesPage} />
        <Route path="/inventory/production" component={ProductionRegistration} />
        <Route path="/inventory/adjustments" component={InventoryAdjustments} />
        <Route path="/inventory/products" component={InventoryPage} />
        <Route path="/inventory" component={InventoryPage} />

        <Route path="/orders" component={OrdersPage} />
        <Route path="/routes/settlements" component={RouteSettlementPage} />
        <Route path="/routes/vehicle-settlement" component={VehicleSettlementPage} />
        <Route path="/routes/recurring-orders" component={RecurringOrders} />
        <Route path="/routes/trucks" component={TrucksPage} />
        <Route path="/routes/vehicle-loading" component={VehicleLoadingPage} />
        <Route path="/routes/:id" component={RouteDetails} />
        <Route path="/routes" component={Routes} />
        <Route path="/users" component={Users} />
        <Route path="/entregas" component={Entregas} />
        <Route path="/drivers/view" component={DriverView} />
        <Route path="/tutorial" component={TutorialPage} />
        <Route path="/settings" component={Settings} />
        <Route path="/reports" component={Reports} />
        <Route path="/reports/:type" component={Reports} />

        {/* Rutas para bottles (envases) */}
        <Route path="/bottles/return" component={DevolucionEnvases} />
        <Route path="/bottles/balance" component={BalanceEnvases} />
        <Route path="/bottles/missing" component={Faltantes} />
        <Route path="/bottles/assign-responsibility" component={AsignarResponsabilidad} />

        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </I18nextProvider>
  );
}