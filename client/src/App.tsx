import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import Customers from "@/pages/customers";
import ProductosPage from "@/pages/inventario/productos";
import CargaProductos from "@/pages/inventario/carga";
import Orders from "@/pages/orders";
import Routes from "@/pages/routes";
import Users from "@/pages/users";
import Payments from "@/pages/payments";
import Billing from "@/pages/billing";
import TutorialPage from "@/pages/tutorial";

// Import translations and I18nextProvider
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/billing" component={Billing} />
        <Route path="/payments" component={Payments} />
        <Route path="/customers" component={Customers} />
        <Route path="/inventario/productos" component={ProductosPage} />
        <Route path="/inventario/carga" component={CargaProductos} />
        <Route path="/orders" component={Orders} />
        <Route path="/routes" component={Routes} />
        <Route path="/users" component={Users} />
        <Route path="/tutorial" component={TutorialPage} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;