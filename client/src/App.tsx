import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import Customers from "@/pages/customers";
import Orders from "@/pages/orders";
import Routes from "@/pages/routes";
import Users from "@/pages/users";
import Payments from "@/pages/payments";
import Billing from "@/pages/billing";
import TutorialPage from "@/pages/tutorial";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import Trucks from "@/pages/trucks";
import DevolucionEnvases from "@/pages/envases/devolucion";
import BalanceEnvases from "@/pages/envases/balance";
import Faltantes from "@/pages/envases/faltantes";
import AsignarResponsabilidad from "@/pages/envases/asignar-responsabilidad";
import ProductionRegistration from "@/pages/inventory/production";
import InventoryPage from "@/pages/inventory";
import WarehousesPage from "@/pages/inventory/warehouses";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import RecurringOrders from "@/pages/routes/RecurringOrders";
import DriverView from "@/pages/routes/DriverView";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/billing" component={Billing} />
        <Route path="/payments" component={Payments} />
        <Route path="/customers" component={Customers} />

        {/* Inventory Routes */}
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/inventory/products" component={InventoryPage} />
        <Route path="/inventory/warehouses" component={WarehousesPage} />
        <Route path="/inventory/production" component={ProductionRegistration} />
        <Route path="/inventory/load" component={InventoryPage} />

        <Route path="/orders" component={Orders} />
        <Route path="/routes" component={Routes} />
        <Route path="/routes/recurring" component={RecurringOrders} />
        <Route path="/routes/driver" component={DriverView} />
        <Route path="/users" component={Users} />
        <Route path="/trucks" component={Trucks} />
        <Route path="/tutorial" component={TutorialPage} />
        <Route path="/settings" component={Settings} />
        <Route path="/reports" component={Reports} />
        <Route path="/reports/:type" component={Reports} />

        {/* Rutas para envases */}
        <Route path="/envases/devolucion" component={DevolucionEnvases} />
        <Route path="/envases/balance" component={BalanceEnvases} />
        <Route path="/envases/faltantes" component={Faltantes} />
        <Route path="/envases/asignar-responsabilidad" component={AsignarResponsabilidad} />

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