import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import Customers from "@/pages/customers";
import Orders from "@/pages/orders/OrdersPage";
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
import DriverView from "@/pages/drivers/DriverView";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import VehicleLoadingPage from "@/pages/routes/vehicle-loading";
import RouteSettlementPage from "@/pages/routes/settlements";
import VehicleSettlementPage from "./pages/routes/vehicle-settlement";
import RecurringOrders from "./pages/routes/RecurringOrders";
import TrucksPage from "./pages/routes/trucks";
import { useEffect } from "react";
import { CenteredLogo } from "@/components/common/CenteredLogo";
import { CompanyFooter } from "@/components/common/CompanyFooter";
import { DesignCredit } from "@/components/common/DesignCredit";

// PWA Pages
import MobileApp from "@/pages/mobile-app";
import MobileRoute from "@/pages/mobile-app/ruta";
import MobileDeliveries from "@/pages/mobile-app/entregas";
import MobilePendingRoutes from "@/pages/mobile-app/rutas-pendientes";
import MobileRoutesInProgress from "@/pages/mobile-app/rutas-en-progreso";
import MobileBottleReturns from "@/pages/mobile-app/envases";

function Router() {
  const [location] = useLocation();
  
  // No envolver en DashboardLayout si estamos en la app móvil PWA
  const isMobileApp = location.startsWith("/mobile-app");
  
  // Registrar el Service Worker para PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registrado con éxito:', registration);
          })
          .catch(error => {
            console.error('Error al registrar el Service Worker:', error);
          });
      });
    }
  }, []);
  
  // Agregar el enlace al manifest.json en el head para PWA
  useEffect(() => {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
    
    // Meta tags para PWA
    const metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    metaThemeColor.content = '#2563eb';
    document.head.appendChild(metaThemeColor);
    
    const metaViewport = document.createElement('meta');
    metaViewport.name = 'viewport';
    metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(metaViewport);
    
    // Apple specific tags para PWA en iOS
    const appleCapable = document.createElement('meta');
    appleCapable.name = 'apple-mobile-web-app-capable';
    appleCapable.content = 'yes';
    document.head.appendChild(appleCapable);
    
    const appleStatusBar = document.createElement('meta');
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
    appleStatusBar.content = 'black-translucent';
    document.head.appendChild(appleStatusBar);
    
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = '/images/icons/apple-touch-icon.svg';
    document.head.appendChild(appleTouchIcon);
    
    // Crear elementos link para diferentes tamaños de íconos Apple usando HTML directo
    const iconSizes = ['180x180', '152x152', '120x120', '76x76'];
    const touchIcons: HTMLElement[] = [];
    
    iconSizes.forEach(size => {
      const linkElement = document.createElement('link');
      linkElement.rel = 'apple-touch-icon';
      // Usar setAttribute en lugar de asignar directamente
      linkElement.setAttribute('sizes', size);
      linkElement.href = '/images/icons/apple-touch-icon.svg';
      document.head.appendChild(linkElement);
      touchIcons.push(linkElement);
    });
    
    // Apple Splash Screen
    const appleSplashScreen = document.createElement('meta');
    appleSplashScreen.name = 'apple-mobile-web-app-title';
    appleSplashScreen.content = 'GoWater Driver';
    document.head.appendChild(appleSplashScreen);
    
    return () => {
      document.head.removeChild(manifestLink);
      document.head.removeChild(metaThemeColor);
      document.head.removeChild(metaViewport);
      document.head.removeChild(appleCapable);
      document.head.removeChild(appleStatusBar);
      document.head.removeChild(appleTouchIcon);
      // Eliminar los íconos de touch
      touchIcons.forEach(icon => document.head.removeChild(icon));
      document.head.removeChild(appleSplashScreen);
    };
  }, []);

  // Si estamos en la app móvil, renderizar directamente sin el DashboardLayout
  if (isMobileApp) {
    return (
      <Switch>
        <Route path="/mobile-app" component={MobileApp} />
        <Route path="/mobile-app/rutas-pendientes" component={MobilePendingRoutes} />
        <Route path="/mobile-app/ruta" component={MobileRoute} />
        <Route path="/mobile-app/entregas" component={MobileDeliveries} />
        <Route path="/mobile-app/envases" component={MobileBottleReturns} />
      </Switch>
    );
  }

  // Para la aplicación web normal, usar el DashboardLayout
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
        <Route path="/inventory/products" component={InventoryPage} />
        <Route path="/inventory" component={InventoryPage} />

        <Route path="/orders" component={Orders} />
        <Route path="/routes/settlements" component={RouteSettlementPage} />
        <Route path="/routes/vehicle-settlement" component={VehicleSettlementPage} />
        <Route path="/routes/recurring-orders" component={RecurringOrders} />
        <Route path="/routes/trucks" component={TrucksPage} />
        <Route path="/routes/vehicle-loading" component={VehicleLoadingPage} />
        <Route path="/routes/:id" component={RouteDetails} />
        <Route path="/routes" component={Routes} />
        <Route path="/users" component={Users} />
        <Route path="/entregas" component={Entregas} />
        <Route path="/drivers" component={DriverView} />
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
        <CenteredLogo size="medium" showName={true} companyName="GoWater" />
        <CompanyFooter />
        <DesignCredit />
      </QueryClientProvider>
    </I18nextProvider>
  );
}